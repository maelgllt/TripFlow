import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseService } from '@/services/database';
import { Step } from '@/types/database';

export default function StepDetails() {
  const { stepId } = useLocalSearchParams();
  const [step, setStep] = useState<Step | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStepData = useCallback(async () => {
    if (!stepId || Array.isArray(stepId)) return;

    try {
      setIsLoading(true);
      const stepData = await DatabaseService.getStepById(parseInt(stepId));
      setStep(stepData);
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non renseigné';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleDeleteStep = () => {
    if (!step) return;

    Alert.alert(
      'Supprimer l\'étape',
      `Êtes-vous sûr de vouloir supprimer "${step.title}" ?\n\nCette action est irréversible et réorganisera automatiquement les étapes suivantes.`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await DatabaseService.deleteStep(step.id);
              if (success) {
                Alert.alert('Succès', 'L\'étape a été supprimée et les étapes suivantes ont été réorganisées', [
                  {
                    text: 'OK',
                    onPress: () => router.back(),
                  },
                ]);
              } else {
                Alert.alert('Erreur', 'Impossible de supprimer l\'étape');
              }
            } catch (error) {
              console.error('Error deleting step:', error);
              Alert.alert('Erreur', 'Une erreur est survenue lors de la suppression');
            }
          },
        },
      ]
    );
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
    <ScrollView style={styles.container}>
      {/* Header avec titre */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepOrder}>Étape #{step.order_index}</Text>
        </View>
      </View>

      {/* Informations de l'étape */}
      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="location" size={20} color="#007AFF" />
            <Text style={styles.infoTitle}>Localisation</Text>
          </View>
          {step.address ? (
            <>
              <Text style={styles.infoContent}>{step.address}</Text>
              {step.latitude && step.longitude && (
                <Text style={styles.coordinates}>
                  📍 {step.latitude.toFixed(6)}, {step.longitude.toFixed(6)}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.infoContentEmpty}>Aucune localisation renseignée</Text>
          )}
        </View>

        {/* Description */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="document-text" size={20} color="#007AFF" />
            <Text style={styles.infoTitle}>Description</Text>
          </View>
          <Text style={styles.infoContent}>
            {step.description || 'Aucune description disponible'}
          </Text>
        </View>

        {/* Dates */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="calendar" size={20} color="#007AFF" />
            <Text style={styles.infoTitle}>Dates</Text>
          </View>
          <View style={styles.dateInfo}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Début :</Text>
              <Text style={styles.dateValue}>{formatDate(step.start_date)}</Text>
            </View>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Fin :</Text>
              <Text style={styles.dateValue}>{formatDate(step.end_date)}</Text>
            </View>
          </View>
        </View>

        {/* Informations système */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color="#666" />
            <Text style={styles.infoTitle}>Informations</Text>
          </View>
          <View style={styles.systemInfo}>
            <Text style={styles.systemInfoText}>
              Créée le : {formatDate(step.created_at)}
            </Text>
            <Text style={styles.systemInfoText}>
              ID de l'étape : {step.id}
            </Text>
            <Text style={styles.systemInfoText}>
              ID du voyage : {step.trip_id}
            </Text>
          </View>
        </View>
      </View>

      {/* Boutons d'action flottants */}
      <View style={styles.floatingButtons}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/step/${step.id}/edit`)}
        >
          <Ionicons name="create" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteStep}
        >
          <Ionicons name="trash" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Bouton pour créer le journal de bord */}
        <TouchableOpacity
          style={styles.journalButton}
          onPress={() => router.push(`/journal/details?stepId=${step.id}`)}
        >
          <Ionicons name="book-outline" size={24} color="#fff" />
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
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 5,
  },
  stepOrder: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  infoSection: {
    padding: 15,
    paddingBottom: 120,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  infoContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  infoContentEmpty: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  coordinates: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  dateInfo: {
    gap: 8,
  },
  dateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  systemInfo: {
    gap: 5,
  },
  systemInfoText: {
    fontSize: 12,
    color: '#666',
  },
  floatingButtons: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'column',
    gap: 15,
  },
  editButton: {
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  deleteButton: {
    backgroundColor: '#ff6b6b',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff6b6b',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  journalButton: {
  backgroundColor: '#34C759',
  width: 56,
  height: 56,
  borderRadius: 28,
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#34C759',
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 5,
},
});