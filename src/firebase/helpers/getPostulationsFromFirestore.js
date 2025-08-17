import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // mantiene tu import existente

/**
 * Obtiene TODAS las postulaciones RECIBIDAS para los castings cuyo creatorEmail === email.
 * Busca en la colección 'applications' (modelo actual que usa ViewApplicationsScreen).
 * Hace queries en bloques de 10 IDs por el límite de Firestore.
 *
 * @param {string} email - Email del dueño/productora (creatorEmail en casting).
 * @param {Array<Object>} allCastings - (opcional) castings ya cargados para no reconsultar.
 *        Deben venir con { id, creatorEmail } al menos.
 * @returns {Promise<Array>} Lista de postulaciones (cada una con al menos { id, castingId, profile, timestamp }).
 */
export const getPostulationsFromFirestore = async (email, allCastings = []) => {
  try {
    if (!email) return [];

    // Filtra solo tus castings
    const myCastings = (allCastings || []).filter(c => (c?.creatorEmail || '').toLowerCase() === email.toLowerCase());
    const ids = myCastings.map(c => String(c.id)).filter(Boolean);

    if (ids.length === 0) {
      console.log('ℹ️ No hay castings del usuario para consultar postulaciones.');
      return [];
    }

    const fs = getFirestore(); // o usa db si prefieres
    const results = [];
    const colRef = collection(fs, 'applications');

    // Firestore: 'in' acepta hasta 10 elementos → troceamos
    for (let i = 0; i < ids.length; i += 10) {
      const chunk = ids.slice(i, i + 10);
      const qIn = query(colRef, where('castingId', 'in', chunk));
      const snap = await getDocs(qIn);
      snap.forEach(docSnap => {
        const data = docSnap.data() || {};
        results.push({
          id: docSnap.id,
          ...data,
          castingId: String(data.castingId || ''),
          timestamp: data.timestamp ?? data.createdAt ?? Date.now(),
          profile: {
            ...(data.profile || {}),
            name: data.profile?.name || '',
            email: data.profile?.email || '',
            profilePhoto: data.profile?.profilePhoto || '',
          },
        });
      });
    }

    console.log(`✅ Se cargaron ${results.length} postulaciones (applications) para ${ids.length} castings.`);
    return results;
  } catch (error) {
    console.error('❌ Error al obtener postulaciones (applications):', error);
    return [];
  }
};
