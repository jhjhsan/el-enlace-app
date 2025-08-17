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
  Modal,
  Alert,
} from 'react-native';
import { getAdsFromFirestore } from '../src/firebase/helpers/getAdsFromFirestore';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ITEM_HEIGHT = 240;
const { width } = Dimensions.get('window');

export default function AllAdsScreen() {
  const navigation = useNavigation();
  const listRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const [ads, setAds] = useState([]);

  // Modal de contacto
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);

  // Helpers -------------------------------------------------------------
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

  // ====== BLOQUE "Ver perfil" ======
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
    if (!emailRegex.test(email)) return null;
    return email;
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

  const openProfile = async (ad) => {
    try {
      const fixedEmail = fixMalformedEmail(ad?.creatorEmail);
      if (!fixedEmail) {
        return navigation.navigate('Profile', { viewedProfile: { email: ad?.creatorEmail || '' } });
      }
      const found = await fetchProfileByEmail(fixedEmail);
      const baseProfile = found || { email: fixedEmail };
      const cleaned = sanitizeProfileData({ ...baseProfile, email: fixedEmail });
      const tipo = cleaned?.membershipType || 'free';
      if (tipo === 'elite') navigation.navigate('ProfileElite', { viewedProfile: cleaned });
      else if (tipo === 'pro') navigation.navigate('ProfilePro', { viewedProfile: cleaned });
      else navigation.navigate('Profile', { viewedProfile: cleaned });
    } catch (e) {
      console.log('❌ Error al navegar al perfil:', e);
      navigation.navigate('Profile', { viewedProfile: { email: ad?.creatorEmail || '' } });
    }
  };

  const openWhatsAppOrLink = async (ad) => {
    const wa = getWhatsAppUrlIfAny(ad?.link);
    const url = wa || normalizeExternalLink(ad?.link);
    if (!url) return openProfile(ad);
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) throw new Error('cannot open');
      Linking.openURL(url);
    } catch (e) {
      console.log('Error al abrir enlace:', e);
      Alert.alert('Error', 'No se pudo abrir el enlace de contacto. Mostrando perfil.');
      openProfile(ad);
    }
  };
  // --------------------------------------------------------------------

  // Cargar anuncios
  useEffect(() => {
    const fetchAds = async () => {
      try {
        const firestoreAds = await getAdsFromFirestore();
        const now = Date.now();
        const visibles = firestoreAds
          .filter(ad => ad.aprobado && ad.expiresAt > now)
          .sort((a, b) => b.expiresAt - a.expiresAt)
          .slice(0, 20);
        setAds(visibles);
      } catch (error) {
        console.log('❌ Error al cargar anuncios desde Firestore:', error);
      }
    };
    fetchAds();
  }, []);

  // ====== Scroll infinito suave con dataset triplicado y recolocación discreta ======
  const loopData = ads.length > 1 ? [...ads, ...ads, ...ads] : ads;

  // Al cargar, colocamos en el bloque central
  useEffect(() => {
    if (ads.length > 1) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({
          offset: ads.length * ITEM_HEIGHT,
          animated: false,
        });
      });
    }
  }, [ads.length]);

  // Recolocación “invisible” durante el scroll si nos alejamos mucho del bloque central.
  const onScrollWithRecenter = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (e) => {
        if (ads.length <= 1) return;
        const y = e.nativeEvent.contentOffset.y;
        const total = ads.length;
        const item = ITEM_HEIGHT;
        const block = total * item;        // altura de un bloque ads
        const start = block;               // inicio bloque central
        const end = block * 2;             // fin bloque central
        const THRESHOLD = item * 2;        // umbral antes de recolocar

        if (y < start - THRESHOLD || y > end + THRESHOLD) {
          // Mantener la misma posición relativa dentro del bloque
          const posInBlock = ((y % block) + block) % block; // [0, block)
          const target = start + posInBlock;
          // recolocar sin animación: no se percibe salto porque es el mismo contenido relativo
          listRef.current?.scrollToOffset({ offset: target, animated: false });
        }
      },
    }
  );

  // getItemLayout para rendimiento
  const getItemLayout = (_data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  });

  const renderItem = ({ item, index }) => {
    const inputRange = [
      (index - 1) * ITEM_HEIGHT,
      index * ITEM_HEIGHT,
      (index + 1) * ITEM_HEIGHT,
    ];

    const scale = scrollY.interpolate({
      inputRange,
      outputRange: [0.7, 1, 0.7],
      extrapolate: 'clamp',
    });

    const opacity = scrollY.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          setSelectedAd(item);
          setShowContactModal(true);
        }}
      >
        <Animated.View style={[styles.itemContainer, { transform: [{ scale }], opacity }]}>
          <Image source={{ uri: item.imageUri }} style={styles.image} />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Botón back inline sin dependencias */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ position: 'absolute', top: 40, left: 20, zIndex: 10 }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.header}>🎯 Publicidad y promociones</Text>

      {ads.length < 20 && ads.some((ad) => ad.enEspera) && (
        <Text style={styles.pendingText}>
          🔔 Tu anuncio pendiente será activado automáticamente cuando haya espacio.
        </Text>
      )}

      {/* Modal de opciones */}
      <Modal visible={showContactModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>¿Qué deseas hacer?</Text>

            {selectedAd?.link ? (
              <TouchableOpacity
                style={styles.modalButton}
                onPress={async () => {
                  setShowContactModal(false);
                  await openWhatsAppOrLink(selectedAd);
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
                await openProfile(selectedAd);
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

      <Animated.FlatList
        ref={listRef}
        data={loopData}
        keyExtractor={(item, index) => `${item.id || 'ad'}_${index}`}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 60 }}
        // ❌ sin snapToInterval (el encaje duro causaba el brinco)
        // ❌ sin onMomentumScrollEnd (ya recolocamos discretamente en onScroll)
        decelerationRate="fast"
        bounces={false}
        getItemLayout={getItemLayout}
        onScroll={onScrollWithRecenter}
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
  pendingText: {
    color: '#888',
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center',
  },
  itemContainer: {
    height: ITEM_HEIGHT,
    width: width * 0.95,
    alignSelf: 'center',
    borderRadius: 15,
    marginBottom: 30,
    backgroundColor: '#111',
    shadowColor: '#D8A353',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
    resizeMode: 'cover',
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
    marginBottom: 12,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
});
