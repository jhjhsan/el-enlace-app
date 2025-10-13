// screens/MyFocusScreen.js (con modal de confirmación)
import React, { useEffect, useState, useCallback, useRef, memo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { db } from '../src/firebase/firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  doc as fsDoc,
  deleteDoc,
  limit,
} from 'firebase/firestore';

const FOCUS_COLS = ['focus', 'focuses', 'focusGroups', 'focus_public'];
const REMOTE_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutos

const tsToMs = (p) => {
  if (typeof p?.createdAt === 'number') return p.createdAt;
  if (p?.createdAtTS?.seconds) {
    return (
      p.createdAtTS.seconds * 1000 +
      Math.floor((p.createdAtTS.nanoseconds || 0) / 1e6)
    );
  }
  if (p?.createdAtMs) return p.createdAtMs;
  return 0;
};

const normalizeLocal = (f) => ({
  ...f,
  authorEmail: (f?.authorEmail || '').trim().toLowerCase(),
  createdAt: tsToMs(f),
});

const normalizeRemote = (docSnap) => {
  const d = docSnap.data() || {};
  return {
    ...d,
    _docId: docSnap.id,
    authorEmail: (d?.authorEmail || '').trim().toLowerCase(),
    createdAt: tsToMs(d),
  };
};

