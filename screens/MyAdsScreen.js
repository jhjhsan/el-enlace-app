import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function MyAdsScreen() {
  const { userData } = useUser();
  const [myAds, setMyAds] = useState([]);

  useEffect(() => {
    const fetchMyAds = async () => {
      try {
        const json = await AsyncStorage.getItem('adsList');
        const allAds = json ? JSON.parse(json) : [];
        const mine = allAds.filter(ad => ad.userEmail === userData.email);
        setMyAds(mine.reverse());
      } catch (error) {
        console.error('Error al cargar anuncios:', error);
      }
    };
    fetchMyAds();
  }, []);

  const getRemainingDays = (expiresAt) => {
    const now = Date.now();
    const diff = expiresAt - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const renewAd = async (index) => {
    try {
      const updatedAds = [...myAds];
      updatedAds[index].expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const existing = await AsyncStorage.getItem('adsList');
      let allAds = existing ? JSON.parse(existing) : [];
      const updatedAll = allAds.map(ad =>
        ad.id === updatedAds[index].id ? updatedAds[index] : ad
      );
      await AsyncStorage.setItem('adsList', JSON.stringify(updatedAll));
      setMyAds(updatedAds);
      Alert.alert('✅ Anuncio renovado por 7 días');
    } catch (error) {
      console.error('Error al renovar anuncio:', error);
    }
  };
  const navigation = useNavigation();

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🧾 Mis Anuncios Publicitarios</Text>

      {myAds.length === 0 && (
        <Text style={styles.empty}>Aún no has publicado anuncios.</Text>
      )}

      {myAds.map((ad, index) => (
        <View key={index} style={styles.card}>
          <Image source={{ uri: ad.imageUri }} style={styles.image} />
          <View style={styles.info}>
            <Text style={styles.adTitle}>{ad.title}</Text>
            {ad.link && ad.link.trim() !== '' && (
              <Text style={styles.link}>🔗 {ad.link}</Text>
            )}
            {ad.expiresAt ? (
              getRemainingDays(ad.expiresAt) > 0 ? (
                <Text style={styles.active}>⏳ {getRemainingDays(ad.expiresAt)} días restantes</Text>
              ) : (
                <View>
                  <Text style={styles.expired}>❌ Anuncio vencido</Text>
                  <TouchableOpacity
                    style={styles.renewButton}
                    onPress={() => renewAd(index)}
                  >
                    <Text style={styles.renewText}>🔁 Renovar 7 días</Text>
                  </TouchableOpacity>
                </View>
              )
            ) : null}
          </View>
        </View>
      ))}
      <TouchableOpacity
  onPress={() => navigation.goBack()}
  style={styles.backButton}
>
  <Ionicons name="arrow-back" size={28} color="#fff" />
</TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    flex: 1,
    padding: 20,
  },
  title: {
    color: '#D8A353',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop:20,
    marginBottom: 20,
    textAlign: 'center',
  },
  empty: {
    color: '#888',
    textAlign: 'center',
    marginTop: 50,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    borderColor: '#D8A353',
    borderWidth: 1,
  },
  image: {
    width: '100%',
    height: 160,
  },
  info: {
    padding: 10,
  },
  adTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  link: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 5,
  },
  active: {
    color: '#D8A353',
    marginTop: 5,
    fontSize: 13,
  },
  expired: {
    color: '#ff4d4d',
    marginTop: 5,
    fontSize: 13,
  },
  renewButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8A353',
  },
  renewText: {
    color: '#D8A353',
    fontSize: 13,
  },
  backButton: {
    position: 'absolute',
    top: 2,
    left: 5,
    zIndex: 10,
  },
  
});
