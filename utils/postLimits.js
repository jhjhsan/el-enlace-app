import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../src/firebase/firebaseConfig';

// 🔄 Cuenta cuántos servicios ha publicado un usuario esta semana en Firestore
export const getWeeklyServicePostCountFromFirestore = async (email) => {
  try {
    const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const sevenDaysAgoTs = Timestamp.fromMillis(sevenDaysAgoMs);

    const servicesRef = collection(db, 'services');
    const q = query(
      servicesRef,
      where('creatorEmail', '==', email.trim().toLowerCase()),
      where('createdAtTS', '>=', sevenDaysAgoTs) // usamos el campo Timestamp
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
  if (membershipType === 'pro' || membershipType === 'elite') {
    return true; // Pro y Elite publican ilimitadamente
  }

  const count = await getWeeklyServicePostCountFromFirestore(email);
  return count < 1; // Free solo 1 por semana
};
