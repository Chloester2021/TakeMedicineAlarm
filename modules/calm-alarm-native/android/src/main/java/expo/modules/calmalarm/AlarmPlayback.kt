package expo.modules.calmalarm

import android.content.Context
import android.media.AudioAttributes
import android.media.Ringtone
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import java.util.Locale
import java.util.UUID

/** Shared by Android preview and scheduled ringing. All lifecycle calls use the main queue. */
class AlarmPlayback(context: Context, private val onFinished: () -> Unit) {
  private val context = context.applicationContext
  private val handler = Handler(Looper.getMainLooper())
  private val owner = UUID.randomUUID().toString()
  private var active = false
  private var speechReady = false
  private var deadline = 0L
  private var message = ""
  private var tone: Ringtone? = null
  private var tts: TextToSpeech? = null

  fun start(message: String, durationMinutes: Int, volumePercent: Int?) {
    check(!active)
    active = true
    this.message = message
    val duration = AlarmDuration.milliseconds(durationMinutes)
    deadline = SystemClock.elapsedRealtime() + duration
    try {
      AlarmVolumeManager.begin(context, owner, volumePercent)
      handler.postDelayed({ finish() }, duration)
      try { tts = TextToSpeech(context) { status -> handler.post { initializeSpeech(status) } } }
      catch (error: Exception) { Log.w("CalmAlarm", "Speech unavailable; continuing alarm tone", error) }
      cycle()
    } catch (error: Exception) {
      stop()
      throw error
    }
  }

  private fun initializeSpeech(status: Int) {
    if (!active || status != TextToSpeech.SUCCESS) return
    val engine = tts ?: return
    try {
      engine.setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
      val language = engine.setLanguage(Locale.getDefault())
      speechReady = language != TextToSpeech.LANG_MISSING_DATA && language != TextToSpeech.LANG_NOT_SUPPORTED
      engine.setSpeechRate(0.9f)
      engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
        override fun onStart(id: String?) {}
        override fun onDone(id: String?) { handler.post { if (active) handler.postDelayed({ cycle() }, 350) } }
        override fun onError(id: String?) { handler.post { if (active) handler.postDelayed({ cycle() }, 1000) } }
      })
    } catch (error: Exception) { speechReady = false; Log.w("CalmAlarm", "Could not initialize alarm speech", error) }
  }

  private fun cycle() {
    if (!active) return
    if (SystemClock.elapsedRealtime() >= deadline) { finish(); return }
    try { tone = DefaultAlarmTone.create(context); tone?.play() }
    catch (error: Exception) { Log.w("CalmAlarm", "Alarm tone failed", error) }
    handler.postDelayed({
      stopTone()
      if (!active) return@postDelayed
      if (SystemClock.elapsedRealtime() >= deadline) { finish(); return@postDelayed }
      val result = try { if (speechReady) tts?.speak(message, TextToSpeech.QUEUE_FLUSH,
        Bundle().apply { putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1f) }, owner) else TextToSpeech.ERROR }
      catch (error: Exception) { Log.w("CalmAlarm", "Alarm speech failed", error); TextToSpeech.ERROR }
      if (result != TextToSpeech.SUCCESS) handler.postDelayed({ cycle() }, 350)
    }, 2200)
  }

  private fun stopTone() {
    try { tone?.stop() } catch (error: Exception) { Log.w("CalmAlarm", "Tone cleanup failed", error) }
    tone = null
  }

  fun stop() {
    active = false
    speechReady = false
    handler.removeCallbacksAndMessages(null)
    stopTone()
    try { tts?.stop() }
    catch (error: Exception) { Log.w("CalmAlarm", "Speech stop failed", error) }
    try { tts?.shutdown() }
    catch (error: Exception) { Log.w("CalmAlarm", "Speech cleanup failed", error) }
    finally { tts = null; AlarmVolumeManager.end(context, owner) }
  }

  private fun finish() {
    if (!active) return
    stop()
    onFinished()
  }
}
