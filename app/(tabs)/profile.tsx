import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  useColorScheme,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import React, { useEffect, useState } from 'react';
import { DatabaseService } from '@/services/database';
// ...existing code...

export default function ProfileScreen() {
  const { user, logout, deleteAccount } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const isDark = scheme === 'dark';

  // Stats states: only trips now
  const [tripCount, setTripCount] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  useEffect(() => {
    const loadStats = async () => {
      setLoadingStats(true);
      try {
        const uid = (user as any)?.id ?? (user as any)?.userId ?? null;

        // --- TRIPS (robust) ---
        let trips: any[] = [];
        if (typeof (DatabaseService as any).getTripsByUserId === 'function') {
          trips = await (DatabaseService as any).getTripsByUserId(uid);
        } else if (typeof (DatabaseService as any).getTripsForUser === 'function') {
          trips = await (DatabaseService as any).getTripsForUser(uid);
        } else if (typeof (DatabaseService as any).getAllTrips === 'function') {
          const all = await (DatabaseService as any).getAllTrips();
          trips = uid ? (all || []).filter((t: any) => String(t.user_id ?? t.userId) === String(uid)) : (all || []);
        }
        setTripCount(Array.isArray(trips) ? trips.length : 0);
      } catch (err) {
        console.warn('Erreur chargement statistiques', err);
        setTripCount(0);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [user]);

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Erreur lors de la déconnexion:', error);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Cette action est irréversible. Toutes vos données seront définitivement supprimées.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmation finale',
              'Êtes-vous vraiment sûr de vouloir supprimer votre compte ?',
              [
                {
                  text: 'Annuler',
                  style: 'cancel',
                },
                {
                  text: 'Oui, supprimer',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const success = await deleteAccount();
                      if (success) {
                        Alert.alert('Compte supprimé', 'Votre compte a été supprimé avec succès.');
                      } else {
                        Alert.alert('Erreur', 'Impossible de supprimer le compte. Veuillez réessayer.');
                      }
                    } catch (error) {
                      console.error('Erreur lors de la suppression:', error);
                      Alert.alert('Erreur', 'Une erreur est survenue lors de la suppression du compte.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {/* Titre en noir */}
        <Text style={[styles.title, { color: '#000' }]}>Profil</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Nom</Text>
            <Text style={styles.value}>{user?.name || 'Non renseigné'}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user?.email || 'Non renseigné'}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.label}>Membre depuis</Text>
            <Text style={styles.value}>
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Non renseigné'}
            </Text>
          </View>
        </View>

        {/* Statistique unique : carte centrée */}
        <View style={styles.singleStatCard}>
          <Ionicons name="airplane-outline" size={36} color="#1f2937" />
          <Text style={styles.singleStatNumber}>{loadingStats ? '…' : tripCount}</Text>
          <Text style={styles.singleStatLabel}>Voyages</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={24} color="#fff" />
          <Text style={styles.deleteText}>Supprimer le compte</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ...existing code...
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },

  // New single-stat style
  singleStatCard: {
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  singleStatNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: '#111827',
    marginTop: 8,
  },
  singleStatLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
  },

  statsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  infoItem: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: '#8B0000',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deleteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});