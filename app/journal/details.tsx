import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, Alert, useColorScheme } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DatabaseService } from '@/services/database';
import { Ionicons } from '@expo/vector-icons';
import { JournalEntry } from '@/types/database';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

type Block =
  | { id: string; type: 'text'; text: string }
  | { id: string; type: 'photo'; uri: string };

export default function JournalDetails() {
  const { stepId } = useLocalSearchParams();
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const scheme = useColorScheme() ?? 'light';
  const borderColor = scheme === 'dark' ? '#4b5563' : '#e2e8f0'; // visible in both themes

  useEffect(() => {
    const load = async () => {
      // typer correctement l'entrée pour éviter les erreurs TS
      const entry = await DatabaseService.getJournalEntryByStepId(Number(stepId)) as JournalEntry | null;
      if (!entry) {
        // démarrer avec un bloc texte vide
        setBlocks([{ id: String(Date.now()), type: 'text', text: '' }]);
        return;
      }

      // si content est JSON avec blocks => restaurer
      try {
        const parsed = JSON.parse(entry.content);
        if (parsed && Array.isArray(parsed.blocks)) {
          setBlocks(parsed.blocks);
          return;
        }
      } catch {
        // non JSON => traiter comme ancien texte
      }

      // ancien format : contenu texte + images en colonne images (sans audio)
      try {
        const oldImages =
          entry.images
            ? typeof entry.images === 'string'
              ? JSON.parse(entry.images)
              : entry.images
            : [];
        const restored: Block[] = [];
        if (entry.content) restored.push({ id: String(Date.now()) + '_t', type: 'text', text: entry.content });
        if (Array.isArray(oldImages)) {
          for (const uri of oldImages) restored.push({ id: String(Date.now()) + '_p' + Math.random(), type: 'photo', uri });
        }
        if (restored.length === 0) restored.push({ id: String(Date.now()), type: 'text', text: '' });
        setBlocks(restored);
      } catch {
        setBlocks([{ id: String(Date.now()), type: 'text', text: '' }]);
      }
    };
    load();
  }, [stepId]);

  const saveToDb = async () => {
    try {
      const payload = { blocks };
      await DatabaseService.saveJournalEntryForStep(Number(stepId), {
        type: 'text',
        content: JSON.stringify(payload),
        images: undefined,
        file_path: undefined,
        entry_date: new Date().toISOString(),
      });
      Alert.alert('Enregistré', 'Le journal a été sauvegardé.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de sauvegarder.');
    }
  };

  const updateBlock = (id: string, patch: Partial<Block>) => {
    setBlocks(prev => prev.map(b => (b.id === id ? { ...b, ...patch } as Block : b)));
  };
  const removeBlock = (id: string) => setBlocks(prev => prev.filter(b => b.id !== id));
  const addTextBlock = () => setBlocks(prev => [...prev, { id: String(Date.now()) + Math.random(), type: 'text', text: '' }]);
  const addImageBlocks = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
    });
    if (res.canceled) return;
    const assets = res.assets ?? [];
    const newBlocks: Block[] = assets.map((a: { uri: string }) => ({ id: String(Date.now()) + '_p' + Math.random(), type: 'photo', uri: a.uri }));
    setBlocks(prev => [...prev, ...newBlocks]);
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    setBlocks(prev => {
      const copy = [...prev];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  };
  const moveDown = (index: number) => {
    setBlocks(prev => {
      if (index >= prev.length - 1) return prev;
      const copy = [...prev];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
  };

  const generateHtmlFromBlocks = async (blocks: Block[]) => {
    const parts = await Promise.all(blocks.map(async (b) => {
      if (b.type === 'text') {
        const safe = (b.text || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br/>');
        return `<div style="margin:8px 0;"><p style="font-size:14px; color:#000; line-height:1.4; margin:0;">${safe}</p></div>`;
      }

      if (b.type === 'photo') {
        try {
          const uri = b.uri;
          if (uri.startsWith('data:')) {
            return `<div style="margin:8px 0;"><img src="${uri}" style="width:100%; max-height:400px; object-fit:cover;" /></div>`;
          }

          const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
          let mime = 'image/jpeg';
          if (ext === 'png') mime = 'image/png';
          if (ext === 'webp') mime = 'image/webp';
          if (ext === 'gif') mime = 'image/gif';

          try {
            const format = ext === 'png' ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG;
            const manip = await ImageManipulator.manipulateAsync(uri, [], { base64: true, format, compress: 1 });
            if (manip?.base64) {
              return `<div style="margin:8px 0;"><img src="data:${mime};base64,${manip.base64}" style="width:100%; max-height:400px; object-fit:cover;" /></div>`;
            }
          } catch (manipErr) {
            console.warn('ImageManipulator failed, falling back to FileSystem', uri, manipErr);
          }

          let fileUri = uri;
          try {
            const base64Try = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' as any });
            return `<div style="margin:8px 0;"><img src="data:${mime};base64,${base64Try}" style="width:100%; max-height:400px; object-fit:cover;" /></div>`;
          } catch (readErr) {
            console.warn('readAsStringAsync failed, will try caching file first', uri, readErr);
            if (Platform.OS === 'android' && uri.startsWith('content://')) {
              const cacheDir = (FileSystem as any).cacheDirectory ?? '';
              const destPath = `${cacheDir}${Math.random().toString(36).slice(2)}.${ext}`;
              try {
                const dl = await FileSystem.downloadAsync(uri, destPath);
                fileUri = dl.uri;
              } catch (dlErr) {
                console.warn('downloadAsync fallback failed for', uri, dlErr);
              }
            }

            const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' as any });
            return `<div style="margin:8px 0;"><img src="data:${mime};base64,${base64}" style="width:100%; max-height:400px; object-fit:cover;" /></div>`;
          }
        } catch (err) {
          console.warn('Embed image failed for', b.uri, err);
          return `<div style="background:#eee;height:180px;display:flex;align-items:center;justify-content:center;color:#666;">Image non disponible</div>`;
        }
      }

      return '';
    }));

    const body = parts.join('\n');

    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        </head>
        <body style="font-family: Arial, Helvetica, sans-serif; padding: 16px;">
          ${body}
        </body>
      </html>
    `;
  };

  const exportPdf = async () => {
    try {
      const html = await generateHtmlFromBlocks(blocks);
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      } else {
        Alert.alert('Export', `PDF créé : ${uri}`);
      }
    } catch (e) {
      console.error('exportPdf error', e);
      Alert.alert('Erreur', 'Impossible de générer le PDF.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingTop: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 12, color: '#000' }}>Journal de l'étape</Text>

        {blocks.map((block, idx) => (
          <View
            key={block.id}
            style={{
              marginBottom: 14,
              borderWidth: 1,
              borderColor: borderColor,
              padding: 10,
              borderRadius: 8,
              backgroundColor: 'transparent',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontWeight: '600', color: '#000' }}>{block.type.toUpperCase()}</Text>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity onPress={() => moveUp(idx)} style={{ marginRight: 8 }}>
                  <Ionicons name="arrow-up" size={20} color="#000" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveDown(idx)} style={{ marginRight: 8 }}>
                  <Ionicons name="arrow-down" size={20} color="#000" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeBlock(block.id)}>
                  <Ionicons name="trash" size={20} color="#c00" />
                </TouchableOpacity>
              </View>
            </View>

            {block.type === 'text' && (
              <TextInput
                value={block.text}
                onChangeText={(t) => updateBlock(block.id, { text: t })}
                placeholder="Texte..."
                placeholderTextColor={'#000'}
                multiline
                style={{ minHeight: 60, textAlignVertical: 'top', color: '#000' }}
              />
            )}

            {block.type === 'photo' && (
              <Image source={{ uri: block.uri }} style={{ width: '100%', height: 180, borderRadius: 8 }} resizeMode="cover" />
            )}
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* boutons flottants icônes (ajout texte / photo) placés en bas de page à gauche du bouton "save" */}
      <View style={{
        position: 'absolute',
        bottom: 24,
        left: 16,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <TouchableOpacity
          onPress={addTextBlock}
          style={{
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center',
            elevation: 4, marginRight: 12,
          }}
        >
          <Ionicons name="document-text" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={addImageBlocks}
          style={{
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center',
            elevation: 4,
          }}
        >
          <Ionicons name="image" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* barre flottante: export + sauvegarder */}
      <View style={{
        position: 'absolute',
        bottom: 24,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}>
        <TouchableOpacity
          onPress={exportPdf}
          style={{
            backgroundColor: '#8B5CF6',
            width: 56, height: 56, borderRadius: 28,
            justifyContent: 'center', alignItems: 'center', marginRight: 12, elevation: 6
          }}
        >
          <Ionicons name="share-outline" size={22} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={saveToDb}
          style={{ backgroundColor: '#007AFF', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6 }}
        >
          <Ionicons name="save" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}