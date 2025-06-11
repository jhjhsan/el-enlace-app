import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const getAdsFromFirestore = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'ads'));
    const ads = [];
    snapshot.forEach(doc => {
      ads.push({ id: doc.id, ...doc.data() });
    });
    return ads;
  } catch (error) {
    console.error('❌ Error al obtener anuncios:', error);
    return [];
  }
};
