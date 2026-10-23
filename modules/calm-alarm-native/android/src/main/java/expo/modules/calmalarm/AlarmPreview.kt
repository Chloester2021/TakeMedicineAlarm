package expo.modules.calmalarm

import android.content.Context

object AlarmPreview {
  private var token: String? = null
  private var playback: AlarmPlayback? = null

  fun start(context: Context, session: String, message: String, durationMinutes: Int, volumePercent: Int?) {
    stopAll()
    val next = AlarmPlayback(context) { if (token == session) { playback = null; token = null } }
    token = session
    playback = next
    try { next.start(message, durationMinutes, volumePercent) }
    catch (error: Exception) { stop(session); throw error }
  }
  fun stop(session: String) { if (token == session) stopAll() }
  fun stopAll() { playback?.stop(); playback = null; token = null }
}
