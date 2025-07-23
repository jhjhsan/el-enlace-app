import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { canPostNewService } from '../utils/postLimits';
import { saveServicePost } from '../src/firebase/helpers/saveServicePost';
import { Ionicons } from '@expo/vector-icons';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

export default function MyServicesScreen() {
  const navigation = useNavigation();
  const [services, setServices] = useState([]);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    const data = await AsyncStorage.getItem('posts');
    if (data) {
      const allPosts = JSON.parse(data);
      const servicePosts = allPosts.filter((p) => p.type === 'servicio');
      setServices(servicePosts);
    }
  };

  const handleCreateService = async () => {
    const userRaw = await AsyncStorage.getItem('userData');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const membershipType = user?.membershipType || 'free';

    const allowed = await canPostNewService(user?.email, membershipType);
    if (!allowed) {
      Alert.alert(
        'Límite alcanzado',
        'Solo puedes publicar 1 servicio por semana con el plan Free. Actualiza tu membresía para publicar más.'
      );
      return;
    }

    try {
      const newService = {
        id: Date.now().toString(),
        title: '🎬 Edición de Video Profesional',
        description:
          'Ofrezco edición profesional para comerciales, videoclips, y cortos. Entrega rápida y calidad de cine.',
        category: 'Editor de video',
        type: 'servicio',
        creatorEmail: user?.email,
        isPromotional: false,
      };

      await saveServicePost(newService);
      // Enviar notificación push al creador (opcional)
try {
  const functions = getFunctions(getApp());
  const sendPush = httpsCallable(functions, 'sendServicePushNotifications');
  await sendPush({
    recipientEmail: user?.email,
    title: newService.title,
    description: newService.description,
  });
  console.log('✅ Notificación de servicio enviada');
} catch (err) {
  console.error('❌ Error enviando notificación push de servicio:', err);
}

      Alert.alert('✅ Servicio creado', 'Tu servicio ha sido publicado.');
      loadServices();
    } catch (error) {
      console.error('Error creando servicio:', error);
      Alert.alert('❌ Error', 'No se pudo crear el servicio.');
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      'Eliminar servicio',
      '¿Estás seguro de que quieres eliminar este servicio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const data = await AsyncStorage.getItem('posts');
            const posts = data ? JSON.parse(data) : [];
            const updated = posts.filter(p => p.id !== id);
            await AsyncStorage.setItem('posts', JSON.stringify(updated));
            loadServices();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{
          position: 'absolute',
          top: 40,
          left: 20,
          zIndex: 2000,
        }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📋 Mis Servicios</Text>

        {services.length === 0 ? (
          <Text style={styles.empty}>No has publicado servicios aún.</Text>
        ) : (
          services.map((item, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
              <View style={styles.cardButtons}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item.id)}
                >
                  <Text style={styles.buttonText}>🗑️ Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
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
    marginTop: 30,
    padding: 20,
    paddingBottom: 120,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  empty: {
    color: '#999',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 20,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderColor: '#D8A353',
    borderWidth: 1,
  },
  cardTitle: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardDescription: {
    color: '#ccc',
    fontSize: 13,
  },
  cardButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  deleteButton: {
    backgroundColor: '#cc0000',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
