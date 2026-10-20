import React from 'react';
import {TouchableOpacity,Text} from 'react-native';
import styles from '../styles/styles';
export const Button=({children,onPress,secondary=false,style})=><TouchableOpacity onPress={onPress} style={[styles.button,secondary&&styles.secondary,style]}><Text style={[styles.buttonText,secondary&&{color:'#173346'}]}>{children}</Text></TouchableOpacity>;
export const Label=({children})=><Text style={styles.label}>{children}</Text>;
