package expo.modules.calmalarm

import android.content.Context
import android.media.AudioManager
import android.util.Log

object AlarmVolumeManager {
  private var instance: AlarmVolumeController? = null

  @Synchronized private fun controller(context: Context): AlarmVolumeController {
    return instance ?: run {
      val audio = context.applicationContext.getSystemService(AudioManager::class.java)
      val prefs = context.applicationContext.getSharedPreferences("calm_alarm_volume_recovery", Context.MODE_PRIVATE)
      AlarmVolumeController(object : AlarmVolumeOutput {
        override fun current() = audio.getStreamVolume(AudioManager.STREAM_ALARM)
        override fun maximum() = audio.getStreamMaxVolume(AudioManager.STREAM_ALARM)
        override fun set(index: Int) {
          check(!audio.isVolumeFixed) { "This device does not support alarm volume changes" }
          audio.setStreamVolume(AudioManager.STREAM_ALARM, index.coerceIn(0, maximum()), 0)
        }
      }, object : AlarmVolumeRecovery {
        override fun read(): Int? = if (prefs.contains("original")) prefs.getInt("original", 0) else null
        override fun save(index: Int) { check(prefs.edit().putInt("original", index).commit()) { "Could not save original alarm volume" } }
        override fun clear() { check(prefs.edit().remove("original").commit()) { "Could not clear alarm volume recovery" } }
      }).also { instance = it }
    }
  }

  fun begin(context: Context, owner: String, percent: Int?) = controller(context).acquire(owner, percent)
  fun end(context: Context, owner: String) {
    try { controller(context).release(owner) }
    catch (error: Exception) { Log.e("CalmAlarm", "Could not restore alarm volume; recovery retained", error) }
  }
  fun recover(context: Context) {
    try { controller(context).recover() }
    catch (error: Exception) { Log.e("CalmAlarm", "Could not recover previous alarm volume", error) }
  }
}
