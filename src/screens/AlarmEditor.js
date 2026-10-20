import React,{useRef,useCallback} from 'react';
import {View,Text,TextInput,TouchableOpacity,ScrollView,Keyboard} from 'react-native';
import {useTimePicker} from '../hooks/useTimePicker';
import {Button,Label} from '../components/Common';
import TimeInputDialog from '../components/TimeInputDialog';
import {WEEK,timeLabel} from '../utils/alarm';
import styles from '../styles/styles';
export default function AlarmEditor({draft,setDraft,onCancel,onSave,onPreview}){
 const selection=useRef({start:0,end:0}),messageRef=useRef(null);
 const onTime=useCallback((hour,minute)=>setDraft(prev=>({...prev,hour,minute})),[setDraft]);
 const picker=useTimePicker(onTime);
 const insertToken=token=>{const message=draft.message||'';const {start,end}=selection.current;setDraft(prev=>({...prev,message:message.slice(0,start)+token+message.slice(end)}));selection.current={start:start+token.length,end:start+token.length};messageRef.current?.focus()};
 return <View style={styles.page}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
  <View style={styles.headerRow}><View><Text style={styles.eyebrow}>SCHEDULE</Text><Text style={styles.heading}>{draft.id?'Edit alarm':'New alarm'}</Text></View><TouchableOpacity onPress={onCancel}><Text style={styles.close}>×</Text></TouchableOpacity></View>
  <Label>Time</Label><TouchableOpacity onPress={()=>{Keyboard.dismiss();picker.open(draft)}} style={styles.timeInput}><Text style={styles.bigTime}>{timeLabel(draft.hour,draft.minute)}</Text><Text style={styles.small}>Edit</Text></TouchableOpacity>
  {picker.visible&&<TimeInputDialog picker={picker}/>}
  <Label>Message</Label><TextInput ref={messageRef} style={[styles.input,{minHeight:48}]} placeholder="e.g. Good morning, today is {day}" value={draft.message} onChangeText={message=>setDraft(prev=>({...prev,message}))} onSelectionChange={e=>selection.current=e.nativeEvent.selection} multiline/>
  <View style={styles.tokenRow}>{[['▦','day','{day}'],['▤','date','{date}'],['◷','time','{time}']].map(([ico,name,token])=><TouchableOpacity key={name} onPress={()=>insertToken(token)} style={styles.token}><Text style={styles.tokenIcon}>{ico}</Text><Text style={styles.tokenLabel}>{name}</Text></TouchableOpacity>)}</View>
  <TouchableOpacity onPress={()=>{Keyboard.dismiss();onPreview()}} style={styles.preview}><Text style={styles.previewText}>◎  Preview alarm card</Text></TouchableOpacity>
  <Label>Repeat</Label><View style={styles.weekRow}>{WEEK.map((day,i)=><TouchableOpacity key={i} onPress={()=>setDraft(prev=>({...prev,days:prev.days.includes(i)?prev.days.filter(d=>d!==i):[...prev.days,i].sort()}))} style={[styles.day,draft.days.includes(i)&&styles.dayActive]}><Text style={[styles.dayText,draft.days.includes(i)&&{color:'white'}]}>{day}</Text></TouchableOpacity>)}</View>
  <Text style={styles.hint}>{draft.days.length?'Repeats on selected days.':'Leave all days clear for a one-time alarm.'}</Text>
  <Label>Sound</Label><View style={styles.input}><Text style={{color:'#173346'}}>Gentle chime (system sound picker requires native Android integration)</Text></View>
  <View style={styles.actions}><Button secondary style={{flex:1}} onPress={onCancel}>Cancel</Button><Button style={{flex:1}} onPress={onSave}>Save alarm</Button></View>
 </ScrollView></View>;
}
