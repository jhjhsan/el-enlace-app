import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Sube un casting a Firestore.
 * @param {object} casting - Objeto con los datos del casting.
 * @returns {Promise<boolean>} true si fue exitoso, false si falló.
 */
export const syncCastingToFirestore = async (casting) => {
  if (!casting || !casting.id || !casting.creatorEmail) return false;

  try {
    const docRef = doc(db, 'castings', `${casting.creatorEmail.toLowerCase()}_${casting.id}`);
    await setDoc(docRef, {
      ...casting,
      syncedAt: new Date().toISOString(),
    });
    console.log('📤 Casting sincronizado con Firestore:', casting.title);
    return true;
  } catch (error) {
    console.error('❌ Error al sincronizar casting a Firestore:', error);
    return false;
  }
};
