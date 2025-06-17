import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const deleteAdFromFirestore = async (adId) => {
  try {
    const docRef = doc(db, 'ads', adId);
    await deleteDoc(docRef);
    console.log(`🗑️ Anuncio ${adId} eliminado de Firestore`);
  } catch (error) {
    console.error('Error al eliminar anuncio de Firestore:', error);
  }
};
