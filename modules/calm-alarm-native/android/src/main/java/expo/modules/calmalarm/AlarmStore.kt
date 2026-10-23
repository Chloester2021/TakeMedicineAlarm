package expo.modules.calmalarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.text.DateFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Native storage is authoritative for firing/completion while JavaScript sleeps. */
object AlarmStore {
  private fun prefs(ctx: Context) = ctx.getSharedPreferences("calm_alarm_schedules_v2", Context.MODE_PRIVATE)
  private fun days(record: JSONObject) = record.getJSONArray("days").let { a -> (0 until a.length()).map { a.getInt(it) } }
  private fun next(record: JSONObject, now: Long) = AlarmSchedule.next(record.getInt("hour"), record.getInt("minute"), days(record), record.optLong("onceAt"), now)
  private fun manager(ctx: Context) = ctx.getSystemService(AlarmManager::class.java)
  private fun pending(ctx: Context, record: JSONObject): PendingIntent {
    val id = record.getString("id")
    val intent = Intent(ctx, AlarmReceiver::class.java).setAction(AlarmCore.ACTION_FIRE)
      .setData(Uri.parse("calmalarm://scheduled/${Uri.encode(id)}"))
      .putExtra("id", id).putExtra("managed", true)
      .putExtra("revision", record.getString("revision")).putExtra("scheduledAt", record.optLong("nextAt"))
    return PendingIntent.getBroadcast(ctx, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }
  private fun save(ctx: Context, record: JSONObject) {
    check(prefs(ctx).edit().putString(record.getString("id"), record.toString()).commit()) { "Could not save alarm state" }
  }
  private fun arm(ctx: Context, record: JSONObject) {
    val alarms = manager(ctx)
    check(Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()) { "Enable Alarms & reminders in Android settings." }
    alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, record.getLong("nextAt"), pending(ctx, record))
  }

  @Synchronized fun schedule(ctx: Context, payload: String): Double {
    val record = JSONObject(payload)
    record.put("durationMinutes", AlarmDuration.minutes(record.optInt("durationMinutes", 1)))
    record.put("volumePercent", if (record.has("volumePercent") && !record.isNull("volumePercent"))
      record.getInt("volumePercent").coerceIn(0, 100) else JSONObject.NULL)
    val at = next(record, System.currentTimeMillis())
    record.put("nextAt", at).put("enabled", at > 0)
    if (at > 0) arm(ctx, record) else manager(ctx).cancel(pending(ctx, record))
    save(ctx, record)
    return at.toDouble()
  }

  @Synchronized fun cancel(ctx: Context, id: String) {
    prefs(ctx).getString(id, null)?.let { manager(ctx).cancel(pending(ctx, JSONObject(it))) }
    check(prefs(ctx).edit().remove(id).commit()) { "Could not remove alarm schedule" }
  }

  @Synchronized fun states(ctx: Context): String = JSONArray().apply {
    prefs(ctx).all.values.forEach { value -> if (value is String) put(JSONObject(value)) }
  }.toString()

  /** Save completion / queue the next weekday before starting the ringing service. */
  @Synchronized fun fire(ctx: Context, intent: Intent): Intent? {
    val id = intent.getStringExtra("id") ?: return null
    val record = prefs(ctx).getString(id, null)?.let { JSONObject(it) } ?: return null
    val firedAt = record.optLong("nextAt")
    if (!record.optBoolean("enabled") || record.getString("revision") != intent.getStringExtra("revision") ||
      firedAt != intent.getLongExtra("scheduledAt", 0)) return null
    val nextAt = if (days(record).isEmpty()) 0L else next(record, maxOf(firedAt, System.currentTimeMillis()))
    record.put("enabled", nextAt > 0).put("nextAt", nextAt).put("lastFiredAt", firedAt)
    save(ctx, record)
    if (nextAt > 0) {
      try { arm(ctx, record) } catch (error: Exception) { android.util.Log.e("CalmAlarm", "Could not queue next occurrence", error) }
    }
    val date = Date(firedAt)
    val locale = Locale.getDefault()
    val message = record.optString("message").ifBlank { "Time to wake up" }
      .replace(Regex("(\\{(?:day|date|time)\\})(?=\\{(?:day|date|time)\\})"), "$1 ")
      .replace("{day}", SimpleDateFormat("EEEE", locale).format(date))
      .replace("{date}", DateFormat.getDateInstance(DateFormat.LONG, locale).format(date))
      .replace("{time}", DateFormat.getTimeInstance(DateFormat.SHORT, locale).format(date))
    return Intent(ctx, AlarmService::class.java).putExtra("id", id).putExtra("message", message).putExtra("displayTime", firedAt)
      .putExtra("durationMinutes", AlarmDuration.minutes(record.optInt("durationMinutes", 1)))
      .apply { if (record.has("volumePercent") && !record.isNull("volumePercent")) putExtra("volumePercent", record.getInt("volumePercent")) }
  }

  @Synchronized fun restore(ctx: Context) {
    AlarmVolumeManager.recover(ctx)
    prefs(ctx).all.values.filterIsInstance<String>().forEach { value ->
      try {
        val record = JSONObject(value)
        if (record.optBoolean("enabled")) {
          val at = next(record, System.currentTimeMillis())
          record.put("nextAt", at).put("enabled", at > 0)
          save(ctx, record)
          if (at > 0) arm(ctx, record)
        }
      } catch (error: Exception) { android.util.Log.e("CalmAlarm", "Could not restore alarm", error) }
    }
  }
}
