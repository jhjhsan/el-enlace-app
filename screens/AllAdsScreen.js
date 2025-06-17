import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  Animated,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { getAdsFromFirestore } from '../src/firebase/helpers/getAdsFromFirestore';
import BackButton from '../components/BackButton';
import { syncAdToFirestore } from '../src/firebase/helpers/syncAdToFirestore';

const { height } = Dimensions.get('window');
const ITEM_HEIGHT = 280;

export default function AllAdsScreen() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [ads, setAds] = useState([]);

useEffect(() => {
  const fetchAds = async () => {
    try {
      // 1. Obtener todos los anuncios desde Firestore
      const firestoreAds = await getAdsFromFirestore();

      // 2. Filtrar solo los aprobados y vigentes
      const now = Date.now();
      const visibles = firestoreAds.filter(
        ad => ad.aprobado && ad.expiresAt > now
      );

      // 3. Ordenar por fecha de expiración (más nuevos primero)
      visibles.sort((a, b) => b.expiresAt - a.expiresAt);

      // 4. Límite de 20 anuncios
      setAds(visibles.slice(0, 20));
    } catch (error) {
      console.log('❌ Error al cargar anuncios desde Firestore:', error);
    }
  };

  fetchAds();
}, []);

  const renderItem = ({ item, index }) => {
    const inputRange = [
      (index - 1) * ITEM_HEIGHT,
      index * ITEM_HEIGHT,
      (index + 1) * ITEM_HEIGHT,
    ];

    const scale = scrollY.interpolate({
      inputRange,
      outputRange: [0.7, 1, 0.7], // más pequeño en laterales
      extrapolate: 'clamp',
    });

    const opacity = scrollY.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3], // más opaco en laterales
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        onPress={() => item.link && Linking.openURL(item.link)}
        activeOpacity={0.9}
      >
        <Animated.View style={[styles.itemContainer, { transform: [{ scale }], opacity }]}>
          <Image source={{ uri: item.imageUri }} style={styles.image} />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <BackButton color="#fff" size={28} top={40} left={20} />
      <Text style={styles.header}>🎯 Publicidad y promociones</Text>
{ads.length < 20 && ads.some(ad => ad.enEspera) && (
  <Text style={{ color: '#888', fontSize: 12, marginBottom: 10, textAlign: 'center' }}>
    🔔 Tu anuncio pendiente será activado automáticamente cuando haya espacio.
  </Text>
)}

      <Animated.FlatList
        data={ads}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 60 }}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 40,
    alignItems: 'center',
  },
  header: {
    color: '#D8A353',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
  },
  itemContainer: {
    height: ITEM_HEIGHT,
    width: Dimensions.get('window').width * 0.9,
    alignSelf: 'center',
    borderRadius: 15,
    marginBottom: 30,
    backgroundColor: '#111',
    shadowColor: '#D8A353',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
    resizeMode: 'cover',
  },
});
