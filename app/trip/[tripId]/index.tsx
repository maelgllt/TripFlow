import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function TripDetails() {
  const { tripId } = useLocalSearchParams();
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Détails du voyage</Text>
      <Text>Trip ID: {tripId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});