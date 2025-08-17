import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackButton from '../components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getCastingsFromFirestore } from '../src/firebase/helpers/getCastingsFromFirestore';
import { useNavigation } from '@react-navigation/native';

import { db } from '../src/firebase/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getApp } from 'firebase/app';

export default function StatsEliteScreen() {
  const [publishedCount, setPublishedCount] = useState(0);
  const [postulationsCount, setPostulationsCount] = useState(0);
  const [activeAdsCount, setActiveAdsCount] = useState(0);

  const [myCastings, setMyCastings] = useState([]);
  const [groupedPostulations, setGroupedPostulations] = useState({}); // { castingId: [postulaciones] }
  const [activeAds, setActiveAds] = useState([]);
  const [filter, setFilter] = useState('all');

  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const unsubRefs = useRef([]); // listeners de postulaciones y servicios

  useEffect(() => {
    loadStats();
    return () => {
      unsubRefs.current.forEach(f => { try { f(); } catch {} });
      unsubRefs.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // ---------- helpers ----------
  const normEmail = (e) => String(e || '').toLowerCase().trim();

  const toDateOrNull = (v) => {
    if (!v) return null;
    if (typeof v === 'number') { const d = new Date(v); return isNaN(d) ? null : d; }
    if (typeof v === 'string') {
      const d = new Date(v); if (!isNaN(d)) return d;
      const d2 = new Date(v.replace(' ', 'T')); return isNaN(d2) ? null : d2;
    }
    if (v?.toDate) return v.toDate();
    if (v?.seconds) return new Date(v.seconds * 1000);
    return null;
  };

  const extractMsFromAny = (x) => {
    if (!x) return null;
    const s = String(x);
    const m = s.match(/(\d{12,14})/);
    return m ? Number(m[1]) : null;
  };

  const getCastingDate = (c) => (
    toDateOrNull(c?.createdAt) ||
    toDateOrNull(c?.syncedAt) ||
    toDateOrNull(c?.created_at) ||
    toDateOrNull(c?.timestamp) ||
    toDateOrNull(c?.date) ||
    toDateOrNull(c?.deadline) ||
    toDateOrNull(c?.tsMs) ||
    (extractMsFromAny(c?.id) ? new Date(extractMsFromAny(c?.id)) : null)
  );

  const formatEsCL = (date, withTime=false) => {
    if (!date) return 'Sin fecha';
    const base = date.toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'});
    if (!withTime) return base;
    const time = date.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});
    return `${base} ${time}`;
  };

  const uniqueCount = (arr=[]) => {
    const set = new Set();
    arr.forEach(p => {
      const key = normEmail(p?.profile?.email || p?.email || p?.applicantEmail || p?.id);
      if (key) set.add(key);
    });
    return set.size;
  };

  const totalUniqueAcrossGroups = (groups) =>
    Object.values(groups).reduce((acc, list) => acc + uniqueCount(list), 0);

  const isActiveService = (ad, now) => {
    const status = String(ad?.status || '').toLowerCase();
    const flags = (ad?.isActive === true) || (ad?.published === true) || ['active','published','open'].includes(status);
    const exp = toDateOrNull(ad?.expiryDate) || toDateOrNull(ad?.expiresAt);
    const notExpired = exp ? exp > now : true; // si no tiene fecha, lo contamos
    return flags && notExpired;
  };
  // -----------------------------

  const loadStats = async () => {
    try {
      const app = getApp();
      console.log('DBG FireApp projectId:', app?.options?.projectId);

      // limpia listeners previos
      unsubRefs.current.forEach(f => { try { f(); } catch {} });
      unsubRefs.current = [];

      const raw = await AsyncStorage.getItem('userData');
      const userData = raw ? JSON.parse(raw) : null;
      const email = (userData?.email || '').toLowerCase();
      const now = new Date();

      // 1) castings del owner
      const allCastings = await getCastingsFromFirestore(email);
      const mine = (allCastings || []).filter(
        c => (c?.creatorEmail || '').toLowerCase() === email
      );
      setPublishedCount(mine.length);

      // 2) escuchar postulaciones (colección: postulaciones)
      const postsCol = collection(db, 'postulaciones');
      const groups = {};

      mine.forEach(c => {
        const cidStr = String(c.id);

        // == string
        const unsubStr = onSnapshot(
          query(postsCol, where('castingId', '==', cidStr)),
          (snap) => {
            const arr = snap.docs.map(d => {
              const data = d.data() || {};
              return {
                id: d.id,
                ...data,
                castingId: data.castingId ?? cidStr,
                timestamp: data.timestamp ?? data.createdAt ?? Date.now(),
                profile: {
                  ...(data.profile || {}),
                  name: data.profile?.name || '',
                  email: data.profile?.email || '',
                  profilePhoto: data.profile?.profilePhoto || '',
                },
              };
            });
            groups[cidStr] = arr;
            setGroupedPostulations({ ...groups });
            setPostulationsCount(totalUniqueAcrossGroups(groups));
          },
          (err) => console.log('onSnapshot(postulaciones,string)== error', cidStr, err?.code || err?.message || err)
        );
        unsubRefs.current.push(unsubStr);

        // == number
        const n = Number(cidStr);
        if (Number.isFinite(n)) {
          const unsubNum = onSnapshot(
            query(postsCol, where('castingId', '==', n)),
            (snap) => {
              const arr = snap.docs.map(d => {
                const data = d.data() || {};
                return {
                  id: d.id,
                  ...data,
                  castingId: String(data.castingId ?? cidStr),
                  timestamp: data.timestamp ?? data.createdAt ?? Date.now(),
                  profile: {
                    ...(data.profile || {}),
                    name: data.profile?.name || '',
                    email: data.profile?.email || '',
                    profilePhoto: data.profile?.profilePhoto || '',
                  },
                };
              });
              const prev = groups[cidStr] || [];
              const map = new Map();
              [...prev, ...arr].forEach(it => map.set(it.id, it));
              groups[cidStr] = Array.from(map.values());
              setGroupedPostulations({ ...groups });
              setPostulationsCount(totalUniqueAcrossGroups(groups));
            },
            (err) => console.log('onSnapshot(postulaciones,number)== error', cidStr, err?.code || err?.message || err)
          );
          unsubRefs.current.push(unsubNum);
        }
      });

      // 3) Promociones/Servicios activos (Firestore + cache)
      const servicesCol = collection(db, 'services');

      // listener directo por creatorEmail (si hay diferencia de mayúsculas, hacemos fallback)
      const unsubServices = onSnapshot(
        query(servicesCol, where('creatorEmail', '==', userData?.email || '')),
        async (snap) => {
          const fsServices = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
          let merged = fsServices;

          // Fallback: si vino 0, intenta leer todo y filtrar por email en minúsculas.
          if (merged.length === 0) {
            const unsubAll = onSnapshot(
              servicesCol,
              (allSnap) => {
                const all = allSnap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
                const filtered = all.filter(s => String(s?.creatorEmail || '').toLowerCase() === email);
                applyServices(filtered);
              },
              (err) => console.log('onSnapshot(services ALL) error:', err?.code || err?.message || err)
            );
            unsubRefs.current.push(unsubAll);
          } else {
            applyServices(merged);
          }

          // también fusiona con caches locales si existen
          const adsDataPrimary = JSON.parse(await AsyncStorage.getItem('adsData')) || [];
          const adsDataAlt1 = JSON.parse(await AsyncStorage.getItem('servicesData')) || [];
          const adsDataAlt2 = JSON.parse(await AsyncStorage.getItem('allServices')) || [];
          const localMerged = [...adsDataPrimary, ...adsDataAlt1, ...adsDataAlt2]
            .filter(s => String(s?.creatorEmail || '').toLowerCase() === email);

          if (localMerged.length) {
            applyServices((prev) => {
              const prevArr = Array.isArray(prev) ? prev : [];
              // dedup por id o título
              const map = new Map();
              [...prevArr, ...localMerged].forEach(it => {
                const k = it.id || it.docId || it.title || it.name;
                if (k) map.set(String(k), it);
              });
              return Array.from(map.values());
            });
          }
        },
        (err) => console.log('onSnapshot(services by creator) error:', err?.code || err?.message || err)
      );
      unsubRefs.current.push(unsubServices);

      // función para aplicar y filtrar activos
      function applyServices(listOrFn) {
        const nowLocal = new Date();
        let list = [];
        if (typeof listOrFn === 'function') {
          // cuando viene del merge con cache
          const prev = activeAds; // state actual
          const next = listOrFn(prev);
          list = next;
        } else {
          list = listOrFn || [];
        }
        const active = list.filter(ad => isActiveService(ad, nowLocal));
        // ordenar por updatedAt/createdAt/expiry
        active.sort((a, b) => {
          const da =
            toDateOrNull(a?.updatedAt) ||
            toDateOrNull(a?.createdAt) ||
            toDateOrNull(a?.created_at) ||
            toDateOrNull(a?.expiryDate) ||
            toDateOrNull(a?.expiresAt) ||
            (extractMsFromAny(a?.id) ? new Date(extractMsFromAny(a?.id)) : null);
          const dbb =
            toDateOrNull(b?.updatedAt) ||
            toDateOrNull(b?.createdAt) ||
            toDateOrNull(b?.created_at) ||
            toDateOrNull(b?.expiryDate) ||
            toDateOrNull(b?.expiresAt) ||
            (extractMsFromAny(b?.id) ? new Date(extractMsFromAny(b?.id)) : null);
          return (dbb ? dbb.getTime() : 0) - (da ? da.getTime() : 0);
        });
        setActiveAds(active);
        setActiveAdsCount(active.length);
      }

      // 4) tarjetas con filtro temporal
      const filteredCastings = mine
        .filter(c => {
          if (filter === 'all') return true;
          const d = getCastingDate(c);
          const diffDays = d ? (new Date() - d) / (1000*60*60*24) : Infinity;
          return filter === '7d' ? diffDays <= 7 : diffDays <= 30;
        })
        .sort((a, b) => {
          const da = getCastingDate(a);
          const db = getCastingDate(b);
          return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
        });

      setMyCastings(filteredCastings);

    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    }
  };

  const goToApplications = (casting) => {
    if (!casting?.id) return;
    navigation.navigate('ViewApplications', {
      castingId: casting.id,
      castingTitle: casting?.title || casting?.name || casting?.titulo || 'Casting',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#1A1A1A', '#000']} style={styles.gradientBackground}>
        <BackButton color="#fff" size={28} top={45} left={15} />
        <ScrollView ref={scrollRef} contentContainerStyle={styles.container}>
          <Text style={styles.title}>📊 Tu actividad reciente</Text>

          <View style={styles.filterRow}>
            <TouchableOpacity onPress={() => setFilter('7d')} style={[styles.filterButton, filter === '7d' && styles.filterSelected]}>
              <Text style={styles.filterText}>Últimos 7 días</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilter('30d')} style={[styles.filterButton, filter === '30d' && styles.filterSelected]}>
              <Text style={styles.filterText}>30 días</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilter('all')} style={[styles.filterButton, filter === 'all' && styles.filterSelected]}>
              <Text style={styles.filterText}>Todos</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bubbleRow}>
            <View style={styles.bubble}>
              <Ionicons name="film-outline" size={34} color="#4DA6FF" />
              <Text style={styles.bubbleNumber}>{publishedCount.toLocaleString('es-CL')}</Text>
              <Text style={styles.bubbleLabel}>Castings publicados</Text>
            </View>

            <View style={styles.bubble}>
              <Ionicons name="people-outline" size={34} color="#4CAF50" />
              <Text style={styles.bubbleNumber}>{postulationsCount.toLocaleString('es-CL')}</Text>
              <Text style={styles.bubbleLabel}>Postulaciones recibidas</Text>
            </View>
          </View>

          <View style={styles.bubble}>
            <Ionicons name="megaphone-outline" size={34} color="#FF3B30" />
            <Text style={styles.bubbleNumber}>{activeAdsCount.toLocaleString('es-CL')}</Text>
            <Text style={styles.bubbleLabel}>Promociones/Servicios activos</Text>
          </View>

          <View style={styles.separator} />

          {myCastings.length === 0 ? (
            <Text style={styles.emptyText}>No se encontraron castings.</Text>
          ) : (
            myCastings.map((casting) => {
              const d = getCastingDate(casting);
              const plist = groupedPostulations[String(casting?.id)] || [];
              const uniqueBadge = uniqueCount(plist);
              return (
                <TouchableOpacity
                  key={casting?.id || String(casting?.title)}
                  style={styles.castingCard}
                  onPress={() => goToApplications(casting)}
                  activeOpacity={0.88}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.emojiIcon}>🎬</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.castingTitle}>{casting?.title || 'Sin título'}</Text>
                      <Text style={styles.castingDetail}>📅 {formatEsCL(d)}</Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{uniqueBadge}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {activeAds.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>📣 Promociones/Servicios activos</Text>
              <View style={{ width: '100%', gap: 8 }}>
                {activeAds.slice(0, 5).map((ad, i) => {
                  const adDate =
                    toDateOrNull(ad?.updatedAt) ||
                    toDateOrNull(ad?.createdAt) ||
                    toDateOrNull(ad?.created_at) ||
                    toDateOrNull(ad?.expiryDate) ||
                    toDateOrNull(ad?.expiresAt) ||
                    (extractMsFromAny(ad?.id) ? new Date(extractMsFromAny(ad?.id)) : null);
                  return (
                    <View key={(ad?.id || ad?.title || 'ad') + '_' + i} style={styles.adItem}>
                      <Ionicons name="megaphone-outline" size={20} color="#FF3B30"/>
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={styles.adTitle} numberOfLines={1}>{ad?.title || ad?.name || 'Servicio'}</Text>
                        <Text style={styles.adDate}>{formatEsCL(adDate, true)}</Text>
                      </View>
                      {ad?.status ? (
                        <View style={styles.adBadge}>
                          <Text style={styles.adBadgeText}>{String(ad.status).toUpperCase()}</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
                {activeAds.length > 5 && (
                  <View style={styles.moreHint}><Text style={styles.moreHintText}>… y {activeAds.length - 5} más</Text></View>
                )}
              </View>
            </>
          )}

          <TouchableOpacity style={styles.aiSummaryButton} disabled>
            <Ionicons name="bulb-outline" size={20} color="#fff" />
            <Text style={styles.aiSummaryText}>Resumen con IA (próximamente)</Text>
          </TouchableOpacity>

          <Text style={styles.lastUpdated}>
            🔄 Última actualización{' '}
            {new Date().toLocaleDateString('es-CL', {
              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  gradientBackground: { flex: 1, backgroundColor: '#000' },
  container: {
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 40,
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '600', color: '#D8A353', marginBottom: 20 },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
    width: '100%',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  filterText: { color: '#ccc', fontSize: 12 },
  filterSelected: { backgroundColor: '#D8A353' },

  bubbleRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bubble: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    flex: 1,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 6,
  },
  bubbleNumber: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginTop: 6 },
  bubbleLabel: { color: '#ccc', fontSize: 13, marginTop: 4, textAlign: 'center' },

  separator: { height: 1, backgroundColor: '#333', width: '100%', marginVertical: 18 },

  castingCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: '#333',
  },
  emojiIcon: { fontSize: 22, marginRight: 10 }, // 🎬
  castingTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  castingDetail: { color: '#ccc', fontSize: 13, marginTop: 4 },

  badge: {
    backgroundColor: '#2b2b2b',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  badgeText: { color: '#D8A353', fontWeight: '700', fontSize: 12 },

  emptyText: { color: '#999', fontStyle: 'italic', marginTop: 10 },

  // Servicios
  sectionTitle: {
    width: '100%',
    color: '#D8A353',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 10,
  },
  adItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  adTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  adDate: { color: '#aaa', fontSize: 12, marginTop: 2 },
  adBadge: {
    marginLeft: 10,
    backgroundColor: '#2b2b2b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  adBadgeText: { color: '#FFB36B', fontWeight: '700', fontSize: 11 },
  moreHint: { alignItems: 'center', marginTop: 6 },
  moreHintText: { color: '#D8A353', fontWeight: '700' },

  aiSummaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 20,
    opacity: 0.5,
  },
  aiSummaryText: { color: '#ccc', marginLeft: 10, fontSize: 12, fontStyle: 'italic' },

  lastUpdated: { color: '#CCCCCC', fontSize: 12, textAlign: 'center', marginTop: 30 },
});
