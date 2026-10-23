import { nextOccurrence } from './alarmSchedule';

const weekday = at => (new Date(at).getDay() + 6) % 7;
const sameDate = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

// The candidate is an explicit save/enable, so its one-time date is recalculated.
export function findAlarmConflict(candidate, alarms, now = new Date()) {
  if (!candidate.enabled) return null;
  const onceAt = candidate.days.length ? null : nextOccurrence(candidate, now);
  return alarms.find(other => {
    if (other.id === candidate.id || !other.enabled || other.hour !== candidate.hour || other.minute !== candidate.minute) return false;
    if (candidate.days.length && other.days.length) return candidate.days.some(day => other.days.includes(day));
    const otherAt = other.days.length ? null : other.onceAt || nextOccurrence(other, now);
    if (otherAt !== null && otherAt <= now.getTime()) return false;
    if (onceAt !== null && otherAt !== null) return sameDate(onceAt, otherAt);
    return onceAt !== null ? other.days.includes(weekday(onceAt)) : candidate.days.includes(weekday(otherAt));
  }) || null;
}

export const sortDashboardAlarms = alarms => [...alarms].sort((a, b) =>
  Number(!!b.enabled) - Number(!!a.enabled) || a.hour * 60 + a.minute - b.hour * 60 - b.minute);
