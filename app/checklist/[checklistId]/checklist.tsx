import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { DatabaseService } from '@/services/database';

export default function ChecklistDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const checklistIdParam = params.checklistId as string | undefined;
  const checklistId = checklistIdParam ? parseInt(checklistIdParam, 10) : undefined;

  const [checklist, setChecklist] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!checklistId) return;
    loadAll();
  }, [checklistId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const lists = await DatabaseService.getChecklistsByTripId(0 as any); // placeholder
      // getChecklistsByTripId requires tripId; we only need the single checklist basic info.
      // try selecting the checklist directly from DB
      const raw = await (DatabaseService as any).db?.getFirstSync
        ? (DatabaseService as any).db.getFirstSync('SELECT * FROM checklists WHERE id = ?', [checklistId])
        : null;
      setChecklist(raw);
      let its: any[] = [];
      if (typeof checklistId === 'number') {
        its = await DatabaseService.getChecklistItems(checklistId);
      }
      setItems(its || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async () => {
    if (!newItemTitle.trim() || !checklistId) return;
    try {
      await DatabaseService.createChecklistItem(checklistId, newItemTitle.trim());
      setNewItemTitle('');
      await loadAll();
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'élément.');
    }
  };

  const toggleChecked = async (item: any) => {
    try {
      await DatabaseService.setChecklistItemChecked(item.id, !Boolean(item.is_checked));
      await loadAll();
    } catch (e) {
      console.error(e);
    }
  };

  const removeItem = async (id: number) => {
    try {
      await DatabaseService.deleteChecklistItem(id);
      await loadAll();
    } catch (e) {
      console.error(e);
    }
  };

  const removeChecklist = async () => {
    Alert.alert('Confirmer', 'Supprimer cette checklist ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await DatabaseService.deleteChecklist(checklistId as number);
            router.back();
          } catch (e) {
            console.error(e);
            Alert.alert('Erreur', 'Impossible de supprimer la checklist.');
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{checklist ? checklist.title : 'Checklist'}</Text>

      <View style={styles.row}>
        <TextInput
          placeholder="Nouvel élément"
          value={newItemTitle}
          onChangeText={setNewItemTitle}
          style={styles.input}
        />
        <Button title="Ajouter" onPress={addItem} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        refreshing={loading}
        onRefresh={loadAll}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <TouchableOpacity onPress={() => toggleChecked(item)} style={styles.check}>
              <Text style={{ fontSize: 18 }}>{item.is_checked ? '☑' : '☐'}</Text>
            </TouchableOpacity>
            <Text style={[styles.itemText, item.is_checked ? styles.checkedText : null]}>{item.title}</Text>
            <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.deleteBtn}>
              <Text style={{ color: 'red' }}>Suppr</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Aucun élément</Text>}
      />

      <View style={{ marginTop: 12 }}>
        <Button title="Supprimer la checklist" color="#cc0000" onPress={removeChecklist} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderColor: '#eee' },
  check: { width: 36, alignItems: 'center' },
  itemText: { flex: 1 },
  checkedText: { textDecorationLine: 'line-through', color: '#666' },
  deleteBtn: { paddingHorizontal: 8 },
  empty: { color: '#666', marginTop: 8 }
});