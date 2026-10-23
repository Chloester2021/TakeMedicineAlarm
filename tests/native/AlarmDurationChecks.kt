package calmalarm.checks.duration

import expo.modules.calmalarm.AlarmDuration

fun main() {
  check(AlarmDuration.milliseconds() == 60000L)
  for (minutes in 1..5) {
    check(AlarmDuration.milliseconds(minutes) == minutes * 60000L)
    check(AlarmDuration.footer(minutes).contains("$minutes minute"))
  }
  check(AlarmDuration.milliseconds(0) == 60000L)
  check(AlarmDuration.milliseconds(100) == 300000L)
  println("PASS: native alarm duration defaults to 1 minute and supports 1–5 minute deadlines")
}
