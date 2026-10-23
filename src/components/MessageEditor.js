import React, { useLayoutEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { messageParts, messageCaret } from '../utils/messageTokens';
import { colors } from '../styles/theme';
import styles from '../styles/styles';

export default function MessageEditor({ value = '', onChange }) {
  const parts = messageParts(value);
  const inputs = useRef({});
  const active = useRef({ index: 0, start: 0, end: 0 });
  const pendingCaret = useRef(null);
  const [focused, setFocused] = useState(false);

  useLayoutEffect(() => {
    if (pendingCaret.current === null) return;
    const { index, position } = messageCaret(messageParts(value), pendingCaret.current);
    pendingCaret.current = null;
    const frame = requestAnimationFrame(() => {
      active.current = { index, start: position, end: position };
      inputs.current[index]?.focus();
      inputs.current[index]?.setNativeProps({ selection: { start: position, end: position } });
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const replace = (start, end, text, restoreCaret = true) => {
    if (restoreCaret) pendingCaret.current = start + text.length;
    onChange(value.slice(0, start) + text + value.slice(end));
  };

  const insert = name => {
    const current = active.current;
    const part = parts[current.index];
    const start = part?.type === 'text' ? part.start + Math.min(current.start, part.value.length) : value.length;
    const end = part?.type === 'text' ? part.start + Math.min(current.end, part.value.length) : value.length;
    const before = /\{(?:day|date|time)\}$/.test(value.slice(0, start)) ? ' ' : '';
    const after = /^\{(?:day|date|time)\}/.test(value.slice(end)) ? ' ' : '';
    replace(start, end, `${before}{${name}}${after}`);
  };

  return <>
    <View style={[local.field, focused && local.focused]}>
      {parts.map((part, index) => part.type === 'token' ? (
        <View key={`token-${index}`} style={local.chip}>
          <Text style={local.chipLabel}>{part.value}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Remove ${part.value} from message`}
            onPress={() => replace(part.start, part.end, '')}
            hitSlop={4}
            style={local.remove}
          ><Text style={local.removeLabel}>{'\u00d7'}</Text></TouchableOpacity>
        </View>
      ) : (
        <View key={`text-${index}`} style={local.textSlot}>
          {/* Measure the editable run so text and chips wrap together. */}
          <Text accessible={false} pointerEvents="none" style={[local.text, local.measure]}>
            {(value ? part.value : 'e.g. Good morning, today is') + ' '}
          </Text>
          <TextInput
            ref={input => { inputs.current[index] = input; }}
            accessibilityLabel={parts.length === 1 ? 'Alarm message' : `Message text, section ${index / 2 + 1}`}
            style={[local.text, local.input]}
            placeholder={value ? undefined : 'e.g. Good morning, today is'}
            placeholderTextColor="#778391"
            value={part.value}
            multiline
            scrollEnabled={false}
            underlineColorAndroid="transparent"
            onFocus={() => {
              setFocused(true);
              if (active.current.index !== index) active.current = { index, start: part.value.length, end: part.value.length };
            }}
            onBlur={() => setFocused(false)}
            onSelectionChange={({ nativeEvent: { selection } }) => {
              active.current = { index, ...selection };
            }}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace' && active.current.start === 0 && active.current.end === 0 && index > 0) {
                inputs.current[index - 2]?.focus();
              }
            }}
            onChangeText={text => {
              const next = value.slice(0, part.start) + text + value.slice(part.end);
              // Pasted or typed valid placeholders also become protected chips.
              if (messageParts(next).length !== parts.length) {
                pendingCaret.current = part.start + active.current.end + text.length - part.value.length;
              }
              onChange(next);
            }}
          />
        </View>
      ))}
    </View>
    <Text style={local.hint}>Insert day, date or time. Tap { '\u00d7' } on a chip to remove it.</Text>
    <View style={styles.tokenRow}>{['day', 'date', 'time'].map(name => (
      <TouchableOpacity key={name} accessibilityRole="button" accessibilityLabel={`Insert ${name}`} onPress={() => insert(name)} style={styles.token}>
        <Text style={styles.tokenLabel}>{name}</Text>
      </TouchableOpacity>
    ))}</View>
  </>;
}

const local = StyleSheet.create({
  field: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#fff', borderColor: '#dbe4ec', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, minHeight: 56, rowGap: 4 },
  focused: { borderColor: colors.teal },
  textSlot: { minWidth: 24, maxWidth: '100%', flexShrink: 1, minHeight: 32 },
  text: { fontSize: 14, lineHeight: 32, color: colors.dark, padding: 0, margin: 0, includeFontPadding: false },
  measure: { opacity: 0 },
  input: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', textAlignVertical: 'top' },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.teal, borderRadius: 8, backgroundColor: '#eefcf9', paddingLeft: 6, marginHorizontal: 2, minHeight: 24 },
  chipLabel: { color: colors.teal, fontSize: 12, fontWeight: '700' },
  remove: { paddingHorizontal: 6, minHeight: 24, justifyContent: 'center' },
  removeLabel: { color: colors.teal, fontSize: 16 },
  hint: { color: '#778391', fontSize: 12, lineHeight: 18, marginTop: 8 },
});
