import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Obtiene todos los castings publicados desde Firestore.
 * @returns {Promise<object[]>} Lista de castings.
 */
export const fetchCastingsFromFirestore = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'castings'));
    const castings = snapshot.docs.map(doc => doc.data());
    return castings;
  } catch (error) {
    console.error('❌ Error al obtener castings de Firestore:', error);
    return [];
  }
};
