import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// 🆕 Firestore
import { db } from '../src/firebase/firebaseConfig';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';

export default function FocusListScreen() {
  const [focusList, setFocusList] = useState([]);
  const navigation = useNavigation();

  // 🆕 helpers
  const normalizeEmail = (e) =>
    (typeof e === 'string' ? e : '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '')
      .replace(/@{2,}/g, '@');

  const uniqueById = (arr) => {
    const seen = new Set();
    return (arr || []).filter((x) => {
      const k = String(x?.id || '');
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const normalizeFocus = (d) => {
    const data = d?.data?.() || {};
    const createdAtMs =
      typeof data.createdAt?.toDate === 'function'
        ? data.createdAt.toDate().getTime()
        : (Number(data.createdAtMs) || Date.now());
    return {
      id: d?.id || data.id || String(createdAtMs),
      title: data.title || 'Focus',
      description: data.description || '',
      requirements: data.requirements || '',
      dateTime: data.dateTime || '',   // ⬅️ fecha/hora del estudio (como “Explorar Servicios” muestra date)
      duration: data.duration || '',
      payment: data.payment || '',
      paymentMethod: data.paymentMethod || '',
      whatsapp: data.whatsapp || '',
      authorName: data.authorName || '',
      authorEmail: data.authorEmail || '',
      authorEmailNormalized: data.authorEmailNormalized || normalizeEmail(data.authorEmail),
      createdAtMs,
    };
  };

  // 🆕 carga remota (Firestore)
  const fetchOtherUsersFocusFromFirestore = async (myEmailN) => {
    try {
      // intentamos con orden por createdAt desc
      let snap;
      try {
        const q1 = query(collection(db, 'focus'), orderBy('createdAt', 'desc'), limit(200));
        snap = await getDocs(q1);
      } catch {
        // fallback sin orderBy (si no hay índice)
        snap = await getDocs(collection(db, 'focus'));
      }

      const rows = [];
      snap.forEach((d) => rows.push(normalizeFocus(d)));

      // excluir mis propios focus
      const filtered = rows.filter(
        (f) => normalizeEmail(f.authorEmailNormalized || f.authorEmail) !== myEmailN
      );

      // ordenar por fecha de publicación (desc)
      filtered.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      return uniqueById(filtered);
    } catch (e) {
      console.log('Error cargando focus remotos:', e?.message || e);
      return [];
    }
  };

  // 🆕 fallback local (AsyncStorage) — solo “otros usuarios”
  const fetchOtherUsersFocusFromLocal = async (myEmailN) => {
    try {
      const json = await AsyncStorage.getItem('focusList');
      const list = json ? JSON.parse(json) : [];
      const cleaned = (Array.isArray(list) ? list : []).map((f) => ({
        id: String(f.id || f.createdAtMs || Date.now()),
        title: f.title || 'Focus',
        description: f.description || '',
        requirements: f.requirements || '',
        dateTime: f.dateTime || '',
        duration: f.duration || '',
        payment: f.payment || '',
        paymentMethod: f.paymentMethod || '',
        whatsapp: f.whatsapp || '',
        authorName: f.authorName || '',
        authorEmail: f.authorEmail || '',
        authorEmailNormalized: normalizeEmail(f.authorEmail || ''),
        createdAtMs: Number(f.createdAtMs) || Date.now(),
      }));
      const onlyOthers = cleaned.filter(
        (f) => normalizeEmail(f.authorEmailNormalized || f.authorEmail) !== myEmailN
      );
      // último primero (como hacía el base con reverse)
      return uniqueById(onlyOthers).sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
    } catch {
      return [];
    }
  };

  const formatPublishedAt = (ms) => {
    try {
      if (!ms) return '';
      const d = new Date(ms);
      // similar a “Explorar Servicios”: mostramos una línea informativa
      return d.toLocaleString('es-CL');
    } catch {
      return '';
    }
  };

  useEffect(() => {
    const validateAccess = async () => {
      const json = await AsyncStorage.getItem('userProfile');
      if (json) {
        const user = JSON.parse(json);
        const membership = user?.membershipType || 'free';
        if (membership === 'free') {
          navigation.goBack();
          // Ideal: usar modal elegante en vez de alert
        }
      }
    };

    validateAccess();

    const loadFocus = async () => {
      try {
        const json = await AsyncStorage.getItem('userProfile');
        const user = json ? JSON.parse(json) : null;
        const myEmailN = normalizeEmail(user?.email || '');

        // 1) Carga remota (preferida)
        const remote = await fetchOtherUsersFocusFromFirestore(myEmailN);

        // 2) Fallback local y merge (sin duplicar)
        const local = await fetchOtherUsersFocusFromLocal(myEmailN);
        const merged = uniqueById([...(remote || []), ...(local || [])]);

        setFocusList(merged);
      } catch (error) {
        console.error('Error cargando Focus:', error);
      }
    };

    // cargar al entrar y cada vez que la pantalla toma foco
    const unsubscribe = navigation.addListener('focus', loadFocus);
    return unsubscribe;
  }, [navigation]);

  const openFocus = (focus) => {
    navigation.navigate('FocusDetailScreen', {
      focusId: focus.id,
      focus,
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>🧠 Focus publicados</Text>

        {focusList.length === 0 ? (
          <Text style={styles.empty}>Aún no hay publicaciones de otros usuarios.</Text>
        ) : (
          focusList.map((focus) => (
            <TouchableOpacity
              key={focus.id}
              activeOpacity={0.85}
              onPress={() => openFocus(focus)}
              style={[
                styles.card,
                {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 3,
                },
              ]}
            >
              <View style={{ marginTop: 6 }}>
                <Text style={styles.cardTitle}>🎯 {focus.title}</Text>
                
                {/* Línea tipo “Explorar Servicios” con fecha/hora de publicación */}
                <Text style={styles.cardText}>
                  🕒 Publicado: {formatPublishedAt(focus.createdAtMs)}
                </Text>

                {!!focus.authorName && (
                  <Text style={styles.cardText}>👤 Publicado por: {focus.authorName}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    flex: 1,
    paddingHorizontal: 10,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 2000,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 100,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  empty: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  // ⬇️ Estilo inspirado en “Explorar Servicios”
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 2,
    marginHorizontal: -5,
    borderWidth: 1,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardText: {
    color: '#bbb',
    fontSize: 12,
    marginBottom: 2,
  },
});
