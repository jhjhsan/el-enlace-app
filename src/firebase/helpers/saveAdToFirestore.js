import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Guarda un anuncio en Firestore, validando si supera el límite de 20 activos.
 * Si se supera, el anuncio se guarda con enEspera: true
 * 
 * @param {Object} adData - Datos del anuncio
 */
export const saveAdToFirestore = async (adData) => {
  try {
    const now = Date.now();
    const adsRef = collection(db, 'ads');

    // Paso 1: obtener anuncios activos aprobados y no en espera
    const q = query(
      adsRef,
      where('aprobado', '==', true),
      where('expiresAt', '>', now),
      where('enEspera', '!=', true)
    );
    const snapshot = await getDocs(q);
    const activeAdsCount = snapshot.size;

    // Paso 2: marcar enEspera si hay 20 o más
    const finalData = {
      ...adData,
      enEspera: activeAdsCount >= 20,
    };

    // Paso 3: guardar el anuncio con ID único (usando timestamp + email como ejemplo)
    const uniqueId = `${Date.now()}_${adData.creatorEmail}`;
    await setDoc(doc(db, 'ads', uniqueId), finalData);

    return finalData.enEspera
      ? { success: true, message: '🟡 El anuncio fue guardado en espera' }
      : { success: true, message: '🟢 Anuncio guardado y activo' };

  } catch (error) {
    console.error('Error al guardar anuncio en Firestore:', error);
    return { success: false, message: '❌ Error al guardar anuncio' };
  }
};
