// screens/MessageDetailScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
// ⛔️ Eliminado: import BackButton from '../components/BackButton';
import { onSnapshot, collection, query, where, orderBy, getDocs, updateDoc, addDoc, Timestamp, doc } from 'firebase/firestore';
import { db } from '../src/firebase/firebaseConfig';
import { guardarAllProfiles } from '../src/firebase/helpers/profileHelpers';
import eventBus from '../utils/eventBus';
import { Ionicons } from '@expo/vector-icons';
// ✅ Agregado para usar misma navegación que Menu/Inbox
import { goToDashboardTab } from '../utils/navigationHelpers';

export default function MessageDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const flatListRef = useRef(null);

  const {
    contactEmail = '',
    recipientEmail = '',
    profileAttachment = null,
    isNewConversation = false,
    contactName: initialContactName = '',
  } = route.params || {};

  const targetEmail = (contactEmail || recipientEmail || '').trim().toLowerCase();
  const [contactName, setContactName] = useState(initialContactName || '');

  useEffect(() => {
    const finalTitle = contactName && contactName !== targetEmail ? contactName : initialContactName;
    if (finalTitle && finalTitle !== targetEmail) {
      navigation.setOptions({ title: finalTitle });
    }
  }, [contactName, initialContactName]);

  const { userData } = useUser();
  const [conversation, setConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [myMessageCount, setMyMessageCount] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [lastContacted, setLastContacted] = useState(null);

  // Estado de moderación
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  // Menú de acciones (⋮)
  const [showActions, setShowActions] = useState(false);

  const normalizeEmail = (email) => {
    if (!email || typeof email !== 'string') return '';
    return email
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9@._\-+]/gi, '')
      .replace(/@{2,}/g, '@');
  };

  const updateUnread = async () => {
    try {
      const json = await AsyncStorage.getItem('userProfile');
      const user = json ? JSON.parse(json) : null;
      if (!user) return;

      const stored = await AsyncStorage.getItem(`notifications_${user.id}`);
      const local = stored ? JSON.parse(stored) : [];
      const unreadCount = local.filter((n) => !n.read).length;
      await AsyncStorage.setItem('unreadCount', unreadCount.toString());
      console.log('🔁 Contador actualizado localmente:', unreadCount);
    } catch (error) {
      console.error('❌ Error actualizando unreadCount local:', error);
    }
  };

  const loadContactName = async () => {
    try {
      const storedProfiles = await AsyncStorage.multiGet([
        'allProfiles',
        'allProfilesPro',
        'allProfilesElite',
      ]);

      const allProfiles = storedProfiles
        .map(([_, value]) => JSON.parse(value || '[]'))
        .flat();

      const matched = allProfiles.find((p) => normalizeEmail(p.email) === normalizeEmail(targetEmail));
      setContactName(matched?.name || matched?.agencyName || targetEmail);
    } catch (error) {
      console.error('❌ Error cargando nombre del contacto:', error);
      setContactName(targetEmail);
    }
  };

  useEffect(() => {
    const loadLastContacted = async () => {
      try {
        const raw = await AsyncStorage.getItem(`lastContacted_${userData.email}`);
        if (raw) {
          setLastContacted(JSON.parse(raw));
        }
      } catch (e) {
        console.log('❌ Error cargando lastContacted:', e.message);
      }
    };
    if (userData?.email) loadLastContacted();
  }, [userData?.email]);

  // Cargar estado bloqueado
  useEffect(() => {
    const loadBlocked = async () => {
      try {
        const me = normalizeEmail(userData?.email);
        const other = normalizeEmail(targetEmail);
        if (!me || !other) return;

        const key = `deletedConversations_${me}`;
        const raw = await AsyncStorage.getItem(key);
        const list = raw ? JSON.parse(raw) : [];
        setIsBlocked(list.some(i => i.email === other));
      } catch (_) {}
    };
    loadBlocked();
  }, [userData?.email, targetEmail]);

  // Listener de mensajes
  useEffect(() => {
    if (!userData?.email || !targetEmail) {
      Alert.alert('Error', 'No se pudo cargar la conversación.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      setIsLoading(false);
      return;
    }

    let unsubscribe = null;
    const initialize = async () => {
      try {
        const normalizedUser = normalizeEmail(userData.email);
        const normalizedTarget = normalizeEmail(targetEmail);

        const existingRaw = await AsyncStorage.getItem('professionalMessages');
        if (existingRaw) {
          try {
            const parsed = JSON.parse(existingRaw);
            if (!Array.isArray(parsed)) {
              await AsyncStorage.removeItem('professionalMessages');
            }
          } catch {
            await AsyncStorage.removeItem('professionalMessages');
          }
        }

        await loadContactName();
        if (!initialContactName && contactName && contactName !== targetEmail) {
          navigation.setParams({ contactName });
        }

        setIsLoading(false);

        const q = query(
          collection(db, 'mensajes'),
          where('from', 'in', [normalizedUser, normalizedTarget]),
          where('to', 'in', [normalizedUser, normalizedTarget]),
          orderBy('timestamp', 'asc')
        );

        unsubscribe = onSnapshot(q, async (snapshot) => {
          const rawMessages = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter(
              (msg) =>
                (msg.from === normalizedUser && msg.to === normalizedTarget) ||
                (msg.from === normalizedTarget && msg.to === normalizedUser)
            );

          const seen = new Set();
          const uniqueMessages = rawMessages
            .filter((msg) => {
              const key = msg.id || `${msg.sender}_${msg.timestamp?.seconds || msg.timestamp}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            })
            .sort((a, b) => {
              const aTime = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp).getTime();
              const bTime = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp).getTime();
              return aTime - bTime;
            });

          if (!uniqueMessages.length) return;

          const updatedConversation = {
            id: `${normalizedUser}_${normalizedTarget}`,
            from: normalizedUser,
            to: normalizedTarget,
            user: normalizedTarget,
            messages: uniqueMessages.map((msg) => ({
              id: msg.id || undefined,
              sender: msg.from,
              text: msg.text,
              timestamp: msg.timestamp,
              read: msg.read || false,
            })),
            archived: false,
            profileAttachment: profileAttachment || {
              name: targetEmail,
              email: targetEmail,
              profilePhotoUrl: null,
              membershipType: '',
            },
          };

          setConversation(updatedConversation);
          setIsLoading(false);

          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 300);

          try {
            const safeMessages = [...uniqueMessages]
              .sort((a, b) => {
                const aTime = a.timestamp?.seconds || 0;
                const bTime = b.timestamp?.seconds || 0;
                return bTime - aTime;
              })
              .slice(0, 50)
              .reverse()
              .map((msg) => ({
                id: msg.id || undefined,
                sender: msg.from,
                text: msg.text,
                timestamp: msg.timestamp,
                read: msg.read || false,
              }));

            const prevRaw = await AsyncStorage.getItem('professionalMessages');
            const prevList = prevRaw ? JSON.parse(prevRaw) : [];
            const others = prevList.filter(
              (conv) =>
                !(
                  (conv.from === normalizedUser && conv.to === normalizedTarget) ||
                  (conv.from === normalizedTarget && conv.to === normalizedUser)
                )
            );

            const newConversation = { ...updatedConversation, messages: safeMessages };
            const deduplicated = [newConversation, ...others];

            await AsyncStorage.setItem('professionalMessages', JSON.stringify(deduplicated));
            console.log('📥 Conversación guardada localmente sin duplicados');
          } catch (e) {
            console.error('❌ Error guardando conversación limpia:', e);
          }

          await markMessagesAsRead(updatedConversation);
        });
      } catch (err) {
        console.error('❌ Error en initialize:', err);
      }
    };

    initialize();
    return () => {
      if (unsubscribe) {
        console.log('🛑 Listener Firestore desmontado');
        unsubscribe();
      }
    };
  }, [userData?.email, targetEmail, isNewConversation, profileAttachment]);

  useEffect(() => {
    if (!initialContactName && contactName && contactName !== targetEmail) {
      navigation.setParams({ contactName });
    }
  }, [contactName]);

  const markMessagesAsRead = async (conv) => {
    try {
      const json = await AsyncStorage.getItem('professionalMessages');
      const allMessages = json ? JSON.parse(json) : [];

      if (!Array.isArray(allMessages)) {
        console.warn('⚠️ professionalMessages no es un array válido');
        return;
      }

      const updatedConversations = allMessages.map((c) => {
        const isMatch =
          (c.from === normalizeEmail(userData.email) && c.to === normalizeEmail(targetEmail)) ||
          (c.from === normalizeEmail(targetEmail) && c.to === normalizeEmail(userData.email));

        if (!isMatch) return c;

        const updatedMessages = c.messages.map((msg) => {
          if (msg.sender !== normalizeEmail(userData.email) && !msg.read) {
            return { ...msg, read: true };
          }
          return msg;
        });

        return { ...c, messages: updatedMessages };
      });

      await AsyncStorage.setItem('professionalMessages', JSON.stringify(updatedConversations));
      console.log('✅ Mensajes marcados como leídos y guardados');

      await updateUnread();
      await markMessagesAsReadInFirestore(userData.email, targetEmail);

      try {
        const notifKey = `notifications_${userData.id}`;
        const storedNotifs = await AsyncStorage.getItem(notifKey);
        let parsed = storedNotifs ? JSON.parse(storedNotifs) : [];

        let updated = false;
        parsed = parsed.map((n) => {
          if (
            n.type === 'mensaje' &&
            normalizeEmail(n.sender) === normalizeEmail(targetEmail) &&
            !n.read
          ) {
            updated = true;
            return { ...n, read: true };
          }
          return n;
        });

        if (updated) {
          await AsyncStorage.setItem(notifKey, JSON.stringify(parsed));
          eventBus.emit('notificationsUpdated');
          console.log('🔔 Notificaciones marcadas como leídas desde inbox');
        }

        const matched = parsed.find(
          (n) =>
            n.type === 'mensaje' &&
            normalizeEmail(n.sender) === normalizeEmail(targetEmail) &&
            n.firebaseId
        );

        if (matched?.firebaseId) {
          const docRef = doc(
            db,
            'notifications',
            normalizeEmail(userData.email),
            'items',
            matched.firebaseId
          );
          await updateDoc(docRef, { read: true });
          console.log('📝 Notificación marcada como leída en Firestore desde inbox');
        }
      } catch (err) {
        console.error('❌ Error marcando notificaciones desde inbox:', err);
      }
    } catch (error) {
      console.error('❌ Error marcando como leídos:', error);
    }
  };

  const markMessagesAsReadInFirestore = async (userEmail, contactEmail) => {
    try {
      const normalizedUser = normalizeEmail(userEmail);
      const normalizedTarget = normalizeEmail(contactEmail);

      const q = query(
        collection(db, 'mensajes'),
        where('from', 'in', [normalizedUser, normalizedTarget]),
        where('to', 'in', [normalizedUser, normalizedTarget]),
        orderBy('timestamp', 'asc')
      );

      const snapshot = await getDocs(q);
      const updates = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        const isFromTargetToUser =
          data.from === normalizedTarget &&
          data.to === normalizedUser &&
          data.read === false;

        if (isFromTargetToUser) {
          updates.push(updateDoc(docSnap.ref, { read: true }));
        }
      });

      await Promise.all(updates);
      console.log(`✅ ${updates.length} mensajes marcados como leídos en Firestore`);
    } catch (err) {
      console.error('❌ Error al marcar mensajes como leídos en Firestore:', err);
    }
  };

  // --- Moderación: handlers ---
  const openReport = () => {
    setShowActions(false);
    setShowReportModal(true);
  };
  const confirmReport = async () => {
    setShowReportModal(false);
    Alert.alert('Reporte enviado', `Revisaremos a ${contactName || targetEmail}.`);
  };

  const openBlockToggle = () => {
    setShowActions(false);
    setShowBlockModal(true);
  };

  const confirmBlock = async () => {
    setShowBlockModal(false);
    try {
      const me = normalizeEmail(userData.email);
      const other = normalizeEmail(targetEmail);
      const key = `deletedConversations_${me}`;
      const raw = await AsyncStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      if (!list.find(i => i.email === other)) {
        list.push({ email: other, at: Date.now() });
        await AsyncStorage.setItem(key, JSON.stringify(list));
      }
      setIsBlocked(true);
      Alert.alert('Usuario bloqueado', 'No verás más mensajes de este contacto.');
    } catch {
      Alert.alert('Error', 'No se pudo bloquear al usuario.');
    }
  };

  const confirmUnblock = async () => {
    setShowBlockModal(false);
    try {
      const me = normalizeEmail(userData.email);
      const other = normalizeEmail(targetEmail);
      const key = `deletedConversations_${me}`;
      const raw = await AsyncStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      const next = list.filter(i => i.email !== other);
      await AsyncStorage.setItem(key, JSON.stringify(next));
      setIsBlocked(false);
      Alert.alert('Desbloqueado', 'Este contacto ha sido desbloqueado.');
    } catch {
      Alert.alert('Error', 'No se pudo desbloquear al usuario.');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      Alert.alert('Campo vacío', 'Escribe un mensaje antes de enviarlo.');
      return;
    }

    if (userData?.membershipType === 'free') {
      const json = await AsyncStorage.getItem('professionalMessages');
      const convs = json ? JSON.parse(json) : [];
      const uniqueEmails = [
        ...new Set(
          convs
            .filter((c) =>
              normalizeEmail(c.from) === normalizeEmail(userData.email) ||
              normalizeEmail(c.to) === normalizeEmail(userData.email)
            )
            .map((c) =>
              normalizeEmail(c.from) === normalizeEmail(userData.email)
                ? normalizeEmail(c.to)
                : normalizeEmail(c.from)
            )
        ),
      ];
      if (!uniqueEmails.includes(normalizeEmail(targetEmail)) && uniqueEmails.length >= 1) {
        setShowUpgradeModal(true);
        return;
      }
    }

    setIsSending(true);
    try {
      const normalizedUser = normalizeEmail(userData.email);
      const normalizedTarget = normalizeEmail(targetEmail);

      const storedProfiles = await AsyncStorage.multiGet([
        'allProfiles',
        'allProfilesPro',
        'allProfilesElite',
      ]);

      const allProfiles = storedProfiles
        .map(([_, value]) => JSON.parse(value || '[]'))
        .flat();

      let foundProfile = allProfiles.find((p) => normalizeEmail(p.email) === normalizedTarget);

      if (!foundProfile) {
        try {
          const { getProfileFromFirestore } = require('../src/firebase/helpers/getProfileFromFirestore');
          const firestoreProfile = await getProfileFromFirestore(targetEmail, 'free');

          if (firestoreProfile) {
            foundProfile = firestoreProfile;
            const current = await AsyncStorage.getItem('allProfiles');
            const currentList = current ? JSON.parse(current) : [];
            const updatedList = [...currentList, firestoreProfile];
            await guardarAllProfiles(updatedList);
          }
        } catch (err) {
          console.error('❌ Error buscando perfil Free en Firestore:', err);
        }
      }

      const defaultAttachment = {
        name: foundProfile?.name || foundProfile?.agencyName || targetEmail,
        email: normalizedTarget,
        profilePhotoUrl: foundProfile?.profilePhotoUrl || null,
        membershipType: foundProfile?.membershipType || '',
      };

      await addDoc(collection(db, 'mensajes'), {
        from: normalizedUser,
        to: normalizedTarget,
        text: newMessage.trim(),
        timestamp: Timestamp.now(),
        read: false,
        profileAttachment: defaultAttachment,
      });

      setNewMessage('');
      setMyMessageCount((prev) => prev + 1);
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar el mensaje.');
      console.error('❌ Error enviando mensaje:', error);
    }
    setIsSending(false);
  };

  const shouldShowConversation = !!conversation && Array.isArray(conversation.messages);

  // Navegar a perfil (reutilizado en el menú)
  const handleViewProfile = async () => {
    try {
      const normalizedEmail = normalizeEmail(targetEmail);
      const storedProfiles = await AsyncStorage.multiGet([
        'allProfiles',
        'allProfilesPro',
        'allProfilesElite',
      ]);

      const allProfiles = storedProfiles
        .map(([_, value]) => {
          try {
            return JSON.parse(value || '[]');
          } catch {
            return [];
          }
        })
        .flat();

      const matchedProfile = allProfiles.find((p) => {
        const profileEmail = normalizeEmail(p.email);
        return profileEmail === normalizedEmail;
      });

      if (!matchedProfile) {
        Alert.alert('Error', 'No se encontró el perfil del remitente.');
        return;
      }

      const routeName =
        matchedProfile.membershipType === 'elite'
          ? 'ProfileElite'
          : matchedProfile.membershipType === 'pro'
          ? 'ProfilePro'
          : 'Profile';

      navigation.navigate(routeName, {
        viewedProfile: matchedProfile,
        isExternal: true,
      });
    } catch (err) {
      console.error('🔥 Error navegando al perfil:', err);
      Alert.alert('Error', 'Ocurrió un problema al abrir el perfil.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D8A353" />
          </View>
        ) : !targetEmail ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>No se puede iniciar conversación (sin destinatario).</Text>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>Volver</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* 🔙 Flecha real como en Menu/Inbox */}
            <TouchableOpacity
              onPress={() => { goToDashboardTab(navigation); }}
              style={{ position: 'absolute', top: 45, left: 20, zIndex: 10 }}
            >
              <Ionicons name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>

            {/* HEADER */}
            <View style={styles.header}>
              {/* Fila con nombre y botón de acciones (⋮) */}
              <View style={styles.headerBottomRow}>
                <Text style={styles.contactName} numberOfLines={1}>
                  {contactName}
                </Text>

                {normalizeEmail(userData.email) !== normalizeEmail(targetEmail) && (
                  <TouchableOpacity
                    onPress={() => setShowActions(true)}
                    style={styles.menuTrigger}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color="#D8A353" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* MENÚ DE ACCIONES */}
            <Modal visible={showActions} transparent animationType="fade" onRequestClose={() => setShowActions(false)}>
              <TouchableOpacity style={styles.actionsOverlay} activeOpacity={1} onPress={() => setShowActions(false)}>
                <View style={styles.actionsCard}>
                  <TouchableOpacity style={styles.actionItem} onPress={handleViewProfile}>
                    <Ionicons name="search" size={16} color="#D8A353" />
                    <Text style={styles.actionText}>Ver perfil</Text>
                  </TouchableOpacity>

                  <View style={styles.separator} />

                  <TouchableOpacity style={[styles.actionItem, styles.actionDanger]} onPress={openReport}>
                    <Ionicons name="alert-circle" size={16} color="#fff" />
                    <Text style={[styles.actionText, styles.actionDangerText]}>Reportar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionItem,
                      isBlocked ? styles.actionSuccess : styles.actionNeutral,
                    ]}
                    onPress={openBlockToggle}
                  >
                    <Ionicons
                      name={isBlocked ? 'checkmark-circle' : 'remove-circle'}
                      size={16}
                      color="#fff"
                    />
                    <Text
                      style={[
                        styles.actionText,
                        isBlocked ? styles.actionSuccessText : styles.actionNeutralText,
                      ]}
                    >
                      {isBlocked ? 'Desbloquear' : 'Bloquear'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>

            {/* CHAT */}
            {shouldShowConversation ? (
              <FlatList
                ref={flatListRef}
                data={conversation.messages}
                keyExtractor={(item, index) =>
                  `${item.sender}_${typeof item.timestamp === 'string' ? item.timestamp : item.timestamp?.seconds || Date.now()}_${index}`
                }
                contentContainerStyle={styles.chatContainer}
                initialNumToRender={10}
                windowSize={5}
                maxToRenderPerBatch={10}
                inverted={false}
                onContentSizeChange={() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const isMine = item.sender === normalizeEmail(userData.email);
                  return (
                    <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}>
                      <Text style={styles.messageText}>{item.text}</Text>
                    </View>
                  );
                }}
              />
            ) : (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}></Text>
              </View>
            )}

            {/* INPUT */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Escribe un mensaje..."
                placeholderTextColor="#aaa"
                value={newMessage}
                onChangeText={setNewMessage}
              />
              <TouchableOpacity
                onPress={handleSendMessage}
                style={[styles.sendButton, isSending && { opacity: 0.6 }]}
                disabled={isSending}
              >
                <Text style={styles.sendButtonText}>
                  {isSending ? 'Enviando...' : 'Enviar'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Modal Upgrade Plan */}
            <Modal visible={showUpgradeModal} transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>🔒 Solo con Plan Pro</Text>
                  <Text style={styles.modalText}>
                    Ya tienes una conversación activa. Suscríbete a Pro para contactar a más talentos o agencias.
                  </Text>

                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => {
                      setShowUpgradeModal(false);
                      navigation.navigate('Subscription');
                    }}
                  >
                    <Text style={styles.modalButtonText}>💳 Ver Planes Pro</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setShowUpgradeModal(false)}
                    style={[styles.modalButton, { backgroundColor: '#333', marginTop: 10 }]}
                  >
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Modal Límite */}
            <Modal visible={showLimitModal} transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>📨 Límite de mensajes alcanzado</Text>
                  <Text style={styles.modalText}>
                    Has enviado 20 mensajes en esta conversación. Te recomendamos continuar por WhatsApp, correo u otro medio directo.
                  </Text>
                  <TouchableOpacity style={styles.modalButton} onPress={() => setShowLimitModal(false)}>
                    <Text style={styles.modalButtonText}>Entendido</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Modal Reportar */}
            <Modal visible={showReportModal} transparent animationType="fade" onRequestClose={() => setShowReportModal(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Reportar usuario</Text>
                  <Text style={styles.modalText}>¿Seguro que deseas reportar a {contactName || targetEmail}?</Text>

                  <TouchableOpacity style={styles.modalButton} onPress={confirmReport}>
                    <Text style={styles.modalButtonText}>Sí, reportar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#333', marginTop: 10 }]} onPress={() => setShowReportModal(false)}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Modal Bloquear/Desbloquear */}
            <Modal visible={showBlockModal} transparent animationType="fade" onRequestClose={() => setShowBlockModal(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{isBlocked ? 'Desbloquear usuario' : 'Bloquear usuario'}</Text>
                  <Text style={styles.modalText}>
                    {isBlocked
                      ? `¿Deseas desbloquear a ${contactName || targetEmail}?`
                      : `¿Seguro que deseas bloquear a ${contactName || targetEmail}? No verás más sus mensajes.`}
                  </Text>

                  <TouchableOpacity style={styles.modalButton} onPress={isBlocked ? confirmUnblock : confirmBlock}>
                    <Text style={styles.modalButtonText}>{isBlocked ? 'Sí, desbloquear' : 'Sí, bloquear'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#333', marginTop: 10 }]} onPress={() => setShowBlockModal(false)}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'ios' ? 56 : 40, // ↓ baja un poco el contenido solo en iOS
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },

  /* HEADER */
  header: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 5,
    paddingHorizontal: 25,
    borderBottomColor: '#D8A353',
    borderBottomWidth: 1,
  },

  // Fila con nombre y botón de menú
  headerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 40, // evita chocar con la flecha back
    flex: 1,
  },
  menuTrigger: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },

  /* MENÚ flotante */
  actionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 90,
    paddingRight: 12,
  },
  actionsCard: {
    backgroundColor: '#121212',
    borderColor: '#2a2a2a',
    borderWidth: 1,
    borderRadius: 12,
    minWidth: 180,
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  separator: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginHorizontal: 8,
  },
  actionDanger: {
    backgroundColor: '#B00020',
  },
  actionDangerText: { color: '#fff' },

  actionNeutral: { backgroundColor: '#5A5A5A' },
  actionNeutralText: { color: '#fff' },

  actionSuccess: { backgroundColor: '#2E7D32' },
  actionSuccessText: { color: '#fff' },

  /* CHAT */
  chatContainer: {
    flexGrow: 1,
    padding: 10,
    paddingBottom: 100,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  myMessage: {
    backgroundColor: '#D8A353',
    alignSelf: 'flex-end',
  },
  theirMessage: {
    backgroundColor: '#333',
    alignSelf: 'flex-start',
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
  },

  /* INPUT */
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#1A1A1A',
    borderTopColor: '#D8A353',
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    color: '#fff',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  sendButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },

  /* MODALES base */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
    width: '100%',
    maxWidth: 380,
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
