import { resolveLanguage } from './language';
import { separateMessageTokens } from './messageTokens';
export const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
export const defaultDraft = () => ({id:null,hour:7,minute:0,message:'',days:[],enabled:true,durationMinutes:1,volumePercent:null});
const two = n => String(n).padStart(2,'0');
export const timeLabel = (h,m) => `${two((h%12)||12)}:${two(m)} ${h>=12?'PM':'AM'}`;
export const tokenText = (message, date = new Date(), language = 'system') => {
 const locale = resolveLanguage(language);
 const format = (options) => new Intl.DateTimeFormat(locale, options).format(date);
 return separateMessageTokens(message || 'Time to wake up')
  .replace(/\{day\}/g, format({ weekday: 'long' }))
  .replace(/\{date\}/g, format({ year: 'numeric', month: 'long', day: 'numeric' }))
  .replace(/\{time\}/g, format({ hour: 'numeric', minute: '2-digit' }));
};
export const dateFromAlarm = alarm => {const d=new Date();d.setHours(alarm.hour,alarm.minute,0,0);return d;};
