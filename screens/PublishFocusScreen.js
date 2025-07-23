import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { Ionicons } from '@expo/vector-icons';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../src/firebase/firebaseConfig';

export default function PublishFocusScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [requirements, setRequirements] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [duration, setDuration] = useState('');
  const [payment, setPayment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [description, setDescription] = useState('');

const handleSubmit = async () => {
  if (!title || !requirements || !dateTime || !payment) {
    Alert.alert('Campos requeridos', 'Por favor completa todos los campos obligatorios.');
    return;
  }

  const userRaw = await AsyncStorage.getItem('userProfile');
  const user = userRaw ? JSON.parse(userRaw) : {};

  const newFocus = {
    id: uuid.v4(),
    title,
    requirements,
    dateTime,
    duration,
    payment,
    paymentMethod,
    description,
    authorEmail: user?.email || '',
    authorName: user?.name || '',
  };

  try {
    const existingData = await AsyncStorage.getItem('focusList');
    const focusList = existingData ? JSON.parse(existingData) : [];
    focusList.push(newFocus);
    await AsyncStorage.setItem('focusList', JSON.stringify(focusList));

    // Llama al endpoint para sincronizar con Firestore
    const syncFocus = httpsCallable(functions, 'syncFocusToFirestore');
    await syncFocus(); // Esto enviará focusList a Firestore

    Alert.alert('Éxito', 'La publicación de Focus fue guardada y sincronizada.');
    navigation.navigate('FocusListScreen');
  } catch (error) {
    console.error('Error guardando o sincronizando el focus:', error);
    Alert.alert('Error', 'No se pudo guardar o sincronizar la publicación.');
  }
};

  return (
    <View style={styles.screen}>
      {/* Flecha profesional arriba */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView style={styles.container}>
        <Text style={styles.title}>📢 Publicar Focus Group</Text>

        <Text style={styles.label}>Título del estudio *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ej: Club Social para hombres de 25 a 35" placeholderTextColor="#aaa" />

        <Text style={styles.label}>Requisitos del participante *</Text>
        <TextInput style={styles.input} value={requirements} onChangeText={setRequirements} placeholder="Ej: Hombres, 25 a 35 años, chilenos, universitarios..." placeholderTextColor="#aaa" />

        <Text style={styles.label}>Fecha y hora *</Text>
        <TextInput style={styles.input} value={dateTime} onChangeText={setDateTime} placeholder="Ej: Martes a las 18:00 hrs" placeholderTextColor="#aaa" />

        <Text style={styles.label}>Duración estimada</Text>
        <TextInput style={styles.input} value={duration} onChangeText={setDuration} placeholder="Ej: 1 hora y media" placeholderTextColor="#aaa" />

        <Text style={styles.label}>Pago ofrecido *</Text>
        <TextInput style={styles.input} value={payment} onChangeText={setPayment} placeholder="Ej: $20.000" placeholderTextColor="#aaa" keyboardType="numeric" />

        <Text style={styles.label}>Forma de pago</Text>
        <TextInput style={styles.input} value={paymentMethod} onChangeText={setPaymentMethod} placeholder="Ej: Gift card Cencosud, transferencia..." placeholderTextColor="#aaa" />

        <Text style={styles.label}>Descripción adicional</Text>
        <TextInput style={styles.textarea} value={description} onChangeText={setDescription} multiline numberOfLines={4} placeholder="Otros detalles..." placeholderTextColor="#aaa" />

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>✅ Publicar Focus</Text>
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
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 2000,
  },
  container: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 22,
    color: '#D8A353',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    color: '#D8A353',
    fontWeight: 'bold',
    marginTop: 10,
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  textarea: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#D8A353',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
