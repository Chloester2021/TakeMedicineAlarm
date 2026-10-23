import { Alert, AppState, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { hasNativeAlarm, canScheduleExact, openExactSettings } from './nativeAlarm';

function confirmSettings(title, message) {
  return new Promise(resolve => Alert.alert(title, message, [
    { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
    { text: 'Open settings', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}

// Register before launching Settings so a quick round trip cannot be missed.
function visitSettings(open) {
  return new Promise((resolve, reject) => {
    let leftApp = false;
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') leftApp = true;
      else if (leftApp) { subscription.remove(); resolve(); }
    });
    Promise.resolve().then(open).catch(error => { subscription.remove(); reject(error); });
  });
}

async function requestPermissions() {
  if (Platform.OS === 'android') {
    // Android needs a channel before it can show the notification permission prompt.
    await Notifications.setNotificationChannelAsync('calm_alarm_urgent_v1', {
      name: 'Calm Alarm ringing', importance: Notifications.AndroidImportance.HIGH,
      sound: null, vibrationPattern: [0, 250, 250, 250],
    });
  }
  let notifications = await Notifications.getPermissionsAsync();
  if (!notifications.granted && notifications.canAskAgain) {
    notifications = await Notifications.requestPermissionsAsync();
  }
  if (!notifications.granted) {
    if (!await confirmSettings('Allow alarm notifications',
      'Calm Alarm needs notifications to show your ringing alarm and Stop button. Enable notifications for Calm Alarm in settings, then return to the app.')) return false;
    await visitSettings(() => Linking.openSettings());
    if (!(await Notifications.getPermissionsAsync()).granted) return false;
  }
  if (Platform.OS === 'android' && hasNativeAlarm() && !canScheduleExact()) {
    if (!await confirmSettings('Allow alarms & reminders',
      'Calm Alarm needs permission to ring at the time you choose. On the next screen, enable Alarms & reminders for Calm Alarm, then return to the app.')) return false;
    await visitSettings(openExactSettings);
    if (!canScheduleExact()) return false;
  }
  return true;
}

let pending;
export function ensureAlarmPermissions() {
  if (!pending) pending = requestPermissions().finally(() => { pending = null; });
  return pending;
}
