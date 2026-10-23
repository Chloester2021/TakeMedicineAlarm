package expo.modules.calmalarm

import android.content.Context
import android.content.Intent

/** Main-thread service/activity state. Scoped broadcasts never leave this app. */
object AlarmSession {
  const val ACTION_ENDED = "expo.modules.calmalarm.SESSION_ENDED"
  var activeId: String? = null
    private set

  fun begin(id: String) { activeId = id }

  fun end(context: Context) {
    val id = activeId ?: return
    activeId = null
    context.sendBroadcast(Intent(ACTION_ENDED).setPackage(context.packageName).putExtra("id", id))
  }
}
