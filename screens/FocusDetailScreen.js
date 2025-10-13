// screens/FocusDetailScreen.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking, // 🆕 para abrir WhatsApp
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

// Firestore (fallback si no está en local)
import { db } from '../src/firebase/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default function FocusDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  // Puede venir como objeto o sólo el id
  const focusFromParams = route?.params?.focus || null;
  const focusIdParam =
    route?.params?.focusId ||
    focusFromParams?.id ||
    route?.params?.focus?.id ||
    null;

  const [focus, setFocus] = useState(focusFromParams || null);
  const [loading, setLoading] = useState(!focusFromParams);
  const [notFound, setNotFound] = useState(false);

  // --------- helpers ----------
  const toStr = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
  const trimOrEmpty = (v) => toStr(v).trim();
  const fmtCL = (ms) => { try { return new Date(Number(ms)).toLocaleString('es-CL'); } catch { return ''; } };
  const fmtTS = (ts) => { try { return (ts?.toDate ? ts.toDate() : new Date(ts)).toLocaleString('es-CL'); } catch { return ''; } };

  const COLLECTIONS = ['focus', 'focuses', 'focusGroups', 'focus_public'];

  const fetchFromFirestore = async (fid) => {
    // 1) buscar por doc-id en varias colecciones
    for (const col of COLLECTIONS) {
      try {
        const dref = doc(collection(db, col), fid);
        const ds = await getDoc(dref);
        if (ds.exists()) return { id: fid, ...(ds.data() || {}) };
      } catch {}
    }
    // 2) buscar por campo id o focusId
    for (const col of COLLECTIONS) {
      try {
        const q1 = query(collection(db, col), where('id', '==', fid));
        const s1 = await getDocs(q1);
        if (!s1.empty) return { id: fid, ...(s1.docs[0].data() || {}) };
      } catch {}
      try {
        const q2 = query(collection(db, col), where('focusId', '==', fid));
        const s2 = await getDocs(q2);
        if (!s2.empty) return { id: fid, ...(s2.docs[0].data() || {}) };
      } catch {}
    }
    return null;
  };

  const loadFromLocal = async (fid) => {
    try {
      const raw = await AsyncStorage.getItem('focusList');
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) {
        const hit = arr.find((f) => f?.id === fid);
        if (hit) return hit;
      }
    } catch {}
    return null;
  };

  // Carga datos si entramos con sólo focusId o si faltan campos
  useEffect(() => {
    let mounted = true;

// Antes incluía paymentMethod, description, whatsapp, etc.
const needEnrich = (obj) => {
  if (!obj) return true;
  // Solo lo realmente necesario para mostrar la pantalla
  const keys = ['title', 'requirements', 'dateTime', 'payment'];
  return keys.some((k) => !trimOrEmpty(obj[k]));
};


    const run = async () => {
      const fid = focusIdParam;
      if (!fid && !focusFromParams) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if (focusFromParams && !needEnrich(focusFromParams)) {
        setLoading(false);
        setNotFound(false);
        return;
      }

      setLoading(true);

      // 1) intentar local
      let merged = focusFromParams || null;
      if (fid) {
        const localHit = await loadFromLocal(fid);
        if (localHit) merged = { ...(merged || {}), ...localHit };
      }

      // 2) si sigue faltando algo, Firestore
      if (fid && (!merged || needEnrich(merged))) {
        const remote = await fetchFromFirestore(fid);
        if (remote) merged = { ...(merged || {}), ...remote };
      }

      if (!mounted) return;

      if (!merged) {
        setNotFound(true);
      } else {
        setFocus(merged);
        setNotFound(false);
      }
      setLoading(false);
    };

    run();
    return () => { mounted = false; };
  }, [focusIdParam, focusFromParams]);

  // === Botón "Ver perfil": misma lógica/estilo que FilteredProfilesScreen ===
  const sanitizeProfileData = (profile) => {
    const cleaned = { ...profile };
    if (!cleaned.profilePhoto?.startsWith('http') && !cleaned.profilePhoto?.startsWith('file')) {
      cleaned.profilePhoto = null;
    }
    if (!cleaned.profileVideo?.startsWith('http') && !cleaned.profileVideo?.startsWith('file')) {
      cleaned.profileVideo = null;
    }
    if (!cleaned.name && cleaned.agencyName) cleaned.name = cleaned.agencyName;
    return cleaned;
  };

  const fixWeirdEmail = (emailRaw) => {
    let email = (emailRaw || '').trim().toLowerCase();
    if ((email.match(/@/g) || []).length > 1) {
      const matches = email.match(/@[^@]+$/);
      const domain = matches ? matches[0].slice(1) : 'gmail.com';
      const beforeAt = email.split('@').slice(0, -1).join('.');
      email = `${beforeAt}@${domain}`;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? email : '';
  };

  const openAuthorProfile = async () => {
    try {
      const emailRaw = (focus?.authorEmail || route?.params?.authorEmail || '').trim().toLowerCase();
      const name = (focus?.authorName || route?.params?.authorName || 'Usuario').trim();

      const email = fixWeirdEmail(emailRaw);
      if (!email) {
        Alert.alert('Perfil no disponible', 'No se encontró el email del autor.');
        return;
      }

      const storedFree  = await AsyncStorage.getItem('allProfilesFree');
      const storedPro   = await AsyncStorage.getItem('allProfiles');
      const storedElite = await AsyncStorage.getItem('allProfilesElite');

      const free  = storedFree  ? JSON.parse(storedFree)  : [];
      const pro   = storedPro   ? JSON.parse(storedPro)   : [];
      const elite = storedElite ? JSON.parse(storedElite) : [];

      const rank = { free: 1, pro: 2, elite: 3 };
      const candidates = [...free, ...pro, ...elite].filter(
        p => (p?.email || '').toLowerCase() === email
      );

      let target = null;
      if (candidates.length) {
        target = candidates.reduce(
          (best, c) => ((rank[c?.membershipType] || 0) > (rank[best?.membershipType] || 0) ? c : best),
          candidates[0]
        );
        target = sanitizeProfileData(target);
      } else {
        target = { email, name }; // fallback mínimo
      }

      const tipo = target?.membershipType || 'free';
      if (tipo === 'elite')      navigation.navigate('ProfileElite', { viewedProfile: target });
      else if (tipo === 'pro')   navigation.navigate('ProfilePro',   { viewedProfile: target });
      else                       navigation.navigate('Profile',      { viewedProfile: target });
    } catch (e) {
      navigation.navigate('Profile', {
        viewedProfile: { email: focus?.authorEmail || '', name: focus?.authorName || 'Usuario' },
      });
    }
  };

  // 🆕 Abrir WhatsApp con mensaje prellenado
  const openWhatsApp = () => {
    const raw =
      trimOrEmpty(focus?.whatsapp) ||
      trimOrEmpty(route?.params?.whatsapp) ||
      ''; // si no hay, alerta
    const digits = raw.replace(/[^\d]/g, ''); // wa.me usa solo dígitos (formato internacional)
    if (!digits) {
      Alert.alert('WhatsApp no disponible', 'Este focus no tiene número configurado.');
      return;
    }
    const msg = `Hola, quiero participar en el focus${focus?.title ? `: ${focus.title}` : ''}.`;
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => Alert.alert('No se pudo abrir WhatsApp'));
  };

  // Normaliza campos (acepta variantes de nombres)
  const display = useMemo(() => {
    const f = focus || {};
    const title =
      trimOrEmpty(f.title) ||
      trimOrEmpty(f.titulo) ||
      trimOrEmpty(route?.params?.title) ||
      'Focus';

    const requirements =
      trimOrEmpty(f.requirements) ||
      trimOrEmpty(f.requisitos) ||
      '';

    const dateTime =
      trimOrEmpty(f.dateTime) ||
      trimOrEmpty(f.fechaHora) ||
      trimOrEmpty(f.fecha) ||
      '';

    const duration =
      trimOrEmpty(f.duration) ||
      trimOrEmpty(f.duracion) ||
      '';

    const payment =
      trimOrEmpty(f.payment) ||
      trimOrEmpty(f.pago) ||
      trimOrEmpty(f.amount) ||
      '';

    const paymentMethod =
      trimOrEmpty(f.paymentMethod) ||
      trimOrEmpty(f.formaPago) ||
      '';

    const description =
      trimOrEmpty(f.description) ||
      trimOrEmpty(f.descripcion) ||
      '';

    const authorName =
      trimOrEmpty(f.authorName) ||
      trimOrEmpty(f.autorNombre) ||
      trimOrEmpty(f.publisherName) ||
      '';

    const authorEmail =
      trimOrEmpty(f.authorEmail) ||
      trimOrEmpty(f.autorEmail) ||
      trimOrEmpty(f.publisherEmail) ||
      '';

    const whatsapp =
      trimOrEmpty(f.whatsapp) ||
      trimOrEmpty(f.whatsApp) ||
      trimOrEmpty(f.phone) ||
      '';

    // creado el
    let createdAt = '';
    if (f.createdAtMs) createdAt = fmtCL(f.createdAtMs);
    else if (f.createdAt) createdAt = fmtTS(f.createdAt);

    // lista de requisitos (viñetas) si vienen separados por coma o salto de línea
    const reqItems = requirements
      ? requirements.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
      : [];

    return {
      title,
      dateTime,
      duration,
      payment,
      paymentMethod,
      description,
      authorName,
      authorEmail,
      whatsapp,
      createdAt,
      reqItems,
      requirements,
    };
  }, [focus, route?.params]);

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#D8A353" />
        <Text style={{ color: '#aaa', marginTop: 10 }}>Cargando focus…</Text>
      </View>
    );
  }

  if (notFound) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { position: 'relative', top: 0, left: 0, marginBottom: 16 }]}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center' }}>
          Este focus ya no está disponible.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Back */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Título */}
        <Text style={styles.title}>🎯 {display.title}</Text>

        {/* Requisitos */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>👤 Requisitos</Text>
          {display.reqItems.length > 0 ? (
            <View style={{ gap: 4 }}>
              {display.reqItems.map((it, idx) => (
                <Text key={idx} style={styles.cardText}>• {it}</Text>
              ))}
            </View>
          ) : (
            <Text style={styles.cardText}>{display.requirements || '—'}</Text>
          )}
        </View>

        {/* Fecha/Hora y Duración */}
        <View style={styles.row}>
          <View style={[styles.card, styles.col]}>
            <Text style={styles.cardLabel}>🗓️ Fecha y hora</Text>
            <Text style={styles.cardText}>{display.dateTime || '—'}</Text>
          </View>
          <View style={[styles.card, styles.col]}>
            <Text style={styles.cardLabel}>⏱️ Duración</Text>
            <Text style={styles.cardText}>{display.duration || '—'}</Text>
          </View>
        </View>

        {/* Pago */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>💰 Pago</Text>
          <Text style={styles.cardText}>
            {display.payment ? display.payment : '—'}
            {display.payment && display.paymentMethod ? ` (${display.paymentMethod})` : ''}
          </Text>
        </View>

        {/* Descripción */}
        {!!display.description && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>📝 Descripción</Text>
            <Text style={styles.cardText}>{display.description}</Text>
          </View>
        )}

        {/* Publicado por (nombre + botón "Ver perfil" con lupa estilo Filtered) */}
        {(display.authorName || display.authorEmail) && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>👤 Publicado por</Text>

            <View style={styles.authorRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.link}>
                  {display.authorName || 'Usuario'}
                </Text>
                {!!display.authorEmail && (
                  <Text style={[styles.cardText, { color: '#aaa', marginTop: 2 }]}>
                    {display.authorEmail}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                onPress={openAuthorProfile}
                style={styles.miniButton}
                accessibilityLabel="Ver perfil del publicador"
              >
                <Ionicons name="search" size={16} color="#D8A353" style={{ marginRight: 6 }} />
                <Text style={styles.miniButtonText}>Ver perfil</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Creado el */}
        {!!display.createdAt && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>📌 Creado el</Text>
            <Text style={styles.cardText}>{display.createdAt}</Text>
          </View>
        )}

        {/* 🆕 CTA: Contactar por WhatsApp (reemplaza Participar) */}
        <TouchableOpacity style={styles.ctaButton} onPress={openWhatsApp}>
          <Text style={styles.ctaButtonText}>📲 Contactar por WhatsApp</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1000,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  col: {
    flex: 1,
  },
  card: {
    backgroundColor: '#121212',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f1f1f',
    padding: 14,
    marginBottom: 10,
  },
  cardLabel: {
    color: '#D8A353',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  cardText: {
    color: '#fff',
    fontSize: 15,
  },
  link: {
    color: '#4da6ff',
    textDecorationLine: 'underline',
    marginBottom: 4,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  // === Botón "Ver perfil" estilo FilteredProfilesScreen (negro con borde dorado) ===
  miniButton: {
    backgroundColor: '#000',
    borderColor: '#D8A353',
    borderWidth: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniButtonText: {
    color: '#D8A353',
    fontSize: 12,
    fontWeight: '500',
  },
  // CTA dorado (mismo estilo que usabas en Participar)
  ctaButton: {
    backgroundColor: '#D8A353',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 18,
  },
  ctaButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
