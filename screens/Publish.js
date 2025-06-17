import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { saveServicePost } from '../src/firebase/helpers/saveServicePost';

export default function Publish({ navigation }) {
  const { userData } = useUser();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const handleSubmit = async () => {
    if (!title || !description || !category) {
      Alert.alert('Completa todos los campos');
      return;
    }

    try {
      const newPost = {
        id: Date.now().toString(),
        title,
        description,
        category,
        creatorEmail: userData?.email || 'anonimo',
        date: new Date().toISOString(),
        type: 'servicio',
      };

      await saveServicePost(newPost);
      Alert.alert('✅ Servicio publicado correctamente');
      setTitle('');
      setDescription('');
      setCategory('');
      navigation.goBack();
    } catch (error) {
      console.error('Error al guardar el servicio:', error);
      Alert.alert('Error al publicar el servicio');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📢 Publicar un servicio</Text>

      <TextInput
        style={styles.input}
        placeholder="Título del servicio"
        placeholderTextColor="#888"
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Descripción detallada"
        placeholderTextColor="#888"
        multiline
        numberOfLines={5}
        value={description}
        onChangeText={setDescription}
      />

      <TextInput
        style={styles.input}
        placeholder="Categoría"
        placeholderTextColor="#888"
        value={category}
        onChangeText={setCategory}
      />

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Publicar ahora</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={18} color="#FFF" />
        <Text style={styles.backText}>Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  title: {
    color: '#D8A353',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    width: '100%',
    marginBottom: 20,
  },
  multiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#D8A353',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 30,
    marginTop: 10,
  },
  submitButtonText: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
  },
  backText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
  },
});
