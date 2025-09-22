import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DatabaseService } from '@/services/database';
import { NominatimService } from '@/services/nominatim';
import { Step } from '@/types/database';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

export default function EditStep() {
  const { stepId } = useLocalSearchParams();
  const [step, setStep] = useState<Step | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<NominatimResult | null>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const loadStepData = useCallback(async () => {
    if (!stepId || Array.isArray(stepId)) return;

    try {
      setIsLoading(true);
      const stepData = await DatabaseService.getStepById(parseInt(stepId));
      if (stepData) {
        setStep(stepData);
        setTitle(stepData.title);
        setDescription(stepData.description || '');
        setLocationQuery(stepData.address || '');
        
        if (stepData.address && stepData.latitude && stepData.longitude) {
          setSelectedLocation({
            display_name: stepData.address,
            lat: stepData.latitude.toString(),
            lon: stepData.longitude.toString(),
          });
        } else {
          setSelectedLocation(null);
        }
        
        if (stepData.start_date) {
          setStartDate(new Date(stepData.start_date));
        }
        if (stepData.end_date) {
          setEndDate(new Date(stepData.end_date));
        }
      }
    } catch (error) {
      console.error('Error loading step data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données de l\'étape');
    } finally {
      setIsLoading(false);
    }
  }, [stepId]);

  useFocusEffect(
    useCallback(() => {
      loadStepData();
    }, [loadStepData])
  );

  const searchLocation = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await NominatimService.searchLocation(query);
      setSearchResults(results.slice(0, 5)); // limiter à 5 résultats
    } catch (error) {
      console.error('Error searching location:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const debouncedSearchLocation = (query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchLocation(query);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const selectLocation = (location: NominatimResult) => {
    setSelectedLocation(location);
    setLocationQuery(location.display_name);
    setSearchResults([]);
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Le titre est obligatoire');
      return false;
    }

    if (startDate >= endDate) {
      Alert.alert('Erreur', 'La date de fin doit être postérieure à la date de début');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
  try {
    const success = await DatabaseService.updateStep(stepId, {
      title: title,
      description: description,
      address: selectedLocation?.display_name || null,
      latitude: selectedLocation ? parseFloat(selectedLocation.lat) : null,
      longitude: selectedLocation ? parseFloat(selectedLocation.lon) : null,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    });
    
    if (success) {
      router.back();
    }
  } catch (error) {
    console.error('Error updating step:', error);
  }
};

  const formatDate = (date: Date | null, defaultText: string) => {
    if (!date) return defaultText;
    return date.toLocaleDateString('fr-FR');
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const confirmStartDate = () => {
    setShowStartDatePicker(false);
  };

  const confirmEndDate = () => {
    setShowEndDatePicker(false);
  };

  const renderLocationResults = () => {
    return searchResults.map((item, index) => (
      <TouchableOpacity
        key={`${item.lat}-${item.lon}-${index}`}
        style={[
          styles.locationResult,
          index === searchResults.length - 1 && styles.locationResultLast
        ]}
        onPress={() => selectLocation(item)}
      >
        <Ionicons name="location-outline" size={16} color="#007AFF" />
        <Text style={styles.locationText}>{item.display_name}</Text>
      </TouchableOpacity>
    ));
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!step) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ff6b6b" />
        <Text style={styles.errorTitle}>Étape introuvable</Text>
        <Text style={styles.errorText}>
          Cette étape n'existe pas ou a été supprimée.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Modifier l'étape</Text>
          <Text style={styles.headerSubtitle}>Étape #{step.order_index}</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Titre */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Titre *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Nom de l'étape"
              placeholderTextColor="#999"
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description de l'étape..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Localisation */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Localisation</Text>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.input}
                value={locationQuery}
                onChangeText={(text) => {
                  setLocationQuery(text);
                  debouncedSearchLocation(text);
                  // Ne réinitialiser selectedLocation que si le texte ne correspond plus
                  if (selectedLocation && text.trim() !== selectedLocation.display_name) {
                    setSelectedLocation(null);
                  }
                }}
                placeholder={selectedLocation ? selectedLocation.display_name : "Rechercher une ville ou une adresse..."}
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

            {/* Résultats de recherche - ne montrer que si pas de localisation sélectionnée ET qu'on a des résultats */}
            {searchResults.length > 0 && !selectedLocation && locationQuery.length >= 3 && (
              <View style={styles.searchResults}>
                {renderLocationResults()}
              </View>
            )}

            {/* Localisation sélectionnée */}
            {selectedLocation && (
              <View style={styles.selectedLocation}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.selectedLocationText}>
                  Localisation sélectionnée
                </Text>
                <TouchableOpacity
                  style={styles.removeLocationButton}
                  onPress={() => {
                    setSelectedLocation(null);
                    setLocationQuery('');
                  }}
                >
                  <Ionicons name="close-circle" size={16} color="#dc3545" />
                </TouchableOpacity>
              </View>
            )}
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
                  {formatDate(startDate, 'Date début')}
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
                  {formatDate(endDate, 'Date fin')}
                </Text>
                <Ionicons name="calendar" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Date Picker Modals */}
      <Modal
        visible={showStartDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStartDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, isDark && styles.modalContainerDark]}>
            <View style={[styles.modalHeader, isDark && styles.modalHeaderDark]}>
              <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                <Text style={[styles.modalCancelText, isDark && styles.modalCancelTextDark]}>Annuler</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>Date de début</Text>
              <TouchableOpacity onPress={confirmStartDate}>
                <Text style={styles.modalConfirmText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onStartDateChange}
              style={[styles.datePicker, isDark && styles.datePickerDark]}
              textColor={isDark ? '#FFFFFF' : '#000000'}
              themeVariant={isDark ? 'dark' : 'light'}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEndDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEndDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, isDark && styles.modalContainerDark]}>
            <View style={[styles.modalHeader, isDark && styles.modalHeaderDark]}>
              <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                <Text style={[styles.modalCancelText, isDark && styles.modalCancelTextDark]}>Annuler</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>Date de fin</Text>
              <TouchableOpacity onPress={confirmEndDate}>
                <Text style={styles.modalConfirmText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={endDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onEndDateChange}
              style={[styles.datePicker, isDark && styles.datePickerDark]}
              textColor={isDark ? '#FFFFFF' : '#000000'}
              themeVariant={isDark ? 'dark' : 'light'}
            />
          </View>
        </View>
      </Modal>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    textAlign: 'center',
  },
  form: {
    padding: 20,
    paddingBottom: 120,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
    marginTop: 5,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  locationResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  locationResultLast: {
    borderBottomWidth: 0,
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
    justifyContent: 'space-between',
  },
  selectedLocationText: {
    fontSize: 12,
    color: '#28a745',
    marginLeft: 6,
    flex: 1,
  },
  removeLocationButton: {
    marginLeft: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalContainerDark: {
    backgroundColor: '#1C1C1E',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalHeaderDark: {
    borderBottomColor: '#48484A',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalTitleDark: {
    color: '#FFFFFF',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#999',
  },
  modalCancelTextDark: {
    color: '#8E8E93',
  },
  modalConfirmText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  datePicker: {
    backgroundColor: '#fff',
    alignSelf: 'center',
    paddingVertical: 20,
  },
  datePickerDark: {
    backgroundColor: '#1C1C1E',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    gap: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#99c7ff',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});