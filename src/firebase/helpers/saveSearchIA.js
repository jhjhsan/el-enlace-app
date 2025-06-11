import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const saveSearchIA = async (phrase, categoryDetected, userEmail, membershipType) => {
  try {
    const ref = collection(db, 'searchHistory');

    const data = {
      phrase,
      userEmail: userEmail?.toLowerCase() || 'anon',
      membershipType: membershipType || 'unknown',
      timestamp: Timestamp.now(),
    };

    if (categoryDetected !== undefined) {
      data.categoryDetected = categoryDetected;
    }

    await addDoc(ref, data);
  } catch (err) {
    console.error('❌ Error al guardar búsqueda IA:', err);
  }
};
