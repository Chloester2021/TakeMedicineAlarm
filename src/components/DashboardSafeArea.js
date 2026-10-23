import React from 'react';
import { Platform, SafeAreaView as LegacySafeAreaView, UIManager, View } from 'react-native';

// Older development APKs do not contain these native views. Check the installed
// binary before loading or mounting the library; Metro cannot add native views.
const hasNativeSafeArea =
  UIManager.hasViewManagerConfig?.('RNCSafeAreaProvider') &&
  UIManager.hasViewManagerConfig?.('RNCSafeAreaView');
const nativeSafeArea = hasNativeSafeArea ? require('react-native-safe-area-context') : null;

export default function DashboardSafeArea({ children, style }) {
  if (nativeSafeArea) {
    const { SafeAreaProvider, SafeAreaView, initialWindowMetrics } = nativeSafeArea;
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics} style={style}>
        <SafeAreaView edges={['bottom', 'left', 'right']} style={style}>
          {children}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const Container = Platform.OS === 'ios' ? LegacySafeAreaView : View;
  // Conservative space for Android's three-button bar until the APK is rebuilt
  // with the native library, which then supplies the device's exact insets.
  return (
    <Container style={[style, Platform.OS === 'android' && { paddingBottom: 48 }]}>
      {children}
    </Container>
  );
}
