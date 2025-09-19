import { Stack } from 'expo-router';
import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

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

export default function AuthLayout() {

  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="login" 
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTitle: () => <HeaderTitle />,
          headerTitleAlign: 'center',
          headerBackTitle: 'Retour',
        }} 
      />
      <Stack.Screen 
        name="register" 
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTitle: () => <HeaderTitle />,
          headerTitleAlign: 'center',
          headerBackTitle: 'Retour',
        }} 
      />
    </Stack>
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