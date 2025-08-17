import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Video } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import { db } from '../src/firebase/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  exportApplicationsToPDF,
  exportApplicationsToExcel,
  EXPORT_STATUS,
} from '../utils/exportUtils';

// Helpers
const normalizeEmail = (email = '') =>
  email.toLowerCase().trim().replace(/\s+/g, '').replace(/[^a-z0-9@._\-+]/gi, '');

const toMs = (t) => {
  if (typeof t === 'number') return t;
  if (t?.seconds) return t.seconds * 1000; // Firestore Timestamp
  const n = Date.parse(t || '');
  return isNaN(n) ? 0 : n;
};

export default function ViewApplicationsScreen({ route }) {
  const { castingId, castingTitle } = route.params || {};
  const [applications, setApplications] = useState([]);
  const navigation = useNavigation();
  const { userData } = useUser();

  // Estados de carga para los botones
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);

  // Callback que reciben las funciones de exportación
  const onStatus = (type, phase) => {
    if (type === 'pdf' || type === 'pdf_selected') {
      setLoadingPDF(phase === EXPORT_STATUS.START);
    }
    if (type === 'excel' || type === 'excel_selected') {
      setLoadingExcel(phase === EXPORT_STATUS.START);
    }
  };

  // Solo Elite puede ver esta pantalla
  useEffect(() => {
    if (userData?.membershipType !== 'elite') {
      navigation.goBack();
    }
  }, [userData]);

  // 1) Carga caché local (si existe) para abrir rápido/offline
  useEffect(() => {
    const loadCache = async () => {
      try {
        const raw = await AsyncStorage.getItem('applications');
        const parsed = raw ? JSON.parse(raw) : [];
        const filtered = parsed
          .filter((app) => app.castingId === castingId)
          .map((a) => ({ ...a }));
        filtered.sort((a, b) => toMs(b.timestamp) - toMs(a.timestamp));
        setApplications(filtered);
      } catch (error) {
        console.error('Error al cargar postulaciones (cache):', error);
      }
    };
    const unsub = navigation.addListener('focus', loadCache);
    return unsub;
  }, [navigation, castingId]);

  // 2) Escucha Firestore (fuente de verdad)
  useEffect(() => {
    if (!castingId) return;

    const q = query(collection(db, 'applications'), where('castingId', '==', castingId));

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const fromFs = snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            castingId: data.castingId ?? castingId,
            castingTitle: data.castingTitle ?? '',
            timestamp: data.timestamp ?? data.createdAt ?? Date.now(),
            videos: Array.isArray(data.videos) ? data.videos : [],
            profile: {
              ...(data.profile || {}),
              name: data.profile?.name || '',
              email: data.profile?.email || '',
              profilePhoto: data.profile?.profilePhoto || '',
            },
          };
        });

        // Merge con lo que ya tuvieses y dedup por (castingId + email + ts)
        setApplications((prev) => {
          const merged = [...prev, ...fromFs];
          const seen = new Set();
          const dedup = merged.filter((a) => {
            const key = `${a.castingId}__${normalizeEmail(a.profile?.email)}__${toMs(a.timestamp)}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          dedup.sort((x, y) => toMs(y.timestamp) - toMs(x.timestamp));
          return dedup;
        });

        // Cachea último snapshot (opcional)
        try {
          const cacheKey = `applications_cache_${castingId}`;
          await AsyncStorage.setItem(cacheKey, JSON.stringify(fromFs));
        } catch {}
      },
      (err) => console.error('❌ Firestore applications error:', err)
    );

    return () => unsub();
  }, [castingId]);

  const sanitizeProfileData = (profile) => {
    const cleaned = { ...profile };
    if (!cleaned.profilePhoto?.startsWith('http') && !cleaned.profilePhoto?.startsWith('file')) {
      cleaned.profilePhoto = null;
    }
    return cleaned;
  };

  const resolveProfileForNav = async (appProfile) => {
    const base = sanitizeProfileData(appProfile || {});
    const email = normalizeEmail(base.email);
    if (!email) return base;

    const [rawFree, rawPro, rawElite] = await Promise.all([
      AsyncStorage.getItem('allProfilesFree'),
      AsyncStorage.getItem('allProfiles'), // Pro
      AsyncStorage.getItem('allProfilesElite'),
    ]);

    const free = rawFree ? JSON.parse(rawFree) : [];
    const pro = rawPro ? JSON.parse(rawPro) : [];
    const elite = rawElite ? JSON.parse(rawElite) : [];

    const all = [...free, ...pro, ...elite].filter((p) => normalizeEmail(p.email) === email);
    const rank = { free: 1, pro: 2, elite: 3 };
    const best = all.sort((a, b) => (rank[b.membershipType] || 0) - (rank[a.membershipType] || 0))[0];

    return best ? { ...base, ...best, email } : base;
  };

  // Debug opcional
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('applications');
        const arr = raw ? JSON.parse(raw) : [];
        console.log('🧪 SAMPLE APPLICATION:', JSON.stringify(arr[0], null, 2));
      } catch (e) {
        console.log('🧪 SAMPLE APPLICATION ERROR:', e);
      }
    })();
  }, []);

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📥 Postulaciones Recibidas</Text>
        <Text style={styles.subtitle}>{castingTitle || 'Casting'}</Text>
        <Text style={styles.counter}>Total: {applications.length}</Text>

        {applications.length === 0 ? (
          <Text style={styles.empty}>No hay postulaciones aún para este casting.</Text>
        ) : (
          applications.map((app, index) => (
            <View key={`${app.id || index}`} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.label}>🕒 Enviado: </Text>
                <Text style={styles.value}>{new Date(toMs(app.timestamp)).toLocaleString()}</Text>
              </View>

              <TouchableOpacity
                style={styles.profilePreview}
                onPress={async () => {
                  try {
                    const cleaned = await resolveProfileForNav(app.profile);
                    const tipo = (cleaned?.membershipType || 'free').toLowerCase();

                    if (tipo === 'elite') {
                      navigation.navigate('ProfileElite', { viewedProfile: cleaned });
                    } else if (tipo === 'pro') {
                      navigation.navigate('ProfilePro', { viewedProfile: cleaned });
                    } else {
                      navigation.navigate('Profile', { viewedProfile: cleaned });
                    }
                  } catch (e) {
                    console.log('❌ Error al navegar al perfil:', e);
                    navigation.navigate('Profile', { viewedProfile: app.profile });
                  }
                }}
              >
                {app.profile.profilePhoto ? (
                  <Image source={{ uri: app.profile.profilePhoto }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text>👤</Text>
                  </View>
                )}
                <Text style={styles.name}>{app.profile.name || 'Sin nombre'}</Text>
                <Text style={styles.link}>Ver perfil</Text>
              </TouchableOpacity>

              {app.videos?.map((uri, i) => (
                <Video key={i} source={{ uri }} useNativeControls resizeMode="contain" style={styles.video} />
              ))}
            </View>
          ))
        )}

        <View style={{ marginTop: 10 }}>
          {/* Botón PDF */}
          <TouchableOpacity
            style={[
              styles.exportPdfButton,
              { backgroundColor: '#8B0000' },
              (applications.length === 0 || loadingPDF) && { opacity: 0.5 },
            ]}
            onPress={() => {
              if (applications.length === 0) {
                alert('Aún no hay postulaciones para exportar.');
                return;
              }
              exportApplicationsToPDF(castingId, castingTitle || 'Casting', { onStatus });
            }}
            disabled={applications.length === 0 || loadingPDF}
          >
            {loadingPDF ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" />
                <Text style={styles.exportPdfText}>  Exportando…</Text>
              </View>
            ) : (
              <Text style={styles.exportPdfText}>🧾 Exportar a PDF</Text>
            )}
          </TouchableOpacity>

          {/* Botón Excel */}
          <TouchableOpacity
            style={[
              styles.exportPdfButton,
              { backgroundColor: '#2E7D32' },
              (applications.length === 0 || loadingExcel) && { opacity: 0.5 },
            ]}
            onPress={() => {
              if (applications.length === 0) {
                alert('Aún no hay postulaciones para exportar.');
                return;
              }
              exportApplicationsToExcel(castingId, castingTitle || 'Casting', { onStatus });
            }}
            disabled={applications.length === 0 || loadingExcel}
          >
            {loadingExcel ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" />
                <Text style={styles.exportPdfText}>  Exportando…</Text>
              </View>
            ) : (
              <Text style={styles.exportPdfText}>📊 Exportar a Excel</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  container: { padding: 10, top: 30, paddingBottom: 100 },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  counter: { color: '#aaa', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  empty: { color: '#999', textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 0.5,
    borderRadius: 8,
    paddingVertical: 0,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  label: { color: '#D8A353', fontWeight: 'bold', marginBottom: 4 },
  value: { color: '#ccc', marginBottom: 10 },
  profilePreview: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginTop: -10,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  name: { color: '#fff', fontWeight: 'bold', flex: 1 },
  link: { color: '#D8A353', fontSize: 13, textDecorationLine: 'underline' },
  video: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#D8A353',
    marginBottom: 10,
  },
  exportPdfButton: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 25,
  },
  exportPdfText: { color: '#fff', fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  subtitle: { color: '#ccc', fontSize: 14, textAlign: 'center', marginBottom: 6 },
});
