import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Sube un anuncio a Firestore
 * @param {Object} adData - Objeto con datos del anuncio
 * @returns {Promise<boolean>}
 */
export const syncAdToFirestore = async (adData) => {
  if (!adData || !adData.id || !adData.creatorEmail) return false;

  try {
    const docRef = doc(db, 'ads', `${adData.creatorEmail.toLowerCase()}_${adData.id}`);
    await setDoc(docRef, {
      ...adData,
      syncedAt: new Date().toISOString(),
    });
    console.log('✅ Anuncio sincronizado con Firestore');
    return true;
  } catch (error) {
    console.error('❌ Error al sincronizar anuncio:', error);
    return false;
  }
};
