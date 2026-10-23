import React from 'react';
import SettingSlider from './SettingSlider';
import { durationLabel, normalizeDurationMinutes } from '../utils/alarmDuration';

export default function AlarmDurationSlider({ value, onChange }) {
  return <SettingSlider value={normalizeDurationMinutes(value)} minimum={1} maximum={5} step={1}
    onChange={onChange} label="Alarm duration" formatValue={durationLabel} formatTick={minutes => `${minutes} min`} ticks={[1, 2, 3, 4, 5]} />;
}
