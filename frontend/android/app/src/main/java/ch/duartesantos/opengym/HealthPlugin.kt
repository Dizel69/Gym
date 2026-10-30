package ch.duartesantos.opengym

import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
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
 * total burned calories there once sharing is on. Exercise sessions are not
 * read — they would fight the workout log. Steps are summed from the records
 * themselves: the aggregate total stays empty when Samsung is not first in
 * Health Connect's source list.
 *
 * JS: registerPlugin('Health') → status(), request(), read().
 */
@CapacitorPlugin(name = "Health")
class HealthPlugin : Plugin() {

    private fun wanted(): Set<String> = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
    )

    /** One granted type is enough to read. Requiring every type blocked steps
     *  when active calories — which Samsung does not write — was still missing. */
    private fun allowed(granted: Set<String>) = granted.any { it in wanted() }

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
                call.resolve(result(true, allowed(granted), granted.containsAll(wanted())))
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
        call.resolve(result(true, allowed(granted), granted.containsAll(wanted())))
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
        val granted = hc.permissionController.getGrantedPermissions()
        val zone = ZoneId.systemDefault()
        val today = LocalDate.now(zone)
        val first = today.minusDays(13)
        val windowStart = first.atStartOfDay(zone).toInstant()
        val windowEnd = today.plusDays(1).atStartOfDay(zone).toInstant().minusMillis(1)
        val stepsPerm = HealthPermission.getReadPermission(StepsRecord::class)
        val sleepPerm = HealthPermission.getReadPermission(SleepSessionRecord::class)
        val stepsByDay = if (stepsPerm in granted) stepsByDay(hc, windowStart, windowEnd, zone) else emptyMap()
        val kcalByDay = caloriesByDay(hc, granted, windowStart, windowEnd, zone)
        val sleepByDay = if (sleepPerm in granted) sleepMinutes(hc, windowStart, windowEnd, zone) else emptyMap()
        val out = JSArray()
        var day = first
        while (!day.isAfter(today)) {
            val steps = stepsByDay[day]
            val kcal = kcalByDay[day]
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

    /** Sum the step records. Aggregate stays empty when Samsung is not the priority source. */
    private suspend fun stepsByDay(
        hc: HealthConnectClient,
        start: Instant,
        end: Instant,
        zone: ZoneId,
    ): Map<LocalDate, Long> {
        val fromRecords = try {
            val sums = mutableMapOf<LocalDate, Double>()
            for (rec in readAll(hc, StepsRecord::class, start, end)) {
                spread(rec.startTime, rec.endTime, rec.count.toDouble(), zone, sums)
            }
            sums.mapValues { kotlin.math.round(it.value).toLong() }
        } catch (_: Exception) {
            emptyMap()
        }
        if (fromRecords.isNotEmpty()) return fromRecords
        return try {
            val out = mutableMapOf<LocalDate, Long>()
            var day = start.atZone(zone).toLocalDate()
            val last = end.atZone(zone).toLocalDate()
            while (!day.isAfter(last)) {
                val dayStart = day.atStartOfDay(zone).toInstant()
                val dayEnd = day.plusDays(1).atStartOfDay(zone).toInstant().minusMillis(1)
                val total = hc.aggregate(
                    AggregateRequest(setOf(StepsRecord.COUNT_TOTAL), TimeRangeFilter.between(dayStart, dayEnd))
                )[StepsRecord.COUNT_TOTAL]
                if (total != null && total > 0) out[day] = total
                day = day.plusDays(1)
            }
            out
        } catch (_: Exception) {
            emptyMap()
        }
    }

    /**
     * Samsung writes "total calories burned", not active calories. Prefer that
     * number; fall back to active calories when it is the only one present.
     */
    private suspend fun caloriesByDay(
        hc: HealthConnectClient,
        granted: Set<String>,
        start: Instant,
        end: Instant,
        zone: ZoneId,
    ): Map<LocalDate, Int> {
        val totalPerm = HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class)
        val activePerm = HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class)
        val total = if (totalPerm in granted) {
            try {
                val sums = mutableMapOf<LocalDate, Double>()
                for (rec in readAll(hc, TotalCaloriesBurnedRecord::class, start, end)) {
                    spread(rec.startTime, rec.endTime, rec.energy.inKilocalories, zone, sums)
                }
                sums
            } catch (_: Exception) {
                emptyMap()
            }
        } else emptyMap()
        val active = if (activePerm in granted) {
            try {
                val sums = mutableMapOf<LocalDate, Double>()
                for (rec in readAll(hc, ActiveCaloriesBurnedRecord::class, start, end)) {
                    spread(rec.startTime, rec.endTime, rec.energy.inKilocalories, zone, sums)
                }
                sums
            } catch (_: Exception) {
                emptyMap()
            }
        } else emptyMap()
        val days = total.keys + active.keys
        return days.mapNotNull { day ->
            val kcal = total[day] ?: active[day] ?: return@mapNotNull null
            day to kotlin.math.round(kcal).toInt().coerceAtLeast(0)
        }.toMap()
    }

    private suspend fun <T : Record> readAll(
        hc: HealthConnectClient,
        type: kotlin.reflect.KClass<T>,
        start: Instant,
        end: Instant,
    ): List<T> {
        val out = mutableListOf<T>()
        var token: String? = null
        do {
            val page = hc.readRecords(
                ReadRecordsRequest(
                    recordType = type,
                    timeRangeFilter = TimeRangeFilter.between(start, end),
                    pageSize = 1000,
                    pageToken = token,
                )
            )
            out.addAll(page.records)
            token = page.pageToken
        } while (!token.isNullOrEmpty() && out.size < 20000)
        return out
    }

    /** Split a record that crosses midnight across the local days it covers. */
    private fun spread(
        start: Instant,
        end: Instant,
        amount: Double,
        zone: ZoneId,
        into: MutableMap<LocalDate, Double>,
    ) {
        val dur = end.toEpochMilli() - start.toEpochMilli()
        if (dur <= 0 || amount == 0.0) return
        var cursor = start
        while (cursor.isBefore(end)) {
            val day = cursor.atZone(zone).toLocalDate()
            val dayEnd = day.plusDays(1).atStartOfDay(zone).toInstant()
            val sliceEnd = if (end.isBefore(dayEnd)) end else dayEnd
            val frac = (sliceEnd.toEpochMilli() - cursor.toEpochMilli()).toDouble() / dur.toDouble()
            if (frac > 0) into[day] = (into[day] ?: 0.0) + amount * frac
            cursor = sliceEnd
        }
    }

    /** Whole session on the local date it ended (the morning you woke), overlaps merged. */
    private suspend fun sleepMinutes(
        hc: HealthConnectClient,
        start: Instant,
        end: Instant,
        zone: ZoneId,
    ): Map<LocalDate, Int> = try {
        val spans = mutableMapOf<LocalDate, MutableList<Pair<Long, Long>>>()
        for (rec in readAll(hc, SleepSessionRecord::class, start, end)) {
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

    private fun result(available: Boolean, granted: Boolean, full: Boolean = false): JSObject {
        val o = JSObject()
        o.put("available", available)
        o.put("granted", granted)
        o.put("full", full)
        return o
    }
}
