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
import BottomBar from '../components/BottomBar';
import DropDownPicker from 'react-native-dropdown-picker';

export default function PublishProfileScreen({ navigation }) {
  const { userData } = useUser();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(null);
  const [open, setOpen] = useState(false);

  const categories = [
    { label: 'Actor', value: 'Actor' },
    { label: 'Actriz', value: 'Actriz' },
    { label: 'Modelo', value: 'Modelo' },
    { label: 'Camarógrafo', value: 'Camarógrafo' },
    { label: 'Editor de video', value: 'Editor de video' },
    { label: 'Maquillista', value: 'Maquillista' },
    { label: 'Animador / presentador', value: 'Animador / presentador' },
    { label: 'Doble de acción', value: 'Doble de acción' },
    { label: 'Productor', value: 'Productor' },
    { label: 'Fotógrafo', value: 'Fotógrafo' },
    // Agrega más si deseas
  ];

  const handlePublish = async () => {
    if (!title || !description || !category) {
      Alert.alert('Campos obligatorios', 'Completa todos los campos antes de publicar.');
      return;
    }

    if (title.trim().length < 10) {
      Alert.alert('Título muy corto', 'Debe tener al menos 10 caracteres.');
      return;
    }

    if (description.trim().length < 30) {
      Alert.alert('Descripción muy corta', 'Debe tener al menos 30 caracteres.');
      return;
    }

    const newPost = {
      id: Date.now().toString(),
      title,
      description,
      category,
      type: 'perfil',
      date: new Date().toISOString().split('T')[0],
      isPromotional: false,
    };

    try {
      const existing = await AsyncStorage.getItem('posts');
      const posts = existing ? JSON.parse(existing) : [];
      const updatedPosts = [...posts, newPost];
      await AsyncStorage.setItem('posts', JSON.stringify(updatedPosts));

      Alert.alert('✅ Perfil publicado', 'Tu perfil ha sido compartido como publicación.');
      navigation.navigate('ViewPosts');
    } catch (error) {
      console.error('Error al guardar perfil publicado:', error);
      Alert.alert('Error', 'No se pudo guardar el perfil publicado.');
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📇 Publicar Perfil Profesional</Text>

        <TextInput
          placeholder="Ej: Actor especializado en escenas de acción"
          placeholderTextColor="#888"
          style={styles.input}
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          placeholder="Ej: Profesional con 5 años de experiencia en cine. Habilidades en combate escénico, acrobacias y actuación dramática. Disponible en Santiago."
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
          items={categories}
          setOpen={setOpen}
          setValue={setCategory}
          placeholder="Selecciona tu categoría"
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
          <Text style={styles.publishText}>📤 Publicar Perfil</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomBar />
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
    marginBottom: 20,
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
    marginTop: 20,
  },
  publishText: {
    color: '#000',
    fontWeight: 'bold',
  },
});
