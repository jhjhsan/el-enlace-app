// screens/NotificationScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  Feather,
} from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { useFocusEffect } from '@react-navigation/native';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { CommonActions } from '@react-navigation/native';
import eventBus from '../utils/eventBus';
import { useNotification } from '../contexts/NotificationContext';

// 🔒 Cache de conversación a nivel módulo (persiste entre renders)
// Clave no direccional: 'a@b.com|b@c.com'
const __convExistCache = new Map();

const icons = {
  mensaje: '📩',
  chat: '💬',
  casting: '🎬',
  reseña: '⭐',
  terminos: '⚙️',
  servicio: '🛠️',
  focus: '🎯',
};

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState([]);
  const [membershipType, setMembershipType] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorNotificationId, setErrorNotificationId] = useState(null);
  const [modalMessage, setModalMessage] = useState('');
  const [nameByEmail, setNameByEmail] = useState({});
  const { recalculateUnreadCount } = useNotification();

  const navigation = useNavigation();
  const db = getFirestore(getApp());

  // 🧠 IDs de mis propios focus (para filtrar self-notifs aunque no traigan email)
  const myFocusIdsRef = React.useRef(new Set());
  const [myFocusReady, setMyFocusReady] = useState(false);

  // ── Guardado local con debounce
  let __saveTimer;
  const queueSaveNotifications = (userId, getList) => {
    try { clearTimeout(__saveTimer); } catch {}
    __saveTimer = setTimeout(async () => {
      try {
        const list = typeof getList === 'function' ? getList() : [];
        await AsyncStorage.setItem(`notifications_${userId}`, JSON.stringify(list));
      } catch (e) {
        console.warn('Persist notifications failed', e);
      }
    }, 300);
  };

  // 🧹 Control de ejecución única para limpieza
  const cleaningRef = React.useRef(false);
  const cleanTimerRef = React.useRef(null);

  const openServiceFromNotification = (serviceId) => {
    if (!serviceId) return;
    navigation.navigate('ServiceDetailScreen', { serviceId });
  };

  // ✅ Marcar todas como leídas (UI optimista + batch)
  const markAllNotificationsAsRead = async (userEmail) => {
    try {
      const normalizedEmail = normalizeEmail(userEmail);
      const notiRef = collection(db, `notifications/${normalizedEmail}/items`);
      const snapshot = await getDocs(notiRef);

      // 1) UI optimista
      setNotifications((prev) => prev.map(n => ({ ...n, read: true })));

      // 2) Firestore en batch
      const batch = writeBatch(db);
      let count = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
        if (data.read !== true) {
          batch.update(docSnap.ref, { read: true });
          count++;
        }
      });
      if (count > 0) await batch.commit();

      // 3) Persistencia local (debounced)
      const jsonUser = await AsyncStorage.getItem('userProfile');
      const user = jsonUser ? JSON.parse(jsonUser) : null;
      if (user?.id) queueSaveNotifications(user.id, () => notifications);
      try { await recalculateUnreadCount?.(user.id); } catch {}
    } catch (error) {
      console.error('❌ Error marcando todas como leídas:', error);
    }
  };

  const normalizeEmail = (email) => {
    if (!email || typeof email !== 'string') return '';
    return email
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9@._\-+]/gi, '')
      .replace(/@{2,}/g, '@');
  };

  // ⛔️ Detecta si la notificación de FOCUS fue creada por el mismo usuario (autor)
  const isSelfFocus = (data, currentNormalized) => {
    if (!data || data.type !== 'focus') return false;
    const candidates = [
      data.sender,
      data.ownerEmail,
      data.creatorEmail,
      data.createdBy,
      data.publishedBy,
      data.userEmail,
      data.authorEmail,
      data.publisherEmail,
      data.focusOwnerEmail,
    ]
      .filter(Boolean)
      .map((e) => normalizeEmail(e));
    return candidates.includes(currentNormalized);
  };

  // 👀 Listener en vivo de mis propios Focus para tener sus IDs
  const listenMyFocus = (userEmail) => {
    const normalized = normalizeEmail(userEmail);
    const ref = collection(db, 'focus');
    const unsubs = [];

    const queries = [
      query(ref, where('ownerEmail', '==', normalized)),
      query(ref, where('creatorEmail', '==', normalized)),
      query(ref, where('createdBy', '==', normalized)),
      query(ref, where('publishedBy', '==', normalized)),
      query(ref, where('userEmail', '==', normalized)),
      query(ref, where('authorEmail', '==', normalized)),
      query(ref, where('publisherEmail', '==', normalized)),
      query(ref, where('focusOwnerEmail', '==', normalized)),
    ];

    for (const qy of queries) {
      try {
        const unsub = onSnapshot(qy, (snap) => {
          const current = new Set(myFocusIdsRef.current);
          snap.docChanges().forEach((chg) => {
            const id = chg.doc.id;
            if (chg.type === 'removed') current.delete(id);
            else current.add(id);
          });
          myFocusIdsRef.current = current;
          setMyFocusReady(true);
        });
        unsubs.push(unsub);
      } catch {}
    }

    return () => {
      unsubs.forEach((u) => { try { u(); } catch {} });
    };
  };

  const toStr = (v) => {
    if (typeof v === 'string') return v;
    if (v == null) return '';
    try { return String(v); } catch { return ''; }
  };

  const loadNameIndex = async () => {
    try {
      const keys = ['allProfiles', 'allProfilesElite', 'allProfilesPro', 'allProfilesFree'];
      const map = {};
      for (const k of keys) {
        const raw = await AsyncStorage.getItem(k);
        if (!raw) continue;
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.forEach(p => {
            const em = normalizeEmail(p?.email);
            if (em) {
              map[em] =
                p?.name ||
                p?.agencyName ||
                p?.displayName ||
                p?.fullName ||
                p?.companyName ||
                em;
            }
          });
        }
      }
      setNameByEmail(map);
    } catch (_) {}
  };

  const checkConversationExists = async (senderEmail, userEmail) => {
    try {
      const normalizedUser = normalizeEmail(userEmail);
      const normalizedSender = normalizeEmail(senderEmail);

      // Cache no direccional
      const [a, b] = [normalizedUser, normalizedSender].sort();
      const cacheKey = `${a}|${b}`;
      if (__convExistCache.has(cacheKey)) {
        return __convExistCache.get(cacheKey);
      }

      // 🔁 Si está en blacklist, lo quitamos
      const blacklistKey = `deletedConversations_${normalizedUser}`;
      const blacklistJson = await AsyncStorage.getItem(blacklistKey);
      let blacklist = blacklistJson ? JSON.parse(blacklistJson) : [];

      const wasBlacklisted = blacklist.find((item) => item.email === normalizedSender);
      if (wasBlacklisted) {
        blacklist = blacklist.filter((item) => item.email !== normalizedSender);
        await AsyncStorage.setItem(blacklistKey, JSON.stringify(blacklist));
      }

      const qy = query(
        collection(db, 'mensajes'),
        where('from', 'in', [normalizedUser, normalizedSender]),
        where('to', 'in', [normalizedUser, normalizedSender])
      );
      const snapshot = await getDocs(qy);
      const existsInFirestore = !snapshot.empty;

      __convExistCache.set(cacheKey, existsInFirestore);

      if (existsInFirestore) {
        const json = await AsyncStorage.getItem('professionalMessages');
        let allMessages = json ? JSON.parse(json) : [];
        const conversationExists = allMessages.some(
          (msg) =>
            (msg.from === normalizedUser && msg.to === normalizedSender) ||
            (msg.from === normalizedSender && msg.to === normalizedUser)
        );

        if (!conversationExists) {
          const firestoreMessages = snapshot.docs.map((docx) => ({
            sender: docx.data().from,
            text: docx.data().text,
            timestamp: docx.data().timestamp,
            read: docx.data().read || false,
          }));
          allMessages.push({
            id: `${normalizedUser}_${normalizedSender}`,
            from: normalizedUser,
            to: normalizedSender,
            user: normalizedSender,
            messages: firestoreMessages,
            archived: false,
          });
          const safe = (allMessages || []).map((conv) => ({
            ...conv,
            messages: (conv.messages || []).slice(-50),
          }));
          await AsyncStorage.setItem('professionalMessages', JSON.stringify(safe));
        }
        return true;
      }

      const json = await AsyncStorage.getItem('professionalMessages');
      let allMessages = json ? JSON.parse(json) : [];
      const initialLength = allMessages.length;
      allMessages = allMessages.filter(
        (msg) =>
          !(
            (msg.from === normalizedUser && msg.to === normalizedSender) ||
            (msg.from === normalizedSender && msg.to === normalizedUser)
          )
      );
      if (allMessages.length < initialLength) {
        try {
          const seen = new Set();
          const safeMessages = allMessages
            .filter((msg) => {
              const key = msg.id || `${msg.from}_${msg.to}_${msg.timestamp?.seconds || msg.timestamp}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            })
            .sort((a, b) => {
              const aTime = a.timestamp?.seconds || 0;
              const bTime = b.timestamp?.seconds || 0;
              return bTime - aTime;
            })
            .slice(0, 60)
            .reverse();

          await AsyncStorage.setItem('professionalMessages', JSON.stringify(safeMessages));
        } catch (error) {
          console.error('❌ Error guardando mensajes:', error);
        }
      }
      return false;
    } catch (error) {
      console.error('❌ Error verificando conversación:', error);
      return false;
    }
  };

  const cleanObsoleteNotifications = async (userEmail) => {
    try {
      if (cleaningRef.current) return;
      cleaningRef.current = true;

      const normalizedEmail = normalizeEmail(userEmail);
      const notiRef = collection(db, `notifications/${normalizedEmail}/items`);
      const snapshot = await getDocs(notiRef);

      const batchSize = 8;
      const docsToCheck = snapshot.docs.slice(0, batchSize);
      const deletions = [];

      for (const docSnap of docsToCheck) {
        const data = docSnap.data() || {};

        // ⛔️ Borra notificaciones de focus creadas por el mismo usuario
        const isMineByEmail = isSelfFocus(data, normalizedEmail);
        const isMineById = data.type === 'focus' && data.focusId && myFocusIdsRef.current.has(data.focusId);
        if (isMineByEmail || isMineById) {
          deletions.push(deleteDoc(docSnap.ref));
          continue;
        }

        if (data.type === 'mensaje' && data.sender) {
          const conversationExists = await checkConversationExists(data.sender, userEmail);
          if (!conversationExists) {
            deletions.push(deleteDoc(docSnap.ref));
          }
        }
      }
      await Promise.all(deletions);

      // Limpia notificaciones locales obsoletas
      let local = await AsyncStorage.getItem(`notifications_${userEmail}`);
      let localNotis = local ? JSON.parse(local) : [];
      const remaining = snapshot.docs.map(d => (d.data() || {}).id);
      localNotis = localNotis
        .filter(n => remaining.includes(n.id))
        .filter(n => {
          if (n.type !== 'focus') return true;
          const byEmail = normalizeEmail(n.sender) === normalizedEmail;
          const byId = n.focusId && myFocusIdsRef.current.has(n.focusId);
          return !(byEmail || byId);
        });
      await AsyncStorage.setItem(`notifications_${userEmail}`, JSON.stringify(localNotis));

      if (snapshot.docs.length > batchSize) {
        if (cleanTimerRef.current) clearTimeout(cleanTimerRef.current);
        cleanTimerRef.current = setTimeout(() => cleanObsoleteNotifications(userEmail), 500);
      }
    } catch (error) {
      console.error('❌ Error limpiando notificaciones obsoletas:', error);
    } finally {
      cleaningRef.current = false;
    }
  };

  const debugAsyncStorage = async () => {
    try {
      await AsyncStorage.getItem('professionalMessages');
      const userJson = await AsyncStorage.getItem('userProfile');
      const user = userJson ? JSON.parse(userJson) : null;
      if (user) {
        await AsyncStorage.getItem(`notifications_${user.id}`);
      }
    } catch (error) {
      console.error('❌ Error inspeccionando AsyncStorage:', error);
    }
  };

  // === helper de fecha fija (incluye createdAt para focus)
  const stableDateForNotif = ({ data, prev, firstSeen, notifId }) => {
    const tsServer    = (data?.timestamp && typeof data.timestamp.toDate === 'function') ? data.timestamp.toDate() : null;
    const tsCreatedAt = (data?.createdAt && typeof data.createdAt.toDate === 'function') ? data.createdAt.toDate() : null;
    const tsMs        = data?.createdAtMs ? new Date(Number(data.createdAtMs)) : null;

    const primary = tsServer || tsCreatedAt || tsMs || null;

    let dateIso = prev?.date || (primary ? primary.toISOString() : null);
    if (!dateIso) {
      if (!firstSeen[notifId]) {
        firstSeen[notifId] = new Date().toISOString();
      }
      dateIso = firstSeen[notifId];
    }

    return { primary, dateIso };
  };

  // 🆕 ✅ Verifica si un focus existe; si hay "permission-denied" o error de red, asumimos que existe
  const focusExists = async (fid) => {
    if (!fid) return false;
    const COLS = ['focus', 'focuses'];
    // 1) intento directo por docId
    for (const col of COLS) {
      try {
        const s = await getDoc(doc(db, col, String(fid)));
        if (s.exists()) return true;
      } catch (e) {
        const code = e?.code || '';
        if (code === 'permission-denied' || code === 'unavailable' || code === 'deadline-exceeded') {
          return true;
        }
      }
    }
    // 2) búsqueda por campo id
    for (const col of COLS) {
      try {
        const s1 = await getDocs(query(collection(db, col), where('id', '==', String(fid))));
        if (!s1.empty) return true;
      } catch (e) {
        const code = e?.code || '';
        if (code === 'permission-denied' || code === 'unavailable' || code === 'deadline-exceeded') {
          return true;
        }
      }
    }
    return false;
  };

  // 🔧🔧 BACKFILL requerido: marcar en Firestore como leídas las notificaciones viejas (no toca UI)
  async function backfillMarkOldAsRead(userEmail, days = 7) {
    try {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const colRef = collection(db, `notifications/${normalizeEmail(userEmail)}/items`);
      const snap = await getDocs(colRef);
      const batch = writeBatch(db);
      let count = 0;
      snap.forEach(docSnap => {
        const d = docSnap.data() || {};
        const ts =
          (d.timestamp && typeof d.timestamp.toDate === 'function' && d.timestamp.toDate()) ||
          (d.createdAt && typeof d.createdAt.toDate === 'function' && d.createdAt.toDate()) ||
          (d.createdAtMs ? new Date(Number(d.createdAtMs)) : null);
        const ms = ts ? ts.getTime() : 0;
        if (ms && ms < cutoff && d.read !== true) {
          batch.update(docSnap.ref, { read: true });
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    } catch (e) {
      console.warn('backfillMarkOldAsRead failed', e);
    }
  }

  // 🆕 Solo añade/actualiza el TEXTO de tarjetas "casting" usando el casting actual
  const hydrateCastingNotifs = async (list) => {
    try {
      const ids = Array.from(
        new Set(
          list.filter(n => n.type === 'casting' && n.castingId).map(n => String(n.castingId))
        )
      );
      if (ids.length === 0) return list;

      const byId = new Map();
      for (const id of ids) {
        try {
          const snap = await getDoc(doc(db, 'castings', id)); // ← colección común: 'castings'
          if (snap.exists()) {
            const c = snap.data() || {};
            const title =
              toStr(c.title) ||
              toStr(c.titulo) ||
              toStr(c.projectTitle) ||
              toStr(c.castingTitle);
            const desc =
              toStr(c.shortDescription) ||
              toStr(c.description) ||
              toStr(c.descripcion);
            byId.set(id, { title, desc });
          }
        } catch {
          // Silencioso: si falla, dejamos lo que vino en la notificación
        }
      }

      if (byId.size === 0) return list;

      return list.map(n => {
        if (n.type !== 'casting' || !n.castingId) return n;
        const fresh = byId.get(String(n.castingId));
        if (!fresh) return n;

        const msgTitle = 'Nuevo Casting';
        const body = fresh.title || fresh.desc || '';
        return {
          ...n,
          title: msgTitle,                               // línea 1
          message: body ? `${msgTitle}: ${body}` : msgTitle, // línea 2 toma el body de message
        };
      });
    } catch {
      return list;
    }
  };

  const fetchUser = async () => {
    try {
      const json = await AsyncStorage.getItem('userProfile');
      const user = json ? JSON.parse(json) : null;
      if (!user) {
        console.log('❌ Usuario no encontrado en AsyncStorage');
        return;
      }

      setMembershipType(user?.membershipType || 'free');
      await loadNameIndex();
      await debugAsyncStorage();

      const normalizedEmail = normalizeEmail(user.email);
      const pendingKey = `pendingNotifications_${normalizedEmail}`;

      // 🔔 Escuchar mis propios Focus
      const stopListenMyFocus = listenMyFocus(user.email);

      // 🔧 backfill
      await backfillMarkOldAsRead(user.email, 7);

      await AsyncStorage.getItem(pendingKey); // lectura por si la necesitas

      const itemsRef = collection(db, `notifications/${normalizedEmail}/items`);

      const unsubscribe = onSnapshot(itemsRef, async (snapshot) => {
        const blacklistKey = `deletedNotificationIds_${user.id}`;
        const blacklistJson = await AsyncStorage.getItem(blacklistKey);
        const blacklist = blacklistJson ? JSON.parse(blacklistJson) : [];

        // previo/firstSeen
        const prevJson = await AsyncStorage.getItem(`notifications_${user.id}`);
        const prevNotis = prevJson ? JSON.parse(prevJson) : [];

        const firstSeenKey = `notifFirstSeen_${user.id}`;
        const firstSeenJson = await AsyncStorage.getItem(firstSeenKey);
        const firstSeen = firstSeenJson ? JSON.parse(firstSeenJson) : {};

        const mineIds = myFocusIdsRef.current;
        const myEmailN = normalizeEmail(user.email);

        const fireDocs = snapshot.docs
          // ⛔️ filtra self-focus
          .filter((docSnap) => {
            const data = docSnap.data() || {};
            if (data.type !== 'focus') return true;
            const selfByEmail = isSelfFocus(data, myEmailN);
            const fid = data.focusId || null;
            const selfById = fid && mineIds.has(fid);
            return !(selfByEmail || selfById);
          })
          .map((docSnap) => {
            const data = docSnap.data() || {};
            const notifId = data.id || `fire_${docSnap.id}`;
            const prev = prevNotis.find(p => p.id === notifId);

            const { primary, dateIso } = stableDateForNotif({ data, prev, firstSeen, notifId });

            const msgTitle = toStr(data.title || '🔔');
            const msgBody  = toStr(data.body ?? data.message ?? '');

            return {
              id: notifId,
              firebaseId: docSnap.id,
              icon: data.type || 'terminos',
              type: data.type,
              chatId: data.chatId,
              castingId: data.castingId,
              focusId: data.focusId || null,
              serviceId: data.serviceId,
              sender: data.sender || null,
              title: toStr(data.title || ''),

              // referencia no visible
              timestamp: primary ? primary.toISOString() : (prev?.timestamp || null),

              // fecha visible fija
              date: dateIso,

              message: `${msgTitle}${msgBody ? ': ' + msgBody : ''}`,
              read: (prev?.read === true) || (data.read === true),
            };
          })
          // últimos 10 días si hay timestamp
          .filter((notif) => {
            if (!notif.timestamp) return true;
            const now = new Date();
            const ref = new Date(notif.timestamp);
            const diffMs = now - ref;
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            return diffDays <= 10;
          })
          // respeta blacklist
          .filter((notif) => !blacklist.includes(notif.id));

        const top = fireDocs
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 60);

        const topNoSelf = top.filter(n => {
          if (n.type !== 'focus') return true;
          const byEmail = normalizeEmail(n.sender) === myEmailN;
          const byId = n.focusId && mineIds.has(n.focusId);
          return !(byEmail || byId);
        });

        // 🆕 Rehidratar SOLO el texto de castings (manteniendo layout)
        const finalList = await hydrateCastingNotifs(topNoSelf);

        await AsyncStorage.setItem(`notifications_${user.id}`, JSON.stringify(finalList));
        await AsyncStorage.setItem(firstSeenKey, JSON.stringify(firstSeen));
        setNotifications(finalList);
        eventBus.emit('notificationsUpdated');
        try { await recalculateUnreadCount?.(user.id); } catch {}
      }, (error) => {
        console.error('❌ Error en onSnapshot:', error);
      });

      // Limpieza asíncrona
      if (cleanTimerRef.current) clearTimeout(cleanTimerRef.current);
      cleanTimerRef.current = setTimeout(() => {
        cleanObsoleteNotifications(user.email).catch((e) =>
          console.warn('cleanObsoleteNotifications (async) failed', e)
        );
      }, 0);

      // devolver ambos unsubscribers
      return () => {
        try { unsubscribe && unsubscribe(); } catch {}
        try { stopListenMyFocus && stopListenMyFocus(); } catch {}
      };
    } catch (error) {
      console.error('❌ Error en fetchUser:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let unsubscribeSnapshot = null;

      const run = async () => {
        const json = await AsyncStorage.getItem('userProfile');
        const user = json ? JSON.parse(json) : null;
        if (!user || !user.email) return;

        unsubscribeSnapshot = await fetchUser();
      };

      run();

      return () => {
        if (typeof unsubscribeSnapshot === 'function') {
          unsubscribeSnapshot();
        }
      };
    }, [])
  );

  // ✅ Marcar una notificación leída (optimista + debounce)
  const markNotificationRead = async (item, opts = {}) => {
    try {
      const json = await AsyncStorage.getItem('userProfile');
      const user = json ? JSON.parse(json) : null;
      if (!user) return;

      // 1) UI optimista
      setNotifications((prev) =>
        prev.map(n =>
          n.id === item.id
            ? { ...n, read: true, senderName: n.senderName || opts.optimisticName || n.senderName }
            : n
        )
      );
      eventBus.emit('notificationsUpdated');

      // 2) Firestore (no bloquear)
      if (item?.firebaseId) {
        updateDoc(
          doc(db, 'notifications', normalizeEmail(user.email), 'items', item.firebaseId),
          { read: true }
        ).catch((e) => console.warn('updateDoc(read) failed', e));
      }

      // 3) Persistencia local inmediata
      if (user?.id) {
        const updated = notifications.map(n =>
          n.id === item.id ? { ...n, read: true } : n
        );
        await AsyncStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated));
        queueSaveNotifications(user.id, () => updated);
        try { await recalculateUnreadCount?.(user.id); } catch {}
      }

    } catch (e) {
      console.warn('markNotificationRead error', e);
    }
  };

  const renderItem = ({ item }) => {
    const isRead = item?.read === true || item?.read === 'true';

    // 🔹 Nombre a mostrar
    const senderEmail = item?.sender ? normalizeEmail(item.sender) : '';
    const displayName =
      toStr(item?.displayName) ||
      toStr(item?.senderName) ||
      (senderEmail && nameByEmail[senderEmail]) ||
      toStr(item?.senderProfile?.name) ||
      (item?.title && item.title.includes('de ')
        ? toStr(item.title.split('de ')[1]?.split(':')[0]).trim()
        : '') ||
      toStr(item?.sender) ||
      'Usuario';

    const bodyText =
      item?.body ??
      (item?.message && item.message.includes(':')
        ? toStr(item.message.split(':').slice(1).join(':')).trim()
        : toStr(item?.message));

    // ⏱️ Fecha/hora fija
    let safeDate = '';
    try {
      if (item?.date) safeDate = new Date(item.date).toLocaleString('es-CL');
    } catch {
      safeDate = '';
    }

    const tipoLabel =
      item?.type === 'casting' ? 'Nuevo Casting'
      : item?.type === 'servicio' ? 'Nuevo Servicio'
      : item?.type === 'focus' ? `Nuevo focus de: ${displayName || 'Usuario'}`
      : 'Mensaje';

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: isRead ? '#1a1a1a' : '#333' }
        ]}
        onPress={async () => {
          const json = await AsyncStorage.getItem('userProfile');
          const user = json ? JSON.parse(json) : null;
          if (!user) return;

          // MENSAJE
          if (item?.type === 'mensaje' && item?.sender && item.sender !== user.email) {
            await markNotificationRead(item, { optimisticName: displayName });
            navigation.dispatch(
              CommonActions.navigate({
                name: 'MessageDetail',
                params: {
                  contactEmail: item.sender,
                  contactName: displayName,
                  refreshFromFirestore: true
                },
              })
            );
            return;
          }

          // SERVICIO
          if (item?.type === 'servicio') {
            await markNotificationRead(item, { optimisticName: displayName });
            openServiceFromNotification(item.serviceId);
            return;
          }

          // CASTING
          if (item?.type === 'casting') {
            if (!item?.castingId) {
              setModalMessage('Este casting ya no está disponible.');
              setShowErrorModal(true);
              setErrorNotificationId(item?.firebaseId || null);
              return;
            }
            await markNotificationRead(item, { optimisticName: displayName });
            navigation.navigate('CastingDetail', { castingId: item.castingId });
            return;
          }

          // FOCUS
          if (item?.type === 'focus') {
            const fid = item?.focusId;
            if (!fid) {
              setModalMessage('Este focus ya no está disponible.');
              setShowErrorModal(true);
              setErrorNotificationId(item?.firebaseId || null);
              return;
            }

            const exists = await focusExists(fid);
            if (!exists) {
              setModalMessage('Este focus fue eliminado y ya no está disponible.');
              setShowErrorModal(true);
              setErrorNotificationId(item?.firebaseId || null);
              return;
            }

            await markNotificationRead(item, { optimisticName: displayName });

            const safeTitle =
              (typeof item?.title === 'string' && item.title.trim()) ? item.title.trim()
              : (typeof item?.message === 'string' && item.message.split(':')[0]?.trim()) || 'Focus';

            navigation.navigate('FocusDetailScreen', {
              focusId: fid,
              focus: { id: fid, title: safeTitle },
              fromNotification: true,
            });
            return;
          }
        }}
      >
        <Text style={{ fontSize: 22, marginRight: 12 }}>
          {icons[item?.type] || '🔔'}
        </Text>

        <View style={{ flex: 1, minHeight: 60 }}>
          {/* Título */}
          <Text style={styles.message} numberOfLines={1}>
            {item?.type === 'mensaje'
              ? `Nuevo mensaje de: ${displayName}`
              : tipoLabel}
          </Text>

          {/* Cuerpo */}
          <Text style={styles.message} numberOfLines={2}>
            {bodyText}
          </Text>

          {/* Fecha (fija) */}
          {!!safeDate && <Text style={styles.time}>{safeDate}</Text>}
        </View>

        {!isRead && (
          <View style={styles.badgeNuevo}>
            <Text style={styles.badgeText}>Nuevo</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notificaciones</Text>
      </View>
      {notifications.length === 0 ? (
        <Text style={styles.empty}>No tienes notificaciones aún.</Text>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
          getItemLayout={(_, index) => ({ length: 74, offset: 74 * index, index })}
        />
      )}
      <Modal visible={showErrorModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>❌ Error</Text>
            <Text style={styles.modalText}>
              {toStr(modalMessage || 'No se pudo abrir esta notificación. Puede que ya no esté disponible.')}
            </Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={async () => {
                try {
                  const json = await AsyncStorage.getItem('userProfile');
                  const user = json ? JSON.parse(json) : null;
                  if (!user) return;

                  if (errorNotificationId) {
                    const docRef = doc(
                      db,
                      'notifications',
                      normalizeEmail(user.email),
                      'items',
                      errorNotificationId
                    );
                    try {
                      await deleteDoc(docRef);
                    } catch (e) {}
                  }
                } catch (error) {
                  console.error('❌ Error al eliminar notificación:', error);
                }
                setShowErrorModal(false);
                setErrorNotificationId(null);
              }}
            >
              <Text style={styles.modalButtonText}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    marginTop: 25,
  },
  header: {
    marginTop: 20,
    alignItems: 'center',
  },
  title: {
    color: '#D8A353',
    fontSize: 24,
    fontWeight: 'bold',
  },
  list: {
    paddingTop: 20,
    paddingBottom: 80,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#121212',
    borderRadius: 0,
    padding: 10,
    marginBottom: 2,
    alignItems: 'center',
    width: '100%',
    marginHorizontal: 0,
  },
  message: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 4,
  },
  time: {
    color: '#888',
    fontSize: 12,
  },
  empty: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 40,
  },
  badgeNuevo: {
    backgroundColor: '#D8A353',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
  },
  badgeText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
    width: '80%',
  },
  modalTitle: {
    color: '#D8A353',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
  },
  modalText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
});
