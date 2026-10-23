package expo.modules.calmalarm

import android.content.Context
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager

object DefaultAlarmTone {
  private var preview: Ringtone? = null
  fun create(context: Context): Ringtone? = RingtoneManager.getRingtone(context,
    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))?.apply {
    audioAttributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
  }
  fun startPreview(context: Context) { stopPreview(); preview = create(context); preview?.play() }
  fun stopPreview() { preview?.stop(); preview = null }
}
