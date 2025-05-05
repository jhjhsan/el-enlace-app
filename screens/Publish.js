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

export default function Publish({ navigation }) {
  const { userData } = useUser();
  const [membershipType, setMembershipType] = useState('free');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (userData?.membershipType) {
      setMembershipType(userData.membershipType);
    }
  }, [userData]);

  const handleSubmit = () => {
    if (!title || !description) {
      Alert.alert('Completa todos los campos');
      return;
    }

    // Aquí luego conectarás con la base de datos para guardar la publicación
    Alert.alert('✅ Publicación enviada correctamente');
    setTitle('');
    setDescription('');
  };

  if (membershipType !== 'elite') {
    return (
      <View style={styles.restrictedContainer}>
        <Text style={styles.restrictedText}>❌ Esta función es solo para miembros Elite</Text>
        <TouchableOpacity
          style={styles.goToPlans}
          onPress={() => navigation.navigate('Subscription')}
        >
          <Ionicons name="arrow-forward" size={16} color="#FFF" />
          <Text style={styles.goToPlansText}>Ver planes disponibles</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📢 Publicar un servicio o casting</Text>

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
  restrictedContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  restrictedText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  goToPlans: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#D8A353',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
  },
  goToPlansText: {
    color: '#FFF',
    marginLeft: 10,
  },
});
