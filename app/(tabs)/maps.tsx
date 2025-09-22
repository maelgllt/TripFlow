import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { DatabaseService } from '@/services/database';
import { useAuth } from '@/contexts/AuthContext';
import { Trip, Step } from '@/types/database';

interface TripWithSteps extends Trip {
  steps: Step[];
}

export default function MapsScreen() {
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);
  const [trips, setTrips] = useState<TripWithSteps[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastClickedStepId, setLastClickedStepId] = useState<number | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 46.603354,
    longitude: 1.888334,
    latitudeDelta: 8.0,
    longitudeDelta: 8.0,
  });

  const loadTripsWithSteps = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const userTrips = await DatabaseService.getTripsByUserId(user.id);
      
      const tripsWithSteps = await Promise.all(
        userTrips.map(async (trip) => {
          const steps = await DatabaseService.getStepsByTripId(trip.id);
          return { ...trip, steps };
        })
      );

      setTrips(tripsWithSteps);
      
      // Sélectionner le premier voyage par défaut s'il y en a un
      if (tripsWithSteps.length > 0 && !selectedTripId) {
        setSelectedTripId(tripsWithSteps[0].id);
        calculateMapRegion(tripsWithSteps[0].steps);
      }
    } catch (error) {
      console.error('Error loading trips:', error);
      Alert.alert('Erreur', 'Impossible de charger les voyages');
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedTripId]);

  useFocusEffect(
    useCallback(() => {
      loadTripsWithSteps();
    }, [loadTripsWithSteps])
  );

  const calculateMapRegion = (steps: Step[]) => {
    const stepsWithCoords = steps.filter(step => step.latitude && step.longitude);
    
    if (stepsWithCoords.length === 0) {
      const region = {
        latitude: 46.603354,
        longitude: 1.888334,
        latitudeDelta: 8.0,
        longitudeDelta: 8.0,
      };
      setMapRegion(region);
      mapRef.current?.animateToRegion(region, 1000);
      return;
    }

    if (stepsWithCoords.length === 1) {
      const region = {
        latitude: stepsWithCoords[0].latitude!,
        longitude: stepsWithCoords[0].longitude!,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setMapRegion(region);
      mapRef.current?.animateToRegion(region, 1000);
      return;
    }

    const lats = stepsWithCoords.map(step => step.latitude!);
    const lngs = stepsWithCoords.map(step => step.longitude!);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    const deltaLat = (maxLat - minLat) * 1.3;
    const deltaLng = (maxLng - minLng) * 1.3;

    const region = {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(deltaLat, 0.05),
      longitudeDelta: Math.max(deltaLng, 0.05),
    };
    
    setMapRegion(region);
    mapRef.current?.animateToRegion(region, 1000);
  };

  const selectTrip = (tripId: number) => {
    setSelectedTripId(tripId);
    setLastClickedStepId(null); // Reset du step sélectionné quand on change de voyage
    const trip = trips.find(t => t.id === tripId);
    if (trip) {
      calculateMapRegion(trip.steps);
    }
  };

  const onMarkerPress = (step: Step, tripTitle: string, stepIndex: number) => {
    // Si c'est le même step que le dernier cliqué, afficher l'alert
    if (lastClickedStepId === step.id) {
      Alert.alert(
        `${tripTitle} - Étape ${stepIndex + 1}`,
        `${step.title}\n${step.description || step.address || 'Aucune description'}`,
        [
          {
            text: 'Voir les détails',
            onPress: () => router.push(`/step/${step.id}/details`),
          },
          {
            text: 'Voir le voyage',
            onPress: () => router.push(`/trip/${step.trip_id}`),
          },
          {
            text: 'Fermer',
            style: 'cancel',
          },
        ]
      );
      setLastClickedStepId(null); // Reset après avoir affiché l'alert
    } else {
      // Premier clic : zoomer sur l'étape
      setLastClickedStepId(step.id);
      zoomToStep(step);
    }
  };

  const zoomToStep = (step: Step) => {
    if (step.latitude && step.longitude) {
      const region = {
        latitude: step.latitude,
        longitude: step.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setMapRegion(region);
      // Utiliser animateToRegion pour une animation fluide
      mapRef.current?.animateToRegion(region, 800);
    }
  };

  const getPolylineCoordinates = (steps: Step[]) => {
    return steps
      .filter(step => step.latitude && step.longitude)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map(step => ({
        latitude: step.latitude!,
        longitude: step.longitude!,
      }));
  };

  const getCityName = (address: string | null | undefined): string => {
    if (!address) return '';
    const firstCommaIndex = address.indexOf(',');
    return firstCommaIndex !== -1 ? address.substring(0, firstCommaIndex).trim() : address;
  };

  const animateStepChange = (step: Step) => {
    if (
      typeof step.latitude === 'number' &&
      typeof step.longitude === 'number' &&
      mapRef.current
    ) {
      const dezoomRegion = {
        latitude: step.latitude as number,
        longitude: step.longitude as number,
        latitudeDelta: 1.5,
        longitudeDelta: 1.5,
      };
      mapRef.current.animateToRegion(dezoomRegion, 1000);

      setTimeout(() => {
        const zoomRegion = {
          latitude: step.latitude as number,
          longitude: step.longitude as number,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        mapRef.current?.animateToRegion(zoomRegion, 1000);
        setMapRegion(zoomRegion);
      }, 1000);
    }
  };

  const selectedTrip = trips.find(trip => trip.id === selectedTripId);
  const stepsWithCoords = selectedTrip?.steps.filter(step => step.latitude && step.longitude) || [];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement des cartes...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Connectez-vous pour voir vos cartes</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sélecteur de voyage */}
      <View style={styles.tripSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {trips.map(trip => (
            <TouchableOpacity
              key={trip.id}
              style={[
                styles.tripButton,
                selectedTripId === trip.id && styles.tripButtonActive
              ]}
              onPress={() => selectTrip(trip.id)}
            >
              <Text style={[
                styles.tripButtonText,
                selectedTripId === trip.id && styles.tripButtonTextActive
              ]}>
                {trip.title}
              </Text>
              <Text style={styles.tripStepCount}>
                {trip.steps.filter(s => s.latitude && s.longitude).length} étapes
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Carte */}
      <View style={styles.mapContainer}>
        {trips.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Aucun voyage à afficher</Text>
            <Text style={styles.emptySubtext}>Créez votre premier voyage !</Text>
          </View>
        ) : selectedTrip ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={mapRegion}
            showsUserLocation={true}
            showsMyLocationButton={true}
            mapType="standard"
            onPress={() => setLastClickedStepId(null)} // Reset du step sélectionné quand on clique sur la carte
          >
            {/* Polyline pour l'itinéraire */}
            {stepsWithCoords.length > 1 && (
              <Polyline
                coordinates={getPolylineCoordinates(selectedTrip.steps)}
                strokeColor="#007AFF"
                strokeWidth={3}
                lineCap="round"
                lineJoin="round"
              />
            )}
            
            {/* Marqueurs */}
            {stepsWithCoords.map((step, index) => (
              <Marker
                key={step.id}
                coordinate={{
                  latitude: step.latitude!,
                  longitude: step.longitude!,
                }}
                title={`${index + 1}. ${step.title}`}
                description={getCityName(step.address) || getCityName(step.description) || 'Lieu non spécifié'}
              >
                <TouchableOpacity
                  onPress={() => onMarkerPress(step, selectedTrip.title, index)}
                  style={[
                    styles.customMarker,
                    lastClickedStepId === step.id && styles.customMarkerSelected
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.markerText}>{index + 1}</Text>
                </TouchableOpacity>
              </Marker>
            ))}
          </MapView>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Sélectionnez un voyage</Text>
            <Text style={styles.emptySubtext}>Choisissez un voyage dans la liste ci-dessus</Text>
          </View>
        )}

        {/* Info overlay */}
        {selectedTrip && stepsWithCoords.length > 0 && (
          <View style={styles.mapInfoOverlay}>
            <Text style={styles.mapOverlayText}>
              {stepsWithCoords.length} étape{stepsWithCoords.length > 1 ? 's' : ''} • {selectedTrip.title}
            </Text>
          </View>
        )}
      </View>

      {/* Liste des étapes pour zoom rapide */}
      {selectedTrip && stepsWithCoords.length > 0 && (
        <View style={styles.stepsList}>
          <Text style={styles.stepsListTitle}>Étapes du voyage</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {stepsWithCoords
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
            .map((step, index) => (
              <React.Fragment key={step.id}>
                <TouchableOpacity
                  style={[
                    styles.stepItem,
                    lastClickedStepId === step.id && styles.stepItemSelected
                  ]}
                  onPress={() => {
                    if (lastClickedStepId === step.id) {
                      Alert.alert(
                        `${selectedTrip.title} - Étape ${index + 1}`,
                        `${step.title}\n${step.description || step.address || 'Aucune description'}`,
                        [
                          {
                            text: 'Voir les détails',
                            onPress: () => router.push(`/step/${step.id}/details`),
                          },
                          {
                            text: 'Voir le voyage',
                            onPress: () => router.push(`/trip/${step.trip_id}`),
                          },
                          {
                            text: 'Fermer',
                            style: 'cancel',
                          },
                        ]
                      );
                      setLastClickedStepId(null);
                    } else {
                      setLastClickedStepId(step.id);
                      animateStepChange(step);
                    }
                  }}
                >
                  <View style={[
                    styles.stepNumber,
                    lastClickedStepId === step.id && styles.stepNumberSelected
                  ]}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepTitle} numberOfLines={1}>
                    {step.title}
                  </Text>
                </TouchableOpacity>
                {/* Flèche sauf après le dernier élément */}
                {index < stepsWithCoords.length - 1 && (
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color="#007AFF"
                    style={{ alignSelf: 'center', marginHorizontal: 2 }}
                  />
                )}
              </React.Fragment>
            ))}
        </ScrollView>
        </View>
      )}
    </View>
  );
}

// Fonction utilitaire pour générer des couleurs différentes par voyage
const getColorForTrip = (tripId: number): string => {
  const colors = ['#007AFF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  return colors[tripId % colors.length];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  tripSelector: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tripButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    alignItems: 'center',
  },
  tripButtonActive: {
    backgroundColor: '#007AFF',
  },
  tripButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  tripButtonTextActive: {
    color: '#fff',
  },
  tripStepCount: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  customMarker: {
    backgroundColor: '#007AFF',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  customMarkerSelected: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FFD700',
    borderWidth: 3,
  },
  markerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mapInfoOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 8,
  },
  mapOverlayText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  stepsList: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 15,
    maxHeight: 120,
  },
  stepsListTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#1a1a1a',
  },
  stepItem: {
    alignItems: 'center',
    marginRight: 15,
    width: 80,
  },
  stepItemSelected: {
    opacity: 0.8,
  },
  stepNumber: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  stepNumberSelected: {
    backgroundColor: '#FF6B6B',
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
  },
});