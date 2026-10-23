package calmalarm.checks.volume

import expo.modules.calmalarm.AlarmVolumeController
import expo.modules.calmalarm.AlarmVolumeOutput
import expo.modules.calmalarm.AlarmVolumeRecovery

private class Output : AlarmVolumeOutput {
  var level = 3
  var writes = 0
  var failNext = false
  override fun current() = level
  override fun maximum() = 7
  override fun set(index: Int) {
    if (failNext) { failNext = false; error("Volume unavailable") }
    level = index; writes++
  }
}
private class Recovery : AlarmVolumeRecovery {
  var saved: Int? = null
  var failSave = false
  override fun read() = saved
  override fun save(index: Int) { if (failSave) error("Storage unavailable"); saved = index }
  override fun clear() { saved = null }
}

fun main() {
  val output = Output()
  val recovery = Recovery()
  val volume = AlarmVolumeController(output, recovery)
  volume.acquire("alarm", 70)
  check(output.level == 5 && recovery.saved == 3)
  volume.release("alarm")
  check(output.level == 3 && recovery.saved == null)
  val writes = output.writes
  volume.release("alarm")
  check(output.writes == writes)
  println("PASS: selected level applies and Stop/timeout cleanup restores once")

  volume.acquire("muted", 0); check(output.level == 0); volume.release("muted"); check(output.level == 3)
  volume.acquire("max", 100); check(output.level == 7); volume.release("max"); check(output.level == 3)
  volume.acquire("quiet", 5); check(output.level == 1); volume.release("quiet"); check(output.level == 3)
  println("PASS: 0% mute and 100% maximum restore the previous level")

  val defaultWrites = output.writes
  volume.acquire("default", null); volume.release("default")
  check(output.writes == defaultWrites && recovery.saved == null)
  println("PASS: system-default alarms never change the phone volume")

  volume.acquire("scheduled", 80)
  volume.acquire("preview", 30)
  check(output.level == 2 && recovery.saved == 3)
  volume.release("scheduled")
  check(output.level == 2 && recovery.saved == 3)
  volume.release("preview")
  check(output.level == 3 && recovery.saved == null)
  println("PASS: overlapping alarm and preview preserve the original baseline")

  volume.acquire("custom", 80)
  volume.acquire("system", null)
  check(output.level == 3)
  volume.release("system"); check(output.level == 6)
  volume.recover(); check(output.level == 6)
  volume.release("custom"); check(output.level == 3)
  println("PASS: nested system-volume session and module initialization do not lose restoration state")

  output.failNext = true
  check(runCatching { volume.acquire("failed", 100) }.isFailure)
  check(output.level == 3 && recovery.saved == null)
  println("PASS: failed volume adjustment rolls back and restores")

  volume.acquire("interrupted", 100)
  output.failNext = true
  check(runCatching { volume.release("interrupted") }.isFailure)
  check(recovery.saved == 3)
  val recovered = AlarmVolumeController(output, recovery)
  recovered.recover()
  check(output.level == 3 && recovery.saved == null)
  println("PASS: failed cleanup / process interruption retains durable recovery for the next launch")

  recovery.failSave = true
  val beforeFailure = output.writes
  check(runCatching { recovered.acquire("disk-failure", 100) }.isFailure)
  check(output.writes == beforeFailure && output.level == 3)
  println("PASS: storage failure never changes the phone volume")
}
