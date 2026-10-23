package expo.modules.calmalarm

import kotlin.math.roundToInt

interface AlarmVolumeOutput {
  fun current(): Int
  fun maximum(): Int
  fun set(index: Int)
}

interface AlarmVolumeRecovery {
  fun read(): Int?
  fun save(index: Int)
  fun clear()
}

/** Owns only STREAM_ALARM; nested sessions must never capture an overridden baseline. */
class AlarmVolumeController(private val output: AlarmVolumeOutput, private val recovery: AlarmVolumeRecovery) {
  private val sessions = linkedMapOf<String, Int?>()
  private var original: Int? = null

  @Synchronized fun acquire(owner: String, percent: Int?) {
    require(owner !in sessions)
    if (sessions.isEmpty()) recover()
    if (percent != null && original == null) {
      val baseline = output.current()
      recovery.save(baseline) // Durable before changing the device's volume.
      original = baseline
    }
    sessions[owner] = percent?.coerceIn(0, 100)
    try { applyCurrent() }
    catch (failure: Exception) {
      sessions.remove(owner)
      try { applyCurrent() } catch (cleanup: Exception) { failure.addSuppressed(cleanup) }
      throw failure
    }
  }

  @Synchronized fun release(owner: String) {
    if (owner !in sessions) { if (sessions.isEmpty()) recover(); return }
    sessions.remove(owner)
    applyCurrent()
  }

  @Synchronized fun recover() {
    if (sessions.isNotEmpty()) return
    original = original ?: recovery.read()
    restore()
  }

  private fun applyCurrent() {
    if (sessions.values.none { it != null }) {
      restore()
      return
    }
    val selected = sessions.values.last()
    val target = if (selected == null) original else {
      val maximum = output.maximum()
      val scaled = (selected / 100.0 * maximum).roundToInt()
      // Only an explicit 0% should round down to mute on devices with few steps.
      if (selected > 0 && maximum > 0) scaled.coerceAtLeast(1) else scaled
    }
    if (target != null) output.set(target)
  }

  private fun restore() {
    original?.let {
      output.set(it)
      recovery.clear()
      original = null
    }
  }
}
