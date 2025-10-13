// screens/MyCastingsScreen.js
import React, { useEffect, useState, useCallback, Fragment } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

const GOLD = '#D8A353', BG = '#000', CARD = '#1B1B1B';
const low = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : null);
const parseArr = (raw) => { try { const j = raw ? JSON.parse(raw) : []; return Array.isArray(j) ? j : []; } catch { return []; } };

// ---- helpers de fecha ----
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
const getCastingDate = (c) =>
  toDateOrNull(c?.createdAt) ||
  toDateOrNull(c?.syncedAt) ||
  toDateOrNull(c?.created_at) ||
  toDateOrNull(c?.timestamp) ||
  toDateOrNull(c?.date) ||
  toDateOrNull(c?.deadline) ||
  toDateOrNull(c?.tsMs) ||
  (extractMsFromAny(c?.id) ? new Date(extractMsFromAny(c?.id)) : null);

// ---- owner / tipo ----
const deriveOwner = (post) => {
  const email =
    low(post?.creatorEmail) || low(post?.ownerEmail) || low(post?.authorEmail) ||
    (typeof post?.docId === 'string' && post.docId.includes('_') ? low(post.docId.split('_')[0]) : null) ||
    (typeof post?.k === 'string'    && post.k.includes('_')    ? low(post.k.split('_')[0])    : null);
  const id = low(post?.creatorId) || low(post?.ownerId) || low(post?.createdBy) || null;
  return { email, id };
};
const isCasting = (post) => { const t = low(post?.type); return t === 'casting' || t == null; };

// ---- helpers firestore ----
const getCastingIdAny = (item) =>
  item?.docId ||
  item?.id ||
  (typeof item?.k === 'string' && item.k.includes('_') ? item.k.split('_')[1] : null);

const getCastingDocRef = (db, item) => {
  const anyId = getCastingIdAny(item);
  return anyId ? doc(db, 'castings', String(anyId)) : null;
};

const fetchCastingsFromFirestore = async (email, uid) => {
  const db = getFirestore(); if (!db) return [];
  const colRef = collection(db, 'castings');
  const q1 = query(colRef, where('creatorEmail', '==', email));
  const q2 = query(colRef, where('creatorId', '==', uid || email));
  const q3 = query(colRef, orderBy('id', 'desc'), limit(100));
  const toArr = (snap) => snap.docs.map(d => ({ docId: d.id, ...d.data() }));

  const [r1, r2, r3] = await Promise.allSettled([getDocs(q1), getDocs(q2), getDocs(q3)]);
  const a1 = r1.status==='fulfilled'?toArr(r1.value):[];
  const a2 = r2.status==='fulfilled'?toArr(r2.value):[];
  const a3 = r3.status==='fulfilled'?toArr(r3.value):[];

  const emailLow = low(email); const uidLow = low(uid);
  let all = [...a1, ...a2, ...a3].filter(p => {
    const owner = low(p.creatorEmail) || low(p.creatorId) ||
      (typeof p.docId==='string' && p.docId.includes('_') ? low(p.docId.split('_')[0]) : null);
    return owner === emailLow || (!!uidLow && owner === uidLow);
  });
  all = all.filter(isCasting);
  return all;
};

