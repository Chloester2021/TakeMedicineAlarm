import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { tokenText } from '../utils/alarm';
import { hasNativeAlarm, scheduleNativeAlarm, cancelNativeAlarm } from './nativeAlarm';
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner:true, shouldShowList:true, shouldPlaySound:true, shouldSetBadge:false }) });
const nativeAndroid = () => Platform.OS === 'android' && hasNativeAlarm();
export async function cancelIds(alarm){
 for(const id of alarm.notificationIds || []){
  if(nativeAndroid()) await cancelNativeAlarm(id);
  else try { await Notifications.cancelScheduledNotificationAsync(id); } catch(e){ console.warn('Cancel notification failed',e); }
 }
}
export async function scheduleAlarm(alarm){
 await cancelIds(alarm);
 if(!alarm.enabled) return {...alarm,notificationIds:[]};
 const ids=[];const now=new Date();
 for(let d=0;d<8;d++){
  const at=new Date(now);at.setDate(now.getDate()+d);at.setHours(alarm.hour,alarm.minute,0,0);
  if(at<=now)continue;
  if(alarm.days.length && !alarm.days.includes((at.getDay()+6)%7))continue;
  const id=String(alarm.id)+'-'+at.toISOString().slice(0,10);
  const message=tokenText(alarm.message,at);
  if(nativeAndroid()) await scheduleNativeAlarm(id,at,message,alarm.soundUri);
  else {const nid=await Notifications.scheduleNotificationAsync({content:{title:'Alarm ringing',body:message,sound:'default',data:{alarmId:alarm.id}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:at}});ids.push(nid);}
  if(nativeAndroid()) ids.push(id);
  if(!alarm.days.length)break;
 }
 return {...alarm,notificationIds:ids};
}
export const loadAlarms=async()=>JSON.parse(await AsyncStorage.getItem('alarms')||'[]');
export const storeAlarms=async alarms=>AsyncStorage.setItem('alarms',JSON.stringify(alarms));
