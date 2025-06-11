import React, { useState, useEffect } from 'react';
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
import { getWeeklyCastingPostCount, registerCastingPost } from '../utils/postLimits';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import { syncCastingToFirestore } from '../src/firebase/helpers/syncCastingToFirestore';

export default function MyCastingsScreen() {
  const navigation = useNavigation();
  const [castings, setCastings] = useState([]);
  const { userData } = useUser();
  const membership = userData?.membershipType || 'free';
const hasPaid = userData?.hasPaid === true;

useEffect(() => {
  const loadCastings = async () => {
    try {
      const data = await AsyncStorage.getItem('posts');
      const parsed = data ? JSON.parse(data) : [];
      const userId = userData?.id?.toLowerCase();
      const creatorEmail = userData?.email?.toLowerCase();

      const ownCastings = parsed.filter((post) => {
        const postCreatorId = post.creatorId?.toLowerCase();
        const postCreatorEmail = post.creatorEmail?.toLowerCase();

        return (
          post.type === 'casting' &&
          (postCreatorId === userId || postCreatorEmail === creatorEmail)
        );
      });

      setCastings(ownCastings);
    } catch (error) {
      console.error('Error al cargar castings:', error);
    }
  };

  const unsubscribe = navigation.addListener('focus', loadCastings);
  return unsubscribe;
}, [navigation, userData]);

  const createTestCasting = async () => {
    const count = await getWeeklyCastingPostCount();

    if (membership === 'free' && count >= 1) {
  Alert.alert(
    'Límite alcanzado',
    'Solo puedes publicar 1 casting por semana con el plan Free. Actualiza tu membresía para publicar más.'
  );
  return;
}

    try {
      const demoCasting = {
        id: Date.now().toString(),
        title: 'Casting de prueba',
        description: 'Se busca actor para cortometraje ficticio. Grabación en Santiago. Remunerado.',
        category: 'Actor',
        type: 'casting',
        date: new Date().toISOString().split('T')[0],
        isPromotional: false,
        creatorId: userData?.id || 'sin-id',
        creatorEmail: userData?.email || 'desconocido@mail.com',
      };

      const existing = await AsyncStorage.getItem('posts');
      const parsed = existing ? JSON.parse(existing) : [];
      parsed.push(demoCasting);
      await AsyncStorage.setItem('posts', JSON.stringify(parsed));

      await registerCastingPost();
      await syncCastingToFirestore(demoCasting);

      Alert.alert('Casting creado', 'Tu publicación fue guardada con éxito.');
    } catch (error) {
      console.error('Error al crear casting:', error);
      Alert.alert('Error', 'No se pudo crear el casting.');
    }
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🎬 Mis castings publicados</Text>

        {castings.length === 0 ? (
          <Text style={styles.empty}>Aún no has publicado ningún casting.</Text>
        ) : (
          castings.map((casting, index) => (
            <View key={index} style={styles.cardRow}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardTitle}>{casting.title}</Text>
                <Text style={styles.cardDate}>📅 {casting.date || 'Sin fecha'}</Text>
                <Text style={styles.cardCategory}>🎭 {casting.category || 'Sin categoría'}</Text>
              </View>
              <TouchableOpacity
                style={styles.cardButton}
                onPress={() => navigation.navigate('ViewApplications', { castingId: casting.id })}
              >
                <Ionicons name="eye-outline" size={16} color="#000" />
                <Text style={styles.cardButtonText}>Ver postulaciones</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <TouchableOpacity onPress={createTestCasting} style={[styles.button, { marginTop: 20 }]}>
          <Text style={styles.buttonText}>+ Crear casting de prueba</Text>
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
    top: 30,
    paddingBottom: 120,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    color: '#D8A353',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  empty: {
    color: '#888',
    marginTop: 50,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#1A1A1A',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
  },
  buttonText: {
    color: '#D8A353',
    fontWeight: 'bold',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 0.5,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  cardLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardDate: {
    color: '#ccc',
    marginBottom: 4,
  },
  cardCategory: {
    color: '#aaa',
  },
  cardButton: {
    backgroundColor: '#D8A353',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  cardButtonText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
  },
});
