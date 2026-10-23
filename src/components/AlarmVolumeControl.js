import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import SettingSlider from './SettingSlider';
import { normalizeVolumePercent } from '../utils/alarmVolume';
import { colors } from '../styles/theme';
import styles from '../styles/styles';

export default function AlarmVolumeControl({ value, onChange }) {
  const percent = normalizeVolumePercent(value);
  return <View>
    <View style={local.row}>
      <Text style={styles.muted}>Use custom volume</Text>
      <Switch accessibilityLabel="Use custom alarm volume" value={percent !== null}
        trackColor={{ false: '#cddfdc', true: colors.teal }}
        onValueChange={enabled => onChange(enabled ? 70 : null)} />
    </View>
    {percent !== null && <SettingSlider value={percent} minimum={0} maximum={100} step={5}
      onChange={onChange} label="Alarm volume" formatValue={level => `${level}%`}
      ticks={[0, 25, 50, 75, 100]} />}
    <Text style={styles.hint}>{percent === null ? 'Uses the phone’s current alarm volume.' :
      `${percent === 0 ? 'Tone and speech will be muted. ' : 'Controls tone and speech. '}Your previous phone volume is restored afterward.`}</Text>
  </View>;
}
const local = StyleSheet.create({ row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 } });
