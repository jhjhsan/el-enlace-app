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

const ACCENT = '#D8A353';
const BG = '#000';
const CARD = '#1A1A1A';
const BORDER = '#2A2A2A';

const key = (me) => `blocked_${me}`;

export default function PrivacySecurityScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  // Apaga cualquier header nativo ANTES del primer render (sin flicker)
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false, animation: 'none' });
  }, [navigation]);

  // email normalizado desde params
  const me = (route?.params?.email || '').toString().trim().toLowerCase();

  const [blocked, setBlocked] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(key(me));
      const parsed = raw ? JSON.parse(raw) : [];
      const clean = parsed
        .map((i) => (typeof i === 'string' ? { email: i } : i))
        .filter((i) => i && i.email);
      setBlocked(clean);
    } catch {
      setBlocked([]);
    }
  }, [me]);

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
          await AsyncStorage.setItem(key(me), JSON.stringify(next));
          setBlocked(next);
        },
      },
    ]);
  };

  // Padding superior estable (sin SafeAreaView, sin cambios de altura post-mount)
  const topPad = Math.max(insets.top, 12);

  return (
    <View style={[s.screen, { paddingTop: topPad }]}>
      <StatusBar style="light" backgroundColor="#0E0E0E" />

  <View style={s.header}>
  {/* Flecha absolutamente posicionada */}
  <TouchableOpacity
    onPress={() => navigation.goBack()}
    hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
    style={s.backBtn}
  >
    <Ionicons name="arrow-back" size={28} color="#fff" />
  </TouchableOpacity>

  {/* Título centrado */}
  <Text style={s.headerTitle}>Privacidad y seguridad</Text>
</View>


      <ScrollView
        style={s.body}
        contentContainerStyle={{ paddingBottom: 24 }}
        contentInsetAdjustmentBehavior="never"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
        }
      >
        <View style={s.infoCard}>
          <Ionicons name="shield-checkmark" size={18} color={ACCENT} />
          <Text style={s.infoText}>
            Administra a quién bloqueaste. Los usuarios desbloqueados podrán volver a enviarte
            mensajes.
          </Text>
        </View>

        <Text style={s.sectionTitle}>Usuarios bloqueados</Text>

        {!me ? (
          <View style={s.card}>
            <Text style={s.empty}>No se pudo identificar tu cuenta.</Text>
            <Text style={[s.empty, { marginTop: 4 }]}>
              Vuelve desde Ajustes → Privacidad y seguridad.
            </Text>
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
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  header: {
    height: 60,
    backgroundColor: '#0E0E0E',
    borderBottomColor: '#D8A353',
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative', // 👈 importante para que la flecha absoluta funcione
  },
  backBtn: {
    position: 'absolute',
    top: 7,   // 👈 exacto donde lo quieres
    left: 20,  // 👈 exacto donde lo quieres
  },
  headerTitle: {
    color: '#D8A353',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },

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

  sectionTitle: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 4,
  },

  card: {
    backgroundColor: CARD,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
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
});
