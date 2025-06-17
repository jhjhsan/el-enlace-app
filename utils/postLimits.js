import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../src/firebase/firebaseConfig';

// 🔄 Cuenta cuántos servicios ha publicado un usuario esta semana en Firestore
export const getWeeklyServicePostCountFromFirestore = async (email) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const servicesRef = collection(db, 'services');
    const q = query(
      servicesRef,
      where('creatorEmail', '==', email),
      where('createdAt', '>=', sevenDaysAgo.toISOString())
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('❌ Error al contar servicios en Firebase:', error);
    return 0;
  }
};

// 🧠 Valida si el usuario puede publicar un nuevo servicio esta semana
export const canPostNewService = async (email, membershipType) => {
  if (membershipType === 'pro') return true; // Pro puede publicar ilimitadamente

  const count = await getWeeklyServicePostCountFromFirestore(email);
  return count < 1; // Free solo 1 por semana
};
