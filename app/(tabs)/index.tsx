import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { IconSymbol } from '@/components/icon-symbol';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TripFlow</Text>
        <Text style={styles.subtitle}>Vos voyages récents</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.emptyState}>
          <IconSymbol name="suitcase" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Aucun voyage pour le moment</Text>
          <Text style={styles.emptySubtext}>Commencez votre première aventure !</Text>
        </View>

        <Link href="/trip/create" asChild>
          <TouchableOpacity style={styles.createButton}>
            <IconSymbol name="plus.circle.fill" size={24} color="#007AFF" />
            <Text style={styles.createButtonText}>Créer un nouveau voyage</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
});