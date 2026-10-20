import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Speech from 'expo-speech';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { tokenText } from '../utils/alarm';
import { speechLanguage } from '../utils/language';

// In-app preview / foreground playback ONLY. Android background and lock-screen
// playback must be implemented in a native foreground service.
const DURATION_MS = 60000;
const CHIME_MS = 2200;
export function useRinging(onFinish) {
  const [ring, setRing] = useState(null);
  const timer = useRef(null);
  const audioTimer = useRef(null);
  const player = useRef(null);
  const session = useRef(0);
  const deadline = useRef(null);
  const preview = useRef(false);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  const clearAudio = useCallback(() => {
    clearTimeout(audioTimer.current);
    Speech.stop();
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
    const current = ++session.current;
    clearTimeout(timer.current);
    clearAudio();
    preview.current = isPreview;
    setRing({ ...alarm, isPreview });
    deadline.current = Date.now() + DURATION_MS;
    timer.current = setTimeout(() => { if (current === session.current) stop(); }, DURATION_MS);
    const message = tokenText(alarm.message, new Date());
    const language = speechLanguage();
    const active = () => current === session.current && Date.now() < deadline.current;

    const playCycle = async () => {
      if (!active()) return;
      try {
        const sound = createAudioPlayer(require('../../assets/chime.wav'));
        player.current = sound;
        sound.play();
      } catch (error) { console.warn('Chime unavailable', error); }
      audioTimer.current = setTimeout(() => {
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
