import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

const normalizeEmail = (email) =>
  email?.toLowerCase().trim().replace(/\s+/g, '').replace(/[^a-z0-9@._\-+]/gi, '');

export const sendMessage = async ({ userEmail, targetEmail, messageText, allProfiles = [] }) => {
  try {
    const normalizedUser = normalizeEmail(userEmail);
    const normalizedTarget = normalizeEmail(targetEmail);
    const msgId = uuidv4();

    const userJson = await AsyncStorage.getItem('userProfile');
    const user = userJson ? JSON.parse(userJson) : null;
    if (!user) throw new Error('Usuario no encontrado en AsyncStorage');

    // Nombre del remitente para que la Cloud Function lo use
    const senderDisplayName =
      (user?.displayName ||
        user?.name ||
        user?.fullName ||
        user?.agencyName ||
        (normalizedUser?.split('@')[0] || '')
      ).trim();

    const profileAttachment = (() => {
      const found = allProfiles.find(
        (p) => normalizeEmail(p.email) === normalizedTarget
      );
      return found
        ? {
            name: found.name || found.agencyName || normalizedTarget,
            email: normalizedTarget,
            profilePhotoUrl: found.profilePhotoUrl || null,
            membershipType: found.membershipType || '',
          }
        : {
            name: normalizedTarget,
            email: normalizedTarget,
            profilePhotoUrl: null,
            membershipType: '',
          };
    })();

    // 👉 Guarda el mensaje (con fromDisplayName) y deja que el BACKEND cree la tarjeta de notificación
    await addDoc(collection(db, 'mensajes'), {
      id: msgId,
      from: normalizedUser,
      to: normalizedTarget,
      text: messageText.trim(),
      timestamp: serverTimestamp(),
      read: false,
      fromDisplayName: senderDisplayName,
    });

    // ⬇️⛔️ Eliminado: creación de tarjeta en `notifications/.../items` desde el cliente
    // (Lo hace la Cloud Function con `displayName` correcto)

    // Guarda el mensaje localmente en professionalMessages (sin cambios)
    const previousRaw = await AsyncStorage.getItem('professionalMessages');
    let previousConvs = previousRaw ? JSON.parse(previousRaw) : [];

    const newMessage = {
      id: msgId,
      from: normalizedUser,
      to: normalizedTarget,
      text: messageText.trim(),
      timestamp: { seconds: Math.floor(Date.now() / 1000) },
      read: false,
      profileAttachment,
    };

    const keyMap = new Map();
    for (const conv of previousConvs) {
      const key = [normalizeEmail(conv.from), normalizeEmail(conv.to)].sort().join('_');
      keyMap.set(key, conv);
    }

    const newKey = [normalizedUser, normalizedTarget].sort().join('_');
    const existingConv = keyMap.get(newKey);

    if (existingConv) {
      existingConv.messages.push(newMessage);
      existingConv.lastMessage = newMessage;
      existingConv.timestamp = new Date().toISOString();
    } else {
      keyMap.set(newKey, {
        from: normalizedUser,
        to: normalizedTarget,
        messages: [newMessage],
        lastMessage: newMessage,
        timestamp: new Date().toISOString(),
        user: normalizedTarget, // siempre el otro contacto
        profileAttachment,
      });
    }

    const mergedConversations = Array.from(keyMap.values()).map((conv) => ({
      ...conv,
      messages: conv.messages.slice(-50),
      profileAttachment: conv.profileAttachment || {
        name: conv.user,
        email: conv.user,
        profilePhoto: null,
        membershipType: 'free',
        category: [],
      },
    }));

    await AsyncStorage.setItem('professionalMessages', JSON.stringify(mergedConversations));
    console.log('💾 Conversaciones guardadas. Total:', mergedConversations.length);

    return { success: true, messageId: msgId };
  } catch (error) {
    console.error('❌ Error en sendMessage:', error.message);
    return { success: false, error: error.message };
  }
};
