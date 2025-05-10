import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import DropDownPicker from 'react-native-dropdown-picker';

export default function PublishCastingScreen({ navigation }) {
  const { userData } = useUser();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(null);
  const [open, setOpen] = useState(false);

  const castingCategories = [
    { label: 'Actor', value: 'Actor' },
    { label: 'Actriz', value: 'Actriz' },
    { label: 'Agencia de casting', value: 'Agencia de casting' },
    { label: 'Animador / presentador', value: 'Animador / presentador' },
    { label: 'Artista urbano', value: 'Artista urbano' },
    { label: 'Bailarín / bailarina', value: 'Bailarín / bailarina' },
    { label: 'Doble de acción', value: 'Doble de acción' },
    { label: 'Extra', value: 'Extra' },
    { label: 'Modelo', value: 'Modelo' },
    { label: 'Modelo publicitario', value: 'Modelo publicitario' },
    { label: 'Niño actor', value: 'Niño actor' },
    { label: 'Niña actriz', value: 'Niña actriz' },
  ];

  const handlePublish = async () => {
    if (!title || !description || !category) {
      Alert.alert('Campos obligatorios', 'Completa todos los campos antes de publicar.');
      return;
    }

    if (title.trim().length < 10) {
      Alert.alert('Título muy corto', 'El título debe tener al menos 10 caracteres.');
      return;
    }

    if (description.trim().length < 30) {
      Alert.alert('Descripción muy corta', 'La descripción debe tener al menos 30 caracteres.');
      return;
    }

    if (description.trim().split('\n').length > 100) {
      Alert.alert('Límite de líneas', 'La descripción no puede superar las 100 líneas.');
      return;
    }

    const newPost = {
      id: Date.now().toString(),
      title,
      description,
      category,
      type: 'casting',
      date: new Date().toISOString().split('T')[0],
      isPromotional: false,
      creatorId: userData?.id || '',
      creatorEmail: userData?.email || '',
    };

    try {
      const existing = await AsyncStorage.getItem('posts');
      const posts = existing ? JSON.parse(existing) : [];
      const updatedPosts = [...posts, newPost];
      await AsyncStorage.setItem('posts', JSON.stringify(updatedPosts));

      Alert.alert('✅ Casting publicado', 'Tu publicación se ha guardado exitosamente.');
      navigation.navigate('ViewPosts');
    } catch (error) {
      console.error('Error al guardar publicación:', error);
      Alert.alert('Error', 'No se pudo guardar la publicación.');
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📝 Publicar Casting</Text>

        <TextInput
          placeholder="Ej: Buscamos actriz para corto publicitario"
          placeholderTextColor="#888"
          style={styles.input}
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          placeholder="Ej: Se necesita actriz entre 25 y 35 años, perfil urbano, rodaje en Santiago, remunerado. Enviar book y video."
          placeholderTextColor="#888"
          style={styles.textarea}
          multiline
          numberOfLines={8}
          value={description}
          onChangeText={setDescription}
        />

        <DropDownPicker
          open={open}
          value={category}
          items={castingCategories}
          setOpen={setOpen}
          setValue={setCategory}
          placeholder="Selecciona una categoría"
          listMode="SCROLLVIEW"
          style={{
            backgroundColor: '#1A1A1A',
            borderColor: '#D8A353',
            zIndex: 1000,
          }}
          dropDownContainerStyle={{
            backgroundColor: '#1A1A1A',
            borderColor: '#D8A353',
            zIndex: 1000,
          }}
          textStyle={{ color: '#fff' }}
        />

        <TouchableOpacity style={styles.publishButton} onPress={handlePublish}>
          <Text style={styles.publishText}>📤 Publicar</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>⬅ Volver</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    padding: 20,
    paddingBottom: 180,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#1A1A1A',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    borderColor: '#D8A353',
    borderWidth: 1,
  },
  textarea: {
    backgroundColor: '#1A1A1A',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 16,
    marginBottom: 15,
    borderColor: '#D8A353',
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  publishButton: {
    backgroundColor: '#D8A353',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 300,
  },
  publishText: {
    color: '#000',
    fontWeight: 'bold',
  },
  back: {
    marginTop: 30,
    color: '#aaa',
    fontSize: 16,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
