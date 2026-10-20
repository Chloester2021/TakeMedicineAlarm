# Calm Alarm — Codex handoff

## Read this first
You are joining this project for the first time. Inspect the **actual files in the open VS Code workspace** before editing anything. This document is historical context, not a claim that the current source matches an earlier ZIP. The latest edits made in VS Code and the latest build output are not available to the author of this handoff.

## Product
Calm Alarm is a React Native / Expo alarm-clock app targeting **Android and iOS**, with Android native functionality the immediate priority. Windows development workspace: `D:\calm-alarm-v1.1-source\calm-alarm`. Expo SDK 57 was used during recent builds; check actual package versions. The user wants a polished, dependable alarm, not merely a notification reminder.

## Architecture expectations
Keep `App.js` lean. Organize screens in `src/screens/`, reusable components in `src/components/`, hooks in `src/hooks/`, native and JS services in `src/services/`, utilities in `src/utils/`, styles in `src/styles/`, and Android native functionality in `modules/calm-alarm-native/` (Kotlin) with Expo config plugin under `plugins/`. Confirm actual layout; preserve existing features and data. Avoid giant single-file rewrites.

## User-facing features and behavior
- Create/edit/enable alarms with hour/minute, recurrence days, message and sound; preserve stored alarms.
- Message supports `{day}`, `{date}`, `{time}` tokens; resolve using the **device's system locale**.
- **No language selector** in the Edit Alarm card. Speech uses the device system language/voice, including Mandarin where installed; do not assume it translates arbitrary text.
- User should be able to choose an alarm sound from the **Android system alarm-tone picker** (not just a hardcoded “Gentle chime”). Check whether implemented.
- Alarm should trigger when app is backgrounded or screen locked; request a lock-screen full-screen alarm, screen wake, and stop button, subject to Android OS permissions and restrictions. Unlocked full-screen behavior may be limited by Android.
- Repeat **alarm tone -> read full message -> alarm tone -> read full message** until **60 seconds from alarm trigger**, unless Stop is pressed. Sound and speech should be managed by native background-capable code, not require opening the React Native notification screen.
- Preview alarm in app should display the ringing screen and message.
- Password protection is optional/off by default; if enabled, prompt once per app launch.
- Long-term reliable recurrence, reboot rescheduling, permission flows, and equivalent iOS behavior need review.

## Three essential Android device tests
1. **Locked screen:** Schedule ~2 minutes ahead; lock device; verify whether screen wakes/full-screen alarm appears automatically; tone and spoken message repeat without tapping a notification; Stop and 60-second timeout work.
2. **Unlocked, home screen:** Verify trigger, presentation, audio and speech repetition, stop/timeout.
3. **Unlocked, another app foreground:** Verify alarm behavior and Android full-screen restrictions, audio/speech independent of app UI.
Also test system ringtone selection, English/Mandarin system locales, placeholders, recurrence, app force-close/restart, and permissions. Document device model, Android version, exact permissions, and observed vs expected results. **Do not claim these tests pass without testing.**

## Build/debug history
- Old notification-only implementation produced one chime and a banner. On locked screen, TTS started only after user tapped notification; speech was not repeated. Native alarm work was added to address this.
- Android picker previously reset to 7 AM and could throw `Tried to close a RNCTimePicker dialog while not attached to an Activity`; use correct native picker callbacks and no conflicting dismiss calls.
- A custom Expo module `calm-alarm-native` and config plugin `withCalmAlarm.js` were added. Earlier builds failed on missing `@expo/config-plugins`; use `expo/config-plugins` import rather than directly installing the package.
- EAS upload once failed on locked `android/.gradle/.../checksums.lock`; exclude generated Gradle caches via `.easignore`, not source files.
- Expo Doctor checks were fixed, including `.expo/` in `.gitignore`, SDK patch versions, and CNG/native-folder handling.
- Gradle earlier failed configuring `:calm-alarm-native`: `'android.defaultConfig.versionName' is not defined`. An earlier suggestion added `defaultConfig { versionName "1.0.0" }` to `modules/calm-alarm-native/android/build.gradle`, but do not assume that is the correct long-term solution; inspect installed Expo Gradle plugin requirements and current actual file.
- **Most recent report:** an Android development APK was installed and initially showed `Unable to load script` / `index.android.bundle` because Metro was not running. The user ran `npx expo start --dev-client --clear` and **the app opened successfully on the phone**. This establishes a working dev-client/Metro connection, **not** a verified standalone preview build or verified alarm behavior. It is not confirmed whether the native implementation works correctly yet.

## Immediate assignment
1. Read the project and report actual architecture, current Git status, Expo SDK/package versions, `eas.json`, config plugin, module registration, Android permissions/manifest, alarm scheduling, background service, notification/full-screen intent, speech and ringtone code.
2. Identify what is genuinely implemented vs placeholder/incomplete. Do not silently assume features work.
3. Make a small, reversible baseline commit or propose one before changing files; avoid overwriting user work. Never commit secrets, keystores, `.env`, or generated caches.
4. Help produce a **standalone internal Android preview APK** with embedded JS (no Metro dependency) using existing EAS profile/config, preserving native module and config-plugin integration. Inspect `eas.json` before suggesting commands; development builds require Metro, preview builds normally bundle JS.
5. Provide a structured manual test checklist for the three scenarios and capture observed results. Fix issues iteratively, one reproducible issue at a time, using build logs and device `adb logcat` if available.
6. After baseline testing, ask the user which new features to prioritize. Implement them in small changes with validation.
7. Explain permission and OS limits honestly; do not promise guaranteed full-screen launch on all Android versions or reliable alarms before verification.

## Suggested workflow
Start with non-destructive inspection and `npx expo-doctor`. If appropriate, run `npx expo export --platform android` to validate JS bundling. Use `eas build --platform android --profile preview` only after inspecting `eas.json` and confirming it outputs an installable APK. Native changes require a new APK; JS-only changes may be testable via Metro. Keep the user informed before costly builds or destructive operations.
