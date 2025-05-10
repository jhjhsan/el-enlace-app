import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';

export default function PromotePostScreen({ navigation }) {
  const { userData } = useUser();
  const [posts, setPosts] = useState([]);
  const [selectedPostIndex, setSelectedPostIndex] = useState(null);
  const [duration, setDuration] = useState(null);

  useEffect(() => {
    const loadPosts = async () => {
      const data = await AsyncStorage.getItem('posts');
      const parsed = data ? JSON.parse(data) : [];
      const servicesOnly = parsed.filter((post) => post.type === 'servicio');
      setPosts(servicesOnly);
    };
    loadPosts();
  }, []);

  const getPrice = (days) => {
    const basePrice = {
      3: 1490,
      7: 2490,
      15: 4990,
    }[days] || 0;

    if (userData?.membershipType === 'elite') {
      return Math.round(basePrice * 0.9);
    }

    return basePrice;
  };

  const handlePromote = async () => {
    if (selectedPostIndex === null || !duration) {
      Alert.alert('Completa los pasos', 'Selecciona un servicio y duración.');
      return;
    }

    const updatedPosts = [...posts];
    updatedPosts[selectedPostIndex].isPromotional = true;
    updatedPosts[selectedPostIndex].promoDays = duration;

    try {
      const originalData = await AsyncStorage.getItem('posts');
      let allPosts = originalData ? JSON.parse(originalData) : [];

      const targetId = updatedPosts[selectedPostIndex].id;
      allPosts = allPosts.map((post) =>
        post.id === targetId ? updatedPosts[selectedPostIndex] : post
      );

      await AsyncStorage.setItem('posts', JSON.stringify(allPosts));
      Alert.alert('✅ Éxito', 'Servicio promocionado correctamente.');
      navigation.navigate('ViewPosts');
    } catch (error) {
      console.error('Error al guardar promoción:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌟 Promocionar servicio</Text>
      <Text style={styles.subtitle}>Haz que tu publicación tenga más visibilidad</Text>

      <Text style={styles.section}>1. Selecciona un servicio</Text>
      <FlatList
        data={posts}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[
              styles.postItem,
              selectedPostIndex === index && styles.selectedItem,
            ]}
            onPress={() => setSelectedPostIndex(index)}
          >
            <Text style={styles.postTitle}>{item.title}</Text>
            <Text style={styles.postDesc}>{item.description}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No tienes servicios publicados aún.</Text>
        }
      />

      <Text style={styles.section}>2. Elige duración</Text>
      <View style={styles.durationContainer}>
        {[3, 7, 15].map((d) => (
          <TouchableOpacity
            key={d}
            style={[
              styles.durationButton,
              duration === d && styles.selectedDuration,
            ]}
            onPress={() => setDuration(d)}
          >
            <Text style={styles.durationText}>{d} días</Text>
            <Text style={styles.durationPrice}>${getPrice(d)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {userData?.membershipType === 'elite' && (
        <Text style={styles.discountNote}>👑 10% de descuento aplicado (Elite)</Text>
      )}

      <TouchableOpacity style={styles.promoteButton} onPress={handlePromote}>
        <Text style={styles.promoteText}>💳 Pagar y promocionar</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>⬅ Volver</Text>
        </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 4,
    fontSize: 14,
    fontStyle: 'italic',
  },
  section: {
    color: '#fff',
    fontSize: 16,
    marginVertical: 10,
  },
  postItem: {
    backgroundColor: '#1B1B1B',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderColor: '#333',
    borderWidth: 1,
  },
  selectedItem: {
    borderColor: '#D8A353',
    borderWidth: 2,
  },
  postTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  postDesc: {
    color: '#ccc',
    fontSize: 14,
  },
  empty: {
    color: '#888',
    textAlign: 'center',
    marginTop: 30,
  },
  durationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  durationButton: {
    backgroundColor: '#1B1B1B',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderColor: '#333',
    borderWidth: 1,
    width: 90,
  },
  selectedDuration: {
    borderColor: '#D8A353',
    borderWidth: 2,
  },
  durationText: {
    color: '#fff',
    fontSize: 14,
  },
  durationPrice: {
    color: '#D8A353',
    fontSize: 12,
    marginTop: 4,
  },
  discountNote: {
    color: '#FFD700',
    textAlign: 'center',
    marginVertical: 10,
    fontStyle: 'italic',
  },
  promoteButton: {
    marginTop: 30,
    backgroundColor: '#D8A353',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  promoteText: {
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
