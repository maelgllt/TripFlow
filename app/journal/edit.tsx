import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function EditJournalEntry() {
  const { entryId } = useLocalSearchParams();
  const router = useRouter();
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    // Charge l'entrée existante
    // const entry = await DatabaseService.getJournalEntry(entryId);
    // setText(entry.content);
    // setImages(entry.images || []);
  }, [entryId]);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      setImages([...images, ...result.assets.map(a => a.uri)]);
    }
  };

  const handleSave = async () => {
    // DatabaseService.updateJournalEntry(entryId, { content: text, images })
    router.back();
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 16 }}>Modifier l'entrée</Text>
      <TextInput
        placeholder="Texte du journal..."
        value={text}
        onChangeText={setText}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 8 }}
        multiline
      />
      <TouchableOpacity onPress={pickImages} style={{ backgroundColor: '#34C759', padding: 12, borderRadius: 8, marginBottom: 16 }}>
        <Text style={{ color: '#fff', textAlign: 'center' }}>Ajouter des photos</Text>
      </TouchableOpacity>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
        {images.map((uri, idx) => (
          <Image key={idx} source={{ uri }} style={{ width: 80, height: 80, borderRadius: 8, marginRight: 8, marginBottom: 8 }} />
        ))}
      </View>
      <TouchableOpacity onPress={handleSave} style={{ backgroundColor: '#007AFF', padding: 12, borderRadius: 8 }}>
        <Text style={{ color: '#fff', textAlign: 'center' }}>Enregistrer</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}