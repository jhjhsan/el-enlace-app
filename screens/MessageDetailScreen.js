import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import BackButton from '../components/BackButton';
import { onSnapshot, collection, query, where, orderBy, getDocs, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../src/firebase/firebaseConfig';
import { guardarAllProfiles } from '../src/firebase/helpers/profileHelpers';

export default function MessageDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const flatListRef = useRef(null);
  const {
    contactEmail = '',
    recipientEmail = '',
    profileAttachment = null,
    isNewConversation = false,
  } = route.params || {};

  const targetEmail = (contactEmail || recipientEmail || '').trim().toLowerCase();
  const [contactName, setContactName] = useState('');
  const { userData } = useUser();
  const [conversation, setConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [myMessageCount, setMyMessageCount] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  console.log('🧪 route.params recibido:', JSON.stringify(route.params, null, 2));
  console.log('🧪 isNewConversation:', isNewConversation);

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

  const loadInitialConversation = async () => {
    try {
      const json = await AsyncStorage.getItem('professionalMessages');
      if (!json) {
        console.log('🔍 professionalMessages vacío en AsyncStorage');
        return null;
      }

      const allMessages = JSON.parse(json);
      if (!Array.isArray(allMessages)) {
        console.log('🔍 professionalMessages no es un array:', allMessages);
        return null;
      }

      const messageMap = {};
      allMessages.forEach((msg) => {
        const key =
          (msg.from === normalizeEmail(userData.email) && msg.to === normalizeEmail(targetEmail)) ||
          (msg.from === normalizeEmail(targetEmail) && msg.to === normalizeEmail(userData.email))
            ? `${normalizeEmail(userData.email)}_${normalizeEmail(targetEmail)}`
            : null;

        if (key && !msg.archived) messageMap[key] = msg;
      });

      const match = messageMap[`${normalizeEmail(userData.email)}_${normalizeEmail(targetEmail)}`];
      if (match) {
        console.log('🔍 Conversación encontrada en AsyncStorage:', JSON.stringify(match, null, 2));
        const sentByMe = match.messages.filter((m) => m.sender === normalizeEmail(userData.email));
        setMyMessageCount(sentByMe.length);
        return match;
      }
      console.log('🔍 No se encontró conversación en AsyncStorage para:', targetEmail);
      return null;
    } catch (error) {
      console.error('❌ Error en loadInitialConversation:', error);
      return null;
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

        await AsyncStorage.removeItem('professionalMessages');
        await loadContactName();
        setIsLoading(false);

        const q = query(
          collection(db, 'mensajes'),
          where('from', 'in', [normalizedUser, normalizedTarget]),
          where('to', 'in', [normalizedUser, normalizedTarget]),
          orderBy('timestamp', 'asc')
        );

        unsubscribe = onSnapshot(q, async (snapshot) => {
          console.log(`📡 Mensajes recibidos para ${normalizedUser} <-> ${normalizedTarget}: ${snapshot.size}`);
          snapshot.docs.forEach((doc) => {
            console.log(`🔍 Mensaje ID: ${doc.id}, Data:`, doc.data());
          });

          const rawMessages = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter(
              (msg) =>
                (msg.from === normalizedUser && msg.to === normalizedTarget) ||
                (msg.from === normalizedTarget && msg.to === normalizedUser)
            );

          const seen = new Set();
          const uniqueMessages = rawMessages.filter((msg) => {
            const key = msg.id || `${msg.sender}_${msg.timestamp?.seconds || msg.timestamp}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }).sort((a, b) => {
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
            const existingRaw = await AsyncStorage.getItem('professionalMessages');
            const existingConversations = existingRaw ? JSON.parse(existingRaw) : [];

            const filtered = existingConversations.filter(
              (conv) =>
                !(
                  (conv.from === normalizedUser && conv.to === normalizedTarget) ||
                  (conv.from === normalizedTarget && conv.to === normalizedUser)
                )
            );

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

            const newConversation = {
              ...updatedConversation,
              messages: safeMessages,
            };

            await AsyncStorage.setItem(
              'professionalMessages',
              JSON.stringify([newConversation, ...filtered])
            );

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

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      Alert.alert('Campo vacío', 'Escribe un mensaje antes de enviarlo.');
      return;
    }

    if (myMessageCount >= 20) {
      setShowLimitModal(true);
      return;
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
        console.log('🔍 Perfil no encontrado en allProfiles. Buscando en Firestore...');
        try {
          const { getProfileFromFirestore } = require('../src/firebase/helpers/getProfileFromFirestore');
          const firestoreProfile = await getProfileFromFirestore(targetEmail, 'free');

          if (firestoreProfile) {
            foundProfile = firestoreProfile;

            const current = await AsyncStorage.getItem('allProfiles');
            const currentList = current ? JSON.parse(current) : [];
            const updatedList = [...currentList, firestoreProfile];
            await guardarAllProfiles(updatedList);

            console.log('🧠 ➕ Añadido userData manualmente a allProfiles:', firestoreProfile.email);
          } else {
            console.warn('⚠️ No se encontró un perfil con ese email en Firestore.');
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

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D8A353" />
        </View>
      ) : !targetEmail ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se puede iniciar conversación (sin destinatario).</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <BackButton color="#fff" size={28} top={45} left={20} />

          <View style={styles.header}>
            <Text style={[styles.contactName, { marginLeft: 50 }]}>
              {contactName}
            </Text>
            <TouchableOpacity
              onPress={async () => {
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
                    console.log('❌ No se encontró el perfil para el email:', normalizedEmail);
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
              }}
            >
              <Text style={styles.viewProfile}>🔍 Ver perfil</Text>
            </TouchableOpacity>
          </View>

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
              renderItem={({ item }) => {
                const isMine = item.sender === normalizeEmail(userData.email);
                return (
                  <View
                    style={[
                      styles.messageBubble,
                      isMine ? styles.myMessage : styles.theirMessage
                    ]}
                  >
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

          <Modal visible={showLimitModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>📨 Límite de mensajes alcanzado</Text>
                <Text style={styles.modalText}>
                  Has enviado 20 mensajes en esta conversación. Te recomendamos continuar por WhatsApp, correo u otro medio directo.
                </Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowLimitModal(false)}
                >
                  <Text style={styles.modalButtonText}>Entendido</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 40,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomColor: '#D8A353',
    borderBottomWidth: 1,
  },
  contactName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewProfile: {
    color: '#D8A353',
    fontSize: 14,
  },
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