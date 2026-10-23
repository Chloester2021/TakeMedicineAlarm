package expo.modules.calmalarm

import android.app.PendingIntent
import android.content.Context
import android.widget.RemoteViews

/** Preview colors and content inside Android's mandatory notification frame. */
object AlarmNotificationView {
  fun create(context: Context, message: String, time: Long, stop: PendingIntent, durationMinutes: Int = 1): Pair<RemoteViews, RemoteViews> {
    val compact = RemoteViews(context.packageName, R.layout.calm_alarm_notification_compact).apply {
      setTextViewText(R.id.alarm_time, AlarmRingingView.timeLabel(time))
      setTextViewText(R.id.alarm_message, message)
      setOnClickPendingIntent(R.id.alarm_stop, stop)
    }
    val expanded = RemoteViews(context.packageName, R.layout.calm_alarm_notification_expanded).apply {
      setTextViewText(R.id.alarm_duration, AlarmDuration.footer(durationMinutes))
      setTextViewText(R.id.alarm_time, AlarmRingingView.timeLabel(time))
      setTextViewText(R.id.alarm_message, message)
      setOnClickPendingIntent(R.id.alarm_stop, stop)
    }
    return Pair(compact, expanded)
  }
}
