package ch.duartesantos.opengym

import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlinx.coroutines.runBlocking

/**
 * Read-only bridge to Health Connect. Samsung Health writes steps, sleep and
 * active calories there once the user turns sharing on. Exercise sessions are
 * intentionally not read — they would fight the workout log.
 *
 * JS: registerPlugin('Health') → status(), request(), read().
 */
@CapacitorPlugin(name = "Health")
class HealthPlugin : Plugin() {

    private fun wanted(): Set<String> = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
    )

    private fun available(): Boolean {
        val ctx = context ?: return false
        return HealthConnectClient.getSdkStatus(ctx) == HealthConnectClient.SDK_AVAILABLE
    }

    @PluginMethod
    fun status(call: PluginCall) {
        if (!available()) {
            call.resolve(result(false, false))
            return
        }
        execute {
            try {
                val granted = runBlocking { client().permissionController.getGrantedPermissions() }
                call.resolve(result(true, granted.containsAll(wanted())))
            } catch (e: Exception) {
                call.reject(e.message ?: "health status failed")
            }
        }
    }

    @PluginMethod
    fun request(call: PluginCall) {
        if (!available()) {
            call.resolve(result(false, false))
            return
        }
        val ctx = activity ?: context
        if (ctx == null) {
            call.reject("no activity")
            return
        }
        val intent = PermissionController.createRequestPermissionResultContract()
            .createIntent(ctx, wanted())
        startActivityForResult(call, intent, "healthPermission")
    }

    @ActivityCallback
    private fun healthPermission(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        val granted = PermissionController.createRequestPermissionResultContract()
            .parseResult(result.resultCode, result.data)
        call.resolve(result(true, granted.containsAll(wanted())))
    }

    @PluginMethod
    fun read(call: PluginCall) {
        if (!available()) {
            val empty = JSObject()
            empty.put("days", JSArray())
            call.resolve(empty)
            return
        }
        execute {
            try {
                val days = runBlocking { readDays() }
                val out = JSObject()
                out.put("days", days)
                call.resolve(out)
            } catch (e: Exception) {
                call.reject(e.message ?: "health read failed")
            }
        }
    }

    private fun client(): HealthConnectClient = HealthConnectClient.getOrCreate(context)

    private suspend fun readDays(): JSArray {
        val hc = client()
        val zone = ZoneId.systemDefault()
        val today = LocalDate.now(zone)
        val first = today.minusDays(13)
        val windowStart = first.atStartOfDay(zone).toInstant()
        val windowEnd = today.plusDays(1).atStartOfDay(zone).toInstant().minusMillis(1)
        val sleepByDay = sleepMinutes(hc, windowStart, windowEnd, zone)
        val out = JSArray()
        var day = first
        while (!day.isAfter(today)) {
            val start = day.atStartOfDay(zone).toInstant()
            val end = day.plusDays(1).atStartOfDay(zone).toInstant().minusMillis(1)
            val steps = aggregateSteps(hc, start, end)
            val kcal = aggregateKcal(hc, start, end)
            val sleep = sleepByDay[day]
            val row = JSObject()
            row.put("d", day.toString())
            val isToday = day == today
            if (steps != null && (isToday || steps > 0)) row.put("steps", steps)
            if (kcal != null && (isToday || kcal > 0)) row.put("activeKcal", kcal)
            if (sleep != null && sleep > 0) row.put("sleepMin", sleep)
            if (row.length() > 1) out.put(row)
            day = day.plusDays(1)
        }
        return out
    }

    private suspend fun aggregateSteps(hc: HealthConnectClient, start: Instant, end: Instant): Long? = try {
        hc.aggregate(
            AggregateRequest(setOf(StepsRecord.COUNT_TOTAL), TimeRangeFilter.between(start, end))
        )[StepsRecord.COUNT_TOTAL]
    } catch (_: Exception) {
        null
    }

    private suspend fun aggregateKcal(hc: HealthConnectClient, start: Instant, end: Instant): Int? = try {
        val energy = hc.aggregate(
            AggregateRequest(
                setOf(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL),
                TimeRangeFilter.between(start, end),
            )
        )[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]
        energy?.kilocalories?.let { kotlin.math.round(it).toInt().coerceAtLeast(0) }
    } catch (_: Exception) {
        null
    }

    /** Whole session on the local date it ended (the morning you woke), overlaps merged. */
    private suspend fun sleepMinutes(
        hc: HealthConnectClient,
        start: Instant,
        end: Instant,
        zone: ZoneId,
    ): Map<LocalDate, Int> = try {
        val response = hc.readRecords(
            ReadRecordsRequest(SleepSessionRecord::class, TimeRangeFilter.between(start, end))
        )
        val spans = mutableMapOf<LocalDate, MutableList<Pair<Long, Long>>>()
        for (rec in response.records) {
            if (!rec.endTime.isAfter(rec.startTime)) continue
            val day = rec.endTime.atZone(zone).toLocalDate()
            spans.getOrPut(day) { mutableListOf() }
                .add(rec.startTime.toEpochMilli() to rec.endTime.toEpochMilli())
        }
        spans.mapValues { (_, list) -> mergedMinutes(list) }
    } catch (_: Exception) {
        emptyMap()
    }

    private fun mergedMinutes(spans: List<Pair<Long, Long>>): Int {
        if (spans.isEmpty()) return 0
        val sorted = spans.sortedBy { it.first }
        var total = 0L
        var s = sorted[0].first
        var e = sorted[0].second
        for (i in 1 until sorted.size) {
            val (ns, ne) = sorted[i]
            if (ns <= e) {
                if (ne > e) e = ne
            } else {
                total += e - s
                s = ns
                e = ne
            }
        }
        total += e - s
        return (total / 60000L).toInt()
    }

    private fun result(available: Boolean, granted: Boolean): JSObject {
        val o = JSObject()
        o.put("available", available)
        o.put("granted", granted)
        return o
    }
}
