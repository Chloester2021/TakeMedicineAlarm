const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadSource.cjs');

function harness(screen, alarms, draft, permissionsReady = true) {
  const states = [screen, alarms, '', draft], calls = [], refs = [];
  let index = 0, refIndex = 0;
  const react = { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: initial => { const i = index++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial;
      return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef: initial => { const i = refIndex++; return refs[i] ||= { current: i === 0 ? alarms : initial }; },
    useEffect() {}, useCallback: fn => fn };
  const App = load('App.js', {
    react, 'react-native': { View: 'View', Text: 'Text', StatusBar: 'StatusBar', Keyboard: { dismiss() {} },
      Alert: { alert: (...args) => calls.push(['alert', ...args]) } },
    'expo-secure-store': {}, 'expo-notifications': {},
    './src/screens/HomeScreen': 'Home', './src/screens/AlarmEditor': 'Editor',
    './src/screens/RingingScreen': 'Ringing', './src/screens/PasswordScreen': 'Password',
    './src/components/AlarmConflictDialog': 'Conflict', './src/styles/styles': {},
    './src/hooks/useRinging': { useRinging: () => ({}) }, './src/hooks/useAlarmStateSync': { useAlarmStateSync() {} },
    './src/services/alarmPermissions': { ensureAlarmPermissions: async () => permissionsReady },
    './src/services/alarms': {
      scheduleAlarm: async (alarm, options) => { calls.push(['schedule', alarm, options]); return alarm; },
      storeAlarms: async alarms => calls.push(['store', alarms]),
    },
  }).default;
  const render = () => { index = 0; refIndex = 0; return App(); };
  const find = (node, type) => node?.type === type ? node.props : node?.props?.children?.flat().map(child => find(child, type)).find(Boolean);
  return { states, calls, component: type => find(render(), type) };
}
const alarm = (id, enabled = true, days = [0]) => ({ id, enabled, days, hour: 7, minute: 0, message: '' });

test('declining permissions preserves the draft and does not schedule or persist', async () => {
  const draft = alarm('draft', false);
  const h = harness('edit', [], draft, false);
  await h.component('Editor').onSave();
  assert.deepEqual(h.calls, []);
  assert.equal(h.states[0], 'edit');
  assert.equal(h.states[3], draft);
});

test('missing permissions block enabling but still allow disabling', async () => {
  const off = alarm('off', false), on = alarm('on', true, [1]);
  const h = harness('home', [off, on], {}, false);
  await h.component('Home').onToggle(off);
  assert.deepEqual(h.calls, []);
  await h.component('Home').onToggle(on);
  assert.equal(h.calls[0][1].enabled, false);
});

test('saving an inactive alarm explicitly enables and rearms it', async () => {
  const old = alarm('old', false);
  const h = harness('edit', [old], old);
  await h.component('Editor').onSave();
  assert.equal(h.calls[0][0], 'schedule');
  assert.equal(h.calls[0][1].enabled, true);
  assert.equal(h.calls[0][2].resetOneTime, true);
  assert.equal(h.states[1][0].enabled, true);
  assert.equal(h.states[0], 'home');
});

test('conflicting save shows the styled dialog without changing schedules or losing the draft', async () => {
  const draft = alarm('edited', false);
  const h = harness('edit', [draft, alarm('existing')], draft);
  await h.component('Editor').onSave();
  assert.equal(h.calls.length, 0);
  assert.match(h.component('Conflict').message, /already set.*overlapping day/);
  assert.equal(h.states[0], 'edit');
  assert.equal(h.states[3], draft);
  h.component('Conflict').onClose();
  assert.equal(h.states[2], '');
});

test('enabling a duplicate is blocked; disabling and different weekdays remain allowed', async () => {
  const off = alarm('off', false), on = alarm('on');
  const h = harness('home', [off, on], {});
  await h.component('Home').onToggle(off);
  assert.equal(h.calls.length, 0);
  await h.component('Home').onToggle(on);
  assert.equal(h.calls[0][1].enabled, false);
  const different = alarm('different', false, [1]);
  const allowed = harness('home', [on, different], {});
  await allowed.component('Home').onToggle(different);
  assert.equal(allowed.calls[0][1].enabled, true);
});
