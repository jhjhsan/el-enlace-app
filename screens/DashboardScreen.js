import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
  Linking,
  Modal,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../contexts/UserContext';
import { useSimulatedNotification } from '../utils/useSimulatedNotification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { syncAdToFirestore } from '../src/firebase/helpers/syncAdToFirestore';
import { Image as RNImage } from 'react-native'; // asegúrate de tener este import

const { width } = Dimensions.get('window');
import img1 from '../assets/placeholders_ads1.png';
import img2 from '../assets/placeholders_ads2.png';
import img3 from '../assets/placeholders_ads3.png';
import img4 from '../assets/placeholders_ads4.png';
import img5 from '../assets/placeholders_ads5.png';
import img6 from '../assets/placeholders_ads6.png';
import img7 from '../assets/placeholders_ads7.png';


export default function DashboardScreen({ navigation }) {
  const scrollRef = useRef(null);
  const currentIndexRef = useRef(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [carouselImages, setCarouselImages] = useState([]);
  const [allCastings, setAllCastings] = useState([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { userData } = useUser();
  const userName = userData?.name || 'Usuario';
  const membershipType = userData?.membershipType || 'free';

  useSimulatedNotification(userData);

  const loadRecentCastings = async () => {
    try {
      const data = await AsyncStorage.getItem('castings');
      const parsed = data ? JSON.parse(data) : [];

      const ahora = Date.now();
      const cincoDiasEnMs = 5 * 24 * 60 * 60 * 1000;

      const recientes = parsed.filter(c => ahora - c.timestamp <= cincoDiasEnMs);
      await AsyncStorage.setItem('castings', JSON.stringify(recientes));
      const sorted = recientes.sort((a, b) => b.timestamp - a.timestamp);
      setAllCastings(sorted);
    } catch (error) {
      console.error('Error cargando castings:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRecentCastings();
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadRecentCastings();
  }, []);

useEffect(() => {
  const fetchAds = async () => {
    try {
      const json = await AsyncStorage.getItem('adsList');
      let parsed = json ? JSON.parse(json) : [];
      const now = Date.now();

      // 1. Desactivar anuncios expirados
      parsed = parsed.map(ad => {
        if (ad.expiresAt < now) {
          return { ...ad, aprobado: false };
        }
        return ad;
      });

      // 2. Verificar si hay espacio para activar uno en espera
      const activos = parsed.filter(ad => ad.aprobado === true);
      if (activos.length < 20) {
        const enEspera = parsed.find(ad => ad.enEspera && !ad.aprobado);
        if (enEspera) {
          enEspera.aprobado = true;
          enEspera.enEspera = false;
          await syncAdToFirestore(enEspera); // FALTA sincronizar cambio con Firebase
        }
      }

      // 3. Guardar cambios
      await AsyncStorage.setItem('adsList', JSON.stringify(parsed));

      // 4. Cargar solo los destacados activos y vigentes
      const dynamicImages = parsed
  .filter(ad => ad.aprobado === true && ad.expiresAt > now && ad.destacado === true)
  .map(ad => ({
    tipo: ad.tipo || 'imagen', // por si es antiguo
    uri: ad.imageUri || null,
    videoUri: ad.videoUri || null,
    link: ad.link,
  }));

const placeholderImages = [
  img1, img2, img3, img4, img5, img6, img7,
];

const placeholders = placeholderImages.map((img, index) => ({
  uri: RNImage.resolveAssetSource(img).uri,
  isPlaceholder: true,
  id: index + 1,
}));

      const mergedImages = placeholders.map((slot, index) => {
  const realAd = dynamicImages[index];
  return realAd
    ? { ...realAd, isPlaceholder: false, id: index + 1 }
    : { ...slot };
});
setCarouselImages(mergedImages);

    } catch (error) {
      console.log('❌ Error cargando anuncios:', error);
    }
  };
  fetchAds();
}, []);

  useEffect(() => {
    if (!isPlaying || carouselImages.length === 0) return;
    const interval = setInterval(() => {
      const nextIndex = (currentIndexRef.current + 1) % carouselImages.length;
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
      scrollRef.current?.scrollToOffset({
        offset: nextIndex * width,
        animated: nextIndex !== 0,
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, carouselImages]);

const formatDate = (isoDate) => {
  const d = new Date(isoDate);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${d.getFullYear()}`;
};

  return (
    <SafeAreaView style={styles.screen}>
      <TouchableOpacity
  onPress={() => navigation.navigate('ExploreProfiles')}
  style={{
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: '#1a1a1a',
    padding: 10,
    borderRadius: 30,
    zIndex: 20,
    elevation: 5,
  }}
>
  <Ionicons name="search" size={24} color="#D8A353" />
</TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image source={require('../assets/logo.png')} style={styles.logoSmall} />
          <View style={styles.greetingBox}>
            <Text style={styles.greeting}>
              Hola, {userName} {membershipType === 'pro' ? '🏆' : '👋'}
            </Text>
            <Text style={styles.subtitle}>
              {membershipType === 'free'
                ? 'Explora oportunidades y sube a Pro para postular.'
                : '¿Listo para tu próxima oportunidad?'}
            </Text>
          </View>
        </View>
{userData?.trialEndsAt && !userData?.hasPaid && (
  <View style={styles.trialBanner}>
    <Text style={styles.trialText}>
      🎁 Acceso gratis hasta el {formatDate(userData.trialEndsAt)}
    </Text>
    <TouchableOpacity onPress={() => navigation.navigate('PaymentScreen')}>
      <Text style={[styles.trialText, { textDecorationLine: 'underline', marginTop: 6 }]}>
        🔓 Activar plan ahora
      </Text>
    </TouchableOpacity>
  </View>
)}
        <View style={styles.carouselWrapper}>
          <FlatList
            ref={scrollRef}
            data={carouselImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => item.link && Linking.openURL(item.link)}>
                <View style={styles.carouselImageWrapper}>
  {item.tipo === 'video' && item.videoUri ? (
  <Video
    source={{ uri: item.videoUri }}
    style={styles.carouselImage}
    resizeMode="cover"
    isLooping
    shouldPlay={isPlaying}
    isMuted
  />
) : (
  <>
    <Image
      source={{ uri: item.uri }}
      style={[styles.carouselImage, item.isPlaceholder && { opacity: 0.4 }]}
      resizeMode="cover"
    />
    {item.isPlaceholder && (
      <Text style={styles.adWatermark}>ESPACIO PUBLICITARIO</Text>
    )}
  </>
)}
</View>

              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={styles.playPauseOverlay}
            onPress={() => setIsPlaying(!isPlaying)}
          >
            <Text style={styles.playPauseText}>{isPlaying ? '⏸️' : '▶️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('AllAdsScreen')}
          style={styles.promoButton}
        >
          <Text style={styles.promoButtonText}>📢 Ver anuncios promocionados</Text>
        </TouchableOpacity>

        <View style={styles.divider} />
      </View>

      <View style={styles.castingSectionWrapper}>
        {allCastings.length > 0 ? (
          <FlatList
            data={allCastings}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.castingLineContainer}
                onPress={() =>
                  membershipType === 'free'
                    ? setShowUpgradeModal(true)
                    : navigation.navigate('CastingDetail', { casting: item })
                }
              >
                <View style={styles.lineSeparator} />
                <View style={styles.castingLine}>
                  <Text style={styles.castingTitle}>{item.title}</Text>
                  <Text style={styles.castingAgency}>{item.agencyName}</Text>
                  <Text style={styles.castingDate}>
                    {new Date(item.timestamp).toLocaleDateString()} -{' '}
                    {new Date(item.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
            contentContainerStyle={{ paddingBottom: 90 }}
          />
        ) : (
          <View style={{ paddingHorizontal: 20, paddingBottom: 90 }}>
            <View style={styles.lineSeparator} />
            <Text style={styles.emptyMessage}>
              No hay castings publicados actualmente. Vuelve a revisar más tarde.
            </Text>
            <View style={styles.lineSeparator} />
          </View>
        )}
      </View>

      <Modal transparent={true} visible={showUpgradeModal} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🚫 Solo disponible para cuentas Pro o Elite</Text>
            <Text style={styles.modalText}>
              Para ver los detalles de los castings y postular, necesitas activar tu cuenta Pro.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowUpgradeModal(false);
                navigation.navigate('UpgradeToPro');
              }}
            >
              <Text style={{ color: '#000', fontWeight: 'bold' }}>Subir a Pro</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {userData?.membershipType !== 'free' && (
 <TouchableOpacity
  style={{
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#D8A353',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    elevation: 6,
  }}
  onPress={() => navigation.navigate('AssistantIAProfile')}
>
  <Ionicons name="sparkles-outline" size={18} color="#000" style={{ marginRight: 6 }} />
  <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 10 }}>Analiza mi perfil</Text>
</TouchableOpacity>
)}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 10,
  },
  header: { paddingTop: 0, backgroundColor: '#000' },
  logoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  logoSmall: { width: 50, height: 50, marginRight:-10},
  greetingBox: { flex: 1, marginLeft: 45, alignItems: 'flex-start' },
  greeting: {
    color: '#D8A353',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 0,
    marginLeft: -20,
    alignSelf: 'flex-start',
  },
  subtitle: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 0,
    textAlign: 'center',
    marginTop: 0,
    marginLeft: -35,
    marginRight: 10,
    alignSelf: 'flex-start',
  },
  carouselWrapper: { position: 'relative', width: '100%', alignItems: 'center', marginBottom: 8 },
  carouselImage: {
    width: width - 40,
    height: (width - 40) * 9 / 16,
    borderRadius: 10,
    marginHorizontal: 20,
  },
  playPauseOverlay: {
    position: 'absolute',
    top: 10,
    right: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderRadius: 20,
  },
  playPauseText: { color: '#D8A353', fontWeight: 'bold', fontSize: 12 },
  promoButton: {
    backgroundColor: '#D8A353',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginBottom: 10,
    alignSelf: 'center',
  },
  promoButtonText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  divider: {
    height: 0.4,
    backgroundColor: '#2A2A2A',
    width: '88%',
    alignSelf: 'center',
    marginBottom: -5,
  },
  castingSectionWrapper: {
    flex: 1,
    backgroundColor: '#111111',
  },
  castingLineContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  castingLine: {
    width: '100%',
  },
  castingTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  castingAgency: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 2,
  },
  castingDate: {
    color: '#777',
    fontSize: 12,
    marginTop: 2,
  },
  lineSeparator: {
    height: 0.6,
    backgroundColor: '#2A2A2A',
    marginBottom: 9,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000aa',
  },
  modalContent: {
    backgroundColor: '#1B1B1B',
    padding: 20,
    borderRadius: 10,
    borderColor: '#D8A353',
    borderWidth: 1,
  },
  modalTitle: { color: '#D8A353', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  modalText: { color: '#ccc', marginBottom: 20 },
  modalButton: { backgroundColor: '#D8A353', padding: 10, borderRadius: 8, alignItems: 'center' },

  emptyMessage: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  trialBanner: {
  backgroundColor: '#222',
  borderColor: '#D8A353',
  borderWidth: 1,
  borderRadius: 8,
  padding: 8,
  marginTop: 10,
  marginHorizontal: 20,
},
trialText: {
  color: '#D8A353',
  fontSize: 12,
  textAlign: 'center',
  fontWeight: 'bold',
},
carouselImageWrapper: {
  position: 'relative',
  width: width - 40,
  height: (width - 40) * 9 / 16,
  borderRadius: 10,
  marginHorizontal: 20,
  overflow: 'hidden',
  justifyContent: 'center',
  alignItems: 'center',
},
adWatermark: {
  position: 'absolute',
  color: 'rgba(255, 255, 255, 0.4)', // blanco semitransparente
  fontSize: 28,
  fontWeight: 'bold',
  textAlign: 'center',
  zIndex: 5,
},

});