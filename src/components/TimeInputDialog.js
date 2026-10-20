import React, { useRef } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Label } from './Common';
import styles from '../styles/styles';

export default function TimeInputDialog({ picker }) {
  const minuteRef = useRef(null);
  return (
    <Modal visible={picker.visible} transparent animationType="fade" onRequestClose={picker.close}>
      <KeyboardAvoidingView style={local.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={local.container} keyboardShouldPersistTaps="handled">
          <View style={local.card} accessibilityViewIsModal>
            <Text style={styles.heading} accessibilityRole="header">Set alarm time</Text>
            <View style={local.row}>
              <View style={local.field}>
                <Label>Hour (1–12)</Label>
                <TextInput value={picker.hour} onChangeText={picker.setHour} keyboardType="number-pad"
                  maxLength={2} selectTextOnFocus autoFocus accessibilityLabel="Hour, 1 to 12"
                  style={[styles.input, local.number]} returnKeyType="next"
                  onSubmitEditing={() => minuteRef.current?.focus()} />
              </View>
              <View style={local.field}>
                <Label>Minute (00–59)</Label>
                <TextInput ref={minuteRef} value={picker.minute} onChangeText={picker.setMinute}
                  keyboardType="number-pad" maxLength={2} selectTextOnFocus
                  accessibilityLabel="Minute, 00 to 59" style={[styles.input, local.number]}
                  onSubmitEditing={picker.confirm} />
              </View>
            </View>
            <View style={styles.actions}>
              {['AM', 'PM'].map(period => (
                <Button key={period} secondary={picker.period !== period} style={local.field}
                  onPress={() => picker.setPeriod(period)}>{period === picker.period ? `✓ ${period}` : period}</Button>
              ))}
            </View>
            {!!picker.error && <Text style={local.error} accessibilityRole="alert">{picker.error}</Text>}
            <View style={styles.actions}>
              <Button secondary style={local.field} onPress={picker.close}>Cancel</Button>
              <Button style={local.field} onPress={picker.confirm}>Set time</Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const local = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: '#fffaf5', borderRadius: 18, padding: 22 },
  row: { flexDirection: 'row', gap: 14 },
  field: { flex: 1 },
  number: { fontSize: 28, textAlign: 'center' },
  error: { color: '#b42318', marginTop: 14 },
});
