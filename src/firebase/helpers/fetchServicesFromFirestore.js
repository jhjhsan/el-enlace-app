import { db } from '../firebaseConfig';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

/**
 * 🔄 Carga servicios publicados en los últimos 30 días desde Firestore.
 * Devuelve un array de objetos `post`.
 */
export const fetchServicesFromFirestore = async () => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const servicesRef = collection(db, 'services');
    const q = query(
      servicesRef,
      where('createdAt', '>=', thirtyDaysAgo.toISOString()),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(doc => doc.data());

    console.log(`📥 Servicios cargados: ${results.length}`);
    return results;
  } catch (error) {
    console.error('❌ Error al cargar servicios desde Firestore:', error);
    return [];
  }
};
