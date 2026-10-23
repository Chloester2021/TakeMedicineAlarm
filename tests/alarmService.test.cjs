const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadSource.cjs');

function service(os = 'android', nativeVersion = 2) {
  const calls = [];
  const states = [];
  const notifications = {
    setNotificationHandler() {}, SchedulableTriggerInputTypes: { WEEKLY: 'weekly', DATE: 'date' },
    scheduleNotificationAsync: async request => { calls.push(['notification', request]); return `new-${calls.length}`; },
    cancelScheduledNotificationAsync: async id => calls.push(['cancelExpo', id]),
  };
  const native = {
    hasNativeAlarm: () => true, nativeAlarmVersion: () => nativeVersion,
    requireCurrentNativeAlarm: () => { if (nativeVersion < 2) throw new Error('New APK required'); },
    scheduleManagedAlarm: async payload => { calls.push(['native', payload]); return Date.now() + 3600000; },
    cancelManagedAlarm: async id => calls.push(['cancelManaged', id]),
    cancelNativeAlarm: async id => calls.push(['cancelLegacy', id]),
    nativeAlarmStates: async () => states,
  };
  const api = load('src/services/alarms.js', {
    'react-native': { Platform: { OS: os } }, 'expo-notifications': notifications,
    '@react-native-async-storage/async-storage': {}, './nativeAlarm': native,
  });
  return { api, calls, states };
}
const alarm = { id: 'a', hour: 7, minute: 30, days: [0, 4], message: '{date}', enabled: true };
test('Android sends a durable weekday rule and raw tokens, not an eight-day batch', async () => {
  const { api, calls } = service();
  const saved = await api.scheduleAlarm(alarm);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'native');
  assert.deepEqual(calls[0][1].days, [0, 4]);
  assert.equal(calls[0][1].message, '{date}');
  assert.equal(saved.scheduler, 'managed');
});
test('old Android APK fails before cancelling any working alarm', async () => {
  const { api, calls } = service('android', 0);
  await assert.rejects(api.scheduleAlarm(alarm), /New APK/);
  assert.equal(calls.length, 0);
});
test('selected duration is saved and sent to the native scheduler', async () => {
  const { api, calls } = service('android', 3);
  const saved = await api.scheduleAlarm({ ...alarm, durationMinutes: 5 });
  assert.equal(saved.durationMinutes, 5);
  assert.equal(calls[0][1].durationMinutes, 5);
});
test('legacy alarms keep their one-minute default when rescheduled', async () => {
  const { api, calls } = service('android', 3);
  const saved = await api.scheduleAlarm(alarm);
  assert.equal(saved.durationMinutes, 1);
  assert.equal(calls[0][1].durationMinutes, 1);
});
test('custom volume including mute is persisted and sent to the native scheduler', async () => {
  for (const volumePercent of [0, 70, 100]) {
    const { api, calls } = service('android', 4);
    const saved = await api.scheduleAlarm({ ...alarm, volumePercent });
    assert.equal(saved.volumePercent, volumePercent);
    assert.equal(calls[0][1].volumePercent, volumePercent);
  }
});
test('existing alarms preserve system volume without an override', async () => {
  const { api, calls } = service('android', 4);
  const saved = await api.scheduleAlarm(alarm);
  assert.equal(saved.volumePercent, null);
  assert.equal(calls[0][1].volumePercent, null);
});
test('custom volume on an older APK fails before changing an existing schedule', async () => {
  const { api, calls } = service('android', 3);
  await assert.rejects(api.scheduleAlarm({ ...alarm, volumePercent: 70 }), /custom alarm volume/);
  assert.equal(calls.length, 0);
});
test('unsupported duration on an older APK fails before changing a working schedule', async () => {
  const { api, calls } = service('android', 2);
  await assert.rejects(api.scheduleAlarm({ ...alarm, durationMinutes: 5 }), /rebuilt Calm Alarm APK/);
  assert.equal(calls.length, 0);
});
test('restoring a native rule never reschedules a completed one-time alarm', async () => {
  const { api, calls, states } = service();
  states.push({ id: 'a', revision: 'r1', enabled: false, nextAt: 0 });
  const saved = { ...alarm, days: [], enabled: false, scheduler: 'managed', scheduleToken: 'r1' };
  assert.equal(await api.restoreAlarm(saved), saved);
  assert.equal(calls.length, 0);
});
test('disabling an alarm cancels its durable native schedule', async () => {
  const { api, calls } = service();
  const saved = await api.scheduleAlarm({ ...alarm, enabled: false, notificationIds: ['managed:a'] });
  assert.equal(saved.enabled, false);
  assert.deepEqual(calls, [['cancelManaged', 'a']]);
});
test('iOS weekday selection uses repeating weekly triggers with matching chime', async () => {
  const { api, calls } = service('ios');
  await api.scheduleAlarm(alarm);
  const requests = calls.filter(([name]) => name === 'notification').map(([, request]) => request);
  assert.deepEqual(requests.map(request => request.trigger.weekday), [2, 6]);
  assert.ok(requests.every(request => request.trigger.type === 'weekly' && request.content.sound === 'chime.wav'));
});
test('failed replacement leaves old notification IDs scheduled and removes partial new ones', async () => {
  const calls = [];
  const notifications = {
    setNotificationHandler() {}, SchedulableTriggerInputTypes: { WEEKLY: 'weekly', DATE: 'date' },
    scheduleNotificationAsync: async () => { if (calls.length) throw new Error('schedule failed'); calls.push(['new']); return 'partial'; },
    cancelScheduledNotificationAsync: async id => calls.push(['cancel', id]),
  };
  const isolated = load('src/services/alarms.js', { 'react-native': { Platform: { OS: 'ios' } },
    'expo-notifications': notifications, '@react-native-async-storage/async-storage': {}, './nativeAlarm': { nativeAlarmStates: async () => [] } });
  await assert.rejects(isolated.scheduleAlarm({ ...alarm, notificationIds: ['old'] }), /schedule failed/);
  assert.deepEqual(calls, [['new'], ['cancel', 'partial']]);
});
