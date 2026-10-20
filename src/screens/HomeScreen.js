import React from 'react';
import {View,Text,ScrollView,TouchableOpacity,Switch,Alert} from 'react-native';
import {Button} from '../components/Common';
import {WEEK,timeLabel} from '../utils/alarm';
import styles from '../styles/styles';
export default function HomeScreen({now,alarms,onAdd,onEdit,onDelete,onToggle,passwordEnabled,onPassword}){
 return <View style={styles.home}><ScrollView contentContainerStyle={styles.homeScroll}>
  <View style={styles.headerRow}><View><Text style={styles.eyebrow}>DAILY RHYTHM</Text><Text style={styles.appTitle}>Alarm Clock</Text></View><View style={styles.localTime}><Text style={styles.small}>LOCAL TIME</Text><Text style={styles.localTimeValue}>{timeLabel(now.getHours(),now.getMinutes())}</Text></View></View>
  <View style={styles.hero}><Text style={styles.small}>{now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</Text><Text style={styles.heroTime}>{timeLabel(now.getHours(),now.getMinutes())}</Text><Text style={styles.muted}>Your next calm start begins here.</Text></View>
  <View style={styles.headerRow}><View><Text style={styles.sectionTitle}>Your alarms</Text><Text style={styles.muted}>Ready when you are.</Text></View><Button onPress={onAdd}>＋ Add</Button></View>
  {alarms.length===0&&<View style={styles.alarmCard}><Text style={styles.muted}>No alarms yet. Add your first alarm.</Text></View>}
  {[...alarms].sort((a,b)=>a.hour*60+a.minute-b.hour*60).map(a=><View key={a.id} style={styles.alarmCard}><View style={styles.headerRow}><View style={{flex:1}}><Text style={styles.cardTime}>{timeLabel(a.hour,a.minute)}</Text><Text style={styles.cardMessage} numberOfLines={2}>{a.message||'Alarm'}</Text><Text style={styles.small}>{a.days.length?a.days.map(i=>WEEK[i]).join(' · '):'Once'}</Text></View><Switch value={a.enabled} onValueChange={()=>onToggle(a)} trackColor={{true:'#0d7b72'}}/></View><View style={styles.cardBottom}><Text style={styles.soundText}>♫  GENTLE</Text><View style={{flexDirection:'row',gap:22}}><TouchableOpacity onPress={()=>onEdit(a)}><Text style={styles.actionIcon}>✎</Text></TouchableOpacity><TouchableOpacity onPress={()=>Alert.alert('Delete alarm?','This cannot be undone.',[{text:'Cancel'},{text:'Delete',style:'destructive',onPress:()=>onDelete(a)}])}><Text style={[styles.actionIcon,{color:'#e84a5a'}]}>♜</Text></TouchableOpacity></View></View></View>)}
 </ScrollView><View style={styles.footer}><Text style={styles.footerPill}>◉  Alarms</Text><TouchableOpacity style={styles.passwordButton} onPress={onPassword}><Text style={styles.buttonText}>{passwordEnabled?'✓ Password on':'♧ Set up password'}</Text></TouchableOpacity></View></View>;
}
