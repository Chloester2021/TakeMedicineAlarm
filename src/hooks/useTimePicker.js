import { useCallback, useState } from 'react';

export function useTimePicker(onSelected) {
  const [visible, setVisible] = useState(false);
  const [hour, setHour] = useState('7');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState('AM');
  const [error, setError] = useState('');

  const open = useCallback(alarm => {
    setHour(String(alarm.hour % 12 || 12));
    setMinute(String(alarm.minute).padStart(2, '0'));
    setPeriod(alarm.hour >= 12 ? 'PM' : 'AM');
    setError('');
    setVisible(true);
  }, []);

  const close = useCallback(() => setVisible(false), []);
  const confirm = useCallback(() => {
    if (!/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute) ||
        Number(hour) < 1 || Number(hour) > 12 || Number(minute) > 59) {
      setError('Enter an hour from 1 to 12 and minutes from 00 to 59.');
      return;
    }
    onSelected(Number(hour) % 12 + (period === 'PM' ? 12 : 0), Number(minute));
    setVisible(false);
  }, [hour, minute, period, onSelected]);

  return { open, close, confirm, visible, hour, setHour, minute, setMinute, period, setPeriod, error };
}
