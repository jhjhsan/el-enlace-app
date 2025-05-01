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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import BottomBar from '../components/BottomBar';

export default function PublishScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [image, setImage] = useState(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (!title || !description || !category) {
      Alert.alert('Error', 'Completa los campos obligatorios.');
      return;
    }
    Alert.alert('Publicado', 'Tu servicio ha sido enviado correctamente.');
    // Aquí iría la lógica para guardar en base de datos
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Image source={require('../assets/logo.png')} style={styles.logo} />

        <Text style={styles.title}>Publicar un servicio</Text>

        <TextInput
          style={styles.input}
          placeholder="Título del servicio"
          placeholderTextColor="#999"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Descripción"
          placeholderTextColor="#999"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <TextInput
          style={styles.input}
          placeholder="Categoría (ej: Actor, Catering...)"
          placeholderTextColor="#999"
          value={category}
          onChangeText={setCategory}
        />
        <TextInput
          style={styles.input}
          placeholder="Ubicación (opcional)"
          placeholderTextColor="#999"
          value={location}
          onChangeText={setLocation}
        />
        <TextInput
          style={styles.input}
          placeholder="Fecha de inicio (opcional)"
          placeholderTextColor="#999"
          value={date}
          onChangeText={setDate}
        />

        <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
          <Text style={styles.uploadText}>📸 Subir imagen</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.uploadButton, { opacity: 0.5 }]}>
          <Text style={styles.uploadText}>🎬 Subir video promocional</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          ⚠️ El video debe durar máximo 90 segundos y pesar menos de 40 MB.
        </Text>

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
    marginTop: 10,
    marginBottom: 10,
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
  note: {
    color: '#FFD700',
    fontSize: 12,
    marginBottom: 15,
    textAlign: 'center',
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
