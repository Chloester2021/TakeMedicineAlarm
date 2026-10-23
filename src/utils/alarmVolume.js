// null preserves the phone's current alarm volume for existing/default alarms.
export function normalizeVolumePercent(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value))) : null;
}
