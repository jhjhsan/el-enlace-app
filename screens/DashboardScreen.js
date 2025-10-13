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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
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
  const pro = membershipType === 'pro';
  const tabBarH = useBottomTabBarHeight(); // alto real de la tab bar
  const insets = useSafeAreaInsets();

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
    const theSrc = it?.__from || (it?.id?.startsWith?.('fire_0_') ? 'notif' : 'fs'); // FIX: const
    return String(it?.docId || it?.id || `${theSrc}_${titleKey}_${t}`);
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

  // Limpia prefijos del título para no duplicar “🎬 Casting: …”
  const cleanTitle = (t='') => {
    let s = String(t).trim();
    s = s.replace(/^\s*🎬\s*/i, '');
    s = s.replace(/^nuevo casting:\s*/i, '');
    s = s.replace(/^casting:\s*/i, '');
    return s.trim();
  };

  // Cerrado?
  const isClosedCasting = (item) =>
    item?.status === 'closed' || item?.closed === true;

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

  // ====== Abrir detalle (tu versión base) ======
  const openCastingDetail = async (item) => {
    try {
      let id = item?.docId || item?.id;

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
        navigation.navigate('CastingDetail', {
          castingId: id,
          casting: item,
          from: 'dashboard',
        });
      }
    } catch {
      navigation.navigate('CastingDetail', { casting: item, from: 'dashboard' });
    }
  };

  useSimulatedNotification(userData);

  // NO purgar storage
  const loadRecentCastings = async () => {
    try {
      const data = await AsyncStorage.getItem('castings');
      const parsed = data ? JSON.parse(data) : [];

      const mapped = [...parsed].map(c => ({
        ...c,
        timestamp: c.timestamp || pickTimestamp(c),
        __from: c.__from || 'local',
        docId: c.docId || c.id
      })).sort((a,b)=> (b.timestamp||0)-(a.timestamp||0));

      // 👉 mismo criterio de "urgentes primero" que se aplica tras el snapshot
      const urgentFirst = [...mapped].sort((a, b) => {
        const ua =
          a.urgente === true ||
          a.isUrgent === true ||
          (String(a.castingType || a.type || '').toLowerCase().includes('urg')) ||
          (a?.structured?.urgent === true);
        const ub =
          b.urgente === true ||
          b.isUrgent === true ||
          (String(b.castingType || b.type || '').toLowerCase().includes('urg')) ||
          (b?.structured?.urgent === true);

        if (ua !== ub) return ub - ua; // true primero
        return (b.timestamp || 0) - (a.timestamp || 0);
      });

      // dedupe ligero por docId/id/título+timebucket para evitar dobles locales
      const tenMin = 10 * 60 * 1000;
      const keyFor = (it) =>
        String(it?.docId || it?.id || `${norm(it?.title || '')}_${Math.round((it?.timestamp || 0)/tenMin)}`);

      const uniq = new Map();
      for (const it of urgentFirst) {
        const k = keyFor(it);
        if (!uniq.has(k) || (uniq.get(k)?.__from === 'notif' && it.__from !== 'notif')) {
          uniq.set(k, it);
        }
      }

      setAllCastings(Array.from(uniq.values()));
    } catch (error) {
      console.error('Error cargando castings:', error);
    }
  };

