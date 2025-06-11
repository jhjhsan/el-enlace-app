import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Linking,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Image as RNImage } from 'react-native';
import img1 from '../assets/placeholders_ads1.png';
import img2 from '../assets/placeholders_ads2.png';
import img3 from '../assets/placeholders_ads3.png';
import img4 from '../assets/placeholders_ads4.png';
import img5 from '../assets/placeholders_ads5.png';
import img6 from '../assets/placeholders_ads6.png';
import img7 from '../assets/placeholders_ads7.png';

const formatDate = (isoDate) => {
  const d = new Date(isoDate);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};
const { width } = Dimensions.get('window');

export default function DashboardEliteScreen({ navigation }) {
    const scrollRef = useRef(null);
    const currentIndexRef = useRef(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [carouselImages, setCarouselImages] = useState([]);
    const [highlightedProfiles, setHighlightedProfiles] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const { userData } = useUser();
   const userName = userData?.agencyName || 'Agencia';

  
    const [localUserData, setLocalUserData] = useState(null);
    const [loadingUserData, setLoadingUserData] = useState(true);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
    const hasPaid = localUserData?.hasPaid === true;
  
 const loadAds = async () => {
  try {
    const json = await AsyncStorage.getItem('adsList');
    const parsed = json ? JSON.parse(json) : [];
    const now = Date.now();

    const dynamicImages = parsed
      .filter(ad => ad.aprobado && ad.expiresAt > now && ad.destacado)
      .map(ad => ({ uri: ad.imageUri, link: ad.link }));

    const placeholderImages = [img1, img2, img3, img4, img5, img6, img7];
    const placeholders = placeholderImages.map((img, index) => ({
      uri: RNImage.resolveAssetSource(img).uri,
      isPlaceholder: true,
      id: index + 1,
    }));

    const merged = placeholders.map((slot, index) => {
      const realAd = dynamicImages[index];
      return realAd
        ? { ...realAd, isPlaceholder: false, id: index + 1 }
        : { ...slot };
    });

    setCarouselImages(merged);
  } catch (error) {
    console.log('Error cargando anuncios:', error);
  }
};

  const loadHighlightedProfiles = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const profileKeys = keys.filter(k => k.startsWith('userProfile_') && !k.includes('Elite'));
      const stores = await AsyncStorage.multiGet(profileKeys);
  
      const profiles = stores
        .map(([, value]) => {
          try {
            const parsed = JSON.parse(value);
            return parsed?.membershipType === 'pro' && parsed?.isHighlighted ? parsed : null;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)) // orden por fecha descendente
        .slice(0, 20); // limitar a 20
  
      setHighlightedProfiles(profiles);
    } catch (error) {
      console.error('Error cargando perfiles destacados:', error);
    }
  };  

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAds();
    await loadHighlightedProfiles();
    setRefreshing(false);
  };

  useEffect(() => {
    loadAds();
    loadHighlightedProfiles();
  }, []);
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const json = await AsyncStorage.getItem('userData');
        const parsed = json ? JSON.parse(json) : null;
        setLocalUserData(parsed);
      } catch (error) {
        console.log('Error cargando userData:', error);
      } finally {
        setLoadingUserData(false);
      }
    };
  
    fetchUserData();
  }, []);
  
  useEffect(() => {
    if (!isPlaying || carouselImages.length === 0) return;
    const interval = setInterval(() => {
      const nextIndex = (currentIndexRef.current + 1) % carouselImages.length;
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
      scrollRef.current?.scrollToOffset({ offset: nextIndex * width, animated: true });
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, carouselImages]);

const crearPerfilDePrueba = async () => {
  const fake = {
    name: 'Talento Destacado',
    category: ['Actor'],
    city: 'Santiago',
    region: 'Región Metropolitana',
    profilePhoto: 'https://via.placeholder.com/100',
    membershipType: 'pro',
    isHighlighted: true,
    email: `fake_${Date.now()}@mail.com`,
    description: 'Este es un talento de prueba con descripción válida para testeo.',
    video: 'https://www.w3schools.com/html/mov_bbb.mp4',
    instagram: 'https://instagram.com/test',
    phone: '+56912345678',
    whatsapp: '+56912345678',
    webLink: 'https://ejemplo.com',
  };

  await AsyncStorage.setItem(`userProfile_${fake.email}`, JSON.stringify(fake));
  await AsyncStorage.setItem('userData', JSON.stringify({
    email: fake.email,
    id: fake.email,
    membershipType: 'pro',
  }));
  await loadHighlightedProfiles();
};

  if (loadingUserData) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#D8A353' }}>Cargando datos de cuenta...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.screen}>
            {/* 🔍 Lupa en esquina superior derecha */}
      <TouchableOpacity
        onPress={() => navigation.navigate('ExploreProfiles')}
        style={{
          position: 'absolute',
          top: 50,
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

      <View style={styles.fixedHeader}>
        <View style={styles.logoRow}>
          <Image source={require('../assets/logo.png')} style={styles.logo} />
          <View style={styles.greetingBox}>
           <Text style={[styles.greeting, { marginLeft: -15 }]}> Hola, {userName} 👑</Text>
            <Text style={[styles.subtitle, { marginLeft:-10 }]}>
  ¿Listo para tu próxima oportunidad?
</Text>
{localUserData?.trialEndsAt && !localUserData?.hasPaid && (
  <View style={styles.trialBanner}>
   <Text style={styles.trialText}>
  🎁 ¡Estás usando la prueba gratuita! Termina el {formatDate(localUserData.trialEndsAt)}
</Text>
    <TouchableOpacity onPress={() => navigation.navigate('PaymentEliteScreen')}>
      <Text style={[styles.trialText, { textDecorationLine: 'underline', marginTop: 6 }]}>
        🔓 Activar plan ahora
      </Text>
    </TouchableOpacity>
  </View>
)}
          </View>
        </View>

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
  <Image
    source={{ uri: item.uri }}
    style={[styles.carouselImage, item.isPlaceholder && { opacity: 0.4 }]}
    resizeMode="cover"
  />
  {item.isPlaceholder && (
    <Text style={styles.adWatermark}>ESPACIO PUBLICITARIO</Text>
  )}
</View>

              </TouchableOpacity>
            )}
          />
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('AllAdsScreen')}
          style={styles.promoButton}
        >
          <Text style={styles.promoButtonText}>📢 Ver anuncios promocionados</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Text style={styles.sectionTitle}>🌟 Perfiles destacados</Text>

        <View style={styles.profilesWrapper}>
          {highlightedProfiles.length === 0 ? (
            <Text style={styles.noProfiles}>Aún no hay perfiles destacados.</Text>
          ) : (
            highlightedProfiles.map((profile, index) => (
              <TouchableOpacity
                key={index}
                style={styles.card}
                onPress={() =>
                  navigation.navigate('ProfileDetail', {
                    profileData: profile,
                    returnTo: 'DashboardElite',
                  })
                }
              >
                <Image
                  source={{ uri: profile.profilePhoto || 'https://via.placeholder.com/100' }}
                  style={styles.avatar}
                />
                <View style={styles.cardInfo}>
                  <Text style={styles.name}>{profile.name}</Text>
                  <Text style={styles.category}>{Array.isArray(profile.category) ? profile.category.join(', ') : profile.category}</Text>
                  <Text style={styles.location}>{profile.city || 'Ciudad'}, {profile.region || 'Región'}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
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

      <TouchableOpacity onPress={crearPerfilDePrueba} style={styles.testButton}>
        <Text style={styles.testButtonText}>+ Test</Text>
      </TouchableOpacity>
      {showUpgradeModal && (
  <View style={styles.modalOverlay}>
    <View style={styles.modalBox}>
      <Text style={styles.modalTitle}>Función bloqueada</Text>
      <Text style={styles.modalText}>Completa tu suscripción Elite para activar esta función.</Text>
      <TouchableOpacity
        style={styles.modalButton}
        onPress={() => {
          setShowUpgradeModal(false);
          navigation.navigate('PaymentScreen');
        }}
      >
        <Text style={styles.modalButtonText}>Ir a pagar</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setShowUpgradeModal(false)} style={{ marginTop: 10 }}>
        <Text style={{ color: '#aaa', fontSize: 12 }}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  </View>
)}
<View style={styles.floatingButtonContainer}>
  <TouchableOpacity
      style={styles.floatingButtonSingle} //
    onPress={() => navigation.navigate('StatsElite')}
  >
    <Text style={styles.floatingButtonText}>📊 Ver estadísticas</Text>
  </TouchableOpacity>
</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  fixedHeader: { paddingHorizontal: 0, paddingTop: 20 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  logo: { width: 50, height: 50, marginRight: 10,  marginLeft: 20  },
  greetingBox: {
    flex: 1,
    marginLeft: 20, // Puedes subir esto si quieres más separación
    alignItems: 'flex-start', // Asegura alineación desde la izquierda
  },  
  greeting: { color: '#D8A353', fontSize: 18, fontWeight: 'bold' },
  subtitle: { color: '#ccc', fontSize: 12 },
 carouselWrapper: {
  alignItems: 'flex-start',  // alinea el carrusel al inicio
  marginBottom: 10,

},
  carouselImage: {
  width: width, // usa TODO el ancho exacto del dispositivo
height: (width - 40) * 9 / 16,
  borderRadius: 10, // si quieres bordes redondeados puedes dejar 10
},
  promoButton: {
    backgroundColor: '#D8A353',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginBottom: 10,
    alignSelf: 'center',
  },
  promoButtonText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  scrollContainer: { 
    paddingHorizontal: 0,
    paddingBottom: 40,
    backgroundColor: '#121212',
  },
  sectionTitle: {
    color: '#D8A353',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 0,
    marginBottom: 10,
    alignSelf: 'center',
  },
  profilesWrapper: { gap: 5 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#121212',
    borderRadius: 12,
    borderWidth: 0.2,
    borderColor: '#D8A353',
    padding: 10,
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 40,
    marginRight: 12,
    borderWidth: 0.2,
    borderColor: '#D8A353',
  },
  cardInfo: { flex: 1 },
  name: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  category: { color: '#D8A353', fontSize: 12 },
  location: { color: '#999', fontSize: 12 },
  noProfiles: {
    color: '#888',
    textAlign: 'center',
    paddingVertical: 30,
    fontStyle: 'italic',
  },
  testButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 30,
    elevation: 5,
  },
  testButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  blockedButton: {
    backgroundColor: '#1E1E1E',
    padding: 14,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
  },
  blocked: {
    opacity: 0.5,
  },
  blockedText: {
    color: '#D8A353',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  modalBox: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8A353',
  },
  modalTitle: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  modalButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  floatingButton: {
  position: 'absolute',
  bottom: 10,
  right: 20,
  backgroundColor: '#D8A353',
  borderRadius: 20,
  paddingVertical: 8,
  paddingHorizontal: 12,
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
},

floatingButtonText: {
  fontSize: 11,
  fontWeight: '600',
  color: '#000',
},
floatingButtonRow: {
  position: 'absolute',
  bottom: 10,
  left: 20,
  right: 20,
  flexDirection: 'row',
  justifyContent: 'space-between',
},
floatingButtonContainer: {
  position: 'absolute',
  bottom: 10,
  left: 0,
  right: 0,
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingHorizontal: 0,
},

floatingButtonSingle: {
  position: 'absolute',
  bottom: 10,
  left: 20, 
  backgroundColor: '#D8A353',
  borderRadius: 20,
  paddingVertical: 8,
  paddingHorizontal: 6,
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
},
trialBanner: {
  backgroundColor: '#222',
  borderColor: '#D8A353',
  borderWidth: 1,
  borderRadius: 8,
  padding: 8,
  marginTop: 8,
  marginRight: 20,
  marginLeft: -10,
},
trialText: {
  color: '#D8A353',
  fontSize: 12,
  fontWeight: 'bold',
  textAlign: 'left',
},
carouselImageWrapper: {
  position: 'relative',
  width: width,
  height: (width - 40) * 9 / 16,
  borderRadius: 10,
  marginBottom: 5,
  justifyContent: 'center',
  alignItems: 'center',
  overflow: 'hidden',
},

adWatermark: {
  position: 'absolute',
  color: 'rgba(255, 255, 255, 0.4)', // blanco translúcido
  fontSize: 28,
  fontWeight: 'bold',
  textAlign: 'center',
  backgroundColor: 'transparent',
  padding: 6,
},
});
