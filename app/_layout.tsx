import { Stack } from "expo-router";
import { useEffect } from 'react';
import React from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { initDatabase } from '@/services/database';
import { AuthProvider } from '@/contexts/AuthContext';

function HeaderTitle() {
  return (
    <View style={styles.headerTitleContainer}>
      <Image 
        source={require('@/assets/images/Logo.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

export default function RootLayout() {

  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <AuthProvider>
      <Stack 
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#fff',
            ...(Platform.OS === 'ios' && {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            }),
            ...(Platform.OS === 'android' && {
              elevation: 4,
            }),
          },
          headerTitle: () => <HeaderTitle />,
          headerTitleAlign: 'center',
          headerBackTitle: 'Retour',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="trip" />
        <Stack.Screen name="step" />
      </Stack>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  headerTitleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 100,
  },
});