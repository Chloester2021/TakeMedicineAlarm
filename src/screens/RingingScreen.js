import React from 'react';
import {View,Text,StatusBar} from 'react-native';
import {Button} from '../components/Common';
import {timeLabel,tokenText,dateFromAlarm} from '../utils/alarm';
import {durationLabel} from '../utils/alarmDuration';
import styles from '../styles/styles';
export default function RingingScreen({alarm,onStop}){
 return <View style={styles.ringing}><StatusBar barStyle="light-content"/><Text style={styles.ringEyebrow}>{alarm.isPreview?'ALARM PREVIEW':'ALARM RINGING'}</Text><Text style={styles.ringTitle}>Time to wake up</Text><Text style={styles.ringName}>Alarm</Text><Text style={styles.ringTime}>{timeLabel(alarm.hour,alarm.minute)}</Text><Text style={styles.ringMessage}>{tokenText(alarm.message,alarm.messageDate || dateFromAlarm(alarm))}</Text><Button onPress={onStop} style={styles.stopButton}>Stop</Button><Text style={styles.ringFooter}>{alarm.isPreview?`Preview mode · ${durationLabel(alarm.durationMinutes)}`:`Automatically stops after ${durationLabel(alarm.durationMinutes)}`}</Text></View>;
}
