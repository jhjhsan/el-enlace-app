import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { useUser } from '../contexts/UserContext';
import { getProfileSuggestions } from '../src/firebase/helpers/getProfileSuggestions';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '../components/BackButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateProfileData } from '../src/firebase/helpers/validateProfileData';
import { validateEliteProfile } from '../src/firebase/helpers/validateEliteProfile';
import { saveSuggestionToFirestore } from '../src/firebase/helpers/saveSuggestionToFirestore';

const db = getFirestore();

// --------- helpers locales ---------
const clean = (s) => (typeof s === 'string' ? s.trim() : '');
const pickFirst = (...vals) => {
  for (const v of vals) {
    const s = clean(v);
    if (s) return s;
  }
  return '';
};
const normalizeInstagram = (raw) => {
  const v = clean(raw);
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  const user = v.replace(/^@+/, '').replace(/[^a-z0-9._]/gi, '');
  return user ? `https://instagram.com/${user}` : '';
};
const isValidVideoURL = (url) => {
  if (typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return (
    lower.startsWith('http') &&
    (lower.includes('.mp4') ||
      lower.includes('.mov') ||
      lower.includes('youtube.com') ||
      lower.includes('vimeo.com'))
  );
};
const isValidImageURL = (url) => {
  if (typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return (
    (lower.startsWith('http') || lower.startsWith('www')) &&
    (lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.png') ||
      lower.endsWith('.webp'))
  );
};
// -----------------------------------

export default function AssistantIAProfileScreen() {
  const { userData } = useUser();

  const [profile, setProfile] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [iaSuggestions, setIaSuggestions] = useState([]);
  const [iaVerdict, setIaVerdict] = useState('');
  const [loading, setLoading] = useState(false);
  const [validations, setValidations] = useState([]);
  const [verdict, setVerdict] = useState('');
  const [completion, setCompletion] = useState(0);

  const animatedValues = useRef([]).current;
  const rotateBrain = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('🧠 LLEGÓ A AssistantIAProfileScreen CON:', userData);
    if (!userData || !userData.email || !userData.membershipType) {
      console.log('❌ userData incompleto o no cargado:', userData);
      return;
    }
    loadProfile();
  }, [userData]);

  const loadProfile = async () => {
    try {
      const emailLower = String(userData.email || '').toLowerCase().trim();

      // 3 variantes de ID
      const idNormalized = emailLower
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9@._\-+]/gi, '')
        .replace(/@{2,}/g, '@');
      const idRaw = emailLower;
      const idUnderscore = emailLower.replace(/[^a-z0-9]/g, '_');

      let collectionName = 'profiles';
      if (userData.membershipType === 'pro') collectionName = 'profilesPro';
      else if (userData.membershipType === 'elite') collectionName = 'profilesElite';

      const tryCollections = [collectionName, 'profiles'];
      const tryIds = [idNormalized, idRaw, idUnderscore];

      let snap = null;
      let usedCol = null;
      let usedId = null;

      for (const col of tryCollections) {
        for (const cand of tryIds) {
          try {
            const ref = doc(db, col, cand);
            const res = await getDoc(ref);
            if (res.exists()) {
              snap = res;
              usedCol = col;
              usedId = cand;
              break;
            }
          } catch (_) {}
        }
        if (snap) break;
      }

      console.log('🔎 Lookup perfil', {
        preferedCollection: collectionName,
        triedIds: tryIds,
        usedCol,
        usedId,
        found: !!snap,
      });

      if (!snap) {
        Alert.alert('Perfil no encontrado en Firestore');
        return;
      }

      const data = snap.data();

      // ✅ Normaliza ANTES de loggear
      const normalized = {
        ...data,
        city: pickFirst(data.city, data.ciudad, data.comuna).toLowerCase(),
        ciudad: pickFirst(data.ciudad, data.city, data.comuna),
        region: pickFirst(data.region, data['región']).toLowerCase(),
        country: pickFirst(data.country, data.pais, data.país),
        instagram: normalizeInstagram(data.instagram),
        age: pickFirst(data.age, data.edad),
        sexo: pickFirst(data.sexo, data.gender),
        height: pickFirst(data.estatura, data.altura),
        phone: pickFirst(data.phone, data.telefono, data.teléfono),
        video: clean(data.profileVideo),
        bookPhotos: Array.isArray(data.bookPhotos) ? data.bookPhotos : [],
      };

      console.log('🌆 Ciudad recibida del perfil:', normalized.city || null);
      console.log('✅ Perfil cargado:', normalized);

      // Usa SIEMPRE el normalizado
      setProfile(normalized);
      await autoGenerateSuggestions(normalized);

      // Validaciones locales (según plan)
      if (userData.membershipType === 'pro') {
        const localSuggestions = validateProfileData(normalized);
        setIaSuggestions(localSuggestions);
        setIaVerdict('');
        validateProProfile(normalized);
      } else if (userData.membershipType === 'elite') {
        const eliteObservations = validateEliteProfile(normalized);
        setIaSuggestions(eliteObservations);
        setIaVerdict('');
        validateEliteCompletion(normalized);
      } else {
        console.warn('❌ membershipType desconocido:', userData.membershipType);
        Alert.alert('Error', 'El tipo de cuenta no es válido para el análisis IA.');
      }
    } catch (err) {
      console.log('❌ Error al cargar perfil:', err);
    }
  };

  const validateProProfile = (data) => {
    const result = [];
    console.log('📦 Datos recibidos para validación:', data);

    let score = 0;
    const total = 8;

    const push = (okText, failText, condition) => {
      if (condition) {
        result.push(`✅ ${okText}`);
        score++;
      } else {
        result.push(`❌ ${failText}`);
      }
    };

    push(
      'Instagram enlazado',
      'Instagram inválido o ausente',
      typeof data.instagram === 'string' &&
        (data.instagram.startsWith('@') || data.instagram.startsWith('http'))
    );

    push(
      'Video de presentación válido',
      'Video ausente o enlace dañado',
      typeof data.video === 'string' && isValidVideoURL(data.video)
    );

    push(
      'Foto de perfil válida',
      'No se ha cargado foto de perfil',
      typeof data.profilePhoto === 'string' &&
        data.profilePhoto.startsWith('http') &&
        data.profilePhoto.includes('firebasestorage') &&
        /\.(jpg|jpeg|png|webp)(\?|$)/i.test(data.profilePhoto)
    );

    push(
      'Categoría definida',
      'Categoría no seleccionada',
      Array.isArray(data.category) && data.category.length > 0
    );

    push(
      'Región establecida',
      'Región no especificada',
      clean(data.region).length > 0
    );

    push(
      'Ciudad ingresada',
      'Ciudad no ingresada',
      clean(data.ciudad || data.city).length > 0
    );

    push(
      'Teléfono válido',
      'Teléfono no válido o ausente',
      typeof data.phone === 'string' && data.phone.trim().length >= 6
    );

    push(
      'Email correcto',
      'Correo electrónico inválido',
      typeof data.email === 'string' && data.email.includes('@')
    );

    animatedValues.length = result.length;
    for (let i = 0; i < result.length; i++) {
      animatedValues[i] = new Animated.Value(0);
    }

    const sorted = [...result].sort((a, b) => (a.startsWith('✅') ? 1 : -1));
    setValidations(sorted);

    Animated.stagger(
      100,
      result.map((_, i) =>
        Animated.timing(animatedValues[i], {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        })
      )
    ).start();

    const percentage = Math.round((score / total) * 100);
    setVerdict('');
    setCompletion(percentage);
    Animated.timing(progressAnim, {
      toValue: percentage,
      duration: 500,
      useNativeDriver: false,
    }).start();
  };

  const validateEliteCompletion = (data) => {
    const result = [];
    let score = 0;
    const total = 8;

    const push = (okText, failText, condition) => {
      if (condition) {
        result.push(`✅ ${okText}`);
        score++;
      } else {
        result.push(`❌ ${failText}`);
      }
    };

    push('Nombre de agencia válido', 'Nombre de agencia ausente o corto', data.agencyName && data.agencyName.trim().length >= 3);
    push('Representante definido', 'Representante ausente', data.representative && data.representative.trim().length >= 3);
    push('Logo cargado', 'Logo no válido', data.profilePhoto && data.profilePhoto.startsWith('http'));
    push('Email válido', 'Email no válido', data.email && data.email.includes('@'));
    push('Teléfono válido', 'Teléfono no válido', data.phone && data.phone.trim().length >= 6);
    push('Región especificada', 'Región no especificada', data.region && data.region.trim() !== '');
    push('Ciudad definida', 'Ciudad no ingresada', (data.city || data.ciudad) && (data.city || data.ciudad).trim() !== '');
    push('Descripción suficiente', 'Descripción muy breve', data.description && data.description.trim().length >= 30);

    animatedValues.length = result.length;
    for (let i = 0; i < result.length; i++) {
      animatedValues[i] = new Animated.Value(0);
    }

    const sorted = [...result].sort((a, b) => (a.startsWith('✅') ? 1 : -1));
    setValidations(sorted);

    Animated.stagger(
      100,
      result.map((_, i) =>
        Animated.timing(animatedValues[i], {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        })
      )
    ).start();

    const percentage = Math.round((score / total) * 100);
    setVerdict('');
    setCompletion(percentage);
    Animated.timing(progressAnim, {
      toValue: percentage,
      duration: 500,
      useNativeDriver: false,
    }).start();
  };

  const runIAAnalysis = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      // 🔖 etiqueta dinámica del dashboard
      const mt = String(userData?.membershipType || 'desconocido').toUpperCase();
      const runId = String(Date.now());

      // perfil SIEMPRE normalizado antes de enviar
      const profileNormalized = {
        ...profile,
        city: pickFirst(profile.city, profile.ciudad, profile.comuna).toLowerCase(),
        region: pickFirst(profile.region, profile['región']).toLowerCase(),
        instagram: normalizeInstagram(profile.instagram),
        video: clean(profile.profileVideo),
        bookPhotos: Array.isArray(profile.bookPhotos) ? profile.bookPhotos : [],
      };

      console.log(`📦 Enviando perfil a IA desde DASHBOARD ${mt}:`, profileNormalized);
      console.log('👤 Enviando userData:', { ...userData, runId });

      // campos presentes para evitar recomendaciones redundantes (si tu helper los usa)
      const presentFields = {
        city: !!profileNormalized.city,
        region: !!profileNormalized.region,
        instagram: !!profileNormalized.instagram,
        phone: !!profileNormalized.phone,
        age: !!profileNormalized.age,
        height: !!profileNormalized.height,
        video: !!profileNormalized.video,
        book: Array.isArray(profileNormalized.bookPhotos) && profileNormalized.bookPhotos.length > 0,
      };

      // ⚠️ Forzar nueva generación cada vez: force:true
      const { suggestions, error } = await getProfileSuggestions(profileNormalized, {
        ...userData,
        model: 'gpt-5',
        runId,
        force: true,
        presentFields,
      });

      if (suggestions && Array.isArray(suggestions)) {
        setSuggestions(suggestions);

        await saveSuggestionToFirestore(
          userData.email,
          suggestions,
          userData.membershipType,
          verdict,
          completion,
          'manual'
        );

        const start = validations.length;
        for (let i = 0; i < suggestions.length; i++) {
          animatedValues[start + i] = new Animated.Value(0);
        }

        Animated.stagger(
          100,
          suggestions.map((_, i) =>
            Animated.timing(animatedValues[start + i], {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            })
          )
        ).start();
      } else if (error) {
        console.warn('IA error:', error);
        Alert.alert('IA', error);
      }
    } catch (e) {
      console.error('❌ Error IA:', e);
    }
    setLoading(false);
  };

  // Auto (una vez por día por usuario) — si quieres, puedes quitar esta “puerta diaria”
  const autoGenerateSuggestions = async (p) => {
    try {
      const todayKey = `iaSuggestionsShown_${userData.email}`;
      const shownToday = await AsyncStorage.getItem(todayKey);
      if (shownToday === 'true') return;

      const base = p && typeof p === 'object' ? p : profile;
      if (!base) return;

      const runId = String(Date.now());
      const presentFields = {
        city: !!clean(base.city || base.ciudad || base.comuna),
        region: !!clean(base.region || base['región']),
        instagram: !!clean(base.instagram),
        phone: !!clean(base.phone),
        age: !!clean(base.age || base.edad),
        height: !!clean(base.height || base.estatura || base.altura),
        video: !!clean(base.profileVideo || base.video),
        book: Array.isArray(base.bookPhotos) && base.bookPhotos.length > 0,
      };

      const { suggestions, error } = await getProfileSuggestions(base, {
        ...userData,
        model: 'gpt-5',
        runId,
        force: true,
        presentFields,
      });
      if (error || !suggestions) return;

      setSuggestions(suggestions);
      await AsyncStorage.setItem(todayKey, 'true');
    } catch (e) {
      console.log('❌ autoGenerateSuggestions error:', e);
    }
  };

  // Animaciones
  useEffect(() => {
    rotateBrain.setValue(0);
    Animated.loop(
      Animated.timing(rotateBrain, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.stopAnimation();
      rotateAnim.setValue(0);
    }
  }, [loading]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.fixedBackButton}>
        <BackButton color="#fff" />
      </View>

      <View style={{ height: 20 }} />

      <View style={styles.titleRow}>
        <Animated.Text
          style={[
            styles.brainIcon,
            {
              transform: [
                {
                  rotate: rotateBrain.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        >
          🧠
        </Animated.Text>
        <Text style={styles.titleText}>  Asistente IA Profesional</Text>
      </View>

      <Text style={styles.subtitle}>Revisión automática de tu perfil</Text>

      <View style={styles.resultBox}>
        {validations.some((v) => v.startsWith('❌')) && (
          <Text style={styles.sectionTitle}>⚠️ Sugerencias para mejorar</Text>
        )}

        {validations.map((v, index) => (
          <Animated.View
            key={index}
            style={[
              styles.resultItem,
              {
                backgroundColor: v.startsWith('✅') ? '#1B1B1B' : '#4A1F1F',
                borderRadius: 6,
                padding: 4,
                marginBottom: 0,
                opacity: animatedValues[index] || 0,
                transform: [
                  {
                    translateY: animatedValues[index]
                      ? animatedValues[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        })
                      : 0,
                  },
                ],
              },
            ]}
          >
            <Ionicons
              name={v.startsWith('✅') ? 'checkmark-circle-outline' : 'alert-circle-outline'}
              size={18}
              color={v.startsWith('✅') ? '#4CAF50' : '#F5A623'}
            />
            <Text style={styles.resultText}>{v.replace('✅ ', '').replace('❌ ', '')}</Text>
          </Animated.View>
        ))}
      </View>

      {Array.isArray(iaSuggestions) && iaSuggestions.length > 0 && (
        <View style={styles.resultBox}>
          <Text style={styles.sectionTitle}>🛠️ Observaciones del sistema</Text>
          {iaSuggestions.map((item, index) => (
            <View key={index} style={styles.resultItem}>
              <Ionicons name="alert-circle-outline" size={18} color="#F5A623" />
              <Text style={styles.resultText}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.analyzeButton} onPress={runIAAnalysis} disabled={loading}>
        <Ionicons name="sparkles-outline" size={20} color="#000" />
        <Text style={styles.analyzeButtonText}>Generar análisis IA</Text>
      </TouchableOpacity>

      {loading && (
        <Animated.View
          style={{
            marginTop: 20,
            alignSelf: 'center',
            transform: [
              {
                rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          }}
        >
          <Ionicons name="sparkles" size={32} color="#D8A353" />
        </Animated.View>
      )}

      <View style={styles.progressContainer}>
        <Text style={styles.progressLabel}>
          Tu perfil está al {completion}% completo{' '}
          {completion === 100
            ? '¡Excelente! Está listo para destacarse.'
            : completion >= 80
            ? 'Muy bien, solo faltan unos pocos ajustes.'
            : completion >= 50
            ? 'Hay varios puntos a mejorar. Puedes optimizarlo.'
            : 'Te recomendamos completar más campos para aumentar visibilidad.'}
        </Text>
        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor:
                  completion === 100
                    ? '#4CAF50'
                    : completion >= 80
                    ? '#D8A353'
                    : completion >= 50
                    ? '#FF9800'
                    : '#F44336',
              },
            ]}
          />
          <Text
            style={{
              color:
                completion === 100
                  ? '#4CAF50'
                  : completion >= 80
                  ? '#D8A353'
                  : completion >= 50
                  ? '#FF9800'
                  : '#F44336',
              fontWeight: 'bold',
              fontSize: 16,
              textAlign: 'center',
              marginTop: 6,
            }}
          >
            {completion === 100
              ? '🔥 Perfil destacado'
              : completion >= 80
              ? '✅ Perfil sólido'
              : completion >= 50
              ? '⚠️ Perfil incompleto'
              : '🚫 Perfil básico'}
          </Text>
        </View>
      </View>

      {verdict !== '' && (
        <View style={styles.verdictBox}>
          <Text style={styles.verdictText}>{verdict}</Text>
        </View>
      )}

      {Array.isArray(suggestions) && suggestions.length > 0 && (
        <View style={styles.resultBox}>
          <Text className="resultTitle" style={styles.resultTitle}>
            💡 {suggestions.length} recomendaciones IA encontradas
          </Text>
          {suggestions.map((item, index) => (
            <Animated.View
              key={index}
              style={[
                styles.resultItem,
                {
                  opacity: animatedValues[index + validations.length] || 0,
                  transform: [
                    {
                      translateY: animatedValues[index + validations.length]
                        ? animatedValues[index + validations.length].interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          })
                        : 0,
                    },
                  ],
                },
              ]}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#D8A353" />
              <Text style={styles.resultText}>{item}</Text>
            </Animated.View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 10,
    paddingTop: 30,
    paddingBottom: 10,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 0,
    marginLeft: 50,
  },
  subtitle: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 15,
    marginLeft: 80,
  },
  analyzeButton: {
    backgroundColor: '#D8A353',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 20,
  },
  analyzeButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 6,
  },
  resultBox: {
    marginTop: 0,
    padding: 10,
    backgroundColor: '#1B1B1B',
    borderRadius: 10,
  },
  resultTitle: {
    color: '#D8A353',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  resultText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    flexShrink: 1,
  },
  verdictBox: {
    marginTop: 0,
    padding: 12,
    backgroundColor: '#111',
    borderRadius: 10,
  },
  verdictText: {
    color: '#D8A353',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  fixedBackButton: {
    position: 'absolute',
    top: 0,
    left: -10,
    zIndex: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 50,
    marginBottom: 10,
  },
  titleText: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
  },
  brainIcon: {
    fontSize: 22,
  },
  sectionTitle: {
    color: '#F5A623',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressContainer: {
    marginTop: 0,
    marginBottom: 10,
  },
  progressLabel: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 6,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: '#333',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 10,
    borderRadius: 5,
  },
});
