import React from 'react';
import {View,Text,TextInput} from 'react-native';
import {Button,Label} from '../components/Common';
import styles from '../styles/styles';
export default function PasswordScreen({unlockMode,password,setPassword,confirm,setConfirm,onSubmit,onCancel}){
 return <View style={styles.center}><View style={styles.modal}><Text style={styles.eyebrow}>PRIVACY</Text><Text style={styles.heading}>{unlockMode?'Password required':'Set up your password'}</Text><Text style={styles.muted}>{unlockMode?'Enter your password once to open the app.':'Optional protection, requested once per app launch.'}</Text><Label>Password</Label><TextInput secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" style={styles.input}/>{!unlockMode&&<><Label>Confirm password</Label><TextInput secureTextEntry value={confirm} onChangeText={setConfirm} placeholder="Confirm password" style={styles.input}/></>}<Button onPress={onSubmit}>{unlockMode?'Continue':'Save password'}</Button>{!unlockMode&&<Button secondary onPress={onCancel}>Cancel</Button>}</View></View>;
}
