// screens/PrivacySecurityScreen.js
import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Linking } from 'react-native';


const ACCENT = '#D8A353';
const BG = '#000';
const CARD = '#1A1A1A';
const BORDER = '#2A2A2A';

const PRIVACY_URL = 'https://www.elenlace.cl/privacidad';
const CSAE_URL    = 'https://www.elenlace.cl/seguridad-ninos';
const HELP_URL    = 'https://www.elenlace.cl/ayuda';
const SUPPORT_MAIL = 'contacto@elenlace.cl';

const normalizeEmail = (e) => (e || '').toString().trim().toLowerCase();
const blockKey = (me) => `blocked_${normalizeEmail(me)}`;

async function openLink(url) {
  try {
    const ok = await Linking.canOpenURL(url);
    if (ok) return Linking.openURL(url);
  } catch {}
  Alert.alert('No se pudo abrir', `Copia este enlace en tu navegador:\n${url}`);
}

export default function PrivacySecurityScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false, animation: 'none' });
  }, [navigation]);

  // email desde params o fallback a AsyncStorage:userData
  const [me, setMe] = useState(normalizeEmail(route?.params?.email));
  const [blocked, setBlocked] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const hydrateMeFromUserData = useCallback(async () => {
    if (me) return; // ya tenemos
    try {
      const raw = await AsyncStorage.getItem('userData');
      if (raw) {
        const parsed = JSON.parse(raw);
        const email = normalizeEmail(parsed?.email || parsed?.user?.email);
        if (email) setMe(email);
      }
    } catch {}
  }, [me]);

  const load = useCallback(async () => {
    try {
      if (!me) return;
      const raw = await AsyncStorage.getItem(blockKey(me));
      const parsed = raw ? JSON.parse(raw) : [];
      const clean = (Array.isArray(parsed) ? parsed : [])
        .map((i) => (typeof i === 'string' ? { email: normalizeEmail(i) } : { ...i, email: normalizeEmail(i?.email) }))
        .filter((i) => i && i.email);
      setBlocked(clean);
    } catch {
      setBlocked([]);
    }
  }, [me]);

  useEffect(() => {
    hydrateMeFromUserData();
  }, [hydrateMeFromUserData]);

  useEffect(() => {
    if (me) load();
  }, [me, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const unblock = (email) => {
    Alert.alert('Desbloquear', `¿Quieres desbloquear a ${email}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí, desbloquear',
        style: 'destructive',
        onPress: async () => {
          const next = (blocked || []).filter((i) => i.email !== email);
          await AsyncStorage.setItem(blockKey(me), JSON.stringify(next));
          setBlocked(next);
        },
      },
    ]);
  };

  const clearAll = () => {
    if (!blocked.length) return;
    Alert.alert(
      'Limpiar lista',
      'Esto desbloqueará a todos los usuarios bloqueados. ¿Deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, limpiar',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.setItem(blockKey(me), JSON.stringify([]));
            setBlocked([]);
          },
        },
      ],
    );
  };

  const topPad = Math.max(insets.top, 12);

  return (
    <View style={[s.screen, { paddingTop: topPad }]}>
      <StatusBar style="light" backgroundColor="#0E0E0E" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
          style={s.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={s.headerTitle}>Privacidad y seguridad</Text>

        <TouchableOpacity
          onPress={clearAll}
          style={s.clearBtn}
          disabled={!blocked.length}
          accessibilityRole="button"
          accessibilityLabel="Limpiar lista de bloqueados"
        >
          <Ionicons name="trash-outline" size={22} color={blocked.length ? ACCENT : '#666'} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.body}
        contentContainerStyle={{ paddingBottom: 28 }}
        contentInsetAdjustmentBehavior="never"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
        }
      >
        {/* Info bloqueos */}
        <View style={s.infoCard}>
          <Ionicons name="shield-checkmark" size={18} color={ACCENT} />
          <Text style={s.infoText}>
            Administra a quién bloqueaste. Los usuarios desbloqueados podrán volver a enviarte mensajes.
          </Text>
        </View>

        <Text style={s.sectionTitle}>Usuarios bloqueados</Text>

        {!me ? (
          <View style={s.card}>
            <Text style={s.empty}>No se pudo identificar tu cuenta.</Text>
            <Text style={[s.empty, { marginTop: 4 }]}>Vuelve desde Ajustes → Privacidad y seguridad.</Text>
          </View>
        ) : blocked.length === 0 ? (
          <View style={s.card}>
            <Text style={s.empty}>No tienes usuarios bloqueados.</Text>
          </View>
        ) : (
          blocked.map((i) => (
            <View key={i.email} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.email}>{i.email}</Text>
                {!!i.at && <Text style={s.meta}>Bloqueado: {new Date(i.at).toLocaleString()}</Text>}
              </View>

              <TouchableOpacity style={s.unblockBtn} onPress={() => unblock(i.email)}>
                <Ionicons name="lock-open" size={16} color="#000" />
                <Text style={s.unblockTxt}>Desbloquear</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Reporte / Abuso */}
        <Text style={[s.sectionTitle, { marginTop: 18 }]}>Reportes y privacidad</Text>
        <View style={s.card}>
          <Text style={s.cardText}>
            ¿Detectaste contenido fraudulento, suplantación o violación de privacidad? Escríbenos a{' '}
            <Text
              style={s.link}
              onPress={() => openLink(`mailto:${SUPPORT_MAIL}?subject=Reporte%20de%20abuso%20o%20privacidad`)}
            >
              {SUPPORT_MAIL}
            </Text>
            . Incluye evidencia (capturas, enlaces) y el correo del perfil involucrado.
          </Text>
        </View>

        {/* Enlaces legales (web) */}
        <Text style={[s.sectionTitle, { marginTop: 18 }]}>Más sobre tu privacidad</Text>

        <TouchableOpacity style={s.linkBtn} onPress={() => openLink(PRIVACY_URL)}>
          <Ionicons name="document-text-outline" size={18} color="#000" />
          <Text style={s.linkBtnTxt}>Política de Privacidad (web)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.linkBtn} onPress={() => openLink(CSAE_URL)}>
          <Ionicons name="shield-outline" size={18} color="#000" />
          <Text style={s.linkBtnTxt}>Seguridad de los niños (web)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.linkBtn} onPress={() => openLink(HELP_URL)}>
          <Ionicons name="help-circle-outline" size={18} color="#000" />
          <Text style={s.linkBtnTxt}>Ayuda / Soporte (web)</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  header: {
    height: 60,
    backgroundColor: '#0E0E0E',
    borderBottomColor: ACCENT,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backBtn: { position: 'absolute', top: 7, left: 20 },
  clearBtn: { position: 'absolute', top: 9, right: 16 },

  headerTitle: { color: ACCENT, fontSize: 20, fontWeight: '700', textAlign: 'center' },

  body: { flex: 1, padding: 16 },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
    gap: 10,
  },
  infoText: { color: '#ddd', fontSize: 13, flex: 1 },

  sectionTitle: { color: ACCENT, fontSize: 14, fontWeight: '700', marginBottom: 10, marginTop: 4 },

  card: {
    backgroundColor: CARD,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 10,
  },
  cardText: { color: '#ddd', fontSize: 13, lineHeight: 20 },

  empty: { color: '#9A9A9A', fontSize: 13 },

  row: {
    backgroundColor: CARD,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  email: { color: '#fff', fontSize: 14, fontWeight: '600' },
  meta: { color: '#8A8A8A', fontSize: 11, marginTop: 2 },

  unblockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  unblockTxt: { color: '#000', fontWeight: '700', fontSize: 12 },

  linkBtn: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  linkBtnTxt: { color: '#000', fontWeight: '700', fontSize: 13 },
});
