// screens/PostulationHistoryScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Firestore
import { db } from '../src/firebase/firebaseConfig';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  documentId,
} from 'firebase/firestore';

export default function PostulationHistoryScreen() {
  const navigation = useNavigation();
  const [postulations, setPostulations] = useState([]);
  const [userEmail, setUserEmail] = useState('');

  // statusMap: { [castingId]: 'active' | 'missing' | 'unknown' }
  const [statusMap, setStatusMap] = useState({});
  const [checking, setChecking] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMsg, setModalMsg] = useState('');

  const normalizeEmail = (email = '') =>
    email.toLowerCase().trim().replace(/\s+/g, '').replace(/[^a-z0-9@._\-+]/gi, '');

  const toArray = (raw) => { try { return raw ? JSON.parse(raw) || [] : []; } catch { return []; } };

  const pickApplicantEmail = (p) =>
    normalizeEmail(p.applicantEmail || p.userEmail || p.email || p.profile?.email || '');

  const pickApplicantName = (p) =>
    p.name || p.profile?.name || p.profile?.fullName || p.profile?.displayName || 'Sin nombre';

  const pickCastingTitle = (p) =>
    p.castingTitle || p.title || p.casting?.title || 'Sin título';

  const pickTimestamp = (p) => {
    const t = p.timestamp || p.ts || p.createdAt || p.date;
    const n = typeof t === 'number' ? t : Date.parse(t || '');
    return isNaN(n) ? 0 : n;
  };

  const unifyShape = (p) => ({
    castingId: p.castingId || p.casting?.id || p.id || '',
    castingTitle: pickCastingTitle(p),
    applicantEmail: pickApplicantEmail(p),
    name: pickApplicantName(p),
    timestamp: pickTimestamp(p),
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

  const loadData = useCallback(async () => {
    try {
      const json = await AsyncStorage.getItem('userProfile');
      const user = json ? JSON.parse(json) : null;
      const myEmail = normalizeEmail(user?.email || '');
      setUserEmail(myEmail);

      const rawMy  = await AsyncStorage.getItem('myApplications');
      const rawApps = await AsyncStorage.getItem('applications');
      const rawAll = await AsyncStorage.getItem('allPostulations');

      const a = toArray(rawMy);
      const b = toArray(rawApps);
      const c = toArray(rawAll);

      const merged = [...a, ...b, ...c].map(unifyShape);
      const mine = merged.filter(p => p.applicantEmail && p.applicantEmail === myEmail);

      const unique = dedupByKey(mine, (p) => `${p.castingId}__${p.applicantEmail}__${p.timestamp}`);
      unique.sort((x, y) => y.timestamp - x.timestamp);

      console.log('PHIST loadData - unique count:', unique.length);
      console.log('PHIST loadData - first 5 items sample:', unique.slice(0, 5));

      setPostulations(unique);

      // Verificación robusta: por doc.id y por campo data.id
      const ids = Array.from(new Set(unique.map(u => String(u.castingId || '').trim()).filter(Boolean)));
      console.log('PHIST verify - ids to check:', ids);

      const map = await verifyExistenceRobust(ids);
      console.log('PHIST verify - final statusMap:', map);
      setStatusMap(map);
    } catch (e) {
      console.log('❌ PHIST loadData error:', e);
      setPostulations([]);
      setStatusMap({});
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation, loadData]);

  const verifyExistenceRobust = async (ids) => {
    if (!ids || ids.length === 0) return {};

    setChecking(true);
    const res = {};
    ids.forEach(id => { res[id] = 'unknown'; });

    try {
      const chunkSize = 10;

      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        console.log('PHIST verify - chunk (docId IN):', chunk);
        try {
          const q1 = query(collection(db, 'castings'), where(documentId(), 'in', chunk));
          const snap1 = await getDocs(q1);
          const found1 = new Set();

          console.log('PHIST verify - q1.size:', snap1.size);
          snap1.forEach(docSnap => {
            const id = docSnap.id;
            res[id] = 'active';
            found1.add(id);
            const data = docSnap.data() || {};
            console.log('PHIST verify - q1 found doc.id:', id, ' data.id:', data?.id);
          });

          const rest = chunk.filter(id => !found1.has(id));
          console.log('PHIST verify - not found by docId, trying field id IN:', rest);
          if (rest.length) {
            const q2 = query(collection(db, 'castings'), where('id', 'in', rest));
            const snap2 = await getDocs(q2);
            const matched = new Set();
            console.log('PHIST verify - q2.size:', snap2.size);
            snap2.forEach(docSnap => {
              const data = docSnap.data() || {};
              const fieldId = String(data.id || '').trim();
              matched.add(fieldId);
              res[fieldId] = 'active';
              console.log('PHIST verify - q2 matched fieldId:', fieldId, ' doc.id:', docSnap.id);
            });

            const rest2 = rest.filter(id => !matched.has(id));
            console.log('PHIST verify - fallback singles for:', rest2);
            for (const id of rest2) {
              try {
                const dref = doc(db, 'castings', id);
                const dsnap = await getDoc(dref);
                if (dsnap.exists()) {
                  res[id] = 'active';
                  console.log('PHIST verify - single doc(id) EXISTS:', id);
                  continue;
                }
                const q3 = query(collection(db, 'castings'), where('id', '==', id));
                const snap3 = await getDocs(q3);
                console.log('PHIST verify - single where(id==) size for', id, ':', snap3.size);
                if (!snap3.empty) {
                  res[id] = 'active';
                  console.log('PHIST verify - single where(id==) matched:', id);
                  continue;
                }
                res[id] = 'missing';
                console.log('PHIST verify - single NOT FOUND, marked missing:', id);
              } catch (singleErr) {
                console.log('PHIST verify - single check error for', id, singleErr);
                res[id] = 'unknown';
              }
            }
          }
        } catch (err) {
          console.log('PHIST verify - q1 batch error for chunk:', chunk, err);
          for (const id of chunk) {
            try {
              const dref = doc(db, 'castings', id);
              const dsnap = await getDoc(dref);
              if (dsnap.exists()) {
                res[id] = 'active';
                console.log('PHIST verify - fallback batch doc(id) EXISTS:', id);
                continue;
              }
              const q3 = query(collection(db, 'castings'), where('id', '==', id));
              const snap3 = await getDocs(q3);
              console.log('PHIST verify - fallback batch where(id==) size for', id, ':', snap3.size);
              if (!snap3.empty) {
                res[id] = 'active';
                console.log('PHIST verify - fallback batch where(id==) matched:', id);
                continue;
              }
              res[id] = 'missing';
              console.log('PHIST verify - fallback batch NOT FOUND, marked missing:', id);
            } catch (e) {
              console.log('PHIST verify - fallback batch single error for', id, e);
              res[id] = 'unknown';
            }
          }
        }
      }
    } catch (e) {
      console.log('❌ PHIST verify - general error:', e);
    } finally {
      setChecking(false);
    }

    return res;
  };

  const handleOpenModal = (msg) => {
    setModalMsg(msg || 'El casting no está disponible.');
    setModalVisible(true);
  };

  const handlePressCard = (item) => {
    const id = String(item?.castingId || '').trim();
    const st = statusMap[id] ?? 'unknown';
    console.log('PHIST press - item:', item);
    console.log('PHIST press - castingId:', id, 'status:', st);

    if (!id) return handleOpenModal('No se encontró el identificador del casting.');

    if (st === 'active' || st === 'unknown') {
      console.log('PHIST press - navigating to CastingDetail with id:', id);
      return navigation.navigate('CastingDetail', { castingId: id });
    }
    if (st === 'missing') {
      console.log('PHIST press - showing missing modal for id:', id);
      return handleOpenModal('El casting ya no existe o fue eliminado.');
    }
    // fallback
    console.log('PHIST press - fallback navigate id:', id);
    return navigation.navigate('CastingDetail', { castingId: id });
  };

  const renderBadge = (stateRaw) => {
    const state = stateRaw ?? 'unknown';
    const map = {
      active:   { text: 'Activo',       style: styles.badgeActive },
      missing:  { text: 'No disponible',style: styles.badgeMissing },
      unknown:  { text: 'Desconocido',  style: styles.badgeUnknown },
    };
    const cfg = map[state] || map.unknown;
    return (
      <View style={[styles.badge, cfg.style]}>
        <Text style={styles.badgeText}>{cfg.text}</Text>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📤 Historial de Postulaciones</Text>
        <Text style={styles.infoSmall}>{userEmail || ''}</Text>

        {postulations.length === 0 ? (
          <Text style={styles.info}>Aún no has enviado postulaciones desde este dispositivo.</Text>
        ) : (
          postulations.map((item, index) => {
            const id = String(item.castingId || '').trim();
            const st = statusMap[id] ?? 'unknown';
            console.log('PHIST render - card', { id, st });

            const disabled = st === 'missing';
            return (
              <TouchableOpacity
                key={`${item.castingId}_${index}_${item.timestamp}`}
                style={[styles.card, disabled && styles.cardDisabled]}
                activeOpacity={0.85}
                onPress={() => handlePressCard(item)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.castingTitle} numberOfLines={2}>
                    {item.castingTitle}
                  </Text>
                  {renderBadge(st)}
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>🧑 Postulaste como</Text>
                  <Text style={styles.value} numberOfLines={1}>{item.name}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>📧 Email</Text>
                  <Text style={styles.value} numberOfLines={1}>{item.applicantEmail}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>📅 Fecha</Text>
                  <Text style={styles.value}>
                    {item.timestamp ? new Date(item.timestamp).toLocaleString('es-CL') : 'N/A'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={modalVisible || checking}
        transparent
        animationType="fade"
        onRequestClose={() => !checking && setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {checking ? (
              <>
                <ActivityIndicator size="small" color="#D8A353" />
                <Text style={[styles.modalText, { marginTop: 8 }]}>Verificando castings...</Text>
              </>
            ) : (
              <>
                <Text style={styles.modalText}>{modalMsg}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalBtn}>
                  <Text style={styles.modalBtnText}>Aceptar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  backBtn: { position: 'absolute', top: 40, left: 20, zIndex: 1000 },
  container: { padding: 10, paddingBottom: 100 },
  title: {
    fontSize: 19,
    color: '#D8A353',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 50,
    marginBottom: 0,
  },
  infoSmall: { color: '#777', fontSize: 11, textAlign: 'center', marginBottom: 12 },
  info: { color: '#aaa', fontSize: 13, textAlign: 'center', marginTop: 22 },

  card: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 5,
    alignSelf: 'center',
    width: '100%',
  },
  cardDisabled: { opacity: 0.7 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  castingTitle: {
    flex: 1,
    color: '#e6e6e6',
    fontSize: 13,
    fontWeight: '700',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  label: { color: '#D8A353', fontWeight: '600', fontSize: 11 },
  value: { color: '#ccc', fontSize: 11, flexShrink: 1, textAlign: 'right' },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
    borderWidth: 0.8,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#000' },
  badgeActive: { backgroundColor: '#D8A353', borderColor: '#E4BD71' },
  badgeMissing: { backgroundColor: '#c76a6a', borderColor: '#e29a9a' },
  badgeUnknown: { backgroundColor: '#666', borderColor: '#999' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '78%',
    backgroundColor: '#161616',
    borderRadius: 10,
    padding: 16,
    borderWidth: 0.8,
    borderColor: '#D8A353',
    alignItems: 'center',
  },
  modalText: { color: '#ddd', fontSize: 14, textAlign: 'center' },
  modalBtn: {
    marginTop: 12,
    backgroundColor: '#D8A353',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalBtnText: { color: '#000', fontWeight: '700' },
});
