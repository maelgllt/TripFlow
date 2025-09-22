import React, { useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DatabaseService } from '@/services/database';
import { NominatimService } from '@/services/nominatim';
import { Step } from '@/types/database';

export default function EditStep() {
  const { stepId } = useLocalSearchParams();
  const [step, setStep] = useState<Step | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  const loadStepData = useCallback(async () => {
    if (!stepId || Array.isArray(stepId)) return;

    try {
      setIsLoading(true);
      const stepData = await DatabaseService.getStepById(parseInt(stepId));
      if (stepData) {
        setStep(stepData);
        setTitle(stepData.title);
        setDescription(stepData.description || '');
        setAddress(stepData.address || '');
        setLatitude(stepData.latitude ?? null);
        setLongitude(stepData.longitude ?? null);
        
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

  const searchLocation = async () => {
    if (!address.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir une adresse');
      return;
    }

    try {
      setIsSearchingLocation(true);
      const results = await NominatimService.searchLocation(address);
      
      if (results.length > 0) {
        const location = results[0];
        setLatitude(Number(location.lat));
        setLongitude(Number(location.lon));
        setAddress(location.display_name);
        Alert.alert('Succès', 'Localisation trouvée et mise à jour');
      } else {
        Alert.alert('Aucun résultat', 'Aucune localisation trouvée pour cette adresse');
      }
    } catch (error) {
      console.error('Error searching location:', error);
      Alert.alert('Erreur', 'Erreur lors de la recherche de localisation');
    } finally {
      setIsSearchingLocation(false);
    }
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
    if (!validateForm() || !step) return;

    try {
      setIsSaving(true);
      
      const success = await DatabaseService.updateStep(step.id, {
        title: title.trim(),
        description: description.trim() || null,
        address: address.trim() || null,
        latitude,
        longitude,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      if (success) {
        Alert.alert('Succès', 'L\'étape a été mise à jour', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert('Erreur', 'Impossible de mettre à jour l\'étape');
      }
    } catch (error) {
      console.error('Error updating step:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

          {/* Adresse */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse</Text>
            <View style={styles.addressInputContainer}>
              <TextInput
                style={[styles.input, styles.addressInput]}
                value={address}
                onChangeText={setAddress}
                placeholder="Adresse ou lieu"
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={searchLocation}
                disabled={isSearchingLocation}
              >
                {isSearchingLocation ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="search" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
            {latitude && longitude && (
              <Text style={styles.coordinates}>
                📍 {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </Text>
            )}
          </View>

          {/* Dates */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date de début *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Ionicons name="calendar" size={20} color="#007AFF" />
              <Text style={styles.dateButtonText}>
                {formatDateForDisplay(startDate)}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date de fin *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Ionicons name="calendar" size={20} color="#007AFF" />
              <Text style={styles.dateButtonText}>
                {formatDateForDisplay(endDate)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Pickers */}
        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartDatePicker(false);
              if (selectedDate) {
                setStartDate(selectedDate);
              }
            }}
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowEndDatePicker(false);
              if (selectedDate) {
                setEndDate(selectedDate);
              }
            }}
          />
        )}
      </ScrollView>

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
  addressInputContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  addressInput: {
    flex: 1,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coordinates: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  dateButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
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