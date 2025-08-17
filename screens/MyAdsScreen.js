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
import { getAdsFromFirestore } from '../src/firebase/helpers/getAdsFromFirestore';
import { syncAdToFirestore } from '../src/firebase/helpers/syncAdToFirestore';
import { deleteAdFromFirestore } from '../src/firebase/helpers/deleteAdFromFirestore';

export default function MyAdsScreen() {
  const { userData } = useUser();
  const [myAds, setMyAds] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchMyAds = async () => {
      try {
        const userEmail = userData?.email || '';
        const adsFromFirestore = await getAdsFromFirestore(userEmail);
        setMyAds(adsFromFirestore.reverse());
        await AsyncStorage.setItem('adsList', JSON.stringify(adsFromFirestore));
      } catch (error) {
        console.error('Error al cargar anuncios desde Firestore:', error);
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
      await syncAdToFirestore(updatedAds[index]);
      setMyAds(updatedAds);
      Alert.alert('✅ Anuncio renovado por 7 días');
    } catch (error) {
      console.error('Error al renovar anuncio:', error);
    }
  };

const handleDeleteAd = async (index) => {
  try {
    const adToDelete = myAds[index];

    // 🔥 Eliminar de Firestore
    await deleteAdFromFirestore(adToDelete.id);

    // 🧹 Eliminar del estado y AsyncStorage
    const updatedAds = myAds.filter((_, i) => i !== index);
    setMyAds(updatedAds);
    await AsyncStorage.setItem('adsList', JSON.stringify(updatedAds));

    Alert.alert('🗑️ Anuncio eliminado');
  } catch (error) {
    console.error('Error al eliminar anuncio:', error);
  }
};

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

            {ad.enEspera && !ad.aprobado && getRemainingDays(ad.expiresAt) > 0 && (
              <Text style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
                ⏳ En espera de activación
              </Text>
            )}

        <TouchableOpacity
  style={{ marginTop: 6, alignSelf: 'flex-start' }}
  onPress={() => handleDeleteAd(index)}
>
  <Text style={{ color: '#ff4d4d', fontSize: 13 }}>🗑️ Eliminar anuncio</Text>
</TouchableOpacity>

            {ad.link && ad.link.trim() !== '' && (
              <Text style={styles.link}>🔗 {ad.link}</Text>
            )}

            {ad.expiresAt ? (
              getRemainingDays(ad.expiresAt) > 0 ? (
                <Text style={styles.active}>
                  ⏳ {getRemainingDays(ad.expiresAt)} días restantes
                </Text>
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

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    flex: 1,
    padding: 10,
    marginTop: 20,
  },
  title: {
    color: '#D8A353',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
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
    marginBottom: 10,
    overflow: 'hidden',
    borderColor: '#D8A353',
    borderWidth: 0.3,
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
    top: 0,
    left: 0,
    zIndex: 10,
  },
});
