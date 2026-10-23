import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { colors } from '../styles/theme';

// Core RN views: compatible with existing APKs, including screen-reader actions.
export default function SettingSlider({ value, minimum, maximum, step, onChange, label, formatValue, formatTick = formatValue, ticks }) {
  const [width, setWidth] = useState(0);
  const snap = raw => Math.max(minimum, Math.min(maximum, minimum + Math.round((raw - minimum) / step) * step));
  const selected = snap(value);
  const latest = useRef(null);
  latest.current = { selected, onChange, width, minimum, maximum, snap };
  const responder = useMemo(() => {
    const select = event => {
      const current = latest.current;
      const usable = current.width - 32;
      if (usable <= 0) return;
      const next = current.snap(current.minimum + (event.nativeEvent.locationX - 16) / usable * (current.maximum - current.minimum));
      if (next !== current.selected) current.onChange(next);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 3,
      onPanResponderGrant: select, onPanResponderMove: select,
      onPanResponderTerminationRequest: () => false,
    });
  }, []);
  const position = Math.max(0, width - 32) * (selected - minimum) / (maximum - minimum);
  return <View>
    <Text style={local.value}>{formatValue(selected)}</Text>
    <View {...responder.panHandlers} style={local.touchArea}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      accessible accessibilityRole="adjustable" accessibilityLabel={label}
      accessibilityValue={{ min: minimum, max: maximum, now: selected, text: formatValue(selected) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={event => {
        const action = event.nativeEvent.actionName;
        if (action === 'increment' || action === 'decrement') {
          const next = snap(selected + (action === 'increment' ? step : -step));
          if (next !== selected) onChange(next);
        }
      }}>
      <View pointerEvents="none" style={local.track} />
      <View pointerEvents="none" style={[local.fill, { width: position }]} />
      <View pointerEvents="none" style={[local.thumb, { left: position + 4 }]} />
    </View>
    <View style={local.labels} pointerEvents="none">
      {ticks.map(tick => <Text key={tick} style={local.tick}>{formatTick(tick)}</Text>)}
    </View>
  </View>;
}

const local = StyleSheet.create({
  value: { color: colors.dark, fontWeight: '700', fontSize: 14 },
  touchArea: { height: 48, justifyContent: 'center' },
  track: { position: 'absolute', left: 16, right: 16, height: 4, borderRadius: 2, backgroundColor: '#cddfdc' },
  fill: { position: 'absolute', left: 16, height: 4, borderRadius: 2, backgroundColor: colors.teal },
  thumb: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: colors.teal },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  tick: { fontSize: 11, color: '#587087' },
});
