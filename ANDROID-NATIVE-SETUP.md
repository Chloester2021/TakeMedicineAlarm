# Calm Alarm Android native prototype

This is a **development prototype**, not a certified reliable alarm clock.

## Installation
1. Back up your project and replace the project files with this source (do not copy `node_modules` or `.git`).
2. `npm install` (internet needed).
3. `npx expo prebuild --platform android --clean` to generate Android code and apply the config plugin.
4. `eas build --platform android --profile development --clear-cache` to create a new APK. A Metro reload alone cannot install native Kotlin changes.
5. On the device, grant notifications, **Alarms & reminders** (exact alarm), and **Full-screen notifications** (where offered). Reopen app to reschedule alarms.

## Important limitations
- This prototype schedules the next occurrence for one-time alarms and up to the next 7 days of repeating alarms. **It does not yet automatically reschedule weekly alarms indefinitely**; re-opening the app refreshes scheduling.
- Full-screen intent is subject to Android policy and device permissions. When unlocked, Android can show a heads-up notification instead of opening an activity.
- Alarm sound currently uses the Android **default system alarm sound**. The **interactive system ringtone picker is not yet wired up**.
- Native service starts from a scheduled alarm, plays the system alarm tone for 2.2 seconds, speaks the message using the device locale, and repeats for up to 60 seconds. Device-specific background limits, missing TTS engines/voices, and power restrictions require testing.
- Android 14+ foreground service and full-screen restrictions apply. No physical device build or runtime test has been performed here.
- The React Native preview remains separate from the native alarm service. iOS continues using Expo notifications.
- Android may block exact-alarm permission for a newly installed app; settings access is needed. This prototype exposes native permission methods but does not yet provide a dedicated permissions UI.
- Avoid using this prototype as your sole wake-up alarm.
