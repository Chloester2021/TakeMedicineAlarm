import React,{useCallback} from 'react';
import {View,Text,TouchableOpacity,ScrollView,Keyboard,Platform} from 'react-native';
import {useTimePicker} from '../hooks/useTimePicker';
import {Button,Label} from '../components/Common';
import TimeInputDialog from '../components/TimeInputDialog';
import AlarmDurationSlider from '../components/AlarmDurationSlider';
import AlarmVolumeControl from '../components/AlarmVolumeControl';
import MessageEditor from '../components/MessageEditor';
import {WEEK,timeLabel} from '../utils/alarm';
import styles from '../styles/styles';
export default function AlarmEditor({draft,setDraft,onCancel,onSave,onPreview}){
 const onTime=useCallback((hour,minute)=>setDraft(prev=>({...prev,hour,minute})),[setDraft]);
 const picker=useTimePicker(onTime);
 return <View style={styles.page}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
  <View style={styles.headerRow}><View><Text style={styles.eyebrow}>SCHEDULE</Text><Text style={styles.heading}>{draft.id?'Edit alarm':'New alarm'}</Text></View><TouchableOpacity onPress={onCancel}><Text style={styles.close}>×</Text></TouchableOpacity></View>
  <Label>Time</Label><TouchableOpacity onPress={()=>{Keyboard.dismiss();picker.open(draft)}} style={styles.timeInput}><Text style={styles.bigTime}>{timeLabel(draft.hour,draft.minute)}</Text><Text style={styles.small}>Edit</Text></TouchableOpacity>
  {picker.visible&&<TimeInputDialog picker={picker}/>}
  <Label>Message</Label><MessageEditor value={draft.message} onChange={message=>setDraft(prev=>({...prev,message}))}/>
  <Label>Alarm duration</Label><AlarmDurationSlider value={draft.durationMinutes} onChange={durationMinutes=>setDraft(prev=>({...prev,durationMinutes}))}/>
  {Platform.OS==='android'&&<><Label>Alarm volume</Label><AlarmVolumeControl value={draft.volumePercent} onChange={volumePercent=>setDraft(prev=>({...prev,volumePercent}))}/></>}
  <TouchableOpacity onPress={()=>{Keyboard.dismiss();onPreview()}} style={styles.preview}><Text style={styles.previewText}>◎  Preview alarm card</Text></TouchableOpacity>
  <Label>Repeat</Label><View style={styles.weekRow}>{WEEK.map((day,i)=><TouchableOpacity key={i} onPress={()=>setDraft(prev=>({...prev,days:prev.days.includes(i)?prev.days.filter(d=>d!==i):[...prev.days,i].sort()}))} style={[styles.day,draft.days.includes(i)&&styles.dayActive]}><Text style={[styles.dayText,draft.days.includes(i)&&{color:'white'}]}>{day}</Text></TouchableOpacity>)}</View>
  <Text style={styles.hint}>{draft.days.length?'Repeats every week on selected days.':'Leave all days clear for a one-time alarm.'}</Text>
  <View style={styles.actions}><Button secondary style={{flex:1}} onPress={onCancel}>Cancel</Button><Button style={{flex:1}} onPress={onSave}>Save alarm</Button></View>
 </ScrollView></View>;
}
