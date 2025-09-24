import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { DatabaseService } from '@/services/database';
import { Trip, Step } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

export default function TripDetails() {
  const { tripId } = useLocalSearchParams();
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTripData = useCallback(async () => {
    if (!tripId || Array.isArray(tripId)) return;

    try {
      setIsLoading(true);
      
      const tripData = await DatabaseService.getTripById(parseInt(tripId));
      setTrip(tripData);

      const stepsData = await DatabaseService.getStepsByTripId(parseInt(tripId));
      setSteps(stepsData);
    } catch (error) {
      console.error('Error loading trip data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données du voyage');
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useFocusEffect(
    useCallback(() => {
      loadTripData();
    }, [loadTripData])
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getMapRegion = () => {
    const stepsWithCoords = steps.filter(step => step.latitude && step.longitude);
    
    if (stepsWithCoords.length === 0) {
      // région par défaut (France)
      return {
        latitude: 46.603354,
        longitude: 1.888334,
        latitudeDelta: 8.0,
        longitudeDelta: 8.0,
      };
    }

    if (stepsWithCoords.length === 1) {
      // une seule étape, zoom sur cette étape
      return {
        latitude: stepsWithCoords[0].latitude!,
        longitude: stepsWithCoords[0].longitude!,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    // calculer les limites pour englober toutes les étapes
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

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(deltaLat, 0.05),
      longitudeDelta: Math.max(deltaLng, 0.05),
    };
  };

  const onMarkerPress = (step: Step, index: number) => {
    Alert.alert(
      `Étape ${index + 1}: ${step.title}`,
      step.description || step.address || 'Aucune description',
      [
        {
          text: 'Voir les détails',
          onPress: () => router.push(`/step/${step.id}/details`),
        },
        {
          text: 'Fermer',
          style: 'cancel',
        },
      ]
    );
  };

  const getPolylineCoordinates = () => {
    const stepsWithCoords = steps.filter(step => step.latitude && step.longitude);
    return stepsWithCoords.map(step => ({
      latitude: step.latitude!,
      longitude: step.longitude!,
    }));
  };

  const renderStepCard = ({ item, index }: { item: Step; index: number }) => (
    <TouchableOpacity
      style={styles.stepCard}
      onPress={() => router.push(`/step/${item.id}/details`)}
    >
      <View style={styles.stepHeader}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>{index + 1}</Text>
        </View>
        <View style={styles.stepInfo}>
          <Text style={styles.stepTitle}>{item.title}</Text>
          {item.address && (
            <View style={styles.addressContainer}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.stepAddress}>{item.address}</Text>
            </View>
          )}
          {item.description && (
            <Text style={styles.stepDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          {item.start_date && (
            <Text style={styles.stepDate}>
              📅 {formatDate(item.start_date)}
              {item.end_date && item.end_date !== item.start_date && 
                ` - ${formatDate(item.end_date)}`
              }
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </View>
    </TouchableOpacity>
  );

  const renderEmptySteps = () => (
    <View style={styles.emptySteps}>
      <Ionicons name="map-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStepsText}>Aucune étape pour le moment</Text>
      <Text style={styles.emptyStepsSubtext}>
        Ajoutez des lieux à visiter pour votre voyage
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Voyage introuvable</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stepsWithCoords = steps.filter(step => step.latitude && step.longitude);
  const polylineCoordinates = getPolylineCoordinates();

  return (
  <View style={styles.container}>
    {/* Header */}
    <View style={styles.header}>
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>{trip.title}</Text>
        {trip.start_date && trip.end_date && (
          <Text style={styles.headerDate}>
            {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
          </Text>
        )}
      </View>
    </View>

    <ScrollView style={styles.content}>
      {/* MapView dynamique */}
      <View style={styles.mapContainer}>
        {stepsWithCoords.length > 0 ? (
          <MapView
            style={styles.map}
            initialRegion={getMapRegion()}
            showsUserLocation={true}
            showsMyLocationButton={true}
            mapType="standard"
          >
            {/* Polyline pour tracer le chemin entre les étapes */}
            {polylineCoordinates.length > 1 && (
              <Polyline
                coordinates={polylineCoordinates}
                strokeColor="#007AFF"
                strokeWidth={3}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* Marqueurs pour chaque étape */}
            {stepsWithCoords.map((step, index) => (
              <Marker
                key={step.id}
                coordinate={{
                  latitude: step.latitude!,
                  longitude: step.longitude!,
                }}
                title={`${index + 1}. ${step.title}`}
                description={step.address || step.description}
                onPress={() => onMarkerPress(step, index)}
              >
                <View style={styles.customMarker}>
                  <Text style={styles.markerText}>{index + 1}</Text>
                </View>
              </Marker>
            ))}
          </MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map" size={40} color="#007AFF" />
            <Text style={styles.mapPlaceholderText}>
              {steps.length === 0 ? 'Carte à venir' : 'Ajoutez des coordonnées aux étapes'}
            </Text>
            <Text style={styles.mapPlaceholderSubtext}>
              {steps.length} étape{steps.length > 1 ? 's' : ''} créée{steps.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
        
        {/* Overlay avec info carte */}
        {stepsWithCoords.length > 0 && (
          <View style={styles.mapInfoOverlay}>
            <Text style={styles.mapOverlayText}>
              {stepsWithCoords.length} étape{stepsWithCoords.length > 1 ? 's' : ''} sur la carte
              {polylineCoordinates.length > 1 && ' • Trajet tracé'}
            </Text>
          </View>
        )}
      </View>

      {/* Liste des étapes */}
      <View style={styles.stepsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Étapes ({steps.length})
          </Text>
        </View>

        {steps.length === 0 ? (
          renderEmptySteps()
        ) : (
          <View>
            {steps.map((item, index) => (
              <View key={item.id.toString()}>
                {renderStepCard({ item, index })}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>

    {/* Bouton d'ajout d'étape */}
    <TouchableOpacity
      style={styles.addStepButton}
      onPress={() => router.push(`/step/create?tripId=${tripId}`)}
    >
      <Ionicons name="add" size={24} color="#fff" />
      <Text style={styles.addStepButtonText}>Ajouter une étape</Text>
    </TouchableOpacity>

    {/* Bouton checklist */}
    <TouchableOpacity
      style={styles.addChecklistButton}
      onPress={() => router.push(`/checklist/create?tripId=${tripId}`)}
    >
      <Ionicons name="list" size={24} color="#fff" />
      <Text style={styles.addChecklistButtonText}>Checklist</Text>
    </TouchableOpacity>
  </View>
);
}

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerInfo: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  headerDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    margin: 15,
    marginBottom: 20,
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapInfoOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  mapOverlayText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  customMarker: {
    backgroundColor: '#007AFF',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mapPlaceholder: {
    height: 250,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: '#007AFF',
    marginTop: 10,
  },
  mapPlaceholderSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  stepsSection: {
    paddingHorizontal: 15,
    paddingBottom: 100,
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  stepCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 30,
    height: 30,
    backgroundColor: '#007AFF',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepAddress: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  stepDate: {
    fontSize: 12,
    color: '#007AFF',
  },
  emptySteps: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStepsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyStepsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  addStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    marginBottom: 20,
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
  addStepButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  addChecklistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#13aa06ff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#13aa06ff',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addChecklistButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});