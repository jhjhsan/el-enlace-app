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
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { CommonActions } from '@react-navigation/native';

const icons = {
  mensaje: <Ionicons name="mail" size={20} color="#D8A353" />,
  chat: <MaterialIcons name="chat" size={20} color="#D8A353" />,
  casting: <Ionicons name="checkmark-done" size={20} color="#D8A353" />,
  reseña: <FontAwesome5 name="star" size={16} color="#D8A353" />,
  terminos: <Feather name="tool" size={20} color="#D8A353" />,
  servicio: <Ionicons name="construct" size={20} color="#D8A353" />,
};

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState([]);
  const [membershipType, setMembershipType] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorNotificationId, setErrorNotificationId] = useState(null);
  const navigation = useNavigation();
  const db = getFirestore(getApp());

  const markAllNotificationsAsRead = async (userEmail) => {
  try {
    const normalizedEmail = normalizeEmail(userEmail);
    const notiRef = collection(db, `notifications/${normalizedEmail}/items`);
    const snapshot = await getDocs(notiRef);

    const updates = [];
    snapshot.forEach((docSnap) => {
      if (!docSnap.data().read) {
        updates.push(updateDoc(docSnap.ref, { read: true }));
      }
    });

    await Promise.all(updates);
    console.log(`✅ ${updates.length} notificaciones marcadas como leídas`);

    const json = await AsyncStorage.getItem(`notifications_${userEmail}`);
    let local = json ? JSON.parse(json) : [];
    local = local.map(n => ({ ...n, read: true }));
    await AsyncStorage.setItem(`notifications_${userEmail}`, JSON.stringify(local));
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

  const checkConversationExists = async (senderEmail, userEmail) => {
    try {
      const normalizedUser = normalizeEmail(userEmail);
      const normalizedSender = normalizeEmail(senderEmail);
      console.log(`🔍 Verificando conversación para: ${normalizedSender} con usuario: ${normalizedUser}`);

      const q = query(
        collection(db, 'mensajes'),
        where('from', 'in', [normalizedUser, normalizedSender]),
        where('to', 'in', [normalizedUser, normalizedSender])
      );
      const snapshot = await getDocs(q);
      const existsInFirestore = !snapshot.empty;
      console.log(`🔍 Conversación en Firestore para ${normalizedSender}: ${existsInFirestore ? 'encontrada' : 'no encontrada'}`);

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
          console.log('✅ AsyncStorage actualizado con mensajes de Firestore');
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
            .slice(0, 50)
            .reverse();

          await AsyncStorage.setItem('professionalMessages', JSON.stringify(safeMessages));
          console.log('✅ Mensajes guardados localmente sin duplicados');
        } catch (error) {
          console.error('❌ Error guardando mensajes:', error);
        }
        console.log('🗑️ Conversación eliminada de AsyncStorage:', normalizedSender);
      }
      return false;
    } catch (error) {
      console.error('❌ Error verificando conversación:', error);
      return false;
    }
  };

  const cleanObsoleteNotifications = async (userEmail) => {
    try {
      const normalizedEmail = normalizeEmail(userEmail);
      const notifRef = collection(db, `notifications/${normalizedEmail}/items`);
      const snapshot = await getDocs(notifRef);
      const deletions = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.type === 'mensaje' && data.sender) {
          const conversationExists = await checkConversationExists(data.sender, userEmail);
          if (!conversationExists) {
            deletions.push(deleteDoc(doc.ref));
            console.log(`🗑️ Notificación obsoleta eliminada: ${doc.id}`);
          }
        }
      }
      await Promise.all(deletions);
      console.log(`✅ Eliminadas ${deletions.length} notificaciones obsoletas`);
    } catch (error) {
      console.error('❌ Error limpiando notificaciones obsoletas:', error);
    }
  };

  const debugAsyncStorage = async () => {
    try {
      const json = await AsyncStorage.getItem('professionalMessages');
      console.log('🔍 Contenido de professionalMessages:', JSON.stringify(json ? JSON.parse(json) : [], null, 2));
      const userJson = await AsyncStorage.getItem('userProfile');
      const user = userJson ? JSON.parse(userJson) : null;
      if (user) {
        const notifJson = await AsyncStorage.getItem(`notifications_${user.id}`);
        console.log('🔍 Contenido de notifications:', JSON.stringify(notifJson ? JSON.parse(notifJson) : [], null, 2));
      }
    } catch (error) {
      console.error('❌ Error inspeccionando AsyncStorage:', error);
    }
  };

  const fetchUser = async () => {
    console.log('📥 Ejecutando fetchUser en NotificationScreen');
    try {
      const json = await AsyncStorage.getItem('userProfile');
      const user = json ? JSON.parse(json) : null;
      if (!user) {
        console.log('❌ Usuario no encontrado en AsyncStorage');
        return;
      }

      setMembershipType(user?.membershipType || 'free');
      await debugAsyncStorage();
      await cleanObsoleteNotifications(user.email); // Limpiar notificaciones obsoletas

      const normalizedEmail = normalizeEmail(user.email);
      console.log('🧪 Escuchando en:', `notifications/${normalizedEmail}/items`);

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

      const notiQuery = query(
        collection(db, `notifications/${normalizedEmail}/items`),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      console.log('📡 Esperando notificaciones en Firestore...');
      const unsubscribe = onSnapshot(notiQuery, async (snapshot) => {
        console.log('📡 Snapshot activado. Nuevas notificaciones:', snapshot.size);
        snapshot.docs.forEach((doc) => {
          console.log(`🔍 Doc ID: ${doc.id}, Data ID: ${doc.data().id}, Data:`, doc.data());
        });

const fireDocs = snapshot.docs.map((doc) => {
  const data = doc.data();
  const safeId = data.id || `fire_0_${doc.id}`; // ✅ Usa el ID del documento si falta el campo `id`

  return {
    id: safeId,
    icon: data.type || 'terminos',
    type: data.type,
    chatId: data.chatId,
    castingId: data.castingId,
    serviceId: data.serviceId,
    sender: data.sender || null,
    date: data.timestamp?.toDate()?.toISOString() || new Date().toISOString(),
    message: `${data.title || '🔔'}: ${data.body || ''}`,
    read: data.read === true,
  };
});

        let prevJson = await AsyncStorage.getItem(notifKey);
        let prevNotis = prevJson ? JSON.parse(prevJson) : [];
        let mergedFireDocs = fireDocs.map(newNoti => {
          const old = prevNotis.find(n => n.id === newNoti.id);
          return old ? { ...newNoti, read: old.read === true } : newNoti;
        });

        await AsyncStorage.setItem(notifKey, JSON.stringify(mergedFireDocs));

        const seen = new Set();
        const merged = [...mergedFireDocs, ...enrichedPending].filter(n => {
          if (seen.has(n.id)) return false;
          seen.add(n.id);
          return true;
        });

      setNotifications((prevNotis) => {
  const all = [...prevNotis, ...merged];
  const seen = new Set();
  const unique = all.filter(n => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });
  return unique.sort((a, b) => new Date(b.date) - new Date(a.date));
});

        console.log('✅ Notificaciones seteadas:', merged.length);
      }, (error) => {
        console.error('❌ Error en onSnapshot:', error);
      });

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
              console.log('📧 Alerta de correo enviada');
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
    console.log('📥 Entrando a NotificationScreen (useFocusEffect)');

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


  const renderItem = ({ item }) => {
    console.log('🎯 Renderizando tarjeta:', item);

    const isRead = item.read === true || item.read === 'true';

    return (
      <TouchableOpacity
      style={[
  styles.card,
  {
    backgroundColor: isRead ? '#1a1a1a' : '#333',

  }
]}

        onPress={async () => {
          try {
            const json = await AsyncStorage.getItem('userProfile');
            const user = json ? JSON.parse(json) : null;
            if (!user) {
              console.error('❌ Usuario no encontrado');
              return;
            }

            if (item.type === 'mensaje' && item.sender && item.sender !== user.email) {
              const conversationExists = await checkConversationExists(item.sender, user.email);
              if (!conversationExists) {
                setErrorNotificationId(item.id);
                setShowErrorModal(true);
                return;
              }

              // Marcar como leída
   if (item.type === 'mensaje' && item.sender && item.sender !== user.email) {
  const conversationExists = await checkConversationExists(item.sender, user.email);
  if (!conversationExists) {
    setErrorNotificationId(item.id);
    setShowErrorModal(true);
    return;
  }

  // ✅ Marcar como leída en Firestore (usando el ID real)
  if (item.firebaseId) {
    const docRef = doc(
      db,
      'notifications',
      normalizeEmail(user.email),
      'items',
      item.firebaseId
    );
    try {
      await updateDoc(docRef, { read: true });
      console.log('📝 Notificación marcada como leída en Firestore:', item.firebaseId);
    } catch (err) {
      console.error('❌ Error marcando como leída:', err);
    }
  }

  // ✅ Marcar como leída localmente
  const stored = await AsyncStorage.getItem(`notifications_${user.id}`);
  const local = stored ? JSON.parse(stored) : [];
  const updated = local.map(n =>
    n.id === item.id ? { ...n, read: true } : n
  );
  await AsyncStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated));
  setNotifications(prev =>
    prev.map(n => (n.id === item.id ? { ...n, read: true } : n))
  );

  // ✅ Navegar a la conversación
  navigation.dispatch(
    CommonActions.navigate({
      name: 'MessageDetail',
      params: {
        contactEmail: item.sender,
        refreshFromFirestore: true,
      },
    })
  );
}

            } else if (item.type === 'servicio' && item.serviceId) {
              navigation.navigate('ServiceDetailScreen', { serviceId: item.serviceId });
            } else if (item.type === 'casting' && item.castingId) {
              const allCastings = await AsyncStorage.getItem('posts');
              const castings = allCastings ? JSON.parse(allCastings) : [];
              const casting = castings.find(c => c.id === item.castingId);
              if (casting) {
                navigation.navigate('CastingDetail', { casting });
              } else {
                Alert.alert('Casting no encontrado', 'Este casting ya no está disponible.');
              }
            }
          } catch (err) {
            console.error('❌ Error marcando como leída o navegando:', err);
          }
        }}
      >
        <Ionicons
          name={
            item.type === 'mensaje'
              ? isRead ? 'mail-open' : 'mail'
              : item.type === 'casting'
              ? 'megaphone'
              : item.type === 'servicio'
              ? 'briefcase'
              : 'notifications'
          }
          size={24}
          color="#D8A353"
          style={{ marginRight: 12 }}
        />

<View style={{ flex: 1, minHeight: 60 }}>
  {/* Línea 1: título con nombre */}
  {item.message?.includes('de ') ? (
    <Text style={styles.message} numberOfLines={1}>
      Nuevo mensaje de: {item.message.split('de ')[1]?.split(':')[0]?.trim()}
    </Text>
  ) : (
    <Text style={styles.message} numberOfLines={1}>
      Nuevo mensaje
    </Text>
  )}

  {/* Línea 2: el mensaje */}
  <Text style={styles.message} numberOfLines={2}>
    {item.message?.split(':').slice(1).join(':').trim()}
  </Text>

  {/* Línea 3: fecha */}
  <Text style={styles.time}>
    {new Date(item.date).toLocaleString('es-CL')}
  </Text>
</View>

        {!isRead && (
          <View style={styles.badgeNuevo}>
            <Text style={styles.badgeText}>Nuevo</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  console.log('🧾 Renderizando notificaciones:', notifications.length);
  notifications.forEach((n, i) => {
    console.log(`🔹 Noti ${i + 1}: ID=${n.id}, Type=${n.type}, Sender=${n.sender}, Message=${n.message}`);
  });


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
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
      <Modal visible={showErrorModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>❌ Error</Text>
            <Text style={styles.modalText}>
              No se pudo cargar la conversación. Es posible que haya sido eliminada.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={async () => {
                try {
                  const json = await AsyncStorage.getItem('userProfile');
                  const user = json ? JSON.parse(json) : null;
                  if (!user) return;

                  const stored = await AsyncStorage.getItem(`notifications_${user.id}`);
                  let local = stored ? JSON.parse(stored) : [];
                  local = local.filter(n => n.id !== errorNotificationId);
                  await AsyncStorage.setItem(`notifications_${user.id}`, JSON.stringify(local));
                  console.log('📦 Notificaciones Firestore procesadas:', mergedFireDocs);

                  setNotifications(local);
                  console.log('🗑️ Notificación eliminada localmente:', errorNotificationId);

                  if (errorNotificationId?.startsWith('fire_0_')) {
                    const docRef = doc(
                      db,
                      'notifications',
                      normalizeEmail(user.email),
                      'items',
                      errorNotificationId
                    );
                    await deleteDoc(docRef);
                    console.log('🗑️ Notificación eliminada de Firestore:', errorNotificationId);
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