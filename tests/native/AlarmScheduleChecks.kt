import expo.modules.calmalarm.AlarmSchedule
import java.util.Calendar
import java.util.TimeZone

fun main() {
  val zone = TimeZone.getTimeZone("America/Vancouver")
  fun at(year: Int, month: Int, day: Int, hour: Int, minute: Int = 0) = Calendar.getInstance(zone).apply {
    clear(); set(year, month - 1, day, hour, minute)
  }.timeInMillis
  fun local(time: Long) = Calendar.getInstance(zone).apply { timeInMillis = time }
  val once = at(2026, 10, 20, 7)
  check(AlarmSchedule.next(7, 0, emptyList(), once, at(2026, 10, 20, 6), zone) == once)
  check(AlarmSchedule.next(7, 0, emptyList(), once, once, zone) == 0L)
  check(AlarmSchedule.next(7, 0, emptyList(), once, at(2026, 10, 21, 6), zone) == 0L)
  println("PASS: one-time occurrence cannot rearm after firing")

  var time = at(2026, 10, 19, 8)
  repeat(104) {
    val next = AlarmSchedule.next(7, 30, listOf(0, 4), 0, time, zone)
    check(next > time)
    val date = local(next)
    check((date.get(Calendar.DAY_OF_WEEK) + 5) % 7 in listOf(0, 4))
    check(date.get(Calendar.HOUR_OF_DAY) == 7 && date.get(Calendar.MINUTE) == 30)
    time = next
  }
  check(time > at(2027, 10, 1, 0))
  println("PASS: 104 weekday occurrences continue for a full year")

  check(AlarmSchedule.next(7, 0, listOf(0), 0, at(2026, 10, 19, 7), zone) == at(2026, 10, 26, 7))
  println("PASS: same weekday after trigger advances to next week")
  val sunday = AlarmSchedule.next(7, 0, listOf(6), 0, at(2026, 10, 31, 8), zone)
  check(sunday == at(2026, 11, 1, 7))
  val following = AlarmSchedule.next(7, 0, listOf(6), 0, sunday, zone)
  check(following == at(2026, 11, 8, 7))
  println("PASS: local alarm time survives daylight-saving transition")

  check(runCatching { AlarmSchedule.next(25, 0, listOf(0), 0, time, zone) }.isFailure)
  println("PASS: invalid times are rejected")
}
