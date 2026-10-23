export function nextOccurrence(alarm, now = new Date()) {
  for (let offset = 0; offset <= 7; offset++) {
    const at = new Date(now);
    at.setDate(now.getDate() + offset);
    at.setHours(alarm.hour, alarm.minute, 0, 0);
    if (at > now && (!alarm.days.length || alarm.days.includes((at.getDay() + 6) % 7))) return at.getTime();
  }
  throw new Error('No next alarm occurrence');
}

// Old Android schedules encoded the UTC date in their ID. Preserve that date
// during migration instead of moving a fired one-time alarm to tomorrow.
export function legacyOneTimeAt(alarm) {
  const id = (alarm.notificationIds || []).find(value => /-\d{4}-\d{2}-\d{2}$/.test(value));
  if (!id) return null;
  const date = id.slice(-10);
  for (const offset of [-1, 0, 1]) {
    const at = new Date(`${date}T12:00:00Z`);
    at.setDate(at.getDate() + offset);
    at.setHours(alarm.hour, alarm.minute, 0, 0);
    if (at.toISOString().slice(0, 10) === date) return at.getTime();
  }
  return null;
}

export function prepareSchedule(alarm, { resetOneTime = false, now = new Date() } = {}) {
  const onceAt = alarm.days.length ? null :
    (!resetOneTime && (alarm.onceAt || legacyOneTimeAt(alarm))) || nextOccurrence(alarm, now);
  return { ...alarm, onceAt, enabled: !!alarm.enabled && (alarm.days.length > 0 || onceAt > now.getTime()) };
}

export function reconcileStates(alarms, states, now = Date.now()) {
  const byId = new Map(states.map(state => [state.id, state]));
  return alarms.map(alarm => {
    if (!alarm.enabled) return alarm;
    const state = byId.get(alarm.id);
    if (state && state.revision === alarm.scheduleToken) {
      if (alarm.enabled === state.enabled && alarm.nextTriggerAt === state.nextAt) return alarm;
      return { ...alarm, enabled: state.enabled, nextTriggerAt: state.nextAt };
    }
    if (!alarm.days.length && alarm.onceAt && alarm.onceAt <= now && alarm.scheduler !== 'managed') {
      return { ...alarm, enabled: false, nextTriggerAt: 0 };
    }
    return alarm;
  });
}
