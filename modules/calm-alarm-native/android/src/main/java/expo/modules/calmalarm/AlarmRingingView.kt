package expo.modules.calmalarm

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import java.util.Calendar

/** Native counterpart of RingingScreen.js; playback stays in AlarmService. */
object AlarmRingingView {
  private val dark = Color.rgb(23, 51, 70)
  private val mint = Color.rgb(156, 246, 227)
  private val coral = Color.rgb(239, 91, 75)

  fun timeLabel(time: Long): String {
    val date = Calendar.getInstance().apply { timeInMillis = time }
    val hour = date.get(Calendar.HOUR_OF_DAY)
    val minute = date.get(Calendar.MINUTE)
    return "${(hour % 12).let { if (it == 0) 12 else it }.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${if (hour >= 12) "PM" else "AM"}"
  }

  fun create(activity: Activity, message: String, time: Long, durationMinutes: Int = 1, onStop: () -> Unit): View {
    fun dp(value: Int) = (value * activity.resources.displayMetrics.density).toInt()
    val scroll = ScrollView(activity).apply {
      isFillViewport = true
      setBackgroundColor(dark)
      clipToPadding = false
    }
    val content = LinearLayout(activity).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setPadding(dp(30), dp(30), dp(30), dp(30))
    }
    scroll.addView(content, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))

    fun text(value: String, size: Float, color: Int, top: Int = 0, bottom: Int = 0, bold: Boolean = true): TextView {
      return TextView(activity).apply {
        this.text = value
        textSize = size
        setTextColor(color)
        gravity = Gravity.CENTER
        includeFontPadding = false
        if (bold) setTypeface(Typeface.DEFAULT, Typeface.BOLD)
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
          setMargins(0, dp(top), 0, dp(bottom))
        }
        content.addView(this)
      }
    }

    text("ALARM RINGING", 11f, Color.rgb(255, 167, 156)).letterSpacing = 0.136f
    text("Time to wake up", 19f, Color.WHITE, top = 12)
    text("Alarm", 26f, Color.WHITE, top = 26)
    text(timeLabel(time), 52f, mint, top = 8)
    text(message, 19f, Color.WHITE, top = 28, bottom = 28, bold = false).setLineSpacing(dp(8).toFloat(), 1f)
    content.addView(Button(activity).apply {
      this.text = "Stop"
      isAllCaps = false
      textSize = 13f
      setTypeface(Typeface.DEFAULT, Typeface.BOLD)
      setTextColor(Color.WHITE)
      minimumHeight = 0
      minHeight = 0
      setPadding(dp(20), dp(26), dp(20), dp(26))
      background = GradientDrawable().apply { setColor(coral); cornerRadius = dp(24).toFloat() }
      layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
      setOnClickListener { onStop() }
    })
    text(AlarmDuration.footer(durationMinutes), 12f, Color.rgb(166, 197, 210), top = 20, bold = false)

    ViewCompat.setOnApplyWindowInsetsListener(scroll) { view, insets ->
      val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
      view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
      insets
    }
    ViewCompat.requestApplyInsets(scroll)
    WindowCompat.getInsetsController(activity.window, scroll).apply {
      isAppearanceLightStatusBars = false
      isAppearanceLightNavigationBars = false
    }
    return scroll
  }
}
