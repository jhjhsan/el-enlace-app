// PublishScreen.js actualizado para manejar publicaciones normales y promocionales

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import BottomBar from '../components/BottomBar';
import { savePostToDatabase } from '../utils/firebase'; // función que guardarás en utils/firebase.js

export default function PublishScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [image, setImage] = useState(null);
  const [isPromotional, setIsPromotional] = useState(false);
  const [budget, setBudget] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [sponsor, setSponsor] = useState('');

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!title || !description || !category) {
      Alert.alert('Error', 'Completa los campos obligatorios.');
      return;
    }

    const post = {
      id: Date.now().toString(),
      title,
      description,
      category,
      location,
      date,
      image,
      type: isPromotional ? 'promocional' : 'normal',
      createdBy: 'user_demo', // este valor debe venir del usuario autenticado
    };

    if (isPromotional) {
      post.promoted = true;
      post.budget = Number(budget);
      post.durationDays = Number(durationDays);
      post.sponsor = sponsor;
    }

    try {
      await savePostToDatabase(post);
      Alert.alert('Publicado', 'Tu publicación fue enviada correctamente.');
      // limpiar campos
      setTitle('');
      setDescription('');
      setCategory('');
      setLocation('');
      setDate('');
      setImage(null);
      setIsPromotional(false);
      setBudget('');
      setDurationDays('');
      setSponsor('');
    } catch (err) {
      Alert.alert('Error', 'No se pudo guardar la publicación.');
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Image source={require('../assets/logo.png')} style={styles.logo} />

        <Text style={styles.title}>Publicar un servicio</Text>

        <TextInput style={styles.input} placeholder="Título del servicio" placeholderTextColor="#999" value={title} onChangeText={setTitle} />
        <TextInput style={[styles.input, styles.textArea]} placeholder="Descripción" placeholderTextColor="#999" value={description} onChangeText={setDescription} multiline />
        <TextInput style={styles.input} placeholder="Categoría (ej: Actor, Catering...)" placeholderTextColor="#999" value={category} onChangeText={setCategory} />
        <TextInput style={styles.input} placeholder="Ubicación (opcional)" placeholderTextColor="#999" value={location} onChangeText={setLocation} />
        <TextInput style={styles.input} placeholder="Fecha de inicio (opcional)" placeholderTextColor="#999" value={date} onChangeText={setDate} />

        <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
          <Text style={styles.uploadText}>📸 Subir imagen</Text>
        </TouchableOpacity>

        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>¿Es una publicación promocional?</Text>
          <Switch value={isPromotional} onValueChange={setIsPromotional} />
        </View>

        {isPromotional && (
          <>
            <TextInput style={styles.input} placeholder="Presupuesto (CLP)" placeholderTextColor="#999" value={budget} onChangeText={setBudget} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Duración en días" placeholderTextColor="#999" value={durationDays} onChangeText={setDurationDays} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Patrocinador / Marca" placeholderTextColor="#999" value={sponsor} onChangeText={setSponsor} />
          </>
        )}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>Publicar servicio</Text>
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
    paddingBottom: 140,
  },
  logo: {
    width: 90,
    height: 90,
    alignSelf: 'center',
    marginVertical: 10,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#1B1B1B',
    color: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  uploadButton: {
    borderWidth: 1,
    borderColor: '#D8A353',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadText: {
    color: '#D8A353',
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  switchLabel: {
    color: '#FFF',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#D8A353',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 40,
  },
  submitText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
