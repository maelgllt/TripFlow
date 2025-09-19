import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ImageBackground } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/icon-symbol';
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DatabaseService } from '@/services/database';
import { Trip } from '@/types/database';

export default function HomeScreen() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTrips = useCallback(async () => {
    if (!user) {
      setTrips([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const userTrips = await DatabaseService.getTripsByUserId(user.id);
      setTrips(userTrips);
    } catch (error) {
      console.error('Error loading trips:', error);
      Alert.alert('Erreur', 'Impossible de charger vos voyages');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, [loadTrips])
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Couleurs de fond par défaut si pas d'image
  const getDefaultBackgroundColor = (index: number) => {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    ];
    const solidColors = ['#667eea', '#f5576c', '#4facfe', '#43e97b'];
    return solidColors[index % solidColors.length];
  };

  const renderTripCard = ({ item, index }: { item: Trip; index: number }) => {
    if (item.cover_image) {
      // Affichage avec image
      return (
        <TouchableOpacity
          style={styles.tripCard}
          onPress={() => router.push(`/trip/${item.id}`)}
        >
          <ImageBackground
            source={{ uri: item.cover_image }}
            style={styles.cardBackground}
            imageStyle={styles.cardBackgroundImage}
          >
            <View style={styles.cardOverlay}>
              <View style={styles.cardContent}>
                <View style={styles.cardInfo}>
                  <Text style={styles.tripTitle}>{item.title}</Text>
                  <View style={styles.locationContainer}>
                    <IconSymbol name="location" size={12} color="#666" />
                    <Text style={styles.locationText}>
                      {item.description || 'Destination inconnue'}
                    </Text>
                  </View>
                  {item.start_date && item.end_date && (
                    <Text style={styles.dateText}>
                      du {formatDate(item.start_date)} au {formatDate(item.end_date)}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </ImageBackground>
        </TouchableOpacity>
      );
    } else {
      // Affichage sans image (fond coloré)
      return (
        <TouchableOpacity
          style={[styles.tripCard, { backgroundColor: getDefaultBackgroundColor(index) }]}
          onPress={() => router.push(`/trip/${item.id}`)}
        >
          <View style={styles.cardContent}>
            <View style={styles.cardInfo}>
              <Text style={styles.tripTitle}>{item.title}</Text>
              <View style={styles.locationContainer}>
                <IconSymbol name="location" size={12} color="#666" />
                <Text style={styles.locationText}>
                  {item.description || 'Destination inconnue'}
                </Text>
              </View>
              {item.start_date && item.end_date && (
                <Text style={styles.dateText}>
                  du {formatDate(item.start_date)} au {formatDate(item.end_date)}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <IconSymbol name="suitcase" size={64} color="#ccc" />
      <Text style={styles.emptyText}>Aucun voyage pour le moment</Text>
      <Text style={styles.emptySubtext}>Commencez votre première aventure !</Text>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>TripFlow</Text>
          <Text style={styles.subtitle}>Connectez-vous pour voir vos voyages</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vos voyages</Text>
      </View>

      <View style={styles.content}>
        {trips.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={trips}
            renderItem={renderTripCard}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.tripsList}
          />
        )}

        <Link href="/trip/create" asChild>
          <TouchableOpacity style={styles.createButton}>
            <IconSymbol name="plus.circle.fill" size={24} color="#fff" />
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
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  tripsList: {
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
  },
  tripCard: {
    width: '48%',
    height: 200,
    marginBottom: 15,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  cardBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardBackgroundImage: {
    borderRadius: 20,
  },
  cardOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
  },
  cardContent: {
    padding: 15,
    justifyContent: 'flex-end',
    flex: 1,
  },
  cardInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 12,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  dateText: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
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
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  createButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
});