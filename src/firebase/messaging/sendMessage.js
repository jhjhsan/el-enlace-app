import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

const normalizeEmail = (email) =>
  email?.toLowerCase().trim().replace(/\s+/g, '').replace(/[^a-z0-9@._\-+]/gi, '');

export const sendMessage = async ({
  userEmail,
  targetEmail,
  messageText,
  allProfiles = [],
}) => {
  try {
    const normalizedUser = normalizeEmail(userEmail);
    const normalizedTarget = normalizeEmail(targetEmail);
    const msgId = uuidv4();

    // Obtener el ID del usuario desde AsyncStorage
    const userJson = await AsyncStorage.getItem('userProfile');
    const user = userJson ? JSON.parse(userJson) : null;
    if (!user) {
      throw new Error('Usuario no encontrado en AsyncStorage');
    }

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

    console.log('📝 Preparando mensaje para Firestore:', {
      id: msgId,
      from: normalizedUser,
      to: normalizedTarget,
      text: messageText.trim(),
      timestamp: '[serverTimestamp]',
      read: false,
    });

    await addDoc(collection(db, 'mensajes'), {
      id: msgId,
      from: normalizedUser,
      to: normalizedTarget,
      text: messageText.trim(),
      timestamp: serverTimestamp(),
      read: false,
    });

    console.log('✅ Mensaje enviado a Firestore');

const notifData = {
  recipient: normalizedTarget,
  type: 'mensaje',
  title: '📩 Nuevo mensaje de ' + (profileAttachment.name || 'Usuario'),
  body: messageText.trim(),
  sender: normalizedUser,
  read: false,
  timestamp: serverTimestamp(),
};

const notifCollectionRef = collection(db, 'notifications', normalizedTarget, 'items');
const notifRef = await addDoc(notifCollectionRef, {
  ...notifData,
  read: false // ⚠️ Asegurar explícitamente aquí
});

const notifId = notifRef.id;
notifData.id = notifId;

// 🛡️ Refuerzo: actualiza inmediatamente para forzar `read: false` si algo lo sobrescribe
await setDoc(notifRef, { ...notifData, read: false }, { merge: true });

console.log('✅ Notificación creada con ID real y read forzado:', notifId);


console.log('✅ Notificación creada con ID real:', notifId);

    console.log('✅ Notificación creada con ID:', notifId, 'para', normalizedTarget);

    // Guardar notificación local con la clave correcta
    const localKey = `notifications_${user.id}`; // Usar user.id
    const existingRaw = await AsyncStorage.getItem(localKey);
    const existing = existingRaw ? JSON.parse(existingRaw) : [];

  const newNotification = {
  ...notifData,
  id: notifId,
  timestamp: new Date().toISOString(), // Para que sea legible en local
};

await AsyncStorage.setItem(localKey, JSON.stringify([newNotification, ...existing]));

    console.log('📬 Notificación local guardada con clave:', localKey);

    return {
      success: true,
      messageId: msgId,
    };
  } catch (error) {
    console.error('❌ Error en sendMessage:', error);
    return { success: false, error };
  }
};