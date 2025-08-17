// screens/MyCastingsScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

const GOLD = '#D8A353', BG = '#000', CARD = '#1B1B1B';
const low = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : null);
const parseArr = (raw) => { try { const j = raw ? JSON.parse(raw) : []; return Array.isArray(j) ? j : []; } catch { return []; } };

// ---- helpers de fecha (mismo criterio que tu StatsElite) ----
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
// -------------------------------------------------------------

const deriveOwner = (post) => {
  const email =
    low(post?.creatorEmail) || low(post?.ownerEmail) || low(post?.authorEmail) ||
    (typeof post?.docId === 'string' && post.docId.includes('_') ? low(post.docId.split('_')[0]) : null) ||
    (typeof post?.k === 'string'    && post.k.includes('_')    ? low(post.k.split('_')[0])    : null);
  const id = low(post?.creatorId) || low(post?.ownerId) || low(post?.createdBy) || null;
  return { email, id };
};
const isCasting = (post) => { const t = low(post?.type); return t === 'casting' || t == null; };

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
      // 1) LOCAL
      const raw1 = await AsyncStorage.getItem('castings');
      const raw2 = await AsyncStorage.getItem('allCastings');
      const local = [...parseArr(raw1), ...parseArr(raw2)];

      // 2) FIRESTORE (siempre) y merge
      const remote = uemail ? await fetchCastingsFromFirestore(uemail, uid) : [];
      const seen = new Set();
      const merged = [...local, ...remote].filter(p => {
        const key = p?.id || p?.docId || p?.k;
        if (!key) return false;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // 3) SOLO CASTINGS + SOLO MÍOS
      const onlyCastings = merged.filter(isCasting);
      const mine = onlyCastings.filter(p => {
        const o = deriveOwner(p);
        return (uemail && o.email === uemail) || (uid && o.id === uid);
      });

      // 4) ORDENAR por fecha DESC (nuevos arriba)
      mine.sort((a, b) => {
        const da = getCastingDate(a);
        const db = getCastingDate(b);
        return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
      });

      setCastings(mine);

      // 5) cache opcional (merged ya ordenado no imprescindible)
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

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🎬 Mis castings publicados</Text>

        {loading && <Text style={styles.hint}>Cargando…</Text>}

        {castings.length === 0 && !loading ? (
          <Text style={styles.empty}>
            No hay castings tuyos.
          </Text>
        ) : (
          castings.map((c, i) => (
            <View key={c.id || c.docId || c.k || `i-${i}`} style={styles.card}>
              <View style={{flex:1, paddingRight:10}}>
                <Text style={styles.cardTitle}>{c.title || 'Sin título'}</Text>
                <Text style={styles.cardMeta}>📅 {getCastingDate(c)?.toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'}) || 'Sin fecha'}</Text>
                <Text style={styles.cardMeta}>🎭 {c.category || 'Casting'}</Text>
              </View>
              <TouchableOpacity style={styles.btn} onPress={() => openApplications(c)}>
                <Ionicons name="eye-outline" size={16} color="#000" />
                <Text style={styles.btnTxt}>Ver postulaciones</Text>
              </TouchableOpacity>
            </View>
          ))
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
  card:{width:'100%', flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:CARD, borderColor:GOLD, borderRadius:10, padding: 10, marginBottom:4},
  cardTitle:{fontSize:16, color:'#fff', fontWeight:'bold', marginBottom:5},
  cardMeta:{color:'#ccc', marginBottom:4},
  btn:{backgroundColor:GOLD, borderRadius:8, paddingVertical:6, paddingHorizontal:12, flexDirection:'row', alignItems:'center'},
  btnTxt:{color:'#000', fontWeight:'bold', marginLeft:6},
});

