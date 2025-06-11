import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { syncCastingToFirestore } from '../src/firebase/helpers/syncCastingToFirestore';

export default function EditPostScreen({ route, navigation }) {
  const { post } = route.params;
  const { userData } = useUser();

  const [title, setTitle] = useState(post?.title || '');
  const [description, setDescription] = useState(post?.description || '');
  const [category, setCategory] = useState(post?.category || '');
  const [open, setOpen] = useState(false);
  const [zIndex, setZIndex] = useState(1000);
  const [showSuccess, setShowSuccess] = useState(false);

  const isCasting = post?.type === 'casting';

  const categories = isCasting
    ? [
        { label: 'Actor', value: 'Actor' },
        { label: 'Actriz', value: 'Actriz' },
        { label: 'Agencia de casting', value: 'Agencia de casting' },
        { label: 'Animador / presentador', value: 'Animador / presentador' },
        { label: 'Modelo', value: 'Modelo' },
        { label: 'Extra', value: 'Extra' },
      ]
    : [
        { label: 'Editor de video', value: 'Editor de video' },
        { label: 'Maquillista', value: 'Maquillista' },
        { label: 'Camarógrafo', value: 'Camarógrafo' },
        { label: 'Sonidista', value: 'Sonidista' },
        { label: 'Productor', value: 'Productor' },
      ];

  const handleSave = async () => {
    if (!title || !description || !category) {
      Alert.alert('Campos requeridos', 'Completa todos los campos antes de guardar.');
      return;
    }

    if (post.creatorEmail !== userData?.email) {
      Alert.alert('Acceso denegado', 'No puedes editar publicaciones de otros usuarios.');
      return;
    }

    if (post.isPromotional) {
      Alert.alert('Edición no permitida', 'Las publicaciones promocionales no se pueden editar.');
      return;
    }

    try {
      const stored = await AsyncStorage.getItem('posts');
      const posts = stored ? JSON.parse(stored) : [];

  // ✅ Verificar existencia del post antes de editar
  const existing = posts.find(p => p.id === post.id);
  if (!existing) {
    Alert.alert('Error', 'No se encontró la publicación original.');
    return;
  }
  const updatedPosts = posts.map(p =>
    p.id === post.id
      ? {
          ...p,
          title,
          description,
          category,
          updatedAt: Date.now(), // ← 🔥 Pegas aquí
        }
      : p
  );  

      await AsyncStorage.setItem('posts', JSON.stringify(updatedPosts));
await syncCastingToFirestore({
  ...existing,
  title,
  description,
  category,
  updatedAt: Date.now(),
});
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error('Error al guardar post editado:', error);
      Alert.alert('Error', 'No se pudo guardar la publicación.');
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>✏️ Editar Publicación</Text>

        <TextInput
          style={styles.input}
          placeholder="Título"
          placeholderTextColor="#888"
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={styles.textarea}
          multiline
          numberOfLines={6}
          placeholder="Descripción"
          placeholderTextColor="#888"
          value={description}
          onChangeText={setDescription}
        />

        <DropDownPicker
          open={open}
          value={category}
          items={categories}
          setOpen={value => {
            setOpen(value);
            setZIndex(value ? 2000 : 1000);
          }}
          setValue={setCategory}
          placeholder="Selecciona una categoría"
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropdownContainer}
          textStyle={{ color: '#fff' }}
          zIndex={zIndex}
        />

        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>💾 Guardar Cambios</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>⬅ Volver</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal transparent={true} visible={showSuccess} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.successText}>✅ Cambios guardados</Text>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 140,
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
  dropdown: {
    backgroundColor: '#1A1A1A',
    borderColor: '#D8A353',
    marginBottom: 20,
  },
  dropdownContainer: {
    backgroundColor: '#1A1A1A',
    borderColor: '#D8A353',
  },
  button: {
    backgroundColor: '#D8A353',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000aa',
  },
  modalContent: {
    backgroundColor: '#1B1B1B',
    padding: 20,
    borderRadius: 10,
    borderColor: '#D8A353',
    borderWidth: 1,
  },
  successText: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
