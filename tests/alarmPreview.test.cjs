const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadSource.cjs');

function previewHarness(version = 4, start = async () => {}) {
  const starts = [], stops = [], states = [], finishes = [], alerts = [], effects = [], timers = new Map();
  const api = load('src/hooks/useRinging.js', {
    react: { useCallback: callback => callback, useRef: value => ({ current: value }),
      useState: () => [null, state => states.push(state)], useEffect: effect => effects.push(effect) },
    'react-native': { Platform: { OS: 'android' }, Alert: { alert: (...args) => alerts.push(args) } },
    'expo-speech': { stop() {}, speak() { throw new Error('New Android preview must use native alarm speech'); } },
    'expo-audio': { setAudioModeAsync() { throw new Error('Native Android preview owns audio routing'); } },
    '../services/nativeAlarm': {
      nativeAlarmVersion: () => version, requireCurrentNativeAlarm() {},
      startDefaultTone() { throw new Error('New preview must use the shared native engine'); }, stopDefaultTone: async () => {},
      startRingingPreview: (...args) => { starts.push(args); return start(...args); },
      stopRingingPreview: async token => { stops.push(token); },
    },
  });
  const originalSetTimeout = global.setTimeout, originalClearTimeout = global.clearTimeout;
  let timerId = 0;
  global.setTimeout = (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; };
  global.clearTimeout = id => timers.delete(id);
  const ringing = api.useRinging(isPreview => finishes.push(isPreview));
  return { ringing, starts, stops, states, finishes, alerts, effects, timers,
    cleanup() { global.setTimeout = originalSetTimeout; global.clearTimeout = originalClearTimeout; } };
}
const alarm = { hour: 7, minute: 0, message: 'Wake up', durationMinutes: 5, volumePercent: 70 };

test('preview speech and card share a fixed scheduled time, including adjacent saved tokens', async () => {
  const { tokenText } = load('src/utils/alarm.js');
  const h = previewHarness();
  try {
    await h.ringing.start({ ...alarm, hour: 17, minute: 4, message: '{time}{date}{day}' }, true);
    const ring = h.states.at(-1);
    assert.equal(ring.messageDate.getHours(), 17);
    assert.equal(ring.messageDate.getMinutes(), 4);
    assert.equal(ring.messageDate.getSeconds(), 0);
    const expected = ['time', 'date', 'day'].map(name => tokenText(`{${name}}`, ring.messageDate)).join(' ');
    assert.equal(h.starts[0][1], expected);
    assert.equal(tokenText(ring.message, ring.messageDate), expected);
  } finally { h.cleanup(); }
});

for (const exit of ['Stop', 'timeout', 'unmount']) {
  test(`native preview receives selected volume and ends its own session on ${exit}`, async () => {
    const h = previewHarness();
    try {
      await h.ringing.start(alarm, true);
      assert.equal(h.starts.length, 1);
      const [token, message, duration, volume] = h.starts[0];
      assert.equal(message, 'Wake up'); assert.equal(duration, 5); assert.equal(volume, 70);
      assert.equal(h.timers.size, 1, 'Only the UI deadline should remain in JavaScript');
      if (exit === 'Stop') h.ringing.stop();
      if (exit === 'timeout') [...h.timers.values()].find(timer => timer.delay === 300000).callback();
      if (exit === 'unmount') h.effects.at(-1)()();
      assert.deepEqual(h.stops, [token]);
      if (exit !== 'unmount') { assert.equal(h.states.at(-1), null); assert.deepEqual(h.finishes, [true]); }
    } finally { h.cleanup(); }
  });
}
test('native preview initialization failure cleans up and reports the failure', async () => {
  const h = previewHarness(4, async () => { throw new Error('Volume denied'); });
  try {
    await h.ringing.start(alarm, true);
    assert.equal(h.states.at(-1), null);
    assert.equal(h.timers.size, 0);
    assert.deepEqual(h.stops, [h.starts[0][0]]);
    assert.match(h.alerts[0][1], /Volume denied/);
  } finally { h.cleanup(); }
});
test('old APK cannot preview a custom level through the old media-speech path', async () => {
  const h = previewHarness(3);
  try {
    await h.ringing.start(alarm, true);
    assert.equal(h.starts.length, 0);
    assert.equal(h.timers.size, 0);
    assert.equal(h.alerts[0][0], 'New APK required');
  } finally { h.cleanup(); }
});
test('a late failure from an earlier preview cannot stop the newer preview', async () => {
  const pending = [];
  const h = previewHarness(4, () => new Promise((resolve, reject) => pending.push({ resolve, reject })));
  try {
    const earlier = h.ringing.start(alarm, true);
    const later = h.ringing.start({ ...alarm, volumePercent: 30 }, true);
    pending[0].reject(new Error('Old preview failed'));
    await earlier;
    assert.deepEqual(h.stops, [h.starts[0][0]]);
    assert.equal(h.alerts.length, 0);
    pending[1].resolve(); await later;
    h.ringing.stop();
    assert.deepEqual(h.stops, [h.starts[0][0], h.starts[1][0]]);
  } finally { h.cleanup(); }
});
