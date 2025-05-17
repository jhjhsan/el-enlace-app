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
import {
  getWeeklyServicePostCount,
  registerServicePost,
} from '../utils/postLimits';
import { Ionicons } from '@expo/vector-icons'; // ✅ Importamos la flecha

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

  const createFakeService = async () => {
    const count = await getWeeklyServicePostCount();

    if (count >= 1) {
      Alert.alert(
        'Límite alcanzado',
        'Solo puedes publicar 1 servicio por semana con el plan Free. Actualiza tu membresía para publicar más.'
      );
      return;
    }

    try {
      const fakeService = {
        id: Date.now().toString(),
        title: '🎬 Edición de Video Profesional',
        description:
          'Ofrezco edición profesional para comerciales, videoclips, y cortos. Entrega rápida y calidad de cine.',
        category: 'Editor de video',
        type: 'servicio',
        date: new Date().toISOString().split('T')[0],
        isPromotional: false,
      };

      const existing = await AsyncStorage.getItem('posts');
      const posts = existing ? JSON.parse(existing) : [];

      posts.push(fakeService);
      await AsyncStorage.setItem('posts', JSON.stringify(posts));

      await registerServicePost();
      Alert.alert('✅ Servicio de prueba creado', 'Ya puedes verlo en Mis Servicios.');
      loadServices();
    } catch (error) {
      console.error('Error creando servicio de prueba:', error);
      Alert.alert('❌ Error', 'No se pudo crear el servicio.');
    }
  };

  return (
    <View style={styles.screen}>
      {/* ✅ Flecha profesional de volver */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{
          position: 'absolute',
          top: 15,
          left: 20,
          zIndex: 2000,
        }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📋 Mis Servicios</Text>

        <TouchableOpacity style={styles.testButton} onPress={createFakeService}>
          <Text style={styles.testButtonText}>⚙️ Crear servicio de prueba</Text>
        </TouchableOpacity>

        {services.length === 0 ? (
          <Text style={styles.empty}>No has publicado servicios aún.</Text>
        ) : (
          services.map((item, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
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
  testButton: {
    backgroundColor: '#444',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
});
