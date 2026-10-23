import React from 'react';
import {View,Text,TextInput,KeyboardAvoidingView,Platform,ScrollView,StyleSheet} from 'react-native';
import {Button,Label} from '../components/Common';
import styles from '../styles/styles';

export default function PasswordScreen({unlockMode,password,setPassword,confirm,setConfirm,onSubmit,onCancel}){
 return <KeyboardAvoidingView style={local.page} behavior={Platform.OS==='ios'?'padding':'height'}>
  <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={local.content}>
   <View style={[styles.modal,local.card]}>
    <Text style={styles.eyebrow}>PRIVACY</Text>
    <Text style={styles.heading}>{unlockMode?'Password required':'Set up your password'}</Text>
    <Text style={styles.muted}>{unlockMode?'Enter your password once to open the app.':'Optional protection, requested once per app launch.'}</Text>
    <Label>Password</Label>
    <TextInput secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" style={styles.input}/>
    {!unlockMode&&<><Label>Confirm password</Label><TextInput secureTextEntry value={confirm} onChangeText={setConfirm} placeholder="Confirm password" style={styles.input}/></>}
    <View style={local.actions}>
     <Button style={local.button} onPress={onSubmit}>{unlockMode?'Continue':'Save password'}</Button>
     {!unlockMode&&<Button secondary style={local.button} onPress={onCancel}>Cancel</Button>}
    </View>
   </View>
  </ScrollView>
 </KeyboardAvoidingView>;
}
const local=StyleSheet.create({
 page:{flex:1,backgroundColor:'#899da4'},
 content:{flexGrow:1,justifyContent:'center',padding:24},
 card:{width:'100%',maxWidth:420,alignSelf:'center'},
 actions:{marginTop:24,gap:12},
 button:{minHeight:48},
});
