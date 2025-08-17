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
  Modal,
  Alert,
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
  const [showText, setShowText] = useState(true);

  const [localUserData, setLocalUserData] = useState(null);
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const hasPaid = localUserData?.hasPaid === true;

  // ---------- Helpers para contacto/perfil ----------
  const WHATSAPP_MSG = 'Hola, vi tu publicidad en El Enlace';

  const getWhatsAppUrlIfAny = (raw) => {
    if (!raw) return null;
    const s = String(raw).trim();
    const digits = s.replace(/[^\d]/g, '');
    if (/^\d{9,15}$/.test(digits)) {
      return `https://wa.me/${digits}?text=${encodeURIComponent(WHATSAPP_MSG)}`;
    }
    if (/^(https?:\/\/)?(wa\.me\/|api\.whatsapp\.com|whatsapp:)/i.test(s)) {
      return s.startsWith('http') || s.startsWith('whatsapp:') ? s : `https://${s}`;
    }
    return null;
  };

  const normalizeExternalLink = (raw) => {
    if (!raw) return null;
    const s = String(raw).trim();
    if (/^(https?:\/\/)/i.test(s)) return s;
    if (/^[\w.-]+\.[a-z]{2,}/i.test(s)) return `https://${s}`;
    return null;
  };

  const fixMalformedEmail = (emailRaw) => {
    let email = (emailRaw || '').trim().toLowerCase();
    if (!email) return null;
    const atCount = (email.match(/@/g) || []).length;
    if (atCount > 1) {
      const matches = email.match(/@[^@]+$/);
      const domain = matches ? matches[0].slice(1) : 'gmail.com';
      const beforeAt = email.split('@').slice(0, -1).join('.');
      email = `${beforeAt}@${domain}`;
      console.warn(`🧽 Email corregido dinámicamente: ${emailRaw} → ${email}`);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? email : null;
  };

  const fetchProfileByEmail = async (email) => {
    try {
      const storedFree = await AsyncStorage.getItem('allProfilesFree');
      const storedPro = await AsyncStorage.getItem('allProfiles');
      const storedElite = await AsyncStorage.getItem('allProfilesElite');
      const parsedFree = storedFree ? JSON.parse(storedFree) : [];
      const parsedPro = storedPro ? JSON.parse(storedPro) : [];
      const parsedElite = storedElite ? JSON.parse(storedElite) : [];
      const rank = { free: 1, pro: 2, elite: 3 };
      const all = [...parsedFree, ...parsedPro, ...parsedElite];
      const candidates = all.filter(p => (p.email || '').toLowerCase() === email.toLowerCase());
      if (candidates.length === 0) return null;
      let best = candidates[0];
      for (const c of candidates) {
        if ((rank[c.membershipType] || 0) > (rank[best.membershipType] || 0)) best = c;
      }
      return best;
    } catch (e) {
      console.log('❌ Error obteniendo perfil por email:', e);
      return null;
    }
  };

  const sanitizeProfileData = (profile) => {
    const cleaned = { ...profile };
    if (cleaned?.profilePhoto && !cleaned.profilePhoto.startsWith('http') && !cleaned.profilePhoto.startsWith('file')) {
      cleaned.profilePhoto = null;
    }
    if (cleaned?.profileVideo && !cleaned.profileVideo.startsWith('http') && !cleaned.profileVideo.startsWith('file')) {
      cleaned.profileVideo = null;
    }
    if (!cleaned.name && cleaned.agencyName) cleaned.name = cleaned.agencyName;
    return cleaned;
  };

  const openProfile = async (creatorEmail) => {
    try {
      const fixedEmail = fixMalformedEmail(creatorEmail);
      if (!fixedEmail) {
        return navigation.navigate('Profile', { viewedProfile: { email: creatorEmail || '' } });
      }
      const found = await fetchProfileByEmail(fixedEmail);
      const baseProfile = found || { email: fixedEmail };
      const cleaned = sanitizeProfileData(baseProfile);
      const tipo = cleaned?.membershipType || 'free';
      if (tipo === 'elite') {
        navigation.navigate('ProfileElite', { viewedProfile: cleaned });
      } else if (tipo === 'pro') {
        navigation.navigate('ProfilePro', { viewedProfile: cleaned });
      } else {
        navigation.navigate('Profile', { viewedProfile: cleaned });
      }
    } catch (e) {
      console.log('❌ Error al navegar al perfil:', e);
      navigation.navigate('Profile', { viewedProfile: { email: creatorEmail || '' } });
    }
  };

  const openWhatsAppOrLink = async (link, creatorEmail) => {
    const wa = getWhatsAppUrlIfAny(link);
    const url = wa || normalizeExternalLink(link);
    if (!url) return openProfile(creatorEmail);
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) throw new Error('cannot open');
      Linking.openURL(url);
    } catch (e) {
      console.log('Error al abrir enlace:', e);
      Alert.alert('Error', 'No se pudo abrir el enlace de contacto. Mostrando perfil.');
      openProfile(creatorEmail);
    }
  };
  // --------------------------------------------------

  // Modal de opciones del carrusel
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);

  const loadAds = async () => {
    try {
      const json = await AsyncStorage.getItem('adsList');
      const parsed = json ? JSON.parse(json) : [];
      const now = Date.now();

      // ✅ Incluimos creatorEmail y NO clickeamos placeholders
      const dynamicImages = parsed
        .filter(ad => ad.aprobado && ad.expiresAt > now && ad.destacado)
        .map(ad => ({
          uri: ad.imageUri,
          link: ad.link,
          creatorEmail: ad.creatorEmail, // 👈 necesario para abrir perfil
          isPlaceholder: false,
        }));

      const placeholderImages = [img1, img2, img3, img4, img5, img6, img7];
      const placeholders = placeholderImages.map((img, index) => ({
        uri: RNImage.resolveAssetSource(img).uri,
        isPlaceholder: true,
        id: index + 1,
      }));

      const merged = placeholders.map((slot, index) => {
        const realAd = dynamicImages[index];
        return realAd ? { ...realAd, id: index + 1 } : { ...slot };
      });

      setCarouselImages(merged);
    } catch (error) {
      console.log('Error cargando anuncios:', error);
    }
  };

  const loadHighlightedProfiles = async () => {
    try {
      const stored = await AsyncStorage.getItem('allProfiles');
      const parsed = stored ? JSON.parse(stored) : [];
      const now = new Date();

      const highlighted = parsed
        .filter(p =>
          p.membershipType === 'pro' &&
          p.isHighlighted &&
          p.highlightedUntil &&
          new Date(p.highlightedUntil) > now
        )
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 20);

      setHighlightedProfiles(highlighted);
    } catch (error) {
      console.error('Error cargando perfiles destacados desde allProfiles:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAds();
    await loadHighlightedProfiles();
    setRefreshing(false);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setShowText(prev => !prev);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

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

  if (loadingUserData) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#D8A353' }}>Cargando datos de cuenta...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      {/* 🔍 Lupa */}
      <TouchableOpacity
        onPress={() => navigation.navigate('ExploreProfiles')}
        style={{
          position: 'absolute',
          top: 45,
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

      {localUserData?.flagged && (
        <View style={styles.flaggedCard}>
          <Text style={styles.flaggedText}>
            ⚠️ Tu perfil fue marcado por IA debido a contenido ofensivo y no está siendo mostrado públicamente. Puedes editarlo para corregir las imágenes o el video.
          </Text>
        </View>
      )}

      <View style={styles.fixedHeader}>
        <View style={styles.logoRow}>
          <Image source={require('../assets/logo.png')} style={styles.logo} />
          <View style={styles.greetingBox}>
            <Text style={[styles.greeting, { marginLeft: -15 }]}> Hola, {userName} 👑</Text>
            <Text style={[styles.subtitle, { marginLeft:-10 }]}>
              ¿Listo para tu próxima oportunidad?
            </Text>
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
              <TouchableOpacity
                onPress={() => {
                  if (item.isPlaceholder) return;
                  setSelectedAd(item);
                  setShowContactModal(true);
                }}
              >
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

      {/* Modal de opciones para el carrusel */}
      <Modal visible={showContactModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>¿Qué deseas hacer?</Text>

            {selectedAd?.link ? (
              <TouchableOpacity
                style={styles.modalButton}
                onPress={async () => {
                  setShowContactModal(false);
                  await openWhatsAppOrLink(selectedAd.link, selectedAd.creatorEmail);
                }}
              >
                <Text style={styles.modalButtonText}>
                  {getWhatsAppUrlIfAny(selectedAd.link) ? '💬 Contactar por WhatsApp' : '🔗 Visitar enlace'}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.modalButton, { marginTop: 10 }]}
              onPress={async () => {
                setShowContactModal(false);
                await openProfile(selectedAd?.creatorEmail);
              }}
            >
              <Text style={styles.modalButtonText}>👤 Ver perfil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, { marginTop: 10, backgroundColor: '#444' }]}
              onPress={() => setShowContactModal(false)}
            >
              <Text style={[styles.modalButtonText, { color: '#fff' }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
                  <Text style={styles.location}>{profile.region || 'Región'}</Text>
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
            bottom: 18,
            right: 18,
            backgroundColor: showText ? '#4CAF50' : '#000',
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
            zIndex: 10,
            elevation: 6,
          }}
          onPress={() => navigation.navigate('AssistantIAProfile')}
        >
          <Ionicons
            name="sparkles-outline"
            size={14}
            color={showText ? '#fff' : '#00FF7F'}
            style={{ marginRight: 4 }}
          />
          <Text
            style={{
              color: showText ? '#fff' : '#00FF7F',
              fontWeight: 'bold',
              fontSize: 10,
            }}
          >
            {showText ? 'Analiza mi perfil' : 'IA'}
          </Text>
        </TouchableOpacity>
      )}

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
          style={styles.floatingButtonSingle}
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
  fixedHeader: { paddingHorizontal: 0, paddingTop: 10 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  logo: { width: 50, height: 50, marginRight: 10, marginLeft: 20 },
  greetingBox: {
    flex: 1,
    marginLeft: 20,
    alignItems: 'flex-start',
  },
  greeting: { color: '#D8A353', fontSize: 18, fontWeight: 'bold' },
  subtitle: { color: '#ccc', fontSize: 12 },
  carouselWrapper: { alignItems: 'flex-start', marginBottom: 10 },
  carouselImage: {
    width: width,
    height: (width - 40) * 9 / 16,
    borderRadius: 10,
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
  blockedButton: {
    backgroundColor: '#1E1E1E',
    padding: 14,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
  },
  blocked: { opacity: 0.5 },
  blockedText: {
    color: '#D8A353',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
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
  modalText: { color: '#ccc', fontSize: 14, textAlign: 'center', marginBottom: 15 },
  modalButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  modalButtonText: { color: '#000', fontWeight: 'bold' },
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
  floatingButtonText: { fontSize: 11, fontWeight: '600', color: '#000' },
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
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 5,
    marginTop: 5,
    marginBottom: -5,
    marginRight: 70,
    marginLeft: 10,
  },
  trialText: { color: '#D8A353', fontSize: 10, fontWeight: 'bold', textAlign: 'left' },
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
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'transparent',
    padding: 6,
  },
  flaggedCard: {
    backgroundColor: '#C62828',
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 6,
    borderColor: '#fff',
    borderWidth: 0.4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  flaggedText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
});
