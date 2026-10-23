import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { tokenText, dateFromAlarm } from '../utils/alarm';
import { speechLanguage } from '../utils/language';
import { alarmDurationMs, normalizeDurationMinutes } from '../utils/alarmDuration';
import { normalizeVolumePercent } from '../utils/alarmVolume';
import { requireCurrentNativeAlarm, startDefaultTone, stopDefaultTone, nativeAlarmVersion,
  startRingingPreview, stopRingingPreview } from '../services/nativeAlarm';

// In-app preview / foreground playback ONLY. Android background and lock-screen
// playback must be implemented in a native foreground service.
const CHIME_MS = 2200;
export function useRinging(onFinish) {
  const [ring, setRing] = useState(null);
  const timer = useRef(null);
  const audioTimer = useRef(null);
  const player = useRef(null);
  const session = useRef(0);
  const nativePreview = useRef(null);
  const deadline = useRef(null);
  const preview = useRef(false);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  const clearAudio = useCallback(() => {
    clearTimeout(audioTimer.current);
    Speech.stop();
    if (nativePreview.current) {
      stopRingingPreview(nativePreview.current)?.catch(error => console.warn('Native preview cleanup', error));
      nativePreview.current = null;
    }
    stopDefaultTone()?.catch(error => console.warn('Default tone cleanup', error));
    try { player.current?.pause(); player.current?.remove(); } catch (error) { console.warn('Audio cleanup', error); }
    player.current = null;
  }, []);

  const stop = useCallback(() => {
    session.current += 1;
    clearTimeout(timer.current);
    deadline.current = null;
    clearAudio();
    setRing(null);
    finishRef.current(preview.current);
  }, [clearAudio]);

  const start = useCallback(async (alarm, isPreview = false) => {
    if (Platform.OS === 'android') {
      try {
        requireCurrentNativeAlarm();
        if (normalizeVolumePercent(alarm.volumePercent) !== null && nativeAlarmVersion() < 4) {
          throw new Error('Install a rebuilt Calm Alarm APK to preview custom volume for both tone and speech.');
        }
      }
      catch (error) { Alert.alert('New APK required', error.message); finishRef.current(isPreview); return; }
    }
    const current = ++session.current;
    clearTimeout(timer.current);
    clearAudio();
    preview.current = isPreview;
    const messageDate = dateFromAlarm(alarm);
    setRing({ ...alarm, isPreview, messageDate });
    const durationMs = alarmDurationMs(alarm);
    deadline.current = Date.now() + durationMs;
    timer.current = setTimeout(() => { if (current === session.current) stop(); }, durationMs);
    const message = tokenText(alarm.message, messageDate);
    const language = speechLanguage();
    const active = () => current === session.current && Date.now() < deadline.current;

    if (Platform.OS === 'android' && nativeAlarmVersion() >= 4) {
      const token = `preview-${Date.now()}-${current}-${Math.random().toString(36).slice(2)}`;
      nativePreview.current = token;
      try { await startRingingPreview(token, message, normalizeDurationMinutes(alarm.durationMinutes), normalizeVolumePercent(alarm.volumePercent)); }
      catch (error) {
        if (current === session.current) { stop(); Alert.alert('Preview unavailable', String(error)); }
      }
      return;
    }

    const playCycle = async () => {
      if (!active()) return;
      try {
        if (Platform.OS === 'android') {
          await startDefaultTone();
          if (!active()) return;
        } else {
          const sound = createAudioPlayer(require('../../assets/chime.wav'));
          player.current = sound;
          sound.play();
        }
      } catch (error) { console.warn('Chime unavailable', error); }
      audioTimer.current = setTimeout(async () => {
        if (!active()) return;
        try { await stopDefaultTone(); } catch (error) { console.warn('Default tone cleanup', error); }
        if (!active()) return;
        try { player.current?.pause(); player.current?.remove(); } catch (error) { console.warn('Chime cleanup', error); }
        player.current = null;
        // onDone / onStopped / onError are speech lifecycle callbacks.
        // Recheck the session before restarting to prevent late callbacks after Stop.
        const next = () => {
          if (!active()) return;
          audioTimer.current = setTimeout(() => { if (active()) playCycle(); }, 300);
        };
        Speech.speak(message, { language, rate: 0.9, onDone: next, onStopped: () => {}, onError: (error) => { console.warn('Speech error', error); next(); } });
      }, CHIME_MS);
    };
    try { await setAudioModeAsync({ playsInSilentMode: true }); }
    catch (error) { console.warn('Audio mode', error); }
    if (active()) playCycle();
  }, [clearAudio, stop]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && deadline.current && Date.now() >= deadline.current) stop();
    });
    return () => subscription.remove();
  }, [stop]);
  useEffect(() => () => {
    session.current++;
    clearTimeout(timer.current);
    clearAudio();
  }, [clearAudio]);
  return { ring, start, stop };
}
