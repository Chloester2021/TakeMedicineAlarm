const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadSource.cjs');

function harness({ granted = true, canAskAgain = true, exact = true, accept = true, grantOnReturn = true } = {}) {
  const calls = [];
  let listener, removed = 0;
  const returnFromSettings = () => {
    listener('background');
    if (grantOnReturn) { granted = true; exact = true; }
    listener('active');
  };
  const api = load('src/services/alarmPermissions.js', {
    'react-native': {
      Platform: { OS: 'android' },
      Alert: { alert: (title, message, buttons) => { calls.push(title); buttons[accept ? 1 : 0].onPress(); } },
      AppState: { addEventListener: (_, fn) => { listener = fn; return { remove: () => removed++ }; } },
      Linking: { openSettings: () => { calls.push('notificationSettings'); returnFromSettings(); } },
    },
    'expo-notifications': {
      AndroidImportance: { HIGH: 4 },
      setNotificationChannelAsync: async () => calls.push('channel'),
      getPermissionsAsync: async () => ({ granted, canAskAgain }),
      requestPermissionsAsync: async () => { calls.push('request'); granted = true; return { granted }; },
    },
    './nativeAlarm': {
      hasNativeAlarm: () => true, canScheduleExact: () => exact,
      openExactSettings: () => { calls.push('exactSettings'); returnFromSettings(); },
    },
  });
  return { api, calls, removed: () => removed };
}

test('fresh install creates a channel, requests notifications and completes exact alarm setup', async () => {
  const h = harness({ granted: false, exact: false });
  assert.equal(await h.api.ensureAlarmPermissions(), true);
  assert.deepEqual(h.calls, ['channel', 'request', 'Allow alarms & reminders', 'exactSettings']);
  assert.equal(h.removed(), 1);
});

test('previously denied notifications open app settings and recheck on return', async () => {
  const h = harness({ granted: false, canAskAgain: false });
  assert.equal(await h.api.ensureAlarmPermissions(), true);
  assert.deepEqual(h.calls, ['channel', 'Allow alarm notifications', 'notificationSettings']);
  assert.equal(h.removed(), 1);
});

test('declining exact alarm setup returns false without opening settings', async () => {
  const h = harness({ exact: false, accept: false });
  assert.equal(await h.api.ensureAlarmPermissions(), false);
  assert.ok(!h.calls.includes('exactSettings'));
});

test('returning without granting exact alarm access does not report success', async () => {
  const h = harness({ exact: false, grantOnReturn: false });
  assert.equal(await h.api.ensureAlarmPermissions(), false);
  assert.equal(h.removed(), 1);
});

test('simultaneous requests share one setup flow; later attempts recheck permission', async () => {
  const h = harness({ exact: false });
  const first = h.api.ensureAlarmPermissions();
  assert.equal(h.api.ensureAlarmPermissions(), first);
  assert.equal(await first, true);
  assert.equal(await h.api.ensureAlarmPermissions(), true);
  assert.equal(h.calls.filter(call => call === 'exactSettings').length, 1);
});
