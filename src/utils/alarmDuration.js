export function normalizeDurationMinutes(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(1, Math.min(5, Math.round(value))) : 1;
}

export const alarmDurationMs = alarm => normalizeDurationMinutes(alarm.durationMinutes) * 60000;
export const durationLabel = value => {
  const minutes = normalizeDurationMinutes(value);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
};
