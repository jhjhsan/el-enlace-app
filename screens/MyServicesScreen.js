import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Image,
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
} from 'firebase/firestore';

export default function MyServicesScreen() {
  const navigation = useNavigation();
  const [services, setServices] = useState([]);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    syncAndLoad();
  }, []);

  useFocusEffect(
    useCallback(() => {
      syncAndLoad();
    }, [])
  );

  // ---- helpers ----
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

  const normalizeLocal = (p) => ({
    ...p,
    type: (p?.type || 'servicio').toLowerCase(),
    creatorEmail: (p?.creatorEmail || '').trim().toLowerCase(),
    createdAt: tsToMs(p),
  });

  // Incluimos ._docId cuando viene de Firestore para poder borrar remoto
  const normalizeRemote = (docSnap) => {
    const d = docSnap.data() || {};
    return {
      ...d,
      _docId: docSnap.id,
      type: (d?.type || 'servicio').toLowerCase(),
      creatorEmail: (d?.creatorEmail || '').trim().toLowerCase(),
      createdAt: tsToMs(d),
    };
  };

  const dedupById = (arr) => {
    const seen = new Set();
    const out = [];
    for (const it of arr) {
      const key = it.id || it._docId || `${it.creatorEmail}_${it.title}_${it.createdAt}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(it);
      }
    }
    return out;
  };

  const loadBlacklist = async () => {
    const raw = await AsyncStorage.getItem('deletedServices');
    return raw ? JSON.parse(raw) : [];
  };

  const addToBlacklist = async (keys = []) => {
    const raw = await AsyncStorage.getItem('deletedServices');
    const current = raw ? JSON.parse(raw) : [];
    const set = new Set([...current, ...keys.filter(Boolean)]);
    await AsyncStorage.setItem('deletedServices', JSON.stringify([...set]));
  };

  const isBlacklisted = (item, blacklist) => {
    return (
      (item.id && blacklist.includes(item.id)) ||
      (item._docId && blacklist.includes(item._docId))
    );
  };

  const buildDocIdCandidates = (item) => {
    const emailSan = (item.creatorEmail || '').replace(/[^a-zA-Z0-9]/g, '_');
    const cands = [];
    if (item._docId) cands.push(item._docId); // el más confiable si viene de Firestore
    if (item.docId) cands.push(item.docId);
    if (item.id) cands.push(`${emailSan}_${String(item.id)}`); // patrón actual de saveServicePost
    // otros posibles patrones legados:
    cands.push(String(item.id || '')); // por si usaste id como docId
    return [...new Set(cands.filter(Boolean))];
  };

  const syncAndLoad = async () => {
    // usuario actual
    const userRaw = await AsyncStorage.getItem('userData');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const myEmail = (user?.email || '').trim().toLowerCase();
    const myId = user?.id || null;

    // blacklist
    const blacklist = await loadBlacklist();

    // 1) local
    const data = await AsyncStorage.getItem('posts');
    const local = data ? JSON.parse(data) : [];
    const localNorm = (Array.isArray(local) ? local : []).map(normalizeLocal);

    // 2) remoto (sin orderBy → sin índice)
    const remote = [];
    if (myEmail) {
      const qEmail = query(collection(db, 'services'), where('creatorEmail', '==', myEmail));
      const snapEmail = await getDocs(qEmail);
      snapEmail.forEach((d) => remote.push(normalizeRemote(d)));
    }
    if (myId) {
      const qId = query(collection(db, 'services'), where('creatorId', '==', myId));
      const snapId = await getDocs(qId);
      snapId.forEach((d) => remote.push(normalizeRemote(d)));
    }

    // 3) fusionar
    const merged = dedupById([...localNorm, ...remote]);

    // 4) filtrar dueño y blacklist
    const mine = merged.filter((p) => {
      const isService = p.type === 'servicio' || p.type === 'service';
      if (!isService) return false;
      if (isBlacklisted(p, blacklist)) return false;

      const ownerEmail = (p.creatorEmail || '').trim().toLowerCase();
      const ownerId = p.creatorId ?? null;
      const matchEmail = !!ownerEmail && ownerEmail === myEmail;
      const matchId = !!ownerId && !!myId && ownerId === myId;
      return matchEmail || matchId;
    });

    // 5) ordenar
    mine.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    setServices(mine);
  };

  const handleDelete = async (id) => {
    const item = services.find((s) => s.id === id);
    if (!item) return;

    const myEmail = (item?.creatorEmail || '').trim().toLowerCase();

    setLoadingDelete(true);
    try {
      // --- 1) BORRAR REMOTO POR DOCID CANDIDATOS ---
      const candidates = buildDocIdCandidates(item);
      let anyDeleted = false;
      for (const did of candidates) {
        try {
          await deleteDoc(fsDoc(db, 'services', did));
          anyDeleted = true;
        } catch {}
      }

      // --- 2) BORRAR REMOTO POR QUERY ---
      try {
        const qById = query(collection(db, 'services'), where('id', '==', String(id)));
        const snapById = await getDocs(qById);
        for (const d of snapById.docs) {
          await deleteDoc(d.ref);
          anyDeleted = true;
        }
      } catch {}

      try {
        const createdAtMs = Number(item.createdAt || item.createdAtMs || 0) || 0;
        if (myEmail && createdAtMs) {
          const qCombo = query(
            collection(db, 'services'),
            where('creatorEmail', '==', myEmail),
            where('createdAtMs', '==', createdAtMs)
          );
          const snapCombo = await getDocs(qCombo);
          for (const d of snapCombo.docs) {
            await deleteDoc(d.ref);
            anyDeleted = true;
          }
        }
      } catch {}

      // --- 3) BORRAR LOCAL (posts y posibles caches) ---
      try {
        const data = await AsyncStorage.getItem('posts');
        const posts = data ? JSON.parse(data) : [];
        const updated = posts.filter((p) => {
          if (p.id === id) return false;
          if (
            (p.creatorEmail || '').trim().toLowerCase() === myEmail &&
            Number(p.createdAt || p.createdAtMs || -1) === Number(item.createdAt || item.createdAtMs || -2)
          ) {
            return false;
          }
          return true;
        });
        await AsyncStorage.setItem('posts', JSON.stringify(updated));
      } catch {}

      // (opcional) otra caché
      try {
        const allSrvRaw = await AsyncStorage.getItem('allServices');
        if (allSrvRaw) {
          const allSrv = JSON.parse(allSrvRaw) || [];
          const filtered = allSrv.filter((p) => String(p.id) !== String(id));
          await AsyncStorage.setItem('allServices', JSON.stringify(filtered));
        }
      } catch {}

      // --- 4) BLACKLIST ---
      try {
        const blKeys = [item.id, item._docId, item.docId].filter(Boolean);
        await addToBlacklist(blKeys);
      } catch {}

      // --- 5) REFRESCAR LISTA ---
      await syncAndLoad();

      if (!anyDeleted) {
        console.log('ℹ️ No se encontró ningún doc remoto para eliminar (ya no existía o docId diferente).');
      }

      setShowSuccessModal(true);
    } finally {
      setLoadingDelete(false);
    }
  };

  const renderCard = (item, index) => {
    const img = item?.image || item?.photoUri || null;
    const isPromotional = item?.isPromotional === true;
    const createdDate =
      item?.date ||
      (item?.createdAt ? new Date(item.createdAt).toISOString().slice(0, 10) : null);

    return (
      <View
        key={item.id || `${item.creatorEmail}_${item.createdAt}` || index}
        style={[
          styles.card,
          isPromotional && styles.promotionalCard,
        ]}
      >
        {img && <Image source={{ uri: img }} style={styles.image} />}

        <Text style={styles.cardTitle}>{item.title || 'Servicio'}</Text>
        {!!item.description && <Text style={styles.cardText}>{item.description}</Text>}
        {!!item.category && <Text style={styles.cardText}>📂 {item.category}</Text>}
        {!!item.location && <Text style={styles.cardText}>📍 {item.location}</Text>}
        {!!createdDate && <Text style={styles.cardText}>📅 {createdDate}</Text>}
        {isPromotional && (
          <Text style={styles.promotionalText}>⭐ Publicación Promocional</Text>
        )}

        {/* Botón de editar (ACTIVO → abre EditPost con el servicio) */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditPost', { post: item, isService: true })}
        >
          <Text style={styles.editText}>✏️ Editar</Text>
        </TouchableOpacity>

        {/* Botón de eliminar */}
        <TouchableOpacity
          onPress={() => handleDelete(item.id)}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteText}>🗑️ Eliminar</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal Cargando */}
      <Modal visible={loadingDelete} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ActivityIndicator size="large" color="#D8A353" />
            <Text style={styles.modalTitle}>Eliminando servicio…</Text>
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
            <Text style={styles.modalMsg}>Tu servicio fue eliminado.</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setShowSuccessModal(false)}>
              <Text style={styles.modalBtnTxt}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📋 Mis Servicios</Text>

        {services.length === 0 ? (
          <Text style={styles.empty}>No has publicado servicios aún.</Text>
        ) : (
          services.map(renderCard)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // contenedor y encabezado (mantengo tus nombres pero adapto el look al del otro screen)
  screen: { flex: 1, backgroundColor: '#000' },
  backBtn: { position: 'absolute', top: 40, left: 20, zIndex: 2000 },
  container: { padding: 10, paddingBottom: 120, marginTop: 40 },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  empty: { color: '#999', textAlign: 'center', marginTop: 50 },

  // tarjeta estilo ViewPostsScreen
  card: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    
    borderRadius: 10,
    padding: 10,
    marginBottom: 5,
  },
  promotionalCard: {
    borderColor: '#FFD700',
    borderWidth: 1,
    backgroundColor: '#222',
  },
  image: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginBottom: 10,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardText: { color: '#ccc', fontSize: 14, marginBottom: 3 },
  promotionalText: {
    color: '#FFD700',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 5,
  },

  editButton: {
    marginTop: 10,
    paddingVertical: 6,
    backgroundColor: '#333',
    borderRadius: 5,
  },
  editText: {
    color: '#D8A353',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  deleteButton: {
    marginTop: 10,
    paddingVertical: 6,
    backgroundColor: '#550000',
    borderRadius: 5,
  },
  deleteText: { color: '#fff', textAlign: 'center' },

  // modales (igual que antes)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '80%',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 0.6,
    borderColor: '#D8A353',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#D8A353',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  modalMsg: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 0.6,
    borderColor: '#D8A353',
  },
  modalBtnTxt: {
    color: '#D8A353',
    fontWeight: '600',
  },
});
