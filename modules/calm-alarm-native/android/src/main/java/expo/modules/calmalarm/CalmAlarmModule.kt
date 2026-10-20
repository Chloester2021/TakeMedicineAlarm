package expo.modules.calmalarm

import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CalmAlarmModule:Module(){
 override fun definition()=ModuleDefinition{
  Name("CalmAlarmNative")
  AsyncFunction("schedule"){id:String,time:Double,message:String,sound:String?->
   AlarmCore.channel(requireNotNull(appContext.reactContext));AlarmCore.schedule(requireNotNull(appContext.reactContext),id,time.toLong(),message,sound)
  }
  AsyncFunction("cancel"){id:String->AlarmCore.cancel(requireNotNull(appContext.reactContext),id)}
  Function("canScheduleExact"){val c=requireNotNull(appContext.reactContext);Build.VERSION.SDK_INT<31||c.getSystemService(AlarmManager::class.java).canScheduleExactAlarms()}
  Function("canUseFullScreen"){val c=requireNotNull(appContext.reactContext);Build.VERSION.SDK_INT<34||c.getSystemService(NotificationManager::class.java).canUseFullScreenIntent()}
  Function("openExactSettings"){
   val c=requireNotNull(appContext.reactContext);if(Build.VERSION.SDK_INT>=31)c.startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
  }
  Function("openFullScreenSettings"){
   val c=requireNotNull(appContext.reactContext);if(Build.VERSION.SDK_INT>=34)c.startActivity(Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).setData(android.net.Uri.parse("package:"+c.packageName)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
  }
  AsyncFunction("systemAlarmSound"){RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)?.toString()?:""}
 }
}
