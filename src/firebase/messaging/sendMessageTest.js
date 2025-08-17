import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

const normalizeEmail = (email) =>
  email?.toLowerCase().trim().replace(/\s+/g, '').replace(/[^a-z0-9@._\-+]/gi, '');

export const sendMessageTest = async ({ from, to, text }) => {
  try {
    const normalizedFrom = normalizeEmail(from);
    const normalizedTo = normalizeEmail(to);
    const msgId = uuidv4();

    const message = {
      id: msgId,
      from: normalizedFrom,
      to: normalizedTo,
      text: text.trim(),
      timestamp: serverTimestamp(),
      read: false,
    };

    // Guardar mensaje en Firestore
    await addDoc(collection(db, 'mensajes'), message);
    console.log('✅ Mensaje enviado a Firestore (test)', message);

    // Guardar en AsyncStorage
    const key = 'professionalMessages';
    const existingRaw = await AsyncStorage.getItem(key);
    const existing = existingRaw ? JSON.parse(existingRaw) : [];

    const newConv = {
      from: normalizedFrom,
      to: normalizedTo,
      messages: [message],
      lastMessage: message,
      timestamp: new Date().toISOString(),
      user: normalizedTo,
    };

    const updated = [newConv, ...existing].slice(0, 50);
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    console.log('📥 Conversación test guardada en local:', key);

    return { success: true, id: msgId };
  } catch (err) {
    console.error('❌ Error en sendMessageTest:', err.message);
    return { success: false, error: err.message };
  }
};
