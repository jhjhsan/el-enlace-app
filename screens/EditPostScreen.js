import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EditPostScreen({ route, navigation }) {
  const { post } = route.params;
  const [title, setTitle] = useState(post?.title || '');
  const [description, setDescription] = useState(post?.description || '');
  const [category, setCategory] = useState(post?.category || '');
  const [open, setOpen] = useState(false);

  const isCasting = post?.type === 'casting';

  const categories = isCasting
    ? [
        { label: 'Actor', value: 'Actor' },
        { label: 'Actriz', value: 'Actriz' },
        { label: 'Agencia de casting', value: 'Agencia de casting' },
        { label: 'Animador / presentador', value: 'Animador / presentador' },
        { label: 'Modelo', value: 'Modelo' },
        { label: 'Extra', value: 'Extra' },
        // Agrega más si necesitas
      ]
    : [
        { label: 'Editor de video', value: 'Editor de video' },
        { label: 'Maquillista', value: 'Maquillista' },
        { label: 'Camarógrafo', value: 'Camarógrafo' },
        { label: 'Sonidista', value: 'Sonidista' },
        { label: 'Productor', value: 'Productor' },
        // Agrega más si necesitas
      ];

  const handleSave = async () => {
    if (!title || !description || !category) {
      Alert.alert('Campos requeridos', 'Completa todos los campos antes de guardar.');
      return;
    }

    try {
      const stored = await AsyncStorage.getItem('posts');
      let posts = stored ? JSON.parse(stored) : [];

      const updatedPosts = posts.map(p =>
        p.id === post.id ? { ...p, title, description, category } : p
      );

      await AsyncStorage.setItem('posts', JSON.stringify(updatedPosts));
      Alert.alert('✅ Guardado', 'La publicación ha sido actualizada.');
      navigation.goBack();
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
          setOpen={setOpen}
          setValue={setCategory}
          placeholder="Selecciona una categoría"
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

        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>💾 Guardar Cambios</Text>
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
});
