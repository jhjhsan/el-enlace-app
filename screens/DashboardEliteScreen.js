// screens/DashboardEliteScreen.js
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
  Platform, 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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

const { width } = Dimensions.get('window');

const formatDate = (isoDate) => {
  const d = new Date(isoDate);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export default function DashboardEliteScreen({ navigation }) {
  // ---------- Estado base ----------
  const scrollRef = useRef(null);
  const currentIndexRef = useRef(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [carouselImages, setCarouselImages] = useState([]);

  const [highlightedProfiles, setHighlightedProfiles] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { userData } = useUser();
  const userName = userData?.agencyName || userData?.displayName || 'Agencia';

  const [showText, setShowText] = useState(true);
  const [localUserData, setLocalUserData] = useState(null);
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const insets = useSafeAreaInsets();

  // KPIs
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [profileViewsCount, setProfileViewsCount] = useState(0);
  const [newThisWeekCount, setNewThisWeekCount] = useState(0);

  // 🎯 Sugeridos (máx 9)
  const [suggestedProfiles, setSuggestedProfiles] = useState([]);

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
      const parts = email.split('@');
      const domain = parts.pop();
      const local = parts.join('.');
      email = `${local}@${domain}`;
      console.warn('🧽 Email corregido dinámicamente:', emailRaw, '→', email);
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

  // ---------- Modal de publicidad ----------
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);

  // ---------- Carga de datos ----------
  const loadAds = async () => {
    try {
      const json = await AsyncStorage.getItem('adsList');
      const parsed = json ? JSON.parse(json) : [];
      const now = Date.now();

      const dynamicImages = parsed
        .filter(ad => ad.aprobado && ad.expiresAt > now && ad.destacado)
        .map(ad => ({
          uri: ad.imageUri,
          link: ad.link,
          creatorEmail: ad.creatorEmail,
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

  // ✅ SOLO PRO destacados vigentes — SIN fallback a "recientes"
  const loadHighlightedProfiles = async () => {
    try {
      const storedPro = await AsyncStorage.getItem('allProfiles');        // free + pro (puede traer elites si se mezcló)
      const storedElite = await AsyncStorage.getItem('allProfilesElite'); // elite
      const parsedPro = storedPro ? JSON.parse(storedPro) : [];
      const parsedElite = storedElite ? JSON.parse(storedElite) : [];

      // Unir evitando duplicados por email; conservar el más reciente por timestamp
      const byEmail = {};
      [...parsedPro, ...parsedElite].forEach(p => {
        const key = (p.email || p.id || '').toLowerCase();
        if (!key) return;
        const prev = byEmail[key];
        if (!prev || (p.timestamp || 0) > (prev.timestamp || 0)) byEmail[key] = p;
      });
      const parsed = Object.values(byEmail);

      const now = new Date();
      const onlyPro = parsed.filter(p => (p.membershipType || '').toLowerCase() === 'pro');

      const proHighlighted = onlyPro.filter(p =>
        p.isHighlighted === true &&
        p.highlightedUntil &&
        new Date(p.highlightedUntil) > now
      );

      const sortByRecent = arr => [...arr].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      const finalList = sortByRecent(proHighlighted).slice(0, 50);
      setHighlightedProfiles(finalList);

      // KPIs (sobre todo el universo unido)
      const thisWeekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const newWeek = parsed.filter(p => p.createdAt && new Date(p.createdAt) > thisWeekStart).length;
      setNewThisWeekCount(newWeek);

      const favJson = await AsyncStorage.getItem('favoritesProfiles');
      const favs = favJson ? JSON.parse(favJson) : [];
      setFavoritesCount(Array.isArray(favs) ? favs.length : 0);

      const viewsJson = await AsyncStorage.getItem('profileViewsCount');
      const views = viewsJson ? Number(JSON.parse(viewsJson)) : 0;
      setProfileViewsCount(Number.isFinite(views) ? views : 0);

      // 🎯 Sugeridos para ti — máx 9
      try {
        const favProfiles = parsed.filter(p => (favs || []).includes(p.id || p.email));
        const freq = {};
        favProfiles.forEach(p => {
          const cats = Array.isArray(p.category) ? p.category : (p.category ? [p.category] : []);
          cats.forEach(c => { if (c) freq[c] = (freq[c] || 0) + 1; });
        });
        const topCat = Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]?.[0];

        const suggested = topCat
          ? parsed.filter(p => {
              const cats = Array.isArray(p.category) ? p.category : (p.category ? [p.category] : []);
              return cats.includes(topCat);
            }).slice(0, 9)
          : parsed.slice(0, 9);

        setSuggestedProfiles(suggested);
      } catch (e) {
        console.log('❌ Error calculando sugeridos:', e);
        setSuggestedProfiles(parsed.slice(0, 9));
      }
    } catch (error) {
      console.error('❌ Error preparando datos Elite:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAds();
    await loadHighlightedProfiles();
    setRefreshing(false);
  };

  // ---------- Ciclos ----------
  useEffect(() => {
    const ticker = setInterval(() => setShowText(prev => !prev), 1500);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem('userData');
        const parsed = json ? JSON.parse(json) : null;
        setLocalUserData(parsed);
      } catch (error) {
        console.log('Error cargando userData:', error);
      } finally {
        setLoadingUserData(false);
      }
    })();
  }, []);

  useEffect(() => {
    loadAds();
    loadHighlightedProfiles();
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

  // ---------- UI ----------
  const renderSuggestedBlock = () => (
    suggestedProfiles.length > 0 ? (
      <>
        <Text style={[styles.sectionTitle, { marginTop: 6 }]}>🎯 Sugeridos para ti</Text>
        <FlatList
          data={suggestedProfiles}
          keyExtractor={(item, i) => (item.id || item.email || `sug_${i}`).toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestCard}
              onPress={() => openProfile(item?.email)}
            >
              <Image
                source={{ uri: item.profilePhoto || 'https://via.placeholder.com/100' }}
                style={styles.suggestAvatar}
              />
              <Text numberOfLines={1} style={styles.suggestName}>{item.name || 'Talento'}</Text>
              <Text numberOfLines={1} style={styles.suggestCat}>
                {Array.isArray(item.category) ? item.category[0] : (item.category || '—')}
              </Text>
            </TouchableOpacity>
          )}
        />
      </>
    ) : (
      <Text style={styles.noProfiles}>No hay sugerencias por ahora.</Text>
    )
  );

  return (
    <SafeAreaView style={styles.screen}>
      {/* 🔍 Lupa */}
   <TouchableOpacity
  onPress={() => navigation.navigate('ExploreProfiles')}
  style={[
    styles.searchFab,
    { top: Platform.OS === 'ios' ? insets.top + 8 : 45 } // 👈 iOS respeta notch; Android queda igual
  ]}
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
>
  <Ionicons
    name="search"
    size={24}
    color="#D8A353"
    style={Platform.select({ ios: { marginTop: 1 }, android: null })}
  />
</TouchableOpacity>

      {/* Avisos de cuenta */}
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

      {/* Encabezado */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image source={require('../assets/logo.png')} style={styles.logo} />
          <View style={styles.greetingBox}>
            <Text style={[styles.greeting, { marginLeft: -15 }]}> Hola, {userName} 👑</Text>
            <Text style={[styles.subtitle, { marginLeft:-10 }]}>
              ¿Listo para tu próxima oportunidad?
            </Text>
          </View>
        </View>
      </View>

      {/* MODAL de opciones de publicidad */}
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

      {/* CONTENIDO SCROLL — publicidad + KPIs + destacados/sugeridos */}
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Publicidad DENTRO del scroll */}
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

        {/* BLOQUE PRINCIPAL: si hay destacados, muéstralos; si no, muestra SUGERIDOS aquí */}
        {highlightedProfiles.length > 0 ? (
          <>
            {/* Perfiles destacados */}
            <Text style={styles.sectionTitle}>🌟 Perfiles destacados</Text>

            <View style={styles.profilesWrapper}>
              {highlightedProfiles.length === 0 ? (
                <Text style={styles.noProfiles}>Aún no hay perfiles destacados.</Text>
              ) : (
                highlightedProfiles.map((profile, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.card}
                    onPress={() => openProfile(profile?.email)}
                  >
                    <Image
                      source={{ uri: profile.profilePhoto || 'https://via.placeholder.com/100' }}
                      style={styles.avatar}
                    />

                    {/* Info de perfil */}
                    <View style={styles.cardInfo}>
                      <Text style={styles.name}>{profile.name}</Text>
                      <Text style={styles.category}>
                        {Array.isArray(profile.category)
                          ? profile.category.join(', ')
                          : profile.category}
                      </Text>
                      {profile.region && (
                        <Text style={styles.location}>{profile.region}</Text>
                      )}
                    </View>

                    {/* Estrella destacada */}
                    <View style={styles.starWrapper}>
                      <Text style={styles.starEmoji}>🌟</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Si hay destacados, también mostramos sugeridos MÁS ABAJO (extra) */}
            {renderSuggestedBlock()}
          </>
        ) : (
          // Si no hay destacados, mostramos aquí arriba los sugeridos y NO más abajo.
          renderSuggestedBlock()
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Botón IA (pequeño) */}
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

      {/* CTA de estadísticas */}
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
  // Base
  screen: { flex: 1, backgroundColor: '#000' },
  header: { paddingHorizontal: 0, paddingTop: 10 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  logo: { width: 50, height: 50, marginRight: 10, marginLeft: 20 },
  greetingBox: { flex: 1, marginLeft: 20, alignItems: 'flex-start' },
  greeting: { color: '#D8A353', fontSize: 18, fontWeight: 'bold' },
  subtitle: { color: '#ccc', fontSize: 12 },

  // Publicidad
  carouselWrapper: { alignItems: 'flex-start', marginBottom: 10 },
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
  carouselImage: {
    width: width,
    height: (width - 40) * 9 / 16,
    borderRadius: 10,
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
  promoButton: {
    backgroundColor: '#D8A353',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginBottom: 10,
    alignSelf: 'center',
  },
  promoButtonText: { color: '#000', fontWeight: 'bold', fontSize: 14 },

  // Scroll container
  scrollContainer: {
    paddingHorizontal: 0,
    paddingBottom: 40,
    backgroundColor: '#000000',
  },

  // Perfiles destacados
  sectionTitle: {
    color: '#D8A353',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 6,
    marginBottom: 10,
    alignSelf: 'center',
  },
  profilesWrapper: { gap: 5, paddingHorizontal: 0 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#121212',
    borderRadius: 0,       // sin esquinas redondeadas para que se funda con el borde
    borderColor: '#D8A353',
    padding: 10,
    alignItems: 'center',
    marginBottom: 0,

    // 👇 clave
    width: '100%',
    alignSelf: 'stretch',
    marginHorizontal: 0,   // nada de margen lateral
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 40,
    marginRight: 10,
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

  // 🎯 Sugeridos
  suggestCard: {
    width: 120,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
    borderWidth: 0.5,
    borderColor: '#2A2A2A',
  },
  suggestAvatar: { width: '100%', height: 90, borderRadius: 8, marginBottom: 8 },
  suggestName: { color: '#fff', fontWeight: '700', fontSize: 12 },
  suggestCat: { color: '#D8A353', fontSize: 11 },

  // Banners/avisos
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

  // Modal genérico
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
  modalTitle: { color: '#D8A353', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  modalText: { color: '#ccc', fontSize: 14, textAlign: 'center', marginBottom: 15 },
  modalButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  modalButtonText: { color: '#000', fontWeight: 'bold' },

  // Floating
  searchFab: {
    position: 'absolute',
    top: 45,
    right: 20,
    backgroundColor: '#1a1a1a',
    padding: 10,
    borderRadius: 30,
    zIndex: 20,
    elevation: 5,
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
  floatingButtonText: { fontSize: 11, fontWeight: '600', color: '#000' },
  cardInfo: {
    flex: 1,
    marginLeft: 15, // 👉 desplaza más a la derecha nombre/categoría
  },
  starWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10, // un pequeño espacio desde la info
  },
});
