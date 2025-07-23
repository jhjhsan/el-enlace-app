import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import BackButton from '../components/BackButton';
import { Image } from 'react-native';
import { rebuildAllProfiles } from '../src/firebase/helpers/rebuildAllProfiles';
import { db } from '../src/firebase/firebaseConfig';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot, getDocs, deleteDoc
} from 'firebase/firestore';

export default function InboxScreen() {
  const navigation = useNavigation();
  const { userData } = useUser();
  const [conversations, setConversations] = useState([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [allProfiles, setAllProfiles] = useState([]);
  const [selectedToDelete, setSelectedToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const normalizeEmail = (email) => {
    if (!email || typeof email !== 'string') return '';
    return email
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9@._\-+]/gi, '')
      .replace(/@{2,}/g, '@')
  };

  const deleteMessage = async (userToDelete) => {
    try {
      setIsDeleting(true);
      const normalizedUser = normalizeEmail(userData.email);
      const normalizedTarget = normalizeEmail(userToDelete);
      console.log(`🗑️ Iniciando eliminación para user: ${normalizedUser}, target: ${normalizedTarget}`);

      // Eliminar de AsyncStorage (professionalMessages)
      const json = await AsyncStorage.getItem('professionalMessages');
      let allMessages = json ? JSON.parse(json) : [];
      allMessages = allMessages.filter(
        (msg) =>
          !(
            (msg.from === normalizedUser && msg.to === normalizedTarget) ||
            (msg.from === normalizedTarget && msg.to === normalizedUser)
          )
      );
      const safe = (allMessages || []).map((conv) => ({
  ...conv,
  messages: (conv.messages || []).slice(-50), // Limita a últimos 50
}));
await AsyncStorage.setItem('professionalMessages', JSON.stringify(safe));

      setConversations((prev) =>
        prev.filter((conv) => normalizeEmail(conv.user) !== normalizedTarget)
      );
      console.log('🗑️ Conversación eliminada de AsyncStorage:', normalizedTarget);

      // Eliminar mensajes de Firestore
      const q = query(
        collection(db, 'mensajes'),
        where('from', 'in', [normalizedUser, normalizedTarget]),
        where('to', 'in', [normalizedUser, normalizedTarget])
      );
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);
      console.log(`🗑️ ${deletePromises.length} mensajes eliminados de Firestore`);

      // Eliminar notificaciones asociadas de Firestore (sender o recipient)
      const notifRef = collection(db, 'notifications', normalizedUser, 'items');
      const notifQuery = query(
        notifRef,
        where('type', '==', 'mensaje'),
        where('sender', 'in', [normalizedUser, normalizedTarget]),
        where('recipient', 'in', [normalizedUser, normalizedTarget])
      );
      const notifSnapshot = await getDocs(notifQuery);
      const notifDeletePromises = notifSnapshot.docs.map((docSnap) => {
        console.log(`🗑️ Eliminando notificación de Firestore: ${docSnap.id}`);
        return deleteDoc(docSnap.ref);
      });
      await Promise.all(notifDeletePromises);
      console.log(`🗑️ ${notifDeletePromises.length} notificaciones eliminadas de Firestore`);

      // Eliminar notificaciones locales (AsyncStorage)
      const notifKey = `notifications_${normalizedUser}`;
      const notifJson = await AsyncStorage.getItem(notifKey);
      let localNotifications = notifJson ? JSON.parse(notifJson) : [];
      localNotifications = localNotifications.filter(
        (notif) =>
          !(
            (notif.sender === normalizedTarget && notif.recipient === normalizedUser) ||
            (notif.sender === normalizedUser && notif.recipient === normalizedTarget)
          )
      );
      await AsyncStorage.setItem(notifKey, JSON.stringify(localNotifications));
      console.log(`🗑️ Notificaciones locales eliminadas para ${normalizedTarget}`);


      // Mostrar mensaje de éxito
      console.log('✅ Conversación y notificaciones eliminadas exitosamente');
    } catch (error) {
      console.error('❌ Error al eliminar mensaje:', error);
      setShowDeleteModal(false);
      throw error; // Lanzar error para que el modal no se cierre si falla
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const loadInbox = async () => {
      try {
        const isFree = userData?.membershipType === 'free';
        const isEliteBlocked = userData?.membershipType === 'elite' && !userData?.hasPaid;

        if (!userData || isEliteBlocked) {
          setShowUpgradeModal(true);
          return;
        }

        if (isFree) {
          const pendingRaw = await AsyncStorage.getItem('pendingMessages');
          if (pendingRaw) {
            const pending = JSON.parse(pendingRaw);
            const userPending = pending.filter((p) => p.toEmail === userData.email);
            if (userPending.length > 0) {
              setShowPendingModal(true);
            }
          }
        }

const json = await AsyncStorage.getItem('professionalMessages');
if (!json) {
  setConversations([]);
  return;
}

const allMessages = JSON.parse(json);

const myConversations = allMessages.filter(
  (msg) => msg.from === userData.email || msg.to === userData.email
);

const safe = (allMessages || []).map((conv) => ({
  ...conv,
  messages: (conv.messages || []).slice(-50), // Limita a últimos 50
}));
await AsyncStorage.setItem('professionalMessages', JSON.stringify(safe));


        const profilesRaw = await AsyncStorage.getItem('allProfiles');
        const profilesProRaw = await AsyncStorage.getItem('allProfilesPro');
        const profilesEliteRaw = await AsyncStorage.getItem('allProfilesElite');

        const profiles = JSON.parse(profilesRaw || '[]');
        const profilesPro = JSON.parse(profilesProRaw || '[]');
        const profilesElite = JSON.parse(profilesEliteRaw || '[]');

        const localUserProfile = {
          ...userData,
          email: normalizeEmail(userData?.email),
        };

        const allProfiles = [...profiles, ...profilesPro, ...profilesElite, localUserProfile];
        setAllProfiles(allProfiles);

        const grouped = myConversations.reduce((acc, msg) => {
          const otherUserRaw = msg.from === userData.email ? msg.to : msg.from;
          const otherUser = normalizeEmail(otherUserRaw);

          if (!acc[otherUser]) {
            acc[otherUser] = msg;
          } else {
            const currentTimestamp = new Date(acc[otherUser].messages?.at(-1)?.timestamp || 0).getTime();
            const newTimestamp = new Date(msg.messages?.at(-1)?.timestamp || 0).getTime();
            if (newTimestamp > currentTimestamp) {
              acc[otherUser] = msg;
            }
          }
          return acc;
        }, {});

        const formatted = Object.entries(grouped).map(([user, messageObj]) => {
          const lastMsg = messageObj.messages?.at(-1);
          const normalizedUser = normalizeEmail(user);

          const fallbackProfile =
            allProfiles.find((p) => normalizeEmail(p.email) === normalizedUser) || {};

          const name =
            fallbackProfile.agencyName ||
            fallbackProfile.name ||
            lastMsg?.profileAttachment?.agencyName ||
            lastMsg?.profileAttachment?.name ||
            user;

          const photo =
            fallbackProfile.profilePhotoUrl ||
            fallbackProfile.profilePhoto ||
            lastMsg?.profileAttachment?.profilePhotoUrl ||
            lastMsg?.profileAttachment?.profilePhoto ||
            null;

          return {
            user,
            lastMessage: lastMsg?.text || 'Mensaje enviado',
            timestamp: lastMsg?.timestamp || '',
            messages: messageObj.messages,
            lastMessageData: {
              ...lastMsg,
              profileAttachment: {
                name,
                profilePhotoUrl: photo,
              },
            },
          };
        });

        setConversations(formatted);
      } catch (error) {
        console.log('❌ Error al cargar mensajes:', error);
      }
    };

const cargarInicial = async () => {
  try {
    const perfilesLocales = await AsyncStorage.multiGet([
      'allProfiles',
      'allProfilesPro',
      'allProfilesElite',
    ]);

    const algunoVacio = perfilesLocales.some(([_, value]) => !value || value === '[]');

    if (algunoVacio) {
      console.log('📦 Reconstruyendo perfiles porque están vacíos');
      await rebuildAllProfiles();
    } else {
      console.log('📦 Perfiles locales ya existen, omitiendo reconstrucción');
    }

    await loadInbox();
  } catch (error) {
    console.log('❌ Error en carga inicial:', error);
  }
};

    cargarInicial();

    const unsubscribe = navigation.addListener('focus', () => {
      loadInbox();
    });

    return () => unsubscribe();
  }, [userData, navigation]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📥 Bandeja de Entrada</Text>

        {conversations.length === 0 && allProfiles.length === 0 ? (
          <Text style={styles.empty}>Cargando conversaciones...</Text>
        ) : (
          conversations.map((conv, index) => {

            const normalizedUser = normalizeEmail(conv.user);

            const matchedProfile = allProfiles.find((p) =>
              normalizeEmail(p.email) === normalizedUser || normalizeEmail(p.id) === normalizedUser
            );

            const lastData = conv.lastMessageData?.profileAttachment || {};

            const profileToUse = {
              name: matchedProfile?.name?.trim() || lastData?.name?.trim() || conv.user,
              agencyName: matchedProfile?.agencyName?.trim() || lastData?.agencyName?.trim() || '',
              profilePhotoUrl:
                matchedProfile?.profilePhotoUrl ||
                matchedProfile?.profilePhoto ||
                lastData?.profilePhotoUrl ||
                lastData?.profilePhoto ||
                null,
            };

            if (!profileToUse.name || profileToUse.name.includes('@')) {
              const altProfile = allProfiles.find((p) =>
                normalizeEmail(p.email) === normalizedUser || normalizeEmail(p.id) === normalizedUser
              );
              if (altProfile) {
                profileToUse.name = altProfile.name || altProfile.agencyName || conv.user;
                profileToUse.profilePhotoUrl =
                  altProfile.profilePhotoUrl || altProfile.profilePhoto || profileToUse.profilePhotoUrl;
              }
            }

            const displayName = profileToUse.agencyName || profileToUse.name || conv.user;
            const profilePhotoUrl = profileToUse.profilePhotoUrl;

            return (
              <TouchableOpacity
                key={index}
                style={styles.card}
                onPress={() => {
                  if (conv?.user) {
                    navigation.navigate('MessageDetail', {
                      contactEmail: conv.user,
                    });
                  }
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {profilePhotoUrl ? (
                    <Image
                      source={{ uri: profilePhotoUrl }}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        marginRight: 10,
                        borderWidth: 1,
                        borderColor: '#D8A353',
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: '#333',
                        marginRight: 10,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#fff' }}>👤</Text>
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Text style={styles.user}>{displayName}</Text>
                
                    </View>
                    <Text style={styles.preview}>✉️ {conv.lastMessage}</Text>
             <Text style={styles.timestamp}>
  {conv.timestamp
    ? (() => {
        const ts = conv.timestamp;
        const date =
          typeof ts === 'string'
            ? new Date(ts)
            : ts?.seconds
            ? new Date(ts.seconds * 1000)
            : null;

        return date && !isNaN(date.getTime())
          ? date.toLocaleDateString('es-CL', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '';
      })()
    : ''}
</Text>
                  </View>

                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedToDelete(conv.user);
                      setShowDeleteModal(true);
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 18, paddingHorizontal: 10 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <BackButton />

        <Modal
          visible={showUpgradeModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowUpgradeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.upgradeModal}>
              <Text style={styles.upgradeTitle}>🔒 Función exclusiva</Text>
              <Text style={styles.upgradeText}>
                Mejora tu membresía para acceder a la bandeja de mensajes profesionales.
              </Text>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => {
                  setShowUpgradeModal(false);
                  navigation.navigate('Subscription');
                }}
              >
                <Text style={styles.upgradeButtonText}>💳 Ver planes</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowUpgradeModal(false)}>
                <Text style={{ color: '#aaa', marginTop: 10 }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showPendingModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPendingModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.upgradeModal}>
              <Text style={styles.upgradeTitle}>📬 ¡Tienes mensajes pendientes!</Text>
              <Text style={styles.upgradeText}>
                Agencias están intentando contactarte, pero ya alcanzaste tu límite semanal de mensajes.
                Si subes a plan Pro, podrás desbloquear y responder estos mensajes importantes.
              </Text>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => {
                  setShowPendingModal(false);
                  navigation.navigate('Subscription');
                }}
              >
                <Text style={styles.upgradeButtonText}>🚀 Subir a plan Pro</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowPendingModal(false)}>
                <Text style={styles.upgradeText}>Volver</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.upgradeModal}>
              <Text style={styles.upgradeTitle}>❌ Confirmar eliminación</Text>
              <Text style={styles.upgradeText}>
                ¿Seguro que quieres eliminar esta conversación?
              </Text>
              <View style={{ flexDirection: 'row', marginTop: 15 }}>
                <TouchableOpacity
                  style={[styles.upgradeButton, { backgroundColor: '#555' }]}
                  onPress={() => setShowDeleteModal(false)}
                >
                  <Text style={styles.upgradeButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.upgradeButton, { marginLeft: 10, opacity: isDeleting ? 0.6 : 1 }]}
                  onPress={async () => {
                    try {
                      await deleteMessage(selectedToDelete);
                      setShowDeleteModal(false);
                      setSelectedToDelete(null);
                    } catch (error) {
                      console.log('❌ Error en eliminación desde modal:', error);
                    }
                  }}
                  disabled={isDeleting}
                >
                  <Text style={styles.upgradeButtonText}>
                    {isDeleting ? 'Eliminando...' : 'Eliminar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    padding: 20,
    paddingBottom: 100,
    marginTop: 25,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#D8A353',
    textAlign: 'center',
    marginBottom: 20,
  },
  empty: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    backgroundColor: '#1B1B1B',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    alignSelf: 'center',
    width: '100%',
    elevation: 1,
  },
  user: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  preview: {
    color: '#aaa',
    fontSize: 13,
  },
  timestamp: {
    color: '#666',
    fontSize: 11,
    marginTop: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeModal: {
    backgroundColor: '#1B1B1B',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderColor: '#D8A353',
    borderWidth: 1,
    marginHorizontal: 30,
    zIndex: 1000,
    elevation: 20,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D8A353',
    marginBottom: 10,
    textAlign: 'center',
  },
  upgradeText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  upgradeButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  upgradeButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 10,
    backgroundColor: '#444',
  },
});