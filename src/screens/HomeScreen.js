import React from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native'
import DashboardSafeArea from '../components/DashboardSafeArea'
import { Button } from '../components/Common'
import { WEEK, timeLabel } from '../utils/alarm'
import styles from '../styles/styles'
import { sortDashboardAlarms } from '../utils/alarmConflict'
export default function HomeScreen({
  now,
  alarms,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
  passwordEnabled,
  onPassword,
}) {
  return (
    <DashboardSafeArea style={styles.home}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.homeScroll}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>DAILY SCHEDULE</Text>
            <Text style={styles.appTitle}>Alarm Clock</Text>
          </View>
        </View>
        <View style={styles.hero}>
          <Text style={styles.small}>
            {now.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          <Text style={styles.heroTime}>
            {timeLabel(now.getHours(), now.getMinutes())}
          </Text>
        </View>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.sectionTitle}>Your alarms</Text>
            <Text style={styles.muted}>Ready when you are.</Text>
          </View>
          <Button onPress={onAdd}>＋ Add</Button>
        </View>
        {alarms.length === 0 && (
          <View style={styles.alarmCard}>
            <Text style={styles.muted}>
              No alarms yet. Add your first alarm.
            </Text>
          </View>
        )}
        {sortDashboardAlarms(alarms).map((a) => (
          <View key={a.id} style={styles.alarmCard}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTime}>
                  {timeLabel(a.hour, a.minute)}
                </Text>
                <Text style={styles.cardMessage} numberOfLines={2}>
                  {a.message || 'Alarm'}
                </Text>
                <Text style={styles.small}>
                  {a.days.length
                    ? a.days.map((i) => WEEK[i]).join(' · ')
                    : 'Once'}
                </Text>
              </View>
              <Switch
                value={a.enabled}
                onValueChange={() => onToggle(a)}
                trackColor={{ true: '#0d7b72' }}
              />
            </View>
            <View style={[styles.cardBottom, { justifyContent: 'flex-end' }]}>
              <View style={{ flexDirection: 'row', gap: 22 }}>
                <TouchableOpacity onPress={() => onEdit(a)}>
                  <Text style={styles.actionIcon}>✎</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert('Delete alarm?', 'This cannot be undone.', [
                      { text: 'Cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => onDelete(a),
                      },
                    ])
                  }
                >
                  <Text style={[styles.actionIcon, { color: '#e84a5a' }]}>
                    ♜
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.passwordButton} onPress={onPassword}>
          <Text style={styles.buttonText}>
            {passwordEnabled ? 'Password on' : 'Set up password'}
          </Text>
        </TouchableOpacity>
      </View>
    </DashboardSafeArea>
  )
}
