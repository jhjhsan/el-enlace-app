import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Sube una postulación a Firestore.
 * @param {Object} applicationData - Datos de la postulación (castingId, perfil, videos, etc.)
 */
export const syncApplicationToFirestore = async (applicationData) => {
  try {
    const enrichedApplication = {
      ...applicationData,
      submittedAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'postulaciones'), enrichedApplication);
    console.log('📥 Postulación sincronizada con Firestore');
  } catch (error) {
    console.error('❌ Error al sincronizar postulación:', error);
  }
};
