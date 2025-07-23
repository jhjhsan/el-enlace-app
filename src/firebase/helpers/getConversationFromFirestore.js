import { db } from '../firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';

/**
 * Obtiene una conversación desde Firestore entre dos usuarios.
 * @param {string} userA - Email del primer usuario (por ejemplo, el logueado).
 * @param {string} userB - Email del otro usuario (contacto).
 * @returns {Object|null} - Conversación encontrada o null si no existe.
 */
export const getConversationFromFirestore = async (userA, userB) => {
  try {
    const mensajesRef = collection(db, 'mensajes');

    // Consulta donde userA es el remitente y userB el receptor o viceversa
    const q = query(
      mensajesRef,
      where('archived', '==', false)
    );

    const snapshot = await getDocs(q);
    const all = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Buscar conversación entre los dos correos (sin importar el orden)
    const match = all.find(
      (msg) =>
        ((msg.from === userA && msg.to === userB) ||
         (msg.from === userB && msg.to === userA))
    );

    return match || null;
  } catch (error) {
    console.error('❌ Error al obtener conversación de Firestore:', error);
    return null;
  }
};
