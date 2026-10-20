package expo.modules.calmalarm

import android.app.*
import android.content.*
import android.media.*
import android.net.Uri
import android.os.*
import android.provider.Settings
import android.speech.tts.TextToSpeech
import androidx.core.app.NotificationCompat
import java.util.Locale

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
    val i=Intent(ctx,AlarmReceiver::class.java).setAction(ACTION_FIRE).putExtra("id",id).putExtra("message",message).putExtra("sound",sound)
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
   ctx.stopService(Intent(ctx,AlarmService::class.java));return
  }
  if(i.action!=AlarmCore.ACTION_FIRE)return
  val service=Intent(ctx,AlarmService::class.java).putExtras(i.extras?:Bundle())
  try{androidx.core.content.ContextCompat.startForegroundService(ctx,service)}catch(e:Exception){android.util.Log.e("CalmAlarm","Could not start ringing service",e)}
 }
}

class AlarmService:Service(),TextToSpeech.OnInitListener {
 private val handler=Handler(Looper.getMainLooper())
 private var tts:TextToSpeech?=null
 private var ringtone:Ringtone?=null
 private var deadline=0L
 private var active=false
 private var message=""
 private var alarmId=""
 private var sound:String?=null
 private val stopRunnable=Runnable{stopSelf()}
 override fun onBind(i:Intent?)=null
 override fun onCreate(){super.onCreate();AlarmCore.channel(this)}
 override fun onStartCommand(i:Intent?,flags:Int,startId:Int):Int {
  if(i==null)return START_NOT_STICKY
  cleanup()
  alarmId=i.getStringExtra("id")?:"alarm";message=i.getStringExtra("message")?:"Time to wake up";sound=i.getStringExtra("sound")
  deadline=SystemClock.elapsedRealtime()+60000;active=true
  val open=Intent(this,AlarmActivity::class.java).putExtra("id",alarmId).putExtra("message",message).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
  val full=PendingIntent.getActivity(this,alarmId.hashCode(),open,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  val stop=PendingIntent.getBroadcast(this,(alarmId+"stop").hashCode(),Intent(this,AlarmReceiver::class.java).setAction(AlarmCore.ACTION_STOP).putExtra("id",alarmId),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  val notification=NotificationCompat.Builder(this,AlarmCore.CHANNEL)
    .setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setContentTitle("Calm Alarm")
    .setContentText(message).setCategory(NotificationCompat.CATEGORY_ALARM).setPriority(NotificationCompat.PRIORITY_MAX)
    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC).setOngoing(true)
    .setContentIntent(full).setFullScreenIntent(full,true).addAction(android.R.drawable.ic_media_pause,"Stop",stop).build()
  if(Build.VERSION.SDK_INT>=29)startForeground(8127,notification,android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
  else startForeground(8127,notification)
  handler.postDelayed(stopRunnable,60000)
  tts=TextToSpeech(this,this)
  return START_NOT_STICKY
 }
 override fun onInit(status:Int){if(status!=TextToSpeech.SUCCESS||!active)return
  tts?.language=Locale.getDefault()
  tts?.setOnUtteranceProgressListener(object:android.speech.tts.UtteranceProgressListener(){
   override fun onStart(id:String?){}
   override fun onDone(id:String?){handler.post{if(active)handler.postDelayed({cycle()},350)}}
   override fun onError(id:String?){handler.post{if(active)handler.postDelayed({cycle()},1000)}}
  })
  cycle()
 }
 private fun cycle(){
  if(!active||SystemClock.elapsedRealtime()>=deadline){stopSelf();return}
  try{
   val uri=if(!sound.isNullOrBlank())Uri.parse(sound) else RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
   ringtone=RingtoneManager.getRingtone(this,uri)
   ringtone?.play()
  }catch(e:Exception){android.util.Log.w("CalmAlarm","Tone playback failed",e)}
  handler.postDelayed({
   ringtone?.stop();ringtone=null
   if(!active||SystemClock.elapsedRealtime()>=deadline){stopSelf();return@postDelayed}
   tts?.speak(message,TextToSpeech.QUEUE_FLUSH,null,"calm-cycle")
  },2200)
 }
 private fun cleanup(){active=false;handler.removeCallbacksAndMessages(null);ringtone?.stop();ringtone=null;tts?.stop();tts?.shutdown();tts=null}
 override fun onDestroy(){cleanup();super.onDestroy()}
}

class AlarmActivity:Activity(){
 override fun onCreate(state:Bundle?){super.onCreate(state)
  if(Build.VERSION.SDK_INT>=27){setShowWhenLocked(true);setTurnScreenOn(true)}
  else window.addFlags(android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
  window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  val root=android.widget.LinearLayout(this).apply{orientation=1;gravity=android.view.Gravity.CENTER;setPadding(32,32,32,32);setBackgroundColor(android.graphics.Color.rgb(12,35,47))}
  val title=android.widget.TextView(this).apply{text="Calm Alarm";textSize=34f;setTextColor(-1);gravity=17}
  val body=android.widget.TextView(this).apply{text=intent.getStringExtra("message")?:"Time to wake up";textSize=24f;setTextColor(-1);gravity=17;setPadding(0,50,0,50)}
  val stop=android.widget.Button(this).apply{text="Stop alarm";setOnClickListener{stopService(Intent(this@AlarmActivity,AlarmService::class.java));finish()}}
  root.addView(title);root.addView(body);root.addView(stop);setContentView(root)
 }
}
