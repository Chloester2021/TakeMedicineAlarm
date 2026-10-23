package expo.modules.calmalarm

import android.app.*
import android.content.*
import android.os.*
import androidx.core.app.NotificationCompat

object AlarmCore {
  const val CHANNEL = "calm_alarm_urgent_v1"
  const val ACTION_FIRE = "expo.modules.calmalarm.FIRE"
  const val ACTION_STOP = "expo.modules.calmalarm.STOP"
  fun channel(ctx: Context) {
    val nm=ctx.getSystemService(NotificationManager::class.java)
    nm.createNotificationChannel(NotificationChannel(CHANNEL,"Calm Alarm ringing",NotificationManager.IMPORTANCE_HIGH).apply {
      description="Scheduled wake-up alarms"; lockscreenVisibility=Notification.VISIBILITY_PUBLIC
      setSound(null,null); enableVibration(true)
    })
  }
  fun intent(ctx:Context, action:String, id:String):PendingIntent {
    val i=Intent(ctx,AlarmReceiver::class.java).setAction(action).putExtra("id",id)
    return PendingIntent.getBroadcast(ctx,id.hashCode(),i,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }
  fun schedule(ctx:Context,id:String,time:Long,message:String,sound:String?) {
    val i=Intent(ctx,AlarmReceiver::class.java).setAction(ACTION_FIRE).putExtra("id",id).putExtra("message",message).putExtra("sound",sound).putExtra("displayTime",time)
    val pi=PendingIntent.getBroadcast(ctx,id.hashCode(),i,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val am=ctx.getSystemService(AlarmManager::class.java)
    if(Build.VERSION.SDK_INT>=31 && !am.canScheduleExactAlarms()) throw IllegalStateException("Exact alarm access is disabled. Enable Alarms & reminders in Android settings.")
    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,time,pi)
  }
  fun cancel(ctx:Context,id:String){ctx.getSystemService(AlarmManager::class.java).cancel(intent(ctx,ACTION_FIRE,id))}
}

class AlarmReceiver:android.content.BroadcastReceiver(){
 override fun onReceive(ctx:Context,i:Intent){
  if(i.action==AlarmCore.ACTION_STOP){
   if(i.getStringExtra("id")==AlarmSession.activeId)ctx.stopService(Intent(ctx,AlarmService::class.java));return
  }
  if(i.action!=AlarmCore.ACTION_FIRE)return
  val service=if(i.getBooleanExtra("managed",false)) AlarmStore.fire(ctx,i)?:return
    else Intent(ctx,AlarmService::class.java).putExtras(i.extras?:Bundle())
  try{androidx.core.content.ContextCompat.startForegroundService(ctx,service)}catch(e:Exception){android.util.Log.e("CalmAlarm","Could not start ringing service",e)}
 }
}

class AlarmService:Service() {
 private var playback:AlarmPlayback?=null
 private var message=""
 private var alarmId=""
 override fun onBind(i:Intent?)=null
 override fun onCreate(){super.onCreate();AlarmCore.channel(this)}
 override fun onStartCommand(i:Intent?,flags:Int,startId:Int):Int {
  if(i==null)return START_NOT_STICKY
  cleanup()
  alarmId=i.getStringExtra("id")?:"alarm";message=i.getStringExtra("message")?:"Time to wake up"
  AlarmSession.begin(alarmId)
  val durationMinutes=AlarmDuration.minutes(i.getIntExtra("durationMinutes",1))
  val volumePercent=if(i.hasExtra("volumePercent"))i.getIntExtra("volumePercent",0).coerceIn(0,100) else null
  val displayTime=i.getLongExtra("displayTime",System.currentTimeMillis())
  val open=Intent(this,AlarmActivity::class.java).putExtra("id",alarmId).putExtra("message",message).putExtra("displayTime",displayTime).putExtra("durationMinutes",durationMinutes).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
  val full=PendingIntent.getActivity(this,alarmId.hashCode(),open,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  val stop=PendingIntent.getBroadcast(this,(alarmId+"stop").hashCode(),Intent(this,AlarmReceiver::class.java).setAction(AlarmCore.ACTION_STOP).putExtra("id",alarmId),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  val cards=AlarmNotificationView.create(this,message,displayTime,stop,durationMinutes)
  val notification=NotificationCompat.Builder(this,AlarmCore.CHANNEL)
    .setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setContentTitle("Time to wake up")
    .setSubText("ALARM RINGING")
    .setContentText(message).setStyle(NotificationCompat.DecoratedCustomViewStyle())
    .setCustomContentView(cards.first).setCustomBigContentView(cards.second).setCustomHeadsUpContentView(cards.first)
    .setColor(android.graphics.Color.rgb(239,91,75))
    .setCategory(NotificationCompat.CATEGORY_ALARM).setPriority(NotificationCompat.PRIORITY_MAX)
    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC).setOngoing(true)
    .setContentIntent(full).setFullScreenIntent(full,true).build()
  if(Build.VERSION.SDK_INT>=29)startForeground(8127,notification,android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
  else startForeground(8127,notification)
  val next=AlarmPlayback(this){stopSelf()}
  playback=next
  try{next.start(message,durationMinutes,volumePercent)}
  catch(error:Exception){android.util.Log.e("CalmAlarm","Could not start alarm playback",error);stopSelf()}
  return START_NOT_STICKY
 }
 private fun cleanup(){playback?.stop();playback=null;AlarmSession.end(this)}
 override fun onDestroy(){cleanup();super.onDestroy()}
}

class AlarmActivity:Activity(){
 private var alarmId:String?=null
 private val ended=object:BroadcastReceiver(){
  override fun onReceive(context:Context,intent:Intent){
   if(intent.getStringExtra("id")==alarmId && AlarmSession.activeId!=alarmId)finish()
  }
 }
 override fun onCreate(state:Bundle?){super.onCreate(state)
  val filter=IntentFilter(AlarmSession.ACTION_ENDED)
  if(Build.VERSION.SDK_INT>=33)registerReceiver(ended,filter,Context.RECEIVER_NOT_EXPORTED)
  else registerReceiver(ended,filter)
  if(Build.VERSION.SDK_INT>=27){setShowWhenLocked(true);setTurnScreenOn(true)}
  else window.addFlags(android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
  window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  showAlarm()
 }
 override fun onNewIntent(next:Intent){super.onNewIntent(next);setIntent(next);showAlarm()}
 override fun onResume(){super.onResume();if(AlarmSession.activeId!=alarmId)finish()}
 private fun showAlarm(){
  alarmId=intent.getStringExtra("id")
  if(alarmId==null || AlarmSession.activeId!=alarmId){finish();return}
  setContentView(AlarmRingingView.create(this,intent.getStringExtra("message")?:"Time to wake up",intent.getLongExtra("displayTime",System.currentTimeMillis()),intent.getIntExtra("durationMinutes",1)) {
   if(AlarmSession.activeId==alarmId)stopService(Intent(this@AlarmActivity,AlarmService::class.java))
   finish()
  })
 }
 override fun onDestroy(){unregisterReceiver(ended);super.onDestroy()}
}
