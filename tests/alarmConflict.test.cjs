const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadSource.cjs');
const { findAlarmConflict, sortDashboardAlarms } = load('src/utils/alarmConflict.js');
const now = new Date(2026, 9, 19, 6); // Monday, before 7am
const alarm = (id, days = [], extra = {}) => ({ id, hour: 7, minute: 0, days, enabled: true, ...extra });

test('weekly alarms conflict only at matching times on shared weekdays', () => {
  const existing = alarm('a', [0, 2]);
  assert.equal(findAlarmConflict(alarm('b', [2, 4]), [existing], now), existing);
  assert.equal(findAlarmConflict(alarm('b', [1, 3]), [existing], now), null);
  assert.equal(findAlarmConflict(alarm('b', [0], { minute: 1 }), [existing], now), null);
  assert.equal(findAlarmConflict(alarm('b', [0], { hour: 8 }), [existing], now), null);
});

test('one-time alarms compare actual dates and the weekday of weekly alarms', () => {
  const monday = alarm('a', [], { onceAt: new Date(2026, 9, 19, 7).getTime() });
  const tuesday = alarm('b', [], { onceAt: new Date(2026, 9, 20, 7).getTime() });
  assert.equal(findAlarmConflict(alarm('new'), [monday], now), monday);
  assert.equal(findAlarmConflict(alarm('new'), [tuesday], now), null);
  assert.equal(findAlarmConflict(alarm('new', [0]), [monday], now), monday);
  assert.equal(findAlarmConflict(alarm('new', [1]), [monday], now), null);
  assert.ok(findAlarmConflict(alarm('new'), [alarm('weekly', [0])], now));
  assert.equal(findAlarmConflict(alarm('new'), [alarm('weekly', [1])], now), null);
});

test('saving a one-time alarm after its time compares tomorrow, including Sunday/Monday boundary', () => {
  const sundayEvening = new Date(2026, 9, 18, 20);
  assert.ok(findAlarmConflict(alarm('new'), [alarm('monday', [0])], sundayEvening));
  assert.equal(findAlarmConflict(alarm('new'), [alarm('sunday', [6])], sundayEvening), null);
});

test('editing self, inactive records, and expired one-time alarms do not conflict', () => {
  const candidate = alarm('a', [0]);
  assert.equal(findAlarmConflict(candidate, [candidate], now), null);
  assert.equal(findAlarmConflict(candidate, [alarm('b', [0], { enabled: false })], now), null);
  assert.equal(findAlarmConflict({ ...candidate, enabled: false }, [alarm('b', [0])], now), null);
  assert.equal(findAlarmConflict(candidate, [alarm('old', [], { onceAt: new Date(2026, 9, 12, 7).getTime() })], now), null);
});

test('resaving an inactive one-time alarm uses its newly armed date for conflicts', () => {
  const resaved = alarm('old', [], { onceAt: new Date(2026, 9, 12, 7).getTime() });
  assert.ok(findAlarmConflict(resaved, [alarm('weekly', [0])], now));
});

test('dashboard keeps active alarms above inactive alarms, with time order within each group', () => {
  const source = [alarm('off-early', [], { enabled: false, hour: 1 }), alarm('on-late', [], { hour: 22 }),
    alarm('off-late', [], { enabled: false, hour: 23 }), alarm('on-early', [], { hour: 6 })];
  assert.deepEqual(sortDashboardAlarms(source).map(a => a.id), ['on-early', 'on-late', 'off-early', 'off-late']);
  assert.equal(source[0].id, 'off-early');
});
