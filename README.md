# Calm Alarm — React Native / Expo prototype

## Run

Requires Node.js 20+, Expo development environment and Android Studio or Xcode.

```bash
npm install
npx expo start
```

For native builds:

```bash
npx expo run:android
npx expo run:ios
```

## Implemented
- Dashboard, add/edit/delete, enable/disable, weekday repeat selection
- Narrow dynamic-token buttons (`{day}`, `{date}`, `{time}`) inserting at cursor
- Full-screen live preview, with rendered message and text-to-speech
- Optional local password stored with SecureStore; prompted once on cold launch
- Local notification scheduling and a full-screen in-app ringing screen with a 60-second timeout
- Persisted alarm records in AsyncStorage

## Production work required before relying on this as an alarm clock

**The prototype is NOT a reliable OS-level alarm clock.** Expo notifications show normal system notifications. On Android, guaranteed lock-screen/full-screen alarm presentation needs a native AlarmManager exact-alarm + full-screen notification implementation, Android 14+ permission/eligibility handling, wake locks, reboot rescheduling, and foreground service/audio. On iOS, third-party apps cannot freely force a full-screen app UI from a terminated/background state; implement the supported AlarmKit flow (where available and approved) or clearly use notification fallback. Expo Speech is not guaranteed to run while the app is backgrounded or terminated. Use native audio/TTS integration for real ringing. The 60-second timer only reliably runs while the JS app is active; native timeout handling is required in production.

Additional improvements: refresh repeating alarms beyond the current seven-day horizon via native repeating schedules; use an actual sound asset and sound picker; add password recovery/change flows; validate daylight-saving transitions; secure password using a salted KDF instead of storing plaintext in secure storage; add native notification tap/open and cold-start handling; test device notification permissions.

This starter intentionally avoids claiming that a notification can wake the screen on iOS/Android without platform-specific native work.

## Version 1.1: confirmed ringing sequence
- In-app alarm and preview now play a bundled 2-second chime **before** speaking the resolved message.
- Stop cancels the chime, pending speech, and the 60-second timer; preview returns to editing.
- The three variable chips have a compact 34-point height.
- `expo-audio` added; install dependencies again before running.

**Important:** This sequence and 60-second stop are reliable only while the JavaScript app is running. Scheduled background notifications use the system sound, and cannot guarantee a spoken message or a full-screen presentation. Android native exact-alarm/full-screen integration and iOS AlarmKit integration (subject to OS support) remain necessary before shipping this as a dependable alarm.