const dedupById = (arr) => {
  const seen = new Set();
  const out = [];
  for (const it of arr) {
    const key =
      it.id ||
      it._docId ||
      `${it.authorEmail}_${it.title || ''}_${it.createdAt || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(it);
    }
  }
  return out;
};

const FocusItem = memo(function FocusItem({ item, onView, onEdit, onDeletePress }) {
  const createdDate =
    item?.date ||
    (item?.createdAt ? new Date(item.createdAt).toISOString().slice(0, 10) : null);
  const paymentLine = item?.payment
    ? `${item.payment}${item.paymentMethod ? ` (${item.paymentMethod})` : ''}`
    : '—';

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.title || 'Focus'}
      </Text>

      {!!item.requirements && (
        <Text style={styles.cardText} numberOfLines={2}>👤 {item.requirements}</Text>
      )}
      {!!item.dateTime && <Text style={styles.cardText}>🗓️ {item.dateTime}</Text>}
      <Text style={styles.cardText}>💰 {paymentLine}</Text>
      {!!createdDate && <Text style={styles.cardText}>📅 {createdDate}</Text>}

      <TouchableOpacity style={styles.editButton} onPress={() => onEdit(item)}>
        <Text style={styles.editText}>✏️ Editar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteButton} onPress={() => onDeletePress(item)}>
        <Text style={styles.deleteText}>🗑️ Eliminar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.viewButton} onPress={() => onView(item)}>
        <Text style={styles.viewText}>👁️ Ver</Text>
      </TouchableOpacity>
    </View>
  );
});

export default function MyFocusScreen() {
  const navigation = useNavigation();
  const [focuses, setFocuses] = useState([]);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // 👇 nuevo: modal de confirmación
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const lastLoadRef = useRef(0);
  const loadingRef = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  const loadLocalFirst = useCallback(async () => {
    const data = await AsyncStorage.getItem('focusList');
    const local = data ? JSON.parse(data) : [];
    const localNorm = (Array.isArray(local) ? local : []).map(normalizeLocal);

    const profRaw = await AsyncStorage.getItem('userProfile');
    const userRaw = profRaw || (await AsyncStorage.getItem('userData'));
    const user = userRaw ? JSON.parse(userRaw) : null;
    const myEmail = (user?.email || '').trim().toLowerCase();
    const myId = user?.id || null;

    const mine = localNorm.filter((f) => {
      const ownerEmail = (f.authorEmail || '').trim().toLowerCase();
      const ownerId = f.authorId ?? null;
      return (ownerEmail && ownerEmail === myEmail) || (ownerId && myId && ownerId === myId);
    });

    mine.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (isMounted.current) setFocuses(mine);

    return { myEmail, myId, current: mine };
  }, []);

  const fetchRemoteInParallel = useCallback(async (myEmail, myId) => {
    const tasks = [];
    for (const col of FOCUS_COLS) {
      if (myEmail) {
        tasks.push(getDocs(query(collection(db, col), where('authorEmail', '==', myEmail), limit(200))));
      }
      if (myId) {
        tasks.push(getDocs(query(collection(db, col), where('authorId', '==', myId), limit(200))));
      }
    }
    const settled = await Promise.allSettled(tasks);
    const remote = [];
    settled.forEach((res) => {
      if (res.status === 'fulfilled') {
        res.value.forEach((d) => remote.push(normalizeRemote(d)));
      }
    });
    return remote;
  }, []);

  const mergeAndSet = useCallback((currentLocal, remote) => {
    const merged = dedupById([...currentLocal, ...remote]);
    merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (isMounted.current) setFocuses(merged);
  }, []);

  const syncAndLoad = useCallback(async () => {
    const now = Date.now();
    if (loadingRef.current || now - lastLoadRef.current < 600) return; // debounce
    loadingRef.current = true;
    lastLoadRef.current = now;

    try {
      const { myEmail, myId, current } = await loadLocalFirst();

      const cacheKey = `focus_remote_cache_${myEmail || myId || 'anon'}`;
      const cacheRaw = await AsyncStorage.getItem(cacheKey);
      const cache = cacheRaw ? JSON.parse(cacheRaw) : null;
      if (cache?.ts && now - cache.ts < REMOTE_CACHE_TTL_MS && Array.isArray(cache.items)) {
        mergeAndSet(current, cache.items);
      }

      const remote = await fetchRemoteInParallel(myEmail, myId);
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), items: remote }));
      mergeAndSet(current, remote);
    } catch (e) {
      console.log('syncAndLoad error:', e?.message || e);
    } finally {
      loadingRef.current = false;
    }
  }, [loadLocalFirst, fetchRemoteInParallel, mergeAndSet]);

  useEffect(() => { syncAndLoad(); }, [syncAndLoad]);
  useFocusEffect(useCallback(() => { syncAndLoad(); }, [syncAndLoad]));

  const buildDocIdCandidates = (item) => {
    const emailSan = (item.authorEmail || '').replace(/[^a-zA-Z0-9]/g, '_');
    const cands = [];
    if (item._docId) cands.push(item._docId);
    if (item.docId) cands.push(item.docId);
    if (item.id) cands.push(`${emailSan}_${String(item.id)}`);
    cands.push(String(item.id || ''));
    return [...new Set(cands.filter(Boolean))];
  };

  // 👉 abre modal de confirmación
  const onDeletePress = useCallback((item) => {
    setPendingDelete(item);
    setConfirmVisible(true);
  }, []);

  // ejecuta borrado real
  const doDelete = useCallback(async (id) => {
    const item = focuses.find((s) => s.id === id);
    if (!item) return;
    const myEmail = (item?.authorEmail || '').trim().toLowerCase();

    setConfirmVisible(false);
    setLoadingDelete(true);
    try {
      let anyDeleted = false;
      const candidates = buildDocIdCandidates(item);
      await Promise.all(
        FOCUS_COLS.flatMap((col) =>
          candidates.map(async (did) => {
            try { await deleteDoc(fsDoc(db, col, did)); anyDeleted = true; } catch {}
          })
        )
      );

      await Promise.all(
        FOCUS_COLS.map(async (col) => {
          try {
            const snap = await getDocs(query(collection(db, col), where('id', '==', String(id))));
            await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
            if (!snap.empty) anyDeleted = true;
          } catch {}
        })
      );

      const createdAtMs = Number(item.createdAt || item.createdAtMs || 0) || 0;
      if (myEmail && createdAtMs) {
        await Promise.all(
          FOCUS_COLS.map(async (col) => {
            try {
              const snap = await getDocs(
                query(
                  collection(db, col),
                  where('authorEmail', '==', myEmail),
                  where('createdAtMs', '==', createdAtMs)
                )
              );
              await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
              if (!snap.empty) anyDeleted = true;
            } catch {}
          })
        );
      }

      try {
        const data = await AsyncStorage.getItem('focusList');
        const list = data ? JSON.parse(data) : [];
        const updated = list.filter((f) => f.id !== id);
        await AsyncStorage.setItem('focusList', JSON.stringify(updated));
      } catch {}

      await syncAndLoad();
      if (!anyDeleted) console.log('ℹ️ No se encontró doc remoto para eliminar.');
      setShowSuccessModal(true);
    } finally {
      setLoadingDelete(false);
      setPendingDelete(null);
    }
  }, [focuses, syncAndLoad]);

  const onView = useCallback((item) => {
    navigation.navigate('FocusDetailScreen', { focus: item });
  }, [navigation]);

  const onEdit = useCallback((item) => {
    navigation.navigate('PublishFocusScreen', { mode: 'edit', focus: item });
  }, [navigation]);

  const keyExtractor = useCallback((item, idx) => String(item.id || item._docId || idx), []);
  const renderItem = useCallback(({ item }) => (
    <FocusItem item={item} onView={onView} onEdit={onEdit} onDeletePress={onDeletePress} />
  ), [onView, onEdit, onDeletePress]);
  const getItemLayout = useCallback((_, index) => ({ length: 148, offset: 148 * index, index }), []);

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal de confirmación de borrado */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setConfirmVisible(false); setPendingDelete(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <Ionicons name="warning-outline" size={40} color="#D8A353" style={{ marginBottom: 8 }} />
            <Text style={styles.confirmTitle}>¿Eliminar focus?</Text>
            <Text style={styles.confirmMsg}>
              {`Vas a borrar "${pendingDelete?.title || 'este focus'}". Esta acción no se puede deshacer.`}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.cancelBtn]}
                onPress={() => { setConfirmVisible(false); setPendingDelete(null); }}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.deleteBtn]}
                onPress={() => doDelete(pendingDelete?.id)}
              >
                <Text style={styles.deleteBtnText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Cargando */}
      <Modal visible={loadingDelete} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ActivityIndicator size="large" color="#D8A353" />
            <Text style={styles.modalTitle}>Eliminando focus…</Text>
            <Text style={styles.modalMsg}>Por favor espera.</Text>
          </View>
        </View>
      </Modal>

      {/* Modal Éxito */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Eliminado exitosamente</Text>
            <Text style={styles.modalMsg}>Tu focus fue eliminado.</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setShowSuccessModal(false)}>
              <Text style={styles.modalBtnTxt}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <FlatList
        data={focuses}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.container}
        ListHeaderComponent={<Text style={styles.title}>📋 Mis Focus</Text>}
        ListEmptyComponent={<Text style={styles.empty}>No has publicado focus aún.</Text>}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
        getItemLayout={getItemLayout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  backBtn: { position: 'absolute', top: 40, left: 20, zIndex: 2000 },
  container: {padding: 8, paddingBottom: 120, paddingTop: 60 },
  title: {
    color: '#D8A353', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 12,
  },
  empty: { color: '#999', textAlign: 'center', marginTop: 40 },

  card: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  cardText: { color: '#ccc', fontSize: 14, marginBottom: 3 },

  editButton: { marginTop: 8, paddingVertical: 6, backgroundColor: '#333', borderRadius: 6 },
  editText: { color: '#D8A353', textAlign: 'center', fontWeight: 'bold' },

  deleteButton: { marginTop: 8, paddingVertical: 6, backgroundColor: '#550000', borderRadius: 6 },
  deleteText: { color: '#fff', textAlign: 'center' },

  viewButton: { marginTop: 8, paddingVertical: 6, backgroundColor: '#222', borderRadius: 6 },
  viewText: { color: '#D8A353', textAlign: 'center', fontWeight: 'bold' },

  // Modales base
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center',
  },
  modalBox: {
    width: '80%', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16,
    borderWidth: 0.6, borderColor: '#D8A353', alignItems: 'center',
  },
  modalTitle: { color: '#D8A353', fontWeight: 'bold', fontSize: 16, marginTop: 12, marginBottom: 6, textAlign: 'center' },
  modalMsg: { color: '#ccc', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  modalBtn: {
    alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8,
    borderWidth: 0.6, borderColor: '#D8A353',
  },
  modalBtnTxt: { color: '#D8A353', fontWeight: '600' },

  // Modal de confirmación
  confirmBox: {
    width: '86%', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 18,
    borderWidth: 0.8, borderColor: '#D8A353', alignItems: 'center',
  },
  confirmTitle: { color: '#D8A353', fontWeight: 'bold', fontSize: 18, marginBottom: 4, textAlign: 'center' },
  confirmMsg: { color: '#ddd', fontSize: 14, textAlign: 'center', marginBottom: 14 },
  confirmActions: { flexDirection: 'row', gap: 10, width: '100%' },
  confirmBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#000', borderWidth: 1, borderColor: '#D8A353' },
  cancelText: { color: '#D8A353', fontWeight: 'bold' },
  deleteBtn: { backgroundColor: '#550000' },
  deleteBtnText: { color: '#fff', fontWeight: 'bold' },
});
