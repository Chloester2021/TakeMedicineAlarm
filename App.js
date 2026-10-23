import React, { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, StatusBar, Alert, Keyboard } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as Notifications from 'expo-notifications'
import HomeScreen from './src/screens/HomeScreen'
import AlarmEditor from './src/screens/AlarmEditor'
import RingingScreen from './src/screens/RingingScreen'
import PasswordScreen from './src/screens/PasswordScreen'
import { defaultDraft, timeLabel } from './src/utils/alarm'
import {
  loadAlarms,
  storeAlarms,
  scheduleAlarm,
  cancelIds,
  restoreAlarm,
} from './src/services/alarms'
import { useRinging } from './src/hooks/useRinging'
import { useAlarmStateSync } from './src/hooks/useAlarmStateSync'
import styles from './src/styles/styles'
import AlarmConflictDialog from './src/components/AlarmConflictDialog'
import { findAlarmConflict } from './src/utils/alarmConflict'
import { ensureAlarmPermissions } from './src/services/alarmPermissions'

export default function App() {
  const [screen, setScreen] = useState('loading')
  const [alarms, setAlarms] = useState([])
  const [conflictMessage, setConflictMessage] = useState('')
  useAlarmStateSync(alarms, setAlarms)
  const [draft, setDraft] = useState(defaultDraft)
  const [now, setNow] = useState(new Date())
  const [passwordEnabled, setPasswordEnabled] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const alarmsRef = useRef([])
  const schedulingRef = useRef(false)
  useEffect(() => {
    alarmsRef.current = alarms
  }, [alarms])
  const onRingFinished = useCallback(
    (isPreview) => setScreen(isPreview ? 'edit' : 'home'),
    [],
  )
  const { ring, start: openRing, stop: stopRing } = useRinging(onRingFinished)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const permissionsReady = await ensureAlarmPermissions()
        if (!mounted) return
        const saved = await loadAlarms()
        if (!mounted) return
        setAlarms(saved)
        const protectedMode =
          (await SecureStore.getItemAsync('passwordEnabled')) === 'true'
        const schedulingErrors = []
        const scheduled = await Promise.all(saved.map(async (alarm) => {
          if (!permissionsReady) return alarm
          try { return await restoreAlarm(alarm) }
          catch (error) { schedulingErrors.push(String(error)); return alarm }
        }))
        if (!mounted) return
        setPasswordEnabled(protectedMode)
        setAlarms(scheduled)
        await storeAlarms(scheduled)
        setScreen(protectedMode ? 'unlock' : 'home')
        if (schedulingErrors.length) Alert.alert('Alarm setup warning', [...new Set(schedulingErrors)].join('\n'))
      } catch (e) {
        console.warn('Alarm initialization', e)
        if (mounted) {
          Alert.alert('Setup warning', String(e))
          setScreen('home')
        }
      }
    }
    load()
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const id = response.notification.request.content.data?.alarmId
        const found = alarmsRef.current.find((a) => a.id === id)
        if (found) {
          setScreen('ring')
          openRing(found, false)
        }
      },
    )
    return () => {
      mounted = false
      subscription.remove()
    }
  }, [openRing])
  const persist = async (next) => {
    setAlarms(next)
    await storeAlarms(next)
  }
  const save = async () => {
    Keyboard.dismiss()
    if (schedulingRef.current) return
    schedulingRef.current = true
    try {
      const alarm = { ...draft, enabled: true, id: draft.id || String(Date.now()) }
      if (hasConflict(alarm)) return
      if (!await ensureAlarmPermissions()) return
      const scheduled = await scheduleAlarm(alarm, { resetOneTime: true })
      await persist([...alarms.filter((a) => a.id !== alarm.id), scheduled])
      setScreen('home')
    } catch (e) {
      Alert.alert('Could not schedule alarm', String(e))
    } finally {
      schedulingRef.current = false
    }
  }
  const remove = async (alarm) => {
    try {
      await cancelIds(alarm)
      await persist(alarms.filter((a) => a.id !== alarm.id))
    } catch (e) {
      Alert.alert('Delete failed', String(e))
    }
  }
  const toggle = async (alarm) => {
    if (schedulingRef.current) return
    schedulingRef.current = true
    try {
      const candidate = { ...alarm, enabled: !alarm.enabled }
      if (hasConflict(candidate)) return
      if (candidate.enabled && !await ensureAlarmPermissions()) return
      const updated = await scheduleAlarm(candidate, { resetOneTime: true })
      await persist(alarms.map((a) => (a.id === alarm.id ? updated : a)))
    } catch (e) {
      Alert.alert('Alarm error', String(e))
    } finally {
      schedulingRef.current = false
    }
  }
  const hasConflict = (candidate) => {
    if (!findAlarmConflict(candidate, alarmsRef.current)) return false
    setConflictMessage(`An active alarm is already set for ${timeLabel(candidate.hour, candidate.minute)} on an overlapping day. Please change the time or choose different days.`)
    return true
  }
  const edit = (alarm) => {
    setDraft(alarm ? { ...alarm, days: [...alarm.days] } : defaultDraft())
    setScreen('edit')
  }
  const setupPassword = async () => {
    if (password.length < 4)
      return Alert.alert('Password too short', 'Use at least four characters.')
    if (password !== confirm) return Alert.alert('Passwords do not match')
    await SecureStore.setItemAsync('alarmPassword', password)
    await SecureStore.setItemAsync('passwordEnabled', 'true')
    setPasswordEnabled(true)
    setPassword('')
    setConfirm('')
    setScreen('home')
  }
  const unlock = async () => {
    if (password !== (await SecureStore.getItemAsync('alarmPassword')))
      return Alert.alert('Incorrect password')
    setPassword('')
    setScreen('home')
  }
  const disablePassword = async () => {
    await SecureStore.deleteItemAsync('alarmPassword')
    await SecureStore.setItemAsync('passwordEnabled', 'false')
    setPasswordEnabled(false)
    setScreen('home')
  }
  const passwordAction = () =>
    passwordEnabled
      ? Alert.alert(
          'Password protection',
          'Turn off password protection for this device?',
          [{ text: 'Cancel' }, { text: 'Disable', onPress: disablePassword }],
        )
      : (setPassword(''), setConfirm(''), setScreen('password'))
  if (screen === 'loading')
    return (
      <View style={styles.center}>
        <Text>Loading alarms…</Text>
      </View>
    )
  if (screen === 'ring' && ring)
    return <RingingScreen alarm={ring} onStop={stopRing} />
  if (screen === 'unlock' || screen === 'password')
    return (
      <PasswordScreen
        unlockMode={screen === 'unlock'}
        password={password}
        setPassword={setPassword}
        confirm={confirm}
        setConfirm={setConfirm}
        onSubmit={screen === 'unlock' ? unlock : setupPassword}
        onCancel={() => setScreen('home')}
      />
    )
  if (screen === 'edit')
    return (
      <>
        <StatusBar barStyle="dark-content" />
        <AlarmConflictDialog message={conflictMessage} onClose={() => setConflictMessage('')} />
        <AlarmEditor
          draft={draft}
          setDraft={setDraft}
          onCancel={() => setScreen('home')}
          onSave={save}
          onPreview={() => {
            setScreen('ring')
            openRing(draft, true)
          }}
        />
      </>
    )
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <AlarmConflictDialog message={conflictMessage} onClose={() => setConflictMessage('')} />
      <HomeScreen
        now={now}
        alarms={alarms}
        onAdd={() => edit(null)}
        onEdit={edit}
        onDelete={remove}
        onToggle={toggle}
        passwordEnabled={passwordEnabled}
        onPassword={passwordAction}
      />
    </>
  )
}
