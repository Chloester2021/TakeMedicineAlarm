package expo.modules.calmalarm

object AlarmDuration {
  fun minutes(value: Int = 1): Int = value.coerceIn(1, 5)
  fun milliseconds(value: Int = 1): Long = minutes(value) * 60000L
  fun footer(value: Int = 1): String {
    val duration = minutes(value)
    return "Automatically stops after $duration minute${if (duration == 1) "" else "s"}"
  }
}
