import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { Button } from './Common';
import { colors } from '../styles/theme';

export default function AlarmConflictDialog({ message, onClose }) {
  return <Modal visible={!!message} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}><View style={styles.card} accessibilityViewIsModal>
      <Text style={styles.title} accessibilityRole="header">Alarm time already in use</Text>
      <Text style={styles.message}>{message}</Text>
      <Button onPress={onClose}>Got it</Button>
    </View></View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#17334699', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fffaf5', borderRadius: 24, padding: 24, width: '100%', maxWidth: 420, alignSelf: 'center' },
  title: { color: colors.dark, fontSize: 21, fontWeight: '800' },
  message: { color: '#587087', fontSize: 15, lineHeight: 23, marginTop: 14, marginBottom: 24 },
});
