import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';

export default function PostulationHistoryScreen() {
  const navigation = useNavigation();
  const [postulations, setPostulations] = useState([]);
  const [userEmail, setUserEmail] = useState('');

  const normalizeEmail = (email = '') =>
    email.toLowerCase().trim().replace(/\s+/g, '').replace(/[^a-z0-9@._\-+]/gi, '');

  const toArray = (raw) => {
    try { return raw ? JSON.parse(raw) || [] : []; } catch { return []; }
  };

  const pickApplicantEmail = (p) => {
    // Intentos comunes según tus otras pantallas:
    return normalizeEmail(
      p.applicantEmail ||
      p.userEmail ||
      p.email ||
      p.profile?.email ||
      ''
    );
  };

  const pickApplicantName = (p) => {
    return (
      p.name ||
      p.profile?.name ||
      p.profile?.fullName ||
      p.profile?.displayName ||
      'Sin nombre'
    );
  };

  const pickCastingTitle = (p) => {
    return (
      p.castingTitle ||
      p.title ||
      p.casting?.title ||
      'Sin título'
    );
  };

  const pickTimestamp = (p) => {
    const t = p.timestamp || p.ts || p.createdAt || p.date;
    const n = typeof t === 'number' ? t : Date.parse(t || '');
    return isNaN(n) ? 0 : n;
  };

  const unifyShape = (p) => ({
    // Estructura unificada para render
    castingId: p.castingId || p.casting?.id || p.id || '',
    castingTitle: pickCastingTitle(p),
    applicantEmail: pickApplicantEmail(p),
    name: pickApplicantName(p),
    timestamp: pickTimestamp(p),
    videos: p.videos || p.media?.videos || [],
    photos: p.photos || p.media?.photos || p.images || [],
    profile: p.profile || null,
  });

  const dedupByKey = (arr, keyFn) => {
    const seen = new Set();
    return arr.filter((x) => {
      const k = keyFn(x);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1) Usuario actual
        const json = await AsyncStorage.getItem('userProfile');
        const user = json ? JSON.parse(json) : null;
        const myEmail = normalizeEmail(user?.email || '');
        setUserEmail(myEmail);

        // 2) Cargar posibles fuentes donde guardes postulaciones
        const rawMy = await AsyncStorage.getItem('myApplications');      // típico para "enviadas"
        const rawApps = await AsyncStorage.getItem('applications');      // a veces usas esto (recibidas por casting)
        const rawAll = await AsyncStorage.getItem('allPostulations');    // el de tu archivo original

        const a = toArray(rawMy);
        const b = toArray(rawApps);
        const c = toArray(rawAll);

        // 3) Unificar y normalizar
        const merged = [...a, ...b, ...c].map(unifyShape);

        // 4) Filtrar SOLO las que fueron ENVIADAS por mí (talento)
        const mine = merged.filter(p => p.applicantEmail && p.applicantEmail === myEmail);

        // 5) Deduplicar (por castingId + applicantEmail + día/hora)
        const unique = dedupByKey(
          mine,
          (p) => `${p.castingId}__${p.applicantEmail}__${p.timestamp}`
        );

        // 6) Ordenar por fecha desc
        unique.sort((x, y) => y.timestamp - x.timestamp);

        setPostulations(unique);
      } catch (e) {
        console.log('❌ Error cargando historial de postulaciones:', e);
        setPostulations([]);
      }
    };

    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation]);

  return (
    <View style={styles.screen}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ position: 'absolute', top: 40, left: 20, zIndex: 1000 }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📤 Historial de Postulaciones Enviadas</Text>
        <Text style={styles.infoSmall}>{userEmail || ''}</Text>

        {postulations.length === 0 ? (
          <Text style={styles.info}>Aún no has enviado postulaciones desde este dispositivo.</Text>
        ) : (
          postulations.map((item, index) => (
            <View key={`${item.castingId}_${index}_${item.timestamp}`} style={styles.card}>
              <Text style={styles.label}>🎬 Casting:</Text>
              <Text style={styles.value}>{item.castingTitle}</Text>

              <Text style={styles.label}>🧑 Tú postulaste como:</Text>
              <Text style={styles.value}>{item.name}</Text>

              <Text style={styles.label}>📧 Email:</Text>
              <Text style={styles.value}>{item.applicantEmail}</Text>

              <Text style={styles.label}>📅 Fecha:</Text>
              <Text style={styles.value}>
                {item.timestamp
                  ? new Date(item.timestamp).toLocaleString('es-CL')
                  : 'N/A'}
              </Text>

              {Array.isArray(item.videos) && item.videos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {item.videos.map((uri, i) => (
                    <Video
                      key={`v_${i}`}
                      source={{ uri }}
                      useNativeControls
                      resizeMode="contain"
                      style={styles.video}
                    />
                  ))}
                </ScrollView>
              )}

              {Array.isArray(item.photos) && item.photos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {item.photos.map((uri, i) => (
                    <Image key={`p_${i}`} source={{ uri }} style={styles.image} />
                  ))}
                </ScrollView>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  container: { padding: 15, paddingBottom: 100 },
  title: {
    fontSize: 22,
    color: '#D8A353',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 50,
    marginBottom: 0,
  },
  infoSmall: { color: '#777', fontSize: 12, textAlign: 'center', marginBottom: 16 },
  info: { color: '#aaa', fontSize: 14, textAlign: 'center', marginTop: 30 },

  card: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 0.5,
    borderRadius: 8,
    paddingVertical: 4,     // más baja todavía
    paddingHorizontal: 10,
    marginBottom: 4,
    alignSelf: 'center',
    width: '100%',
  },

  label: { color: '#D8A353', fontWeight: 'bold', marginBottom: 0 },
  value: { color: '#ccc', marginBottom: 6 },

  video: {
    height: 120,            // más bajo
    width: 200,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#D8A353',
    marginRight: 6,
  },

  image: {
    height: 100,            // más baja
    width: 80,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 0.5,
    borderColor: '#D8A353',
  },
});

