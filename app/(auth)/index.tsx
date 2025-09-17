import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuthIndexScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('@/assets/images/Logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeTitle}>Bienvenue sur TripFlow</Text>
          <Text style={styles.welcomeSubtitle}>
            Organisez vos voyages et partagez vos aventures
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.loginButton]}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.registerButton]}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.registerButtonText}>S'inscrire</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logo: {
    width: 200,
    height: 150,
  },
  welcomeContainer: {
    marginBottom: 60,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  button: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: '#007AFF',
  },
  registerButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  registerButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '600',
  },
});