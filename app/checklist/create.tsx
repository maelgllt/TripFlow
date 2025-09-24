import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useGlobalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseService } from '@/services/database';
import { IconSymbol } from '@/components/icon-symbol';

export default function ChecklistCreatePage() {
  const router = useRouter();
  const params = useGlobalSearchParams();
  const tripIdParam = params.tripId as string | undefined;
  const tripId = tripIdParam ? parseInt(tripIdParam, 10) : undefined;

  const [title, setTitle] = useState('');
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!tripId) return;
    loadLists();
  }, [tripId]);

  const loadLists = async () => {
    setLoading(true);
    try {
      const data = await DatabaseService.getChecklistsByTripId(tripId as number);
      setLists(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const capitalizeFirstWord = (text?: string) => {
    if (!text) return '';
    const t = text.trim();
    if (t.length === 0) return '';
    return t[0].toUpperCase() + t.slice(1);
  };

  const create = async () => {
    if (!tripId) {
      Alert.alert('Erreur', 'Trip ID manquant.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Erreur', 'Donnez un nom à la checklist.');
      return;
    }

    try {
      console.log('create checklist: tripId=', tripId, 'title=', title);
      const id = await DatabaseService.createChecklist(tripId, title.trim());
      console.log('create returned id=', id);

      setTitle('');
      setShowModal(false);

      await loadLists();

      if (id) {
        router.push({
          pathname: '/checklist/[checklistId]/checklist',
          params: { checklistId: String(id), tripId: String(tripId) },
        });
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de créer la checklist.');
    }
  };

  const openList = (id: number) => {
    router.push({
      pathname: '/checklist/[checklistId]/checklist',
      params: { checklistId: String(id), ...(tripId ? { tripId: String(tripId) } : {}) }
    });
  };

  const confirmDelete = (id: number, title?: string) => {
    Alert.alert(
      'Supprimer la checklist',
      title ? `Supprimer "${capitalizeFirstWord(title)}" ?` : 'Supprimer cette checklist ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteChecklist(id);
              setLists(prev => prev.filter(i => i.id !== id));
            } catch (e) {
              console.error(e);
              Alert.alert('Erreur', "Impossible de supprimer la checklist.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderBox = ({ item }: { item: any }) => {
    const pinned = !!item.pinned;
    return (
      <TouchableOpacity
        style={styles.box}
        onPress={() => openList(item.id)}
        onLongPress={() => confirmDelete(item.id, item.title)}
        delayLongPress={400}
      >
        {pinned && <IconSymbol name="location" size={16} color="#ff5a5f" style={styles.pin} />}
        <Text style={styles.boxText} numberOfLines={2}>
          {capitalizeFirstWord(item.title)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Checklists</Text>
      {!tripId && <Text style={styles.warn}>Aucun tripId fourni (paramètre tripId requis)</Text>}

      <FlatList
        data={lists}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshing={loading}
        onRefresh={loadLists}
        renderItem={renderBox}
        ListEmptyComponent={<Text style={styles.empty}>Aucune checklist pour ce voyage.</Text>}
        contentContainerStyle={lists.length === 0 ? { flex: 1, justifyContent: 'center' } : undefined}
      />

      {/* Floating add button */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)} accessibilityLabel="Ajouter une checklist">
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal pour création */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouvelle checklist</Text>

            <TextInput placeholder="Nom (ex: Valise)" value={title} onChangeText={setTitle} style={styles.input} />
            <View style={styles.modalButtons}>
              <Button title="Annuler" onPress={() => setShowModal(false)} />
              <View style={{ width: 12 }} />
              <Button title="Créer" onPress={create} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'left' },
  warn: { color: 'red', marginBottom: 8 },

  row: { justifyContent: 'space-between', marginBottom: 12 },

  box: {
    position: 'relative',
    width: '48%',
    minHeight: 110,
    backgroundColor: '#f2f6ff',
    borderRadius: 12,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  pin: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  boxText: { fontSize: 16, fontWeight: '600', textAlign: 'center', color: '#0a3d91' },
  empty: { color: '#666', marginTop: 8, textAlign: 'center' },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
});