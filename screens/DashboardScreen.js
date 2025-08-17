// screens/DashboardScreen.js
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
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../contexts/UserContext';
import { useSimulatedNotification } from '../utils/useSimulatedNotification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { syncAdToFirestore } from '../src/firebase/helpers/syncAdToFirestore';
import { Image as RNImage } from 'react-native';
import { getFirestore, doc, getDoc, collection, query, onSnapshot, getDocs, limit } from 'firebase/firestore';

const { width } = Dimensions.get('window');

import img1 from '../assets/placeholders_ads1.png';
import img2 from '../assets/placeholders_ads2.png';
import img3 from '../assets/placeholders_ads3.png';
import img4 from '../assets/placeholders_ads4.png';
import img5 from '../assets/placeholders_ads5.png';
import img6 from '../assets/placeholders_ads6.png';
import img7 from '../assets/placeholders_ads7.png';

const DEBUG = false;

export default function DashboardScreen({ navigation }) {
  const scrollRef = useRef(null);
  const currentIndexRef = useRef(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [carouselImages, setCarouselImages] = useState([]);
  const [allCastings, setAllCastings] = useState([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showText, setShowText] = useState(true);
  const [seenIds, setSeenIds] = useState([]);

  const { userData } = useUser();
  const userName = userData?.name || 'Usuario';
  const membershipType = userData?.membershipType || 'free';

  // ========= HELPERS =========
  const norm = (s = '') =>
    String(s)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  const parseTsMs = (v) => {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const t = Date.parse(v);
      return isNaN(t) ? 0 : t;
    }
    if (v?.toMillis) return v.toMillis();
    if (v?.seconds) return v.seconds * 1000;
    if (v instanceof Date) return v.getTime();
    return 0;
  };

  const pickTimestamp = (data) => {
    return (
      Number(data?.publishedAtMs || 0) ||
      parseTsMs(data?.syncedAt) ||
      parseTsMs(data?.updatedAt) ||
      parseTsMs(data?.createdAt) ||
      parseTsMs(data?.date) ||
      parseInt(String(data?.id || '').replace(/\D/g, ''), 10) ||
      Date.now()
    );
  };

  const getCastingKey = (it) => {
    const t = Number(it?.timestamp || 0);
    const titleKey = String(it?.title || '').toLowerCase().trim();
    const src = it?.__from || (it?.id?.startsWith?.('fire_0_') ? 'notif' : 'fs');
    return String(it?.docId || it?.id || `${src}_${titleKey}_${t}`);
  };

  const __logCastingKeys = (arr, tag='') => {
    if (!DEBUG) return;
    try {
      const keys = (arr || []).map(getCastingKey);
      const counts = keys.reduce((m,k)=> (m[k]=(m[k]||0)+1, m), {});
      const dups = Object.entries(counts).filter(([k,c])=>c>1);
      console.log(`🔑 ${tag} keys:`, keys.length, '| dups:', dups.length, dups);
      console.log(`🔑 ${tag} sample:`, keys.slice(0, 20));
    } catch (e) {
      console.log('🔑 __logCastingKeys error:', e?.message);
    }
  };

  // ========= CONTACTO / PERFIL (para anuncios del carrusel) =========
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
  // ========= FIN CONTACTO / PERFIL =========

  // Modal de opciones del carrusel
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);
// ====== Abrir detalle de casting (versión que te funcionaba) ======
const openCastingDetail = async (item) => {
  try {
    let id = item?.docId || item?.id;

    // Si no hay id, navega con el objeto "as-is"
    if (!id) {
      navigation.navigate('CastingDetail', { casting: item, from: 'dashboard' });
      return;
    }

    // Marcar como visto
    try {
      const storeKey = `castings_seen_${userData?.id}`;
      const beforeRaw = await AsyncStorage.getItem(storeKey);
      const before = beforeRaw ? JSON.parse(beforeRaw) : [];
      const updatedSeen = [
        ...new Set([
          ...before,
          getCastingKey(item),
          getCastingKey({ ...item, docId: id }),
        ]),
      ];
      await AsyncStorage.setItem(storeKey, JSON.stringify(updatedSeen));
      setSeenIds(updatedSeen);
    } catch {}

    // Intentar traer el doc completo desde Firestore
    const db = getFirestore();
    const snap = await getDoc(doc(db, 'castings', id));

    if (snap.exists()) {
      const full = { id: snap.id, ...snap.data() };
      navigation.navigate('CastingDetail', {
        castingId: full.docId || full.id,
        casting: full,
        from: 'dashboard',
      });
    } else {
      // Fallback: navega con lo que tenemos
      navigation.navigate('CastingDetail', {
        castingId: id,
        casting: item,
        from: 'dashboard',
      });
    }
  } catch {
    // Último fallback
    navigation.navigate('CastingDetail', { casting: item, from: 'dashboard' });
  }
};

  useSimulatedNotification(userData);

  // NO purgar storage
  const loadRecentCastings = async () => {
    try {
      const data = await AsyncStorage.getItem('castings');
      const parsed = data ? JSON.parse(data) : [];
      const sorted = [...parsed].map(c => ({
        ...c,
        timestamp: c.timestamp || pickTimestamp(c),
        __from: c.__from || 'local',
        docId: c.docId || c.id
      })).sort((a,b)=> (b.timestamp||0)-(a.timestamp||0));
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

  useEffect(() => { loadRecentCastings(); }, []);

  useEffect(() => {
    const interval = setInterval(() => setShowText(prev => !prev), 1500);
    return () => clearInterval(interval);
  }, []);

  // Anuncios
  useEffect(() => {
    const fetchAds = async () => {
      try {
        const json = await AsyncStorage.getItem('adsList');
        let parsed = json ? JSON.parse(json) : [];
        const now = Date.now();

        parsed = parsed.map(ad => ad.expiresAt < now ? { ...ad, aprobado: false } : ad);

        const activos = parsed.filter(ad => ad.aprobado === true);
        if (activos.length < 20) {
          const enEspera = parsed.find(ad => ad.enEspera && !ad.aprobado);
          if (enEspera) {
            enEspera.aprobado = true;
            enEspera.enEspera = false;
            await syncAdToFirestore(enEspera);
          }
        }

        await AsyncStorage.setItem('adsList', JSON.stringify(parsed));

        // ✅ Incluimos creatorEmail para poder abrir perfil
        const dynamicImages = parsed
          .filter(ad => ad.aprobado === true && ad.expiresAt > now && ad.destacado === true)
          .map(ad => ({
            tipo: ad.tipo || 'imagen',
            uri: ad.imageUri || null,
            videoUri: ad.videoUri || null,
            link: ad.link || null,
            creatorEmail: ad.creatorEmail || null,
            isPlaceholder: false,
          }));

        const placeholderImages = [img1, img2, img3, img4, img5, img6, img7];
        const placeholders = placeholderImages.map((img, index) => ({
          uri: RNImage.resolveAssetSource(img).uri,
          isPlaceholder: true,
          id: index + 1,
        }));

        const mergedImages = placeholders.map((slot, index) => {
          const realAd = dynamicImages[index];
          return realAd ? { ...realAd, isPlaceholder: false, id: index + 1 } : { ...slot };
        });

        setCarouselImages(mergedImages);
      } catch (error) {
        console.log('❌ Error cargando anuncios:', error);
      }
    };
    fetchAds();
  }, []);

  // Mezclar Firestore + notis + locales
  const mergeWithCastingNotis = async (firestoreRows = []) => {
    try {
      const notiKey = `notifications_${userData?.id}`;
      const rawNoti = await AsyncStorage.getItem(notiKey);
      const notis = rawNoti ? JSON.parse(rawNoti) : [];

      const rawLocal = await AsyncStorage.getItem('castings');
      const localCastings = rawLocal ? JSON.parse(rawLocal) : [];

      const castNotis = (Array.isArray(notis) ? notis : [])
        .filter(n => (n.type || n.tipo) === 'casting')
        .map((n, i) => {
          const msg = n.message || n.msg || '';
          const m = msg.match(/Nuevo casting:\s*([^\n:—-]+)/i);
          const titleRaw = (m && m[1]?.trim()) || n.title || 'Casting';
          let ts =
            parseTsMs(n.timestampMs) ||
            parseTsMs(n.timestamp)   ||
            parseTsMs(n.date)        ||
            parseTsMs(n.publishedAtMs) ||
            parseTsMs(n.createdAt)   ||
            parseTsMs(n.created_at)  ||
            parseTsMs(n.ts)          ||
            Date.now();
          const docIdFromNoti = n.castingId || n.data?.castingId || n.data?.docId || n.docId || null;
          return {
            id: n.id || `notif_${ts}_${i}`,
            docId: docIdFromNoti,
            title: titleRaw,
            timestamp: ts,
            __from: 'notif',
          };
        });

      const localCastingsNormalized = (Array.isArray(localCastings) ? localCastings : [])
        .map(l => ({
          ...l,
          timestamp: l.timestamp || pickTimestamp(l),
          __from: l.__from || 'local',
          docId: l.docId || l.id
        }));

      const map = new Map();
      [...firestoreRows, ...castNotis, ...localCastingsNormalized].forEach(item => {
        const baseKey =
          (item && item.docId) ||
          (item && item.id) ||
          `${norm(item?.title || '')}_${item?.timestamp || ''}`;
        const src = item?.__from || 'fs';
        const k = `${baseKey}__${src}`;
        if (!map.has(k)) map.set(k, item);
      });

      const merged = Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return merged;
    } catch (e) {
      if (DEBUG) console.log('mergeWithCastingNotis error', e?.message);
      return firestoreRows;
    }
  };

  const hydrateAgenciesByTitle = async (items = []) => {
    const db = getFirestore();
    const missing = items.filter(i => !i.agencyName && i?.title);
    if (!missing.length) return items;

    const uniqueTitles = Array.from(new Set(missing.map(i => String(i.title))));
    const titleToAgency = new Map();

    for (const title of uniqueTitles) {
      try {
        const qy = query(collection(db, 'castings'), limit(1));
        const snap = await getDocs(qy);
        if (!snap.empty) {
          const d = snap.docs[0].data() || {};
          const agency = d.agencyName || d.producer || d.agency || d.agency_name || d?.structured?.producer || '';
          titleToAgency.set(title, agency);
        } else {
          titleToAgency.set(title, '');
        }
      } catch {
        titleToAgency.set(title, '');
      }
    }

    return items.map(it => {
      if (!it.agencyName && titleToAgency.has(it.title)) {
        const agency = titleToAgency.get(it.title);
        return agency ? { ...it, agencyName: agency } : it;
      }
      return it;
    });
  };

  useEffect(() => {
    const db = getFirestore();
    const qy = query(collection(db, 'castings'));

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const raw = snap.docs.map((d) => {
          const data = d.data() || {};
          const tsMs = pickTimestamp(data);
          return {
            ...data,
            id: d.id,
            docId: data.docId || d.id,
            title: data.title || 'Sin título',
            agencyName:
              data.agencyName ||
              data.agency ||
              data.agency_name ||
              data?.structured?.agency ||
              '',
            image: data.image || (Array.isArray(data.images) ? data.images[0] : null) || null,
            status: data.status || 'unknown',
            timestamp: tsMs,
            __from: 'fs',
          };
        });

        mergeWithCastingNotis(raw)
          .then(async (merged) => {
            const hydrated = await hydrateAgenciesByTitle(merged);
            const keyFor = (it) =>
              String(it?.docId || it?.id || `${norm(it?.title || '')}_${it?.timestamp || ''}`);

            const uniq = new Map();
            for (const it of hydrated) {
              const k = keyFor(it);
              if (!uniq.has(k)) uniq.set(k, it);
              else {
                const prev = uniq.get(k);
                if (prev?.__from === 'notif' && it?.__from !== 'notif') {
                  uniq.set(k, it);
                }
              }
            }

            const finalList = Array.from(uniq.values()).sort(
              (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
            );

            setAllCastings(finalList);
          })
          .catch(() => setAllCastings(raw));
      },
      (err) => {
        console.error('❌ Error cargando castings del Dashboard:', err);
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!DEBUG) return;
    console.log('📦 allCastings length ->', allCastings.length);
    __logCastingKeys(allCastings, 'allCastings');
    console.log(
      '📦 allCastings[0..4]:',
      allCastings.slice(0, 5).map(c => ({
        k: getCastingKey(c),
        id: c.id,
        docId: c.docId,
        title: c.title,
        ts: c.timestamp,
        from: c.__from,
        agency: c.agencyName || c.agency || c.agency_name || c?.structured?.agency || ''
      }))
    );
  }, [allCastings]);

  useEffect(() => {
    (async () => {
      try {
        const key = `castings_seen_${userData?.id}`;
        const raw = await AsyncStorage.getItem(key);
        const loaded = raw ? JSON.parse(raw) : [];
        setSeenIds(loaded);
      } catch {}
    })();
  }, [userData?.id]);

  useEffect(() => {
    const unsubFocus = navigation.addListener('focus', async () => {
      try {
        const key = `castings_seen_${userData?.id}`;
        const raw = await AsyncStorage.getItem(key);
        const loaded = raw ? JSON.parse(raw) : [];
        setSeenIds(loaded);
      } catch {}
    });
    return unsubFocus;
  }, [navigation, userData?.id]);

  useEffect(() => {
    if (!isPlaying || carouselImages.length === 0) return;
    const interval = setInterval(() => {
      const nextIndex = (currentIndexRef.current + 1) % carouselImages.length;
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
      scrollRef.current?.scrollToOffset({ offset: nextIndex * width, animated: nextIndex !== 0 });
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, carouselImages]);

  const formatDate = (isoDate) => {
    const d = new Date(isoDate);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}/${d.getFullYear()}`;
  };

  const isPaid = (item) => {
    const val =
      item.pagado ?? item.isPaid ?? item?.structured?.paid ?? item.payment ?? item.amount;
    const n = typeof val === 'string' ? parseInt(val.replace(/\D/g, ''), 10) : Number(val || 0);
    return Number.isFinite(n) ? n > 0 : val === true;
  };
  const isUrgent = (item) => {
    const t = (item.castingType || item.type || '').toString().toLowerCase();
    return (
      item.urgente === true ||
      item.isUrgent === true ||
      item?.structured?.urgent === true ||
      t.includes('urg') ||
      t.includes('emerg')
    );
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
              {membershipType === 'free' ? 'Explora oportunidades.' : '¿Listo para tu próxima oportunidad?'}
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

        {userData?.flagged && (
          <View style={styles.flaggedCard}>
            <Text style={styles.flaggedText}>
              ⚠️ Tu perfil fue marcado por contenido ofensivo y no está siendo mostrado públicamente. Reemplaza las imágenes o el video para corregirlo.
            </Text>
          </View>
        )}

        <View style={styles.carouselWrapper}>
          <FlatList
            ref={scrollRef}
            data={carouselImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => {
              const titleKey = String(item?.title || '').toLowerCase().trim();
              const k = String(item?.docId || item?.id || `${titleKey}_${item?.timestamp || ''}`);
              return `${k}__${index}`;
            }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  if (item.isPlaceholder) return;
                  setSelectedAd(item);
                  setShowContactModal(true);
                }}
              >
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

      {/* Modal de opciones para el carrusel */}
      <Modal visible={showContactModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>¿Qué deseas hacer?</Text>

            {selectedAd?.link ? (
              <TouchableOpacity
                style={styles.modalButton}
                onPress={async () => {
                  setShowContactModal(false);
                  await openWhatsAppOrLink(selectedAd.link, selectedAd.creatorEmail);
                }}
              >
                <Text style={{ color: '#000', fontWeight: 'bold' }}>
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
              <Text style={{ color: '#000', fontWeight: 'bold' }}>👤 Ver perfil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, { marginTop: 10, backgroundColor: '#444' }]}
              onPress={() => setShowContactModal(false)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.castingSectionWrapper}>
        {allCastings.length > 0 ? (
          <FlatList
            data={allCastings}
            keyExtractor={(item, idx) => `${getCastingKey(item)}__${idx}`}
            extraData={seenIds}
            renderItem={({ item }) => {
              const ts = Number(item.timestamp || 0);
              const dt = new Date(ts);
              const ok = !isNaN(dt.getTime());
              const dateStr = ok ? dt.toLocaleDateString() : '—';
              const timeStr = ok ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

              const k = getCastingKey(item);
              const seen = seenIds.includes(k);

              return (
                <TouchableOpacity
                  style={styles.castingLineContainer}
                  onPress={() => openCastingDetail(item)}
                >
                  <View style={styles.lineSeparator} />

                  <View style={[styles.castingLine, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ color: '#aaa', fontSize: 13, marginBottom: 2 }}>
                        {item.agencyName
                          || item.agency
                          || item.agency_name
                          || item?.structured?.agency
                          || item?.meta?.agencyName
                          || 'Agencia desconocida'}
                      </Text>

                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>
                        🎬 Casting: {item.title}
                      </Text>

                      <Text style={{ color: '#ccc', fontSize: 12 }}>
                        {timeStr} - {dateStr}
                      </Text>
                    </View>

                    {seen ? (
                      <View style={{ backgroundColor: '#555', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ color: '#eee', fontSize: 10, fontWeight: 'bold' }}>Casting</Text>
                      </View>
                    ) : (
                      <View
                        style={{
                          backgroundColor: (isPaid(item) && isUrgent(item)) ? '#FF4D4D' : '#00D084',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 10 }}>
                          {(isPaid(item) && isUrgent(item)) ? 'Casting urgente' : 'Casting nuevo'}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
            contentContainerStyle={{ paddingBottom: 90 }}
          />
        ) : (
          <View style={{ paddingHorizontal: 20, paddingBottom: 90 }}>
            <View style={styles.lineSeparator} />
            <Text style={styles.emptyMessage}>
              No hay castings disponibles por ahora.
            </Text>
            <View style={styles.lineSeparator} />
          </View>
        )}
      </View>

      <Modal transparent={true} visible={showUpgradeModal} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🚫 Solo disponible para cuentas Pro </Text>
            <Text style={styles.modalText}>
              Para ver los detalles de los castings y postular, necesitas activar tu cuenta Pro.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowUpgradeModal(false);
                navigation.navigate('Subscription');
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
    marginLeft: -20,
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
  lineSeparator: {
    height: 0.6,
    backgroundColor: '#2A2A2A',
    marginBottom: 9,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: '#1B1B1B',
    padding: 20,
    borderRadius: 10,
    borderColor: '#D8A353',
    borderWidth: 1,
    width: '80%',
  },
  modalTitle: { color: '#D8A353', fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalText: { color: '#ccc', marginBottom: 20, textAlign: 'center' },
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
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    zIndex: 5,
  },
  flaggedCard: {
    backgroundColor: '#ff4444',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: -2,
    borderColor: '#fff',
    borderWidth: 0.5,
    elevation: 4,
  },
  flaggedText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
