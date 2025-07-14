import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { NotificationService } from './src/services/notificationService';
import { OfflineService } from './src/services/offlineService';
import { useEffect } from 'react';
import './global.css';

export default function App() {
  useEffect(() => {
    // Initialize services
    NotificationService.registerForPushNotifications();
    OfflineService.initialize();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}