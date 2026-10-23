package expo.modules.calmalarm

import java.util.Calendar
import java.util.TimeZone

/** Local calendar arithmetic, so weekly alarms survive daylight-saving changes. */
object AlarmSchedule {
  fun next(hour: Int, minute: Int, days: List<Int>, onceAt: Long, now: Long, zone: TimeZone = TimeZone.getDefault()): Long {
    require(hour in 0..23 && minute in 0..59 && days.all { it in 0..6 })
    if (days.isEmpty()) return if (onceAt > now) onceAt else 0L
    for (offset in 0..7) {
      val at = Calendar.getInstance(zone).apply {
        timeInMillis = now
        add(Calendar.DAY_OF_YEAR, offset)
        set(Calendar.HOUR_OF_DAY, hour)
        set(Calendar.MINUTE, minute)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
      }
      val weekday = (at.get(Calendar.DAY_OF_WEEK) + 5) % 7
      if (weekday in days && at.timeInMillis > now) return at.timeInMillis
    }
    error("No next weekday occurrence")
  }
}