const handleRefresh = async () => {
  setIsRefreshing(true);
  try {
    const db = getFirestore();
    const snap = await getDocs(query(collection(db, 'castings')));

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

    let merged = await mergeWithCastingNotis(raw);
    merged = await hydrateAgenciesByTitle(merged);

    const keyFor = (it) =>
      String(it?.docId || it?.id || `${norm(it?.title || '')}_${it?.timestamp || ''}`);

    const uniq = new Map();
    for (const it of merged) {
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

    const urgentFirst = [...finalList].sort((a, b) => {
      const ua =
        a.urgente === true ||
        a.isUrgent === true ||
        (String(a.castingType || a.type || '').toLowerCase().includes('urg')) ||
        (a?.structured?.urgent === true);
      const ub =
        b.urgente === true ||
        b.isUrgent === true ||
        (String(b.castingType || b.type || '').toLowerCase().includes('urg')) ||
        (b?.structured?.urgent === true);

      if (ua !== ub) return ub - ua;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

    if (urgentFirst.length > 0) {
      setAllCastings(urgentFirst);
    } else {
      await loadRecentCastings(); // fallback local
    }
  } catch (e) {
    console.log('♻️ Refresh: usando fallback local por error:', e?.message);
    await loadRecentCastings();
  } finally {
    setIsRefreshing(false);
  }
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

  // ========= DEDUPE (ACTUALIZADO) =========
  const mergeWithCastingNotis = async (firestoreRows = []) => {
    try {
      const notiKey = `notifications_${userData?.id}`;
      const rawNoti = await AsyncStorage.getItem(notiKey);
      const notis = rawNoti ? JSON.parse(rawNoti) : [];

      const rawLocal = await AsyncStorage.getItem('castings');
      const localCastings = rawLocal ? JSON.parse(rawLocal) : [];

      const normItem = (x, src) => ({
        ...x,
        __from: src,
        docId: x.docId || x.id || null,
        title: String(x.title || '').trim(),
        timestamp: x.timestamp || pickTimestamp(x),
      });

      const fs  = (firestoreRows || []).map(x => normItem(x, 'fs'));
      const loc = (localCastings || []).map(x => normItem(x, 'local'));

      const castNotis = (notis || [])
        .filter(n => (n.type || n.tipo) === 'casting')
        .map((n, i) => {
          const msg = n.message || n.msg || '';
          const m = msg.match(/Nuevo casting:\s*([^\n:—-]+)/i);
          const titleRaw = (m && m[1]?.trim()) || n.title || 'Casting';
          const ts =
            parseTsMs(n.timestampMs) || parseTsMs(n.timestamp) || parseTsMs(n.date) ||
            parseTsMs(n.publishedAtMs) || parseTsMs(n.createdAt) || parseTsMs(n.created_at) ||
            parseTsMs(n.ts) || Date.now();
          const docIdFromNoti = n.castingId || n.data?.castingId || n.data?.docId || n.docId || null;
          return normItem({ id: n.id || `notif_${ts}_${i}`, docId: docIdFromNoti, title: titleRaw, timestamp: ts }, 'notif');
        });

      // 🔗 Alinear docId de notificaciones con FS/LOCAL por título+tiempo para evitar duplicados
      const pool = [...fs, ...loc];
      const oneHour = 60 * 60 * 1000; // ventana ±1h

      const matchByTitleTime = (n) => {
        const t0 = norm(cleanTitle(n.title || ''));
        const ts0 = n.timestamp || 0;
        return pool.find(x =>
          norm(cleanTitle(x.title || '')) === t0 &&
          Math.abs((x.timestamp || 0) - ts0) <= oneHour
        );
      };

      castNotis.forEach(n => {
        const existsExact = pool.find(x => x.docId && n.docId && x.docId === n.docId);
        if (!existsExact) {
          const m = matchByTitleTime(n);
          if (m?.docId) n.docId = m.docId; // fuerza misma clave para fusionar
        }
      });

      // preferencia por docId + conservar "cerrado" si cualquiera lo trae
      const rank = { fs: 3, local: 2, notif: 1 };
      const byDoc = new Map();
      [...fs, ...loc, ...castNotis].forEach(it => {
        if (!it.docId) return;
        const k = `doc:${it.docId}`;
        const prev = byDoc.get(k);
        if (!prev) {
          byDoc.set(k, it);
        } else {
          const chosen = rank[it.__from] > rank[prev.__from] ? it : prev;
          const closedFlag =
            (prev.closed || prev.status === 'closed') ||
            (it.closed || it.status === 'closed');
          byDoc.set(k, closedFlag ? { ...chosen, closed: true, status: 'closed' } : chosen);
        }
      });

      const tenMin = 10 * 60 * 1000;
      const res = [];
      const seen = new Set();

      const push = (it, key) => { if (!seen.has(key)) { seen.add(key); res.push(it); } };

      // 1) con docId (ya priorizados)
      for (const [, it] of byDoc) push(it, `doc:${it.docId}`);

      // 2) sin docId (notis): evita meter si hay FS/LOCAL con mismo título ±10min
      const fsLoc = [...fs, ...loc];
      castNotis.filter(n => !n.docId).forEach(n => {
        const match = fsLoc.find(x =>
          x.title.trim().toLowerCase() === n.title.trim().toLowerCase() &&
          Math.abs((x.timestamp||0) - (n.timestamp||0)) <= tenMin
        );
        if (!match) push(n, `ttl:${n.title.toLowerCase()}_${Math.round((n.timestamp||0)/tenMin)}`);
      });

      // 3) Items FS/LOCAL sin docId (por si acaso)
      [...fs, ...loc].filter(x => !x.docId).forEach(x => {
        push(x, `ttl:${x.title.toLowerCase()}_${Math.round((x.timestamp||0)/tenMin)}`);
      });

      res.sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
      return res;
    } catch {
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

            // 👉 Urgentes primero, luego por fecha
            const urgentFirst = [...finalList].sort((a, b) => {
              const ua =
                a.urgente === true ||
                a.isUrgent === true ||
                (String(a.castingType || a.type || '').toLowerCase().includes('urg')) ||
                (a?.structured?.urgent === true);
              const ub =
                b.urgente === true ||
                b.isUrgent === true ||
                (String(b.castingType || b.type || '').toLowerCase().includes('urg')) ||
                (b?.structured?.urgent === true);

              if (ua !== ub) return ub - ua; // true primero
              return (b.timestamp || 0) - (a.timestamp || 0);
            });

            setAllCastings(urgentFirst);
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

  // ===== Helpers de pago (para mostrar SOLO en Pro) =====
  const extractAmountFromText = (str) => {
    if (!str) return null;
    const m = String(str).match(/\$?\s?(\d{1,3}(?:[.\s]\d{3})+|\d+)(?=\b)/);
    if (!m) return null;
    const n = parseInt(m[1].replace(/[.\s]/g, ''), 10);
    return Number.isFinite(n) ? n : null;
  };
  const getNumericAmount = (val) => {
    if (val == null) return null;
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string') {
      const n = extractAmountFromText(val);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };
  const getPaymentInfo = (item) => {
    const candidates = [
      item?.extras?.pay?.amount,
      item.amount,
      item.payment,
      item.paymentAmount,
      item.remuneration,
      item.pay,
      item.fee,
      item.rate,
      item?.structured?.amount,
      item?.structured?.payment,
      item?.structured?.remuneration,
      item?.salary,
      item?.budget,
      item?.description,
    ];
    for (const c of candidates) {
      const num = getNumericAmount(c);
      if (num != null) {
        return { paid: true, amount: num, text: `$${num.toLocaleString('es-CL')}` };
      }
    }
    const paidFlags = item.pagado ?? item.isPaid ?? item?.structured?.paid ?? item?.structured?.isPaid;
    if (paidFlags === true) return { paid: true, amount: null, text: 'Sí' };
    if (paidFlags === false) return { paid: false, amount: null, text: 'No' };
    return { paid: false, amount: null, text: 'No especificado' };
  };

  const isPaid = (item) => {
    const n = getPaymentInfo(item).amount;
    const flag = item.pagado ?? item.isPaid ?? item?.structured?.paid;
    return (typeof n === 'number' && n > 0) || flag === true;
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

  // ========= RENDER =========
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
 <TouchableOpacity
  onPress={() => navigation.navigate('ExploreProfiles')}
  style={[
    styles.searchFab,
    { top: Platform.OS === 'ios' ? insets.top + 8 : 40 }
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

      {/* HEADER */}
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

        {membershipType === 'free' && (
          <>
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
          </>
        )}

        {membershipType === 'pro' && <View style={styles.divider} />}
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

      {/* LISTA */}
      <View style={[styles.castingSectionWrapper, pro && { backgroundColor: '#000' }]}>
        {allCastings.length > 0 ? (
          <FlatList
            data={allCastings}
            keyExtractor={(item, idx) => `${getCastingKey(item)}__${idx}`}
            extraData={seenIds}

            /* PRO: incluir el banner dentro del scroll, SIN cambiarlo */
            ListHeaderComponent={
              membershipType === 'pro' ? (
                <View>
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
              ) : null
            }

            renderItem={({ item }) => {
              const ts = Number(item.timestamp || 0);
              const dt = new Date(ts);
              const ok = !isNaN(dt.getTime());
              const dateStr = ok ? dt.toLocaleDateString() : '—';
              const timeStr = ok ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

              const k = getCastingKey(item);
              const seen = seenIds.includes(k);

              const pro = membershipType === 'pro';
              const paymentInfo = pro ? getPaymentInfo(item) : null;
              const urgent =
                item.urgente === true ||
                item.isUrgent === true ||
                (String(item.castingType || item.type || '').toLowerCase().includes('urg')) ||
                (item?.structured?.urgent === true);

              const extraDesc =
                item.description ||
                item.synopsis ||
                item.summary ||
                item?.structured?.description ||
                item?.details?.description ||
                '';
              const role =
                item.role ||
                item?.structured?.role ||
                item?.extras?.role ||
                item?.details?.role ||
                '';

              return (
                <TouchableOpacity
                  style={[
                    styles.castingLineContainer,
                    pro && { paddingHorizontal: 0, paddingVertical: 2 }
                  ]}
                  onPress={() => openCastingDetail(item)}
                >
                  {!pro && <View style={styles.lineSeparator} />}

                  <View
                    style={[
                      styles.castingLine,
                      pro && {
                        backgroundColor: urgent ? '#2b1a1a' : '#1A1A1A',
                        borderRadius: urgent ? 12 : 0,
                        padding: urgent ? 16 : 12,
                        borderWidth: urgent ? 1 : 0,
                        borderColor: urgent ? '#FF4D4D' : 'transparent',
                      },
                      {
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        opacity: isClosedCasting(item) ? 0.4 : 1
                      }
                    ]}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ color: pro ? '#D8A353' : '#aaa', fontSize: urgent ? 16 : (pro ? 14 : 13), marginTop: 0, marginBottom: 1 }}>
                        {item.agencyName
                          || item.agency
                          || item.agency_name
                          || item?.structured?.agency
                          || item?.meta?.agencyName
                          || 'Agencia desconocida'}
                      </Text>

                      {urgent ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5, marginBottom: 2 }}>
                          <Ionicons name="megaphone" size={21} color="#FF4D4D" />
                          <Text
                            style={{ color: '#fff', fontSize: 20, fontWeight: '800', flexShrink: 1 }}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {`Casting: ${role ? (String(role).toLowerCase() + ' ') : ''}${cleanTitle(item.title)}`}
                          </Text>
                        </View>
                      ) : (
                        <Text style={{ color: '#fff', fontSize: pro ? 17 : 15, fontWeight: 'bold' }}>
                          🎬 Casting: {cleanTitle(item.title)}
                        </Text>
                      )}

                      {pro && (
                        <>
                          <Text style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>
                            💰 Pago: {paymentInfo?.text || 'No especificado'}
                          </Text>
                          <Text style={{ color: '#ccc', fontSize: 13 }}>
                            📍 Ubicación: {item.location || item?.structured?.location || 'No especificada'}
                          </Text>
                        </>
                      )}
                      {pro && urgent && !!extraDesc && (
                        <Text style={{ color: '#ddd', fontSize: 13, marginTop: 6 }} numberOfLines={3}>
                          {extraDesc}
                        </Text>
                      )}

                      <Text style={{ color: '#ccc', fontSize: 12, marginTop: pro ? 6 : 4 }}>
                        {timeStr} - {dateStr}
                      </Text>
                    </View>

                    {isClosedCasting(item) ? (
                      <View style={{ backgroundColor: '#666', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>Cerrado</Text>
                      </View>
                    ) : seen ? (
                      <View style={{ backgroundColor: '#555', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                        <Text style={{ color: '#eee', fontSize: 11, fontWeight: 'bold' }}>Visto</Text>
                      </View>
                    ) : urgent ? (
                      <View style={{ backgroundColor: '#FF4D4D', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 10 }}>⚠️ Casting urgente</Text>
                      </View>
                    ) : (
                      <View style={{ backgroundColor: '#00D084', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>Casting nuevo</Text>
                      </View>
                    )}

                  </View>
                </TouchableOpacity>
              );
            }}
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
            contentContainerStyle={{
    paddingBottom: Platform.OS === 'ios' ? tabBarH + 8 : 90
  }}
          />
        ) : (
          <View style={{
   paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? tabBarH + 8 : 90
  }}>
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
    fontSize: 18,
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

  // Carrusel
  carouselWrapper: { position: 'relative', width: '100%', alignItems: 'center', marginBottom: 8 },
  carouselImage: {
    width: width - 40,
    height: (width - 40) * 9 / 16,
    borderRadius: 10,
    marginHorizontal: 20,
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
    freeRow: {
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 12,
    minHeight: 88, // alto mínimo uniforme para Free
  },
searchFab: {
  position: 'absolute',
  right: 20,
  backgroundColor: '#1a1a1a',
  padding: 10,
  borderRadius: 30,
  zIndex: 20,
  elevation: 5,
},

});
