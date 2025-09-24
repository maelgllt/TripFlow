import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
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
      if (!checklistId) return;
      const info = await DatabaseService.getChecklistsByTripId(checklistId);
      const its = await DatabaseService.getChecklistItems(checklistId);
      const unchecked = (its || []).filter((i: any) => !i.is_checked);
      const checked = (its || []).filter((i: any) => i.is_checked);
      setChecklist(info || null);
      setItems([...unchecked, ...checked]);
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
      Alert.alert('Erreur', "Impossible d'ajouter l'élément.");
    }
  };

  const toggleChecked = async (item: any) => {
    try {
      if (!item || !('is_checked' in item)) return;
      const newChecked = !Boolean(item.is_checked);
      if ((DatabaseService as any).setChecklistItemChecked) {
        await (DatabaseService as any).setChecklistItemChecked(item.id, newChecked);
      }
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const others = items.filter(i => i.id !== item.id);
      const toggled = { ...item, is_checked: newChecked };
      if (newChecked) {
        const unchecked = others.filter(i => !i.is_checked);
        const checked = [toggled, ...others.filter(i => i.is_checked)];
        setItems([...unchecked, ...checked]);
      } else {
        const unchecked = [toggled, ...others.filter(i => !i.is_checked)];
        const checked = others.filter(i => i.is_checked);
        setItems([...unchecked, ...checked]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const removeItem = async (id: number) => {
    Alert.alert('Supprimer', 'Supprimer cet élément ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await DatabaseService.deleteChecklistItem(id);
            setItems(prev => prev.filter(i => i.id !== id));
          } catch (e) {
            console.error(e);
            Alert.alert('Erreur', "Impossible de supprimer l'élément.");
          }
        },
      },
    ]);
  };

  const removeChecklist = async () => {
    Alert.alert('Supprimer checklist', 'Supprimer cette checklist ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            if (!checklistId) return;
            await DatabaseService.deleteChecklist(checklistId);
            router.back();
          } catch (e) {
            console.error(e);
            Alert.alert('Erreur', "Impossible de supprimer la checklist.");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<any>) => {
    return (
      <TouchableOpacity
        onLongPress={drag}
        disabled={isActive}
        style={[styles.itemRow, isActive && styles.itemActive]}
      >
        <TouchableOpacity onPress={() => toggleChecked(item)} style={styles.check}>
          <Text style={{ fontSize: 26 }}>{item.is_checked ? '☑' : '☐'}</Text>
        </TouchableOpacity>

        <Text style={[styles.itemText, item.is_checked ? styles.checkedText : null]}>
          {item.title}
        </Text>

        <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.deleteBtn}>
          <Ionicons name="trash" size={20} color="#cc0000" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{checklist ? checklist.title : 'Checklist'}</Text>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ paddingHorizontal: 12 }}>
        <View style={styles.row}>
          <TextInput
            placeholder="Nouvel élément"
            value={newItemTitle}
            onChangeText={setNewItemTitle}
            style={styles.input}
          />
          <Button title="Ajouter" onPress={addItem} />
        </View>
      </KeyboardAvoidingView>

      <DraggableFlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        onDragEnd={({ data }) => {
          setItems(data);
        }}
        renderItem={renderItem}
        activationDistance={12}
        refreshing={loading}
        onRefresh={loadAll}
      />

      <TouchableOpacity style={styles.fabDelete} onPress={removeChecklist} accessibilityLabel="Supprimer la checklist">
        <Ionicons name="trash" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 12, paddingBottom: 24, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: '700', marginBottom: 12, paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8 },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    backgroundColor: 'transparent',
  },
  itemActive: { backgroundColor: '#f7f7f7' },

  check: { width: 56, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, fontSize: 16, color: '#0a3d91' },
  checkedText: { textDecorationLine: 'line-through', color: '#888' },
  deleteBtn: { paddingHorizontal: 8 },

  fabDelete: {
    position: 'absolute',
    right: 18,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#cc0000',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
});