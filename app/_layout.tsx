import { Stack } from "expo-router";
import { useEffect } from 'react';
import React from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { initDatabase } from '@/services/database';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function HeaderTitle() {
  return (
    <View style={styles.headerTitleContainer}>
      <Image 
        source={require('@/assets/images/Logo_TripFlow.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

function RootLayoutNav() {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        // Rediriger vers l'app principale si connecté
        router.replace('/(tabs)');
      } else {
        // Rediriger vers l'authentification si pas connecté
        router.replace('/(auth)');
      }
    }
  }, [isAuthenticated, loading]);

  return (
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
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </GestureHandlerRootView>
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