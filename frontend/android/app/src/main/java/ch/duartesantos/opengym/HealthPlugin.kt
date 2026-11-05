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
 * read — they would fight the workout log. Steps come from Samsung Health's own
 * records. Summing every source double-counts the same walk (the phone pedometer
 * on top of the watch), which is why the total ran ahead of Samsung Health.
 *
 * JS: registerPlugin('Health') → status(), request(), read().
 */
@CapacitorPlugin(name = "Health")
class HealthPlugin : Plugin() {

    private companion object {
        const val SAMSUNG_HEALTH = "com.sec.android.app.shealth"
    }

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

    /**
     * Samsung Health's own step records, not the sum of every app that wrote steps.
     * The phone sensor and the watch both record the same walk; adding them is how
     * 3 046 in Samsung Health became 4 107 here. Overlapping stretches from the
     * chosen source count once, at the higher rate.
     */
    private suspend fun stepsByDay(
        hc: HealthConnectClient,
        start: Instant,
        end: Instant,
        zone: ZoneId,
    ): Map<LocalDate, Long> {
        val fromRecords = try {
            stepsFrom(recordsForSteps(readAll(hc, StepsRecord::class, start, end)), zone)
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

    private fun recordsForSteps(all: List<StepsRecord>): List<StepsRecord> {
        if (all.isEmpty()) return all
        fun pkg(rec: StepsRecord) = rec.metadata.dataOrigin.packageName
        val exact = all.filter { pkg(it) == SAMSUNG_HEALTH }
        if (exact.isNotEmpty()) return exact
        val samsung = all.filter { isSamsungHealth(pkg(it)) }
        val pool = if (samsung.isNotEmpty()) samsung else all
        val byPkg = pool.groupBy { pkg(it) }
        if (byPkg.size <= 1) return pool
        return byPkg.maxByOrNull { (_, recs) -> recs.sumOf { it.count } }?.value ?: pool
    }

    private fun isSamsungHealth(pkg: String): Boolean {
        if (pkg == SAMSUNG_HEALTH) return true
        val p = pkg.lowercase()
        return p.contains("shealth") || (p.contains("samsung") && p.contains("health"))
    }

    /** Clip each record onto local days, then collapse overlaps so one walk is one count. */
    private fun stepsFrom(records: List<StepsRecord>, zone: ZoneId): Map<LocalDate, Long> {
        val byDay = mutableMapOf<LocalDate, MutableList<Triple<Long, Long, Double>>>()
        for (rec in records) {
            val dur = rec.endTime.toEpochMilli() - rec.startTime.toEpochMilli()
            if (dur <= 0L || rec.count <= 0L) continue
            var cursor = rec.startTime
            while (cursor.isBefore(rec.endTime)) {
                val day = cursor.atZone(zone).toLocalDate()
                val dayEnd = day.plusDays(1).atStartOfDay(zone).toInstant()
                val sliceEnd = if (rec.endTime.isBefore(dayEnd)) rec.endTime else dayEnd
                val sliceMs = sliceEnd.toEpochMilli() - cursor.toEpochMilli()
                if (sliceMs > 0L) {
                    val count = rec.count.toDouble() * sliceMs.toDouble() / dur.toDouble()
                    byDay.getOrPut(day) { mutableListOf() }
                        .add(Triple(cursor.toEpochMilli(), sliceEnd.toEpochMilli(), count))
                }
                cursor = sliceEnd
            }
        }
        return byDay.mapNotNull { (day, slices) ->
            val steps = kotlin.math.round(mergedSteps(slices)).toLong()
            if (steps > 0L) day to steps else null
        }.toMap()
    }

    /** Where intervals overlap, keep the higher step rate instead of adding both. */
    private fun mergedSteps(slices: List<Triple<Long, Long, Double>>): Double {
        data class Ev(val t: Long, val rate: Double, val start: Boolean)
        val events = ArrayList<Ev>(slices.size * 2)
        for ((a, b, count) in slices) {
            val dur = b - a
            if (dur <= 0L || count <= 0.0) continue
            val rate = count / dur.toDouble()
            events.add(Ev(a, rate, true))
            events.add(Ev(b, rate, false))
        }
        if (events.isEmpty()) return 0.0
        events.sortWith(compareBy<Ev>({ it.t }, { if (it.start) 1 else 0 }))
        val active = ArrayList<Double>()
        var total = 0.0
        var prev = events[0].t
        for (ev in events) {
            if (ev.t > prev && active.isNotEmpty()) {
                var max = 0.0
                for (rate in active) if (rate > max) max = rate
                total += (ev.t - prev).toDouble() * max
            }
            if (ev.start) active.add(ev.rate) else active.remove(ev.rate)
            prev = ev.t
        }
        return total
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
