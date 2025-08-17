// screens/NotificationScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
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
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  writeBatch, // ✅ batch para marcar leídas
} from 'firebase/firestore';
import { CommonActions } from '@react-navigation/native';
import eventBus from '../utils/eventBus';

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
};

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState([]);
  const [membershipType, setMembershipType] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorNotificationId, setErrorNotificationId] = useState(null);
  const [modalMessage, setModalMessage] = useState('');
  const [nameByEmail, setNameByEmail] = useState({});

  const navigation = useNavigation();
  const db = getFirestore(getApp());

  // ── Guardado local con debounce para no bloquear la UI ───────────────
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

  const toStr = (v) => {
    if (typeof v === 'string') return v;
    if (v == null) return '';
    try {
      return String(v);
    } catch {
      return '';
    }
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
    } catch (_) { /* silencioso */ }
  };

  const checkConversationExists = async (senderEmail, userEmail) => {
    try {
      const normalizedUser = normalizeEmail(userEmail);
      const normalizedSender = normalizeEmail(senderEmail);

      // Cache no direccional: el par A-B es igual a B-A
      const [a, b] = [normalizedUser, normalizedSender].sort();
      const cacheKey = `${a}|${b}`;
      if (__convExistCache.has(cacheKey)) {
        return __convExistCache.get(cacheKey);
      }

      // 🔁 Si está en blacklist, lo quitamos (recibió nuevo mensaje)
      const blacklistKey = `deletedConversations_${normalizedUser}`;
      const blacklistJson = await AsyncStorage.getItem(blacklistKey);
      let blacklist = blacklistJson ? JSON.parse(blacklistJson) : [];

      const wasBlacklisted = blacklist.find((item) => item.email === normalizedSender);
      if (wasBlacklisted) {
        blacklist = blacklist.filter((item) => item.email !== normalizedSender);
        await AsyncStorage.setItem(blacklistKey, JSON.stringify(blacklist));
      }

      const q = query(
        collection(db, 'mensajes'),
        where('from', 'in', [normalizedUser, normalizedSender]),
        where('to', 'in', [normalizedUser, normalizedSender])
      );
      const snapshot = await getDocs(q);
      const existsInFirestore = !snapshot.empty;

      // guarda en cache
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
          const firestoreMessages = snapshot.docs.map((doc) => ({
            sender: doc.data().from,
            text: doc.data().text,
            timestamp: doc.data().timestamp,
            read: doc.data().read || false,
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
      if (cleaningRef.current) return; // ya hay una limpieza corriendo
      cleaningRef.current = true;

      const normalizedEmail = normalizeEmail(userEmail);
      const notiRef = collection(db, `notifications/${normalizedEmail}/items`);
      const snapshot = await getDocs(notiRef);

      // Procesa en tandas para no congelar la UI
      const batchSize = 8;
      const docs = snapshot.docs.slice(0, batchSize);
      const deletions = [];

      for (const docSnap of docs) {
        const data = docSnap.data();
        if (data.type === 'mensaje' && data.sender) {
          const conversationExists = await checkConversationExists(data.sender, userEmail);
          if (!conversationExists) {
            deletions.push(deleteDoc(docSnap.ref));
          }
        }
      }
      await Promise.all(deletions);

      // Limpia notificaciones locales obsoletas (usando el snapshot completo)
      let local = await AsyncStorage.getItem(`notifications_${userEmail}`);
      let localNotis = local ? JSON.parse(local) : [];
      const remaining = snapshot.docs.map(d => (d.data() || {}).id);
      localNotis = localNotis.filter(n => remaining.includes(n.id));
      await AsyncStorage.setItem(`notifications_${userEmail}`, JSON.stringify(localNotis));

      // Si quedan más por procesar, agenda una sola siguiente tanda
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
      const json = await AsyncStorage.getItem('professionalMessages');
      const userJson = await AsyncStorage.getItem('userProfile');
      const user = userJson ? JSON.parse(userJson) : null;
      if (user) {
        await AsyncStorage.getItem(`notifications_${user.id}`); // lectura para inspección manual si la necesitas
      }
    } catch (error) {
      console.error('❌ Error inspeccionando AsyncStorage:', error);
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

      const notifKey = `notifications_${user.id}`;
      const pendingKey = `pendingNotifications_${normalizedEmail}`;

      const pendingJson = await AsyncStorage.getItem(pendingKey);
      const pending = pendingJson ? JSON.parse(pendingJson) : [];
      const enrichedPending = pending.map((p, i) => ({
        id: p.id || `pend_${i}_${p.timestamp}`,
        icon: 'chat',
        date: p.timestamp,
        message: p.message,
      }));

      const itemsRef = collection(db, `notifications/${normalizedEmail}/items`);

      const unsubscribe = onSnapshot(itemsRef, async (snapshot) => {
        const blacklistKey = `deletedNotificationIds_${user.id}`;
        const blacklistJson = await AsyncStorage.getItem(blacklistKey);
        const blacklist = blacklistJson ? JSON.parse(blacklistJson) : [];

        const fireDocs = snapshot.docs
          .map((doc) => {
            const data = doc.data() || {};
            const ts =
              (data.timestamp && typeof data.timestamp.toDate === 'function'
                ? data.timestamp.toDate()
                : null) ||
              (data.createdAtMs ? new Date(Number(data.createdAtMs)) : null) ||
              new Date(); // fallback si no hay timestamp

            const msgTitle = toStr(data.title || '🔔');
            const msgBody  = toStr(data.body ?? data.message ?? '');

            return {
              id: data.id || `fire_${doc.id}`,      // ID estable
              firebaseId: doc.id,
              icon: data.type || 'terminos',
              type: data.type,
              chatId: data.chatId,
              castingId: data.castingId,
              serviceId: data.serviceId,
              sender: data.sender || null,
              date: ts.toISOString(),
              timestamp: ts,
              message: `${msgTitle}${msgBody ? ': ' + msgBody : ''}`,
              read: data.read === true,
            };
          })
          // Últimos 10 días
          .filter((notif) => {
            const now = new Date();
            const diffMs = now - notif.timestamp;
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            return diffDays <= 10;
          })
          // Respeta blacklist
          .filter((notif) => !blacklist.includes(notif.id));

        // Preserva "read" local
        const prevJson = await AsyncStorage.getItem(`notifications_${user.id}`);
        const prevNotis = prevJson ? JSON.parse(prevJson) : [];
        const mergedFireDocs = fireDocs.map((n) => {
          const old = prevNotis.find((p) => p.id === n.id);
          return old ? { ...n, read: old.read === true } : n;
        });

        // Ordena por fecha desc y limita
        const top = mergedFireDocs
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 60);

        await AsyncStorage.setItem(`notifications_${user.id}`, JSON.stringify(top));

        // (opcional) mezclar enrichedPending si lo usas
        setNotifications(top);
        eventBus.emit('notificationsUpdated');
      }, (error) => {
        console.error('❌ Error en onSnapshot:', error);
      });

      // ⚡ Limpieza asíncrona (single timer)
      if (cleanTimerRef.current) clearTimeout(cleanTimerRef.current);
      cleanTimerRef.current = setTimeout(() => {
        cleanObsoleteNotifications(user.email).catch((e) =>
          console.warn('cleanObsoleteNotifications (async) failed', e)
        );
      }, 0);

      if (user.trialEndsAt && !user.hasPaid) {
        const trialEndDate = new Date(user.trialEndsAt);
        const now = new Date();
        const diffDays = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));

        if (diffDays <= 3 && diffDays >= 0) {
          const trialAlert = {
            id: 'trial_alert',
            icon: 'terminos',
            date: now.toISOString(),
            message: `⚠️ Tu prueba gratuita termina en ${diffDays} día(s). Activa tu plan Elite para mantener los beneficios.`,
          };

          const merged = [...notifications, trialAlert].filter(n => {
            const seen = new Set();
            return !seen.has(n.id) && seen.add(n.id);
          });

          setNotifications(merged.sort((a, b) => new Date(b.date) - new Date(a.date)));

          const sentKey = `emailAlertSent_${normalizedEmail}`;
          const sent = await AsyncStorage.getItem(sentKey);
          if (!sent) {
            try {
              const functions = getFunctions(getApp());
              const sendEmail = httpsCallable(functions, 'sendTrialAlertEmail');
              await sendEmail({ email: user.email });
              await AsyncStorage.setItem(sentKey, 'true');
            } catch (error) {
              console.error('❌ Error al enviar correo:', error);
            }
          }
        }
      }

      return unsubscribe;
    } catch (error) {
      console.error('❌ Error en fetchUser:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      eventBus.emit('notificationsUpdated'); // 🔥 Fuerza la recarga del contador
    }, [])
  );

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

      // 3) Persistencia local (debounced)
      if (user?.id) queueSaveNotifications(user.id, () => notifications);

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

    let safeDate = '';
    try {
      safeDate = new Date(item?.date || Date.now()).toLocaleString('es-CL');
    } catch {
      safeDate = '';
    }

    const tipoLabel =
      item?.type === 'casting'
        ? 'Casting'
        : item?.type === 'servicio'
        ? 'Servicio'
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

          {/* Fecha */}
          <Text style={styles.time}>{safeDate}</Text>
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
          // 🔧 Optimización de rendimiento para listas grandes
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
          getItemLayout={(_, index) => ({ length: 74, offset: 74 * index, index })} // alto aprox de la card
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

                  // Si tenemos un firebaseId, elimina ese doc (no el id "fire_*")
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
                    } catch (e) {
                      // Puede no existir, no rompemos el flujo
                    }
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
