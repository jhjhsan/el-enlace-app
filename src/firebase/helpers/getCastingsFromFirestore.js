import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Obtiene castings con métricas para análisis de IA (postulaciones, días, etc.)
 * @param {string} email - Email del creador (agencia).
 * @returns {Promise<Array>} - Lista de castings con desempeño.
 */
export const getCastingsFromFirestore = async (email) => {
  try {
    const snapshot = await getDocs(collection(db, 'castings'));
    const allCastings = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (data?.creatorEmail?.toLowerCase() !== email.toLowerCase()) continue;

      const castingId = data.id || docSnap.id;

      // 🔍 Buscar postulaciones relacionadas
      const postSnapshot = await getDocs(
        query(collection(db, 'postulations'), where('castingId', '==', castingId))
      );
      const postCount = postSnapshot.size;

      // 📅 Días desde publicación
      let daysSince = null;
      if (data.timestamp) {
        const created = new Date(data.timestamp);
        const now = new Date();
        const diff = Math.floor((now - created) / (1000 * 60 * 60 * 24));
        daysSince = diff;
      }

      // 📊 Construir objeto de desempeño
      allCastings.push({
        ...data,
        castingId,
        postulaciones: postCount,
        diasDesdePublicacion: daysSince,
        tieneVideo: !!data.video,
        tieneImagen: !!data.image,
        destacado: !!data.destacado,
      });
    }

    console.log(`📊 Se cargaron ${allCastings.length} castings con análisis de Firestore.`);
    return allCastings;
  } catch (error) {
    console.error('❌ Error al obtener desempeño de castings:', error);
    return [];
  }
};
