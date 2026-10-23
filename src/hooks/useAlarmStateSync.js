import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { storeAlarms, syncAlarmStates } from '../services/alarms';

// Android saves completion while JS sleeps; update the dashboard on return and
// while it is visible. Do not apply a snapshot over an intervening edit/toggle.
export function useAlarmStateSync(alarms, setAlarms) {
  const latest = useRef(alarms);
  latest.current = alarms;
  useEffect(() => {
    let disposed = false;
    let busy = false;
    const refresh = async () => {
      if (busy || AppState.currentState !== 'active') return;
      busy = true;
      const snapshot = latest.current;
      try {
        const next = await syncAlarmStates(snapshot);
        if (!disposed && latest.current === snapshot && next.some((alarm, i) => alarm !== snapshot[i])) {
          latest.current = next;
          setAlarms(next);
          await storeAlarms(next);
        }
      } catch (error) { console.warn('Alarm state sync', error); }
      finally { busy = false; }
    };
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    const interval = setInterval(refresh, 1000);
    return () => { disposed = true; clearInterval(interval); subscription.remove(); };
  }, [setAlarms]);
}
