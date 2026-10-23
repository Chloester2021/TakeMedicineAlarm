import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { tokenText } from '../utils/alarm';
import { normalizeDurationMinutes } from '../utils/alarmDuration';
import { normalizeVolumePercent } from '../utils/alarmVolume';
import { prepareSchedule, nextOccurrence, reconcileStates } from '../utils/alarmSchedule';
import { hasNativeAlarm, cancelNativeAlarm, requireCurrentNativeAlarm, nativeAlarmVersion,
  scheduleManagedAlarm, cancelManagedAlarm, nativeAlarmStates, restoreNativeAlarms } from './nativeAlarm';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner:true, shouldShowList:true, shouldPlaySound:true, shouldSetBadge:false }) });

async function cancelLegacyIds(alarm) {
  for (const id of alarm.notificationIds || []) {
    if (id.startsWith('managed:')) continue;
    if (Platform.OS === 'android' && hasNativeAlarm() && /-\d{4}-\d{2}-\d{2}$/.test(id)) await cancelNativeAlarm(id);
    else await Notifications.cancelScheduledNotificationAsync(id);
  }
}
export async function cancelIds(alarm) {
  if (Platform.OS === 'android' && nativeAlarmVersion() >= 2) await cancelManagedAlarm(alarm.id);
  await cancelLegacyIds(alarm);
}

export async function scheduleAlarm(input, options) {
  if (Platform.OS === 'android' && input.enabled) requireCurrentNativeAlarm();
  const alarm = prepareSchedule(input, options);
  alarm.durationMinutes = normalizeDurationMinutes(input.durationMinutes);
  alarm.volumePercent = normalizeVolumePercent(input.volumePercent);
  if (!alarm.enabled) {
    await cancelIds(alarm);
    return { ...alarm, notificationIds: [], nextTriggerAt: 0 };
  }
  if (Platform.OS === 'android') {
    if (alarm.volumePercent !== null && nativeAlarmVersion() < 4) {
      throw new Error('Install a rebuilt Calm Alarm APK to use custom alarm volume for tone and speech. Your current alarm schedule has been kept.');
    }
    if (alarm.durationMinutes > 1 && nativeAlarmVersion() < 3) {
      throw new Error('Install a rebuilt Calm Alarm APK to schedule alarms longer than 1 minute. Your current APK supports 1-minute alarms; Metro cannot update native playback.');
    }
    const scheduleToken = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const nextTriggerAt = await scheduleManagedAlarm({ id: alarm.id, hour: alarm.hour, minute: alarm.minute,
      days: alarm.days, onceAt: alarm.onceAt || 0, message: alarm.message || '', revision: scheduleToken,
      durationMinutes: alarm.durationMinutes, volumePercent: alarm.volumePercent });
    await cancelLegacyIds(alarm);
    return { ...alarm, scheduler: 'managed', scheduleToken, enabled: nextTriggerAt > 0,
      nextTriggerAt, notificationIds: [`managed:${alarm.id}`] };
  }
  const ids = [];
  const nextTriggerAt = alarm.days.length ? nextOccurrence(alarm) : alarm.onceAt;
  try {
    const triggers = alarm.days.length ? alarm.days.map(day => ({
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: (day + 1) % 7 + 1, hour: alarm.hour, minute: alarm.minute,
    })) : [{ type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(alarm.onceAt) }];
    for (const trigger of triggers) {
      ids.push(await Notifications.scheduleNotificationAsync({
        content: { title: 'Time to wake up', body: tokenText(alarm.message, new Date(nextTriggerAt)),
          sound: 'chime.wav', data: { alarmId: alarm.id } }, trigger,
      }));
    }
  } catch (error) {
    await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id)));
    throw error;
  }
  await cancelLegacyIds(alarm);
  return { ...alarm, scheduler: 'expo', nextTriggerAt, notificationIds: ids };
}

export async function syncAlarmStates(alarms) {
  return reconcileStates(alarms, await nativeAlarmStates());
}
export async function loadAlarms() {
  const saved = JSON.parse(await AsyncStorage.getItem('alarms') || '[]');
  if (Platform.OS === 'android') await restoreNativeAlarms();
  const dated = saved.map(alarm => ({ ...(alarm.days.length || alarm.onceAt ? alarm : prepareSchedule(alarm)),
    durationMinutes: normalizeDurationMinutes(alarm.durationMinutes), volumePercent: normalizeVolumePercent(alarm.volumePercent) }));
  return syncAlarmStates(dated);
}
export async function restoreAlarm(alarm) {
  if (Platform.OS === 'android' && alarm.scheduler === 'managed' && nativeAlarmVersion() >= 2) {
    const states = await nativeAlarmStates();
    if (states.some(state => state.id === alarm.id && state.revision === alarm.scheduleToken)) return alarm;
  }
  return scheduleAlarm(alarm);
}
export const storeAlarms = alarms => AsyncStorage.setItem('alarms', JSON.stringify(alarms));
