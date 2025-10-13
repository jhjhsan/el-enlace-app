// screens/InboxScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
// ⛔️ Quitado: import BackButton from '../components/BackButton';
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

// ✅ Agregados para flecha igual que en MenuScreen
import { Ionicons } from '@expo/vector-icons';
import { goToDashboardTab } from '../utils/navigationHelpers';

export default function InboxScreen() {
  const navigation = useNavigation();
  const { userData } = useUser();
  const [conversations, setConversations] = useState([]);
  useEffect(() => {
    console.log('👀 conversations actualizado:', conversations.map(c => c.user));
  }, [conversations]);

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

      // 1. BORRA SOLO la conversación local del usuario actual (NO afecta al otro)
      const json = await AsyncStorage.getItem('professionalMessages');

      const debugRaw = await AsyncStorage.getItem('professionalMessages');
      const debugParsed = debugRaw ? JSON.parse(debugRaw) : [];
      console.log('🧪 DEBUG FINAL - BLOQUES CONVERSACIONES:', debugParsed.length);
      debugParsed.forEach((c, i) =>
        console.log(`🔢 ${i + 1}. De: ${c.from} → ${c.to}, mensajes: ${c.messages?.length || 0}`)
      );
      console.log('📦 professionalMessages cargadas desde AsyncStorage:', debugParsed.length);
      debugParsed.forEach((c, i) => {
        console.log(`📬 ${i + 1}. De: ${c.from} → ${c.to}, Mensajes: ${c.messages?.length || 0}`);
      });

      setConversations((prev) =>
        prev.filter((conv) => normalizeEmail(conv.user) !== normalizedTarget)
      );
      console.log('🗑️ Conversación eliminada SOLO localmente para:', normalizedTarget);

      // 2. Opcional: borra notificaciones locales de este contacto
      const notifKey = `notifications_${normalizedUser}`;
      const notifJson = await AsyncStorage.getItem(notifKey);
      let localNotifications = notifJson ? JSON.parse(notifJson) : [];
      localNotifications = localNotifications.filter(
        (notif) =>
          !(
            (normalizeEmail(notif.sender) === normalizedTarget) ||
            (normalizeEmail(notif.recipient) === normalizedTarget)
          )
      );
      await AsyncStorage.setItem(notifKey, JSON.stringify(localNotifications));
      console.log(`🗑️ Notificaciones locales eliminadas SOLO para ${normalizedTarget}`);

      // 3. NO borres nada de Firestore

      console.log('✅ Conversación eliminada SOLO para este usuario');
      // 5. Añade el contacto eliminado a la blacklist CON TIMESTAMP
      const blacklistKey = `deletedConversations_${normalizedUser}`;
      const existingBlacklist = await AsyncStorage.getItem(blacklistKey);
      let blacklist = existingBlacklist ? JSON.parse(existingBlacklist) : [];

      const entry = {
        email: normalizedTarget,
        timestamp: Date.now(),
      };

      if (!blacklist.find((b) => b.email === normalizedTarget)) {
        blacklist.push(entry);
        await AsyncStorage.setItem(blacklistKey, JSON.stringify(blacklist));
        console.log(`🚫 Añadido a blacklist de conversaciones: ${normalizedTarget}`);
      }

    } catch (error) {
      console.error('❌ Error al eliminar mensaje:', error);
      setShowDeleteModal(false);
      throw error;
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

        const toMs = (ts) => {
          try {
            if (!ts) return 0;
            if (typeof ts === 'string') {
              const t = Date.parse(ts); return isNaN(t) ? 0 : t;
            }
            if (ts?.seconds) return ts.seconds * 1000;
            if (typeof ts.toDate === 'function') return ts.toDate().getTime();
            if (ts instanceof Date) return ts.getTime();
            return 0;
          } catch { return 0; }
        };

        // 1) Carga lo local si existe
        let json = await AsyncStorage.getItem('professionalMessages');
        let local = json ? JSON.parse(json) : [];
        console.log('📦 Cargando Inbox desde AsyncStorage:', local.length);

        // 2) SIEMPRE consulta Firestore (enviados y recibidos) y fusiona
        const me = normalizeEmail(userData.email);
        const [sentSnap, recvSnap] = await Promise.all([
          getDocs(query(collection(db, 'mensajes'), where('from', '==', me))),
          getDocs(query(collection(db, 'mensajes'), where('to', '==', me))),
        ]);

        const fsDocs = [...sentSnap.docs, ...recvSnap.docs];
        const fsMsgs = fsDocs.map((d) => ({ id: d.id, ...d.data() }));

        // 3) Conviértelo a estructura de conversaciones por "otro"
        const fsByOther = new Map();
        fsMsgs.forEach((m) => {
          const from = normalizeEmail(m.from);
          const to = normalizeEmail(m.to);
          const other = from === me ? to : from;
          if (!other) return;
          const arr = fsByOther.get(other) || [];
          arr.push(m);
          fsByOther.set(other, arr);
        });

        // 4) Convierte cada grupo en el formato de tu storage
        const fsConvs = [];
        for (const [other, list] of fsByOther) {
          const seen = new Set();
          const sorted = list
            .filter((msg) => {
              const key = msg.id || `${normalizeEmail(msg.from)}_${toMs(msg.timestamp)}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            })
            .sort((a, b) => toMs(a.timestamp) - toMs(b.timestamp));

          const mapped = sorted.map((m) => ({
            id: m.id,
            sender: normalizeEmail(m.from),
            text: m.text,
            timestamp: m.timestamp,
            read: !!m.read,
          }));

          fsConvs.push({
            from: me,
            to: other,
            user: other,
            messages: mapped,
          });
        }

        // 5) Fusiona Firestore + Local por “otro” (y dedupe mensajes)
        const byOther = new Map();

        (local || []).forEach((conv) => {
          const fromN = normalizeEmail(conv.from);
          const toN = normalizeEmail(conv.to);
          const other = fromN === me ? toN : fromN;
          if (!other) return;
          byOther.set(other, {
            from: me,
            to: other,
            user: conv.user || other,
            messages: Array.isArray(conv.messages) ? [...conv.messages] : [],
          });
        });

        fsConvs.forEach((conv) => {
          const other = conv.to;
          const existing = byOther.get(other) || { from: me, to: other, user: other, messages: [] };
          const existingMsgs = existing.messages || [];
          const newMsgs = conv.messages || [];

          const seen = new Set(existingMsgs.map(m => m.id || `${m.sender}_${toMs(m.timestamp)}_${m.text || ''}`));
          const merged = [
            ...existingMsgs,
            ...newMsgs.filter(m => {
              const k = m.id || `${m.sender}_${toMs(m.timestamp)}_${m.text || ''}`;
              if (seen.has(k)) return false;
              seen.add(k);
              return true;
            }),
          ].sort((a,b) => toMs(a.timestamp) - toMs(b.timestamp));

          byOther.set(other, { ...existing, messages: merged.slice(-50) });
        });

        // 6) Resultado final
        const allMessages = Array.from(byOther.values());

        // 7) Persistir cache actualizado
        await AsyncStorage.setItem('professionalMessages', JSON.stringify(allMessages));

        const myConversations = allMessages.filter(
          (msg) =>
            normalizeEmail(msg.from) === normalizeEmail(userData.email) ||
            normalizeEmail(msg.to) === normalizeEmail(userData.email)
        );

        // 🚫 Blacklist
        const blacklistKey = `deletedConversations_${normalizeEmail(userData.email)}`;
        const blacklistRaw = await AsyncStorage.getItem(blacklistKey);
        const blacklist = blacklistRaw ? JSON.parse(blacklistRaw) : [];
        const blacklistTimestamps = {};
        blacklist.forEach((item) => {
          if (typeof item === 'object' && item.email && item.timestamp) {
            blacklistTimestamps[normalizeEmail(item.email)] = item.timestamp;
          }
        });

        console.log('🧾 Todas las conversaciones:', myConversations.map(c => c.user));
        const rebuiltConvs = myConversations.map((conv) => {
          const normalizedFrom = normalizeEmail(conv.from);
          const normalizedTo = normalizeEmail(conv.to);
          const currentUser = normalizeEmail(userData.email);
          const otherUser = normalizedFrom === currentUser ? normalizedTo : normalizedFrom;

          return {
            ...conv,
            user: conv.user || otherUser,
          };
        });

        const filteredConversations = rebuiltConvs.filter((conv) => {
          const otherUser = conv.user;
          const deletedAt = blacklistTimestamps[normalizeEmail(otherUser)] || 0;
          const lastMsg = conv.messages?.[conv.messages.length - 1];

          let msgTime = 0;
          if (lastMsg?.timestamp?.seconds) {
            msgTime = new Date(lastMsg.timestamp.seconds * 1000).getTime();
          } else if (typeof lastMsg?.timestamp === 'string') {
            msgTime = new Date(lastMsg.timestamp).getTime();
          }

          const isYouSender = normalizeEmail(lastMsg?.from || '') === normalizeEmail(userData.email);
          const isAfterDeleted = msgTime > deletedAt;
          const showConv = deletedAt === 0 || isAfterDeleted || conv.messages.length > 0;

          console.log(`🧪 ${otherUser} - deletedAt: ${deletedAt} - msgTime: ${msgTime} - isYouSender: ${isYouSender} - mostrar: ${showConv}`);

          return showConv;
        });

        console.log('📨 Conversaciones cargadas (sin blacklist):', myConversations.length);
        console.log('🚫 Emails eliminados:', blacklist.map(b => b.email));
        console.log('✅ Conversaciones finales:', filteredConversations.length);
        setConversations(filteredConversations);

        const safe = (allMessages || []).map((conv) => {
          const otherUser = normalizeEmail(conv.from === userData.email ? conv.to : conv.from);
          const entry = blacklist.find((b) => b.email === otherUser);
          const deletedAt = entry?.timestamp || 0;

          const filteredMessages = (conv.messages || []).filter((m) => {
            const timestamp = new Date(m.timestamp).getTime();
            return !entry || timestamp > deletedAt;
          });

          return {
            ...conv,
            messages: filteredMessages.slice(-50),
          };
        });

        await AsyncStorage.setItem('professionalMessages', JSON.stringify(allMessages));

        const rebuilt = safe.map((conv) => {
          const hasUser = !!conv.user;
          const fallbackUser =
            normalizeEmail(conv.from) === normalizeEmail(userData.email)
              ? normalizeEmail(conv.to)
              : normalizeEmail(conv.from);

          return {
            ...conv,
            user: hasUser ? normalizeEmail(conv.user) : fallbackUser,
          };
        });

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

        const grouped = {};

        rebuilt.forEach((conv) => {
          const normalizedFrom = normalizeEmail(conv.from);
          const normalizedTo = normalizeEmail(conv.to);
          const currentUser = normalizeEmail(userData.email);
          const otherUser = normalizedFrom === currentUser ? normalizedTo : normalizedFrom;

          if (!grouped[otherUser]) {
            grouped[otherUser] = {
              ...conv,
              messages: [...(conv.messages || [])],
            };
          } else {
            const existingMessages = grouped[otherUser].messages || [];
            const newMessages = conv.messages || [];

            const mergedMessages = [
              ...existingMessages,
              ...newMessages.filter(
                (newMsg) =>
                  !existingMessages.some((oldMsg) => oldMsg.id === newMsg.id)
              ),
            ];

            mergedMessages.sort((a, b) => {
              const tA = new Date(a.timestamp).getTime();
              const tB = new Date(b.timestamp).getTime();
              return tA - tB;
            });

            grouped[otherUser].messages = mergedMessages;
          }
        });

        const formatted = Object.entries(grouped).map(([user, messageObj]) => {
          const lastMsg = messageObj.messages?.at(-1);
          console.log('🧩 Último mensaje:', lastMsg);

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
            timestamp: (() => {
              try {
                const raw = lastMsg?.timestamp;

                if (!raw) return null;

                if (typeof raw === 'string') {
                  const d = new Date(raw);
                  return isNaN(d.getTime()) ? null : d.toISOString();
                }

                if (raw?.seconds) {
                  const d = new Date(raw.seconds * 1000);
                  return isNaN(d.getTime()) ? null : d.toISOString();
                }

                if (raw instanceof Date) {
                  return isNaN(raw.getTime()) ? null : raw.toISOString();
                }

                if (typeof raw.toDate === 'function') {
                  const d = raw.toDate();
                  return isNaN(d.getTime()) ? null : d.toISOString();
                }

                return null;
              } catch {
                return null;
              }
            })(),

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

        formatted.forEach(c =>
          console.log('🕒 Timestamp visible:', c.timestamp, new Date(c.timestamp).toLocaleString())
        );

        setConversations(formatted);
        formatted.forEach(c => console.log('🕒 Timestamp visible:', c.timestamp));

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

  const filtered = conversations.filter(
    (conv) =>
      conv &&
      conv.user &&
      normalizeEmail(conv.user) !== normalizeEmail(userData.email)
  );
  console.log('🧾 Renderizando tarjetas para:', (conversations || []).map(c => c.user));

  return (
    <View style={styles.screen}>

      {/* 🔙 Flecha real como en MenuScreen */}
      <TouchableOpacity
        onPress={() => { goToDashboardTab(navigation); }}
        style={{ position: 'absolute', top: 40, left: 20, zIndex: 10 }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📥 Bandeja de Entrada</Text>

        {conversations.length === 0 ? (
          <Text style={styles.empty}>Cargando conversaciones...</Text>
        ) : (
          filtered.map((conv, index) => {

            const normalizedUser = normalizeEmail(conv.user);

            const lastData = conv.lastMessageData?.profileAttachment || {};

            const profileFromStorage = allProfiles.find((p) =>
              normalizeEmail(p.email) === normalizedUser || normalizeEmail(p.id) === normalizedUser
            );

            const profileToUse = {
              name:
                profileFromStorage?.agencyName?.trim() ||
                profileFromStorage?.name?.trim() ||
                lastData?.agencyName?.trim() ||
                lastData?.name?.trim() ||
                conv.user,
              profilePhotoUrl:
                profileFromStorage?.profilePhotoUrl ||
                profileFromStorage?.profilePhoto ||
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

            const displayName = profileToUse.name || conv.user;
            const profilePhotoUrl = profileToUse.profilePhotoUrl;
            console.log('🕒 Timestamp visible:', conv.timestamp);

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
                      <Text style={styles.user} numberOfLines={1} ellipsizeMode="tail">
                        {displayName}
                      </Text>
                    </View>

                    <Text style={styles.preview} numberOfLines={1} ellipsizeMode="tail">
                      ✉️ {conv.lastMessage || ''}
                    </Text>

                    <Text style={styles.timestamp}>
                      {conv.timestamp && !isNaN(new Date(conv.timestamp).getTime())
                        ? new Date(conv.timestamp).toLocaleDateString('es-CL', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
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

        {/* ⛔️ Quitado el BackButton burbuja */}
        {/* <BackButton /> */}

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
    padding: 10,
    paddingBottom: 100,
    marginTop: Platform.OS === 'ios' ? 48 : 25,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#D8A353',
    textAlign: 'center',
    marginBottom: 30,
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
    marginBottom: 5,
    alignSelf: 'center',
    width: '100%',
    elevation: 1,
    height: 84,
    overflow: 'hidden'
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
