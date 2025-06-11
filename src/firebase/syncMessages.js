import { db } from './firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Sube un mensaje a Firestore con timestamp.
 * @param {Object} messageData - Objeto del mensaje (de, para, contenido, etc.)
 */
export const syncMessageToFirestore = async (messageData) => {
  try {
    const enrichedMessage = {
      ...messageData,
      sentAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'mensajes'), enrichedMessage);
    console.log('📨 Mensaje guardado en Firestore con timestamp');
  } catch (error) {
    console.error('❌ Error al guardar mensaje en Firestore:', error);
  }
};