export default function MyCastingsScreen() {
  const navigation = useNavigation();
  const { userData } = useUser();

  const [castings, setCastings] = useState([]);
  const [loading, setLoading] = useState(false);

  const uid = low(userData?.id);
  const uemail = low(userData?.email);

  const loadCastings = useCallback(async () => {
    setLoading(true);
    try {
      // LOCAL
      const raw1 = await AsyncStorage.getItem('castings');
      const raw2 = await AsyncStorage.getItem('allCastings');
      const local = [...parseArr(raw1), ...parseArr(raw2)];

      // REMOTO
      const remote = uemail ? await fetchCastingsFromFirestore(uemail, uid) : [];
      const seen = new Set();
      const merged = [...local, ...remote].filter(p => {
        const key = p?.id || p?.docId || p?.k;
        if (!key) return false;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // SOLO MÍOS
      const onlyCastings = merged.filter(isCasting);
      const mine = onlyCastings.filter(p => {
        const o = deriveOwner(p);
        return (uemail && o.email === uemail) || (uid && o.id === uid);
      });

      // ORDEN
      mine.sort((a, b) => {
        const da = getCastingDate(a);
        const db = getCastingDate(b);
        return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
      });

      setCastings(mine);

      // cache opcional
      if (remote.length) {
        await AsyncStorage.setItem('castings', JSON.stringify(merged));
      }
    } catch (e) {
      console.error('MyCastings load error:', e);
      setCastings([]);
    } finally {
      setLoading(false);
    }
  }, [uid, uemail]);

  useEffect(() => { loadCastings(); }, [loadCastings]);
  useEffect(() => { const u = navigation.addListener('focus', loadCastings); return u; }, [navigation, loadCastings]);

  const openApplications = (item) => {
    const castingId =
      item?.id ||
      item?.docId ||
      (typeof item?.k === 'string' && item.k.includes('_') ? item.k.split('_')[1] : null);
    if (!castingId) { Alert.alert('Casting sin ID', 'No se puede abrir postulaciones.'); return; }
    navigation.navigate('ViewApplications', { castingId });
  };

  // --- Acciones funcionales (sin mover tu botón principal) ---
  const onEdit = (item) => {
    const castingId = getCastingIdAny(item);
    if (!castingId) { Alert.alert('Casting sin ID', 'No se puede abrir el editor.'); return; }
    // Navega al nombre REAL de la pantalla (registrada como PublishCastingScreen)
    navigation.navigate('PublishCastingScreen', { mode: 'edit', castingId, original: item });
  };

  const onToggleClosed = async (item) => {
    try {
      const db = getFirestore();
      const ref = getCastingDocRef(db, item);
      if (!ref) { Alert.alert('Error', 'No se pudo resolver el ID del casting.'); return; }

      const nextClosed = !Boolean(item?.closed);
      const nextStatus = nextClosed ? 'closed' : 'open';

      // Optimista UI
      setCastings(prev => prev.map(c =>
        getCastingIdAny(c) === getCastingIdAny(item) ? { ...c, closed: nextClosed, status: nextStatus } : c
      ));

      // Remoto
      await updateDoc(ref, { closed: nextClosed, status: nextStatus });

      // Cache local básica
      try {
        const raw = await AsyncStorage.getItem('castings');
        const arr = parseArr(raw);
        const updated = arr.map(c =>
          getCastingIdAny(c) === getCastingIdAny(item) ? { ...c, closed: nextClosed, status: nextStatus } : c
        );
        await AsyncStorage.setItem('castings', JSON.stringify(updated));
      } catch {}
    } catch (e) {
      console.error('Toggle closed error:', e);
      Alert.alert('Error', 'No se pudo actualizar el estado.');
      loadCastings();
    }
  };

  const onDelete = (item) => {
    Alert.alert('Eliminar casting', `¿Seguro que deseas eliminar "${item?.title || 'este casting'}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            const db = getFirestore();
            const ref = getCastingDocRef(db, item);
            if (!ref) { Alert.alert('Error', 'No se pudo resolver el ID del casting.'); return; }

            // optimista
            setCastings(prev => prev.filter(c => getCastingIdAny(c) !== getCastingIdAny(item)));

            await deleteDoc(ref);

            // limpiar cache local básica
            try {
              const raw = await AsyncStorage.getItem('castings');
              const arr = parseArr(raw);
              const filtered = arr.filter(c => getCastingIdAny(c) !== getCastingIdAny(item));
              await AsyncStorage.setItem('castings', JSON.stringify(filtered));
            } catch {}
          } catch (e) {
            console.error('Delete error', e);
            Alert.alert('Error', 'No se pudo eliminar.');
            loadCastings();
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🎬 Mis castings publicados</Text>

        {loading && <Text style={styles.hint}>Cargando…</Text>}

        {castings.length === 0 && !loading ? (
          <Text style={styles.empty}>No hay castings tuyos.</Text>
        ) : (
          castings.map((c, i) => {
            const isClosed = Boolean(c?.closed) || c?.status === 'closed';
            return (
              <View key={c.id || c.docId || c.k || `i-${i}`} style={styles.card}>
                {/* --- TU LAYOUT ORIGINAL (sin mover el botón) --- */}
                <View style={{flex:1, paddingRight:10}}>
                  <Text style={styles.cardTitle}>{c.title || 'Sin título'}</Text>
                  <Text style={styles.cardMeta}>
                    📅 {getCastingDate(c)?.toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'}) || 'Sin fecha'}
                  </Text>
                  <Text style={styles.cardMeta}>🎭 {c.category || 'Casting'}</Text>
                </View>
                <TouchableOpacity style={styles.btn} onPress={() => openApplications(c)}>
                  <Ionicons name="eye-outline" size={16} color="#000" />
                  <Text style={styles.btnTxt}>Ver postulaciones</Text>
                </TouchableOpacity>

                {/* --- Fila sutil de acciones, DENTRO y DEBAJO --- */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity onPress={() => onToggleClosed(c)}>
                    <Text style={styles.actionLink}>{isClosed ? 'Reabrir' : 'Cerrar'}</Text>
                  </TouchableOpacity>
                  <Text style={styles.dot}>•</Text>
                  <TouchableOpacity onPress={() => onEdit(c)}>
                    <Text style={styles.actionLink}>Editar</Text>
                  </TouchableOpacity>
                  <Text style={styles.dot}>•</Text>
                  <TouchableOpacity onPress={() => onDelete(c)}>
                    <Text style={[styles.actionLink, styles.actionDanger]}>Borrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:{flex:1, backgroundColor:BG},
  back:{position:'absolute', top:40, left:20, zIndex:10},
  container:{padding:10, paddingTop:70, paddingBottom:120, alignItems:'center'},
  title:{fontSize:22, color:GOLD, fontWeight:'bold', marginBottom:12},
  empty:{color:'#bbb', textAlign:'center', lineHeight:20, marginTop:20},
  hint:{color:'#777', fontSize:12, textAlign:'center', marginBottom:10},

  // tarjeta original
  card:{width:'100%', flexDirection:'row', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap',
        backgroundColor:CARD, borderColor:GOLD, borderRadius:10, padding: 10, marginBottom:4},
  cardTitle:{fontSize:16, color:'#fff', fontWeight:'bold', marginBottom:2},
  cardMeta:{color:'#ccc', marginBottom:2},
  btn:{backgroundColor:GOLD, borderRadius:8, paddingVertical:6, paddingHorizontal:6, flexDirection:'row', alignItems:'center'},
  btnTxt:{color:'#000', fontWeight:'bold', marginLeft:6},

  // acciones sutiles
  actionsRow:{ width:'100%', marginTop:2, flexDirection:'row', justifyContent:'flex-end' },
  actionLink:{ color:'#B9B9B9', fontSize:12, textDecorationLine:'underline' },
  actionDanger:{ color:'#FF9A9A' },
  dot:{ color:'#666', marginHorizontal:8 },
});
