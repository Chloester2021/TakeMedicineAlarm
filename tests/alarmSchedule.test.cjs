const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadSource.cjs');
const { prepareSchedule, nextOccurrence, reconcileStates, legacyOneTimeAt } = load('src/utils/alarmSchedule.js');
const alarm = { id: 'a', hour: 7, minute: 0, days: [], enabled: true, message: '' };

test('one-time date stays fixed across reopening and expires without moving to tomorrow', () => {
  const first = prepareSchedule(alarm, { now: new Date(2026, 9, 20, 6) });
  const reopened = prepareSchedule(first, { now: new Date(2026, 9, 20, 6, 30) });
  const expired = prepareSchedule(reopened, { now: new Date(2026, 9, 20, 8) });
  assert.equal(first.onceAt, new Date(2026, 9, 20, 7).getTime());
  assert.equal(reopened.onceAt, first.onceAt);
  assert.equal(expired.onceAt, first.onceAt);
  assert.equal(expired.enabled, false);
});
test('explicit enable/save rearms a completed one-time alarm', () => {
  const next = prepareSchedule({ ...alarm, onceAt: new Date(2026, 9, 19, 7).getTime() },
    { resetOneTime: true, now: new Date(2026, 9, 20, 8) });
  assert.equal(next.enabled, true);
  assert.equal(next.onceAt, new Date(2026, 9, 21, 7).getTime());
});
test('legacy Android IDs preserve past one-time dates including UTC date boundaries', () => {
  for (const hour of [0, 7, 23]) {
    const at = new Date(2026, 9, 19, hour);
    const old = { ...alarm, hour, notificationIds: [`a-${at.toISOString().slice(0, 10)}`] };
    assert.equal(legacyOneTimeAt(old), at.getTime());
    assert.equal(prepareSchedule(old, { now: new Date(2026, 9, 21) }).enabled, false);
  }
});
test('selected weekdays continue for 26 weeks and never repeat the same occurrence', () => {
  const weekly = { ...alarm, days: [0, 4] };
  let now = new Date(2026, 9, 19, 8);
  for (let count = 0; count < 52; count++) {
    const at = new Date(nextOccurrence(weekly, now));
    assert.ok(at > now);
    assert.ok([0, 4].includes((at.getDay() + 6) % 7));
    assert.equal(at.getHours(), 7);
    now = at;
  }
  assert.ok(now > new Date(2027, 3, 1));
});
test('native completion turns off a one-time alarm and keeps it visible', () => {
  const saved = { ...alarm, scheduler: 'managed', scheduleToken: 'r1', nextTriggerAt: 123 };
  const result = reconcileStates([saved], [{ id: 'a', revision: 'r1', enabled: false, nextAt: 0 }]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'a');
  assert.equal(result[0].enabled, false);
  assert.equal(result[0].message, saved.message);
});
test('stale completion cannot disable an edited or re-enabled alarm', () => {
  const saved = { ...alarm, scheduler: 'managed', scheduleToken: 'new', onceAt: 1 };
  assert.equal(reconcileStates([saved], [{ id: 'a', revision: 'old', enabled: false }])[0], saved);
});
test('managed alarm stays enabled until native delivery confirms firing', () => {
  const saved = { ...alarm, scheduler: 'managed', scheduleToken: 'r1', onceAt: 1, nextTriggerAt: 1 };
  assert.equal(reconcileStates([saved], [{ id: 'a', revision: 'r1', enabled: true, nextAt: 1 }], 999)[0], saved);
});
