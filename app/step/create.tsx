import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DatabaseService } from '@/services/database';
import { NominatimService, NominatimResult } from '@/services/nominatim';
import { Trip } from '@/types/database';

export default function CreateStep() {
  const { tripId } = useLocalSearchParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [stepTitle, setStepTitle] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<NominatimResult | null>(null);
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  const loadTrip = async () => {
    if (!tripId || Array.isArray(tripId)) return;

    try {
      const tripData = await DatabaseService.getTripById(parseInt(tripId));
      setTrip(tripData);
    } catch (error) {
      console.error('Error loading trip:', error);
      Alert.alert('Erreur', 'Impossible de charger les données du voyage');
    }
  };

  const searchLocation = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await NominatimService.searchLocation(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Erreur', 'Impossible de rechercher la ville');
    } finally {
      setIsSearching(false);
    }
  };

  const selectLocation = (location: NominatimResult) => {
    setSelectedLocation(location);
    setCityQuery(location.display_name);
    setSearchResults([]);
  };

  const validateDates = (start: Date, end: Date): string | null => {
    if (!trip) return 'Données du voyage non disponibles';

    const tripStart = trip.start_date ? new Date(trip.start_date) : null;
    const tripEnd = trip.end_date ? new Date(trip.end_date) : null;

    if (tripStart && start < tripStart) {
      return 'La date de début doit être après le début du voyage';
    }

    if (tripEnd && end > tripEnd) {
      return 'La date de fin doit être avant la fin du voyage';
    }

    if (start > end) {
      return 'La date de début ne peut pas être après la date de fin';
    }

    return null;
  };

  const handleCreateStep = async () => {
    if (!stepTitle.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom pour l\'étape');
      return;
    }

    if (!selectedLocation) {
      Alert.alert('Erreur', 'Veuillez sélectionner une ville');
      return;
    }

    if (!startDate || !endDate) {
      Alert.alert('Erreur', 'Veuillez sélectionner les dates de l\'étape');
      return;
    }

    const dateError = validateDates(startDate, endDate);
    if (dateError) {
      Alert.alert('Erreur', dateError);
      return;
    }

    if (!tripId || Array.isArray(tripId)) return;

    setIsLoading(true);

    try {
      const stepId = await DatabaseService.createStep(
        parseInt(tripId),
        stepTitle.trim(),
        description.trim() || undefined,
        parseFloat(selectedLocation.lat),
        parseFloat(selectedLocation.lon),
        selectedLocation.display_name,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      if (stepId) {
        Alert.alert(
          'Succès',
          'Étape créée avec succès !',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert('Erreur', 'Impossible de créer l\'étape');
      }
    } catch (error) {
      console.error('Error creating step:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la création de l\'étape');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Sélectionner une date';
    return date.toLocaleDateString('fr-FR');
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || startDate;
    setShowStartDatePicker(Platform.OS === 'ios');
    setStartDate(currentDate);
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || endDate;
    setShowEndDatePicker(Platform.OS === 'ios');
    setEndDate(currentDate);
  };

  const renderLocationResult = ({ item }: { item: NominatimResult }) => (
    <TouchableOpacity
      style={styles.locationResult}
      onPress={() => selectLocation(item)}
    >
      <Ionicons name="location-outline" size={16} color="#007AFF" />
      <Text style={styles.locationText} numberOfLines={2}>
        {item.display_name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nouvelle étape</Text>
      </View>

      <View style={styles.form}>
        {/* Nom de l'étape */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom de l'étape *</Text>
          <TextInput
            style={styles.input}
            value={stepTitle}
            onChangeText={setStepTitle}
            placeholder="Ex: Visite du Colisée"
            placeholderTextColor="#999"
          />
        </View>

        {/* Recherche de ville */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ville *</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.input}
              value={cityQuery}
              onChangeText={(text) => {
                setCityQuery(text);
                setSelectedLocation(null);
                searchLocation(text);
              }}
              placeholder="Rechercher une ville..."
              placeholderTextColor="#999"
            />
            {isSearching && (
              <ActivityIndicator
                size="small"
                color="#007AFF"
                style={styles.searchLoader}
              />
            )}
          </View>

          {/* Résultats de recherche */}
          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              <FlatList
                data={searchResults}
                renderItem={renderLocationResult}
                keyExtractor={(item) => item.place_id.toString()}
                style={styles.resultsList}
                nestedScrollEnabled={true}
              />
            </View>
          )}

          {/* Localisation sélectionnée */}
          {selectedLocation && (
            <View style={styles.selectedLocation}>
              <Ionicons name="checkmark-circle" size={16} color="#28a745" />
              <Text style={styles.selectedLocationText}>
                Coordonnées: {parseFloat(selectedLocation.lat).toFixed(4)}, {parseFloat(selectedLocation.lon).toFixed(4)}
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Décrivez cette étape..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Dates */}
        <View style={styles.dateRow}>
          <View style={[styles.inputGroup, styles.dateInput]}>
            <Text style={styles.label}>Date de début *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {formatDate(startDate)}
              </Text>
              <Ionicons name="calendar" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <View style={[styles.inputGroup, styles.dateInput]}>
            <Text style={styles.label}>Date de fin *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {formatDate(endDate)}
              </Text>
              <Ionicons name="calendar" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Contrainte de dates du voyage */}
        {trip && (trip.start_date || trip.end_date) && (
          <View style={styles.dateConstraint}>
            <Text style={styles.dateConstraintText}>
              📅 Dates du voyage: {trip.start_date && formatDate(new Date(trip.start_date))} 
              {trip.end_date && ` - ${formatDate(new Date(trip.end_date))}`}
            </Text>
          </View>
        )}

        {/* Date Pickers */}
        {showStartDatePicker && (
          <DateTimePicker
            testID="startDatePicker"
            value={startDate || new Date()}
            mode="date"
            is24Hour={true}
            display="default"
            onChange={onStartDateChange}
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            testID="endDatePicker"
            value={endDate || new Date()}
            mode="date"
            is24Hour={true}
            display="default"
            onChange={onEndDateChange}
          />
        )}

        {/* Bouton de création */}
        <TouchableOpacity
          style={[styles.createButton, isLoading && styles.createButtonDisabled]}
          onPress={handleCreateStep}
          disabled={isLoading}
        >
          <Text style={styles.createButtonText}>
            {isLoading ? 'Création...' : 'Créer l\'étape'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
  },
  searchContainer: {
    position: 'relative',
  },
  searchLoader: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  searchResults: {
    maxHeight: 200,
    marginTop: 5,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultsList: {
    maxHeight: 200,
  },
  locationResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  selectedLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  selectedLocationText: {
    fontSize: 12,
    color: '#28a745',
    marginLeft: 6,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateInput: {
    flex: 0.48,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#fff',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  dateConstraint: {
    backgroundColor: '#e7f3ff',
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
  },
  dateConstraintText: {
    fontSize: 12,
    color: '#007AFF',
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    marginTop: 30,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});