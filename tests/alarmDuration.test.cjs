const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadSource.cjs');

test('preview uses the chosen deadline and stops tone/speech when it expires', async () => {
  for (const minutes of [undefined, 1, 3, 5]) {
    const originalSetTimeout = global.setTimeout;
    const originalClearTimeout = global.clearTimeout;
    const timers = new Map();
    let nextTimer = 0;
    const ringStates = [];
    const finishes = [];
    let toneStops = 0;
    let speechStops = 0;
    const speech = [];
    const api = load('src/hooks/useRinging.js', {
      react: {
        useCallback: callback => callback, useRef: value => ({ current: value }),
        useState: () => [null, value => ringStates.push(value)], useEffect() {},
      },
      'react-native': { Platform: { OS: 'android' }, Alert: { alert() { throw new Error('Unexpected alert'); } } },
      'expo-speech': { stop() { speechStops++; }, speak: (_, options) => speech.push(options) },
      'expo-audio': { setAudioModeAsync: async () => {} },
      '../services/nativeAlarm': {
        nativeAlarmVersion: () => 2,
        requireCurrentNativeAlarm() {}, startDefaultTone: async () => {}, stopDefaultTone: async () => { toneStops++; },
      },
    });
    try {
      global.setTimeout = (callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, delay }); return id; };
      global.clearTimeout = id => timers.delete(id);
      const ringing = api.useRinging(isPreview => finishes.push(isPreview));
      await ringing.start({ hour: 7, minute: 0, message: 'Wake up', durationMinutes: minutes }, true);
      const selectedMs = (minutes || 1) * 60000;
      const deadline = [...timers.values()].find(timer => timer.delay === selectedMs);
      assert.ok(deadline, `Expected deadline ${selectedMs}`);
      const tone = [...timers.values()].find(timer => timer.delay === 2200);
      assert.ok(tone);
      await tone.callback();
      assert.equal(speech.length, 1);
      const priorToneStops = toneStops;
      const priorSpeechStops = speechStops;
      deadline.callback();
      assert.equal(ringStates.at(-1), null);
      assert.deepEqual(finishes, [true]);
      assert.ok(toneStops > priorToneStops);
      assert.ok(speechStops > priorSpeechStops);
      const pending = timers.size;
      speech[0].onDone();
      assert.equal(timers.size, pending, 'Late speech callback must not restart the alarm');
    } finally {
      global.setTimeout = originalSetTimeout;
      global.clearTimeout = originalClearTimeout;
    }
  }
});

test('malformed saved durations stay within the 1–5 minute bounds', () => {
  const { alarmDurationMs } = load('src/utils/alarmDuration.js');
  for (const value of [undefined, null, NaN, Infinity, -10, 0]) {
    assert.equal(alarmDurationMs({ durationMinutes: value }), 60000);
  }
  assert.equal(alarmDurationMs({ durationMinutes: 100 }), 300000);
});
