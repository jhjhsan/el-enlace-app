import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Obtiene todas las postulaciones relacionadas a una agencia desde Firestore.
 * @param {string} email - Email del creador (agency).
 * @returns {Promise<Array>} - Lista de postulaciones encontradas.
 */
export const getPostulationsFromFirestore = async (email) => {
  try {
    const snapshot = await getDocs(collection(db, 'postulations'));
    const allPostulations = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data?.agencyEmail?.toLowerCase() === email.toLowerCase()) {
        allPostulations.push(data);
      }
    });

    console.log(`✅ Se cargaron ${allPostulations.length} postulaciones de Firestore.`);
    return allPostulations;
  } catch (error) {
    console.error('❌ Error al obtener postulaciones de Firestore:', error);
    return [];
  }
};
