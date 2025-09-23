import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter, useGlobalSearchParams } from 'expo-router';
import { DatabaseService } from '@/services/database';

export default function ChecklistCreatePage() {
  const router = useRouter();
  const params = useGlobalSearchParams();
  const tripIdParam = params.tripId as string | undefined;
  const tripId = tripIdParam ? parseInt(tripIdParam, 10) : undefined;

  const [title, setTitle] = useState('');
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const create = async () => {
    if (!tripId) {
      Alert.alert('Erreur', 'Trip ID manquant.');
      return;
    }
    if (!title.trim()) return;
    try {
      const id = await DatabaseService.createChecklist(tripId, title.trim());
      setTitle('');
      await loadLists();
      if (id) {
        router.push({
          pathname: '/checklist/[checklistId]/checklist',
          params: { checklistId: String(id) }
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
      params: { checklistId: String(id) }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Checklists du voyage</Text>
      {!tripId && <Text style={styles.warn}>Aucun tripId fourni (paramètre tripId requis)</Text>}

      <View style={styles.row}>
        <TextInput
          placeholder="Titre de la checklist (ex: Valise)"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />
        <Button title="Créer" onPress={create} />
      </View>

      <Text style={styles.sub}>Listes existantes</Text>
      <FlatList
        data={lists}
        keyExtractor={(item) => String(item.id)}
        refreshing={loading}
        onRefresh={loadLists}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => openList(item.id)}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemDate}>{new Date(item.created_at).toLocaleString()}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Aucune checklist pour ce voyage.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  warn: { color: 'red', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 6 },
  sub: { fontSize: 16, fontWeight: '600', marginVertical: 8 },
  item: { padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginBottom: 8 },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  itemDate: { fontSize: 12, color: '#666', marginTop: 4 },
  empty: { color: '#666', marginTop: 8 }
});