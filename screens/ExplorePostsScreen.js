import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchServicesFromFirestore } from '../src/firebase/helpers/fetchServicesFromFirestore';

export default function ExplorePostsScreen() {
  const [posts, setPosts] = useState([]);
  const navigation = useNavigation();

  const goToProfileDetail = async (email) => {
  try {
    const storedFreePro = await AsyncStorage.getItem('allProfiles');
    const storedElite = await AsyncStorage.getItem('allProfilesElite');

    const parsedFreePro = storedFreePro ? JSON.parse(storedFreePro) : [];
    const parsedElite = storedElite ? JSON.parse(storedElite) : [];

    const allProfiles = [...parsedFreePro, ...parsedElite];
    const match = allProfiles.find((p) => p.email === email);

    if (match) {
      navigation.navigate('ProfileDetailScreen', {
        profileData: match,
      });
    } else {
      Alert.alert('Perfil no encontrado', 'No se encontró el perfil del usuario que publicó este servicio.');
    }
  } catch (error) {
    console.log('❌ Error buscando perfil:', error);
    Alert.alert('Error', 'Ocurrió un error al intentar abrir el perfil.');
  }
};

useEffect(() => {
  const loadPostsFromFirestore = async () => {
    try {
      const data = await fetchServicesFromFirestore();
      setPosts(data);
    } catch (error) {
      console.error('Error al cargar publicaciones desde Firestore:', error);
    }
  };

  loadPostsFromFirestore();
}, []);

  return (
    <View style={styles.screen}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ position: 'absolute', top: 40, left: 20, zIndex: 10 }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🔍 Explorar Servicios</Text>
        {posts.length === 0 ? (
          <Text style={styles.empty}>No hay publicaciones disponibles.</Text>
        ) : (
      posts.map((post, index) => (
  <TouchableOpacity
    key={index}
    style={[styles.card, { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 }]}
onPress={() => {
  if (post.creatorEmail) {
    goToProfileDetail(post.creatorEmail);
  }
}}
  >
    {post.image && (
      <Image source={{ uri: post.image }} style={styles.image} />
    )}

    <View style={{ marginTop: 10 }}>
      <Text style={styles.cardTitle}>📌 {post.title}</Text>
      <Text style={styles.cardText}>{post.description}</Text>
      <Text style={styles.cardText}>📂 {post.category}</Text>
      {post.location && (
        <Text style={styles.cardText}>📍 {post.location}</Text>
      )}
      {post.date && (
        <Text style={styles.cardText}>📅 {post.date}</Text>
      )}

      {post.whatsapp && (
        <TouchableOpacity
          onPress={() => {
            const number = post.whatsapp.replace(/\D/g, '');
            const link = `https://wa.me/${number}`;
            Linking.openURL(link);
          }}
        >
          <Text style={{ color: '#25D366', marginTop: 6, fontWeight: 'bold' }}>
            📱 Contactar por WhatsApp
          </Text>
        </TouchableOpacity>
      )}
    </View>
  </TouchableOpacity>
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
    top: 30,
    marginBottom: 50,
  },
  empty: {
    color: '#999',
    textAlign: 'center',
    marginTop: 50,
  },
card: {
  backgroundColor: '#1A1A1A',
  borderColor: '#D8A353',
  borderWidth: 0.5,
  borderRadius: 8,
  padding: 10,
  marginBottom: 10,
},
image: {
  width: '100%',
  height: 120,
  borderRadius: 6,
  marginBottom: 8,
},
cardTitle: {
  color: '#fff',
  fontSize: 15,
  marginTop: -10,
  fontWeight: '600',
  marginBottom: 4,
},
cardText: {
  color: '#bbb',
  fontSize: 12,
  marginBottom: 2,
},

});
