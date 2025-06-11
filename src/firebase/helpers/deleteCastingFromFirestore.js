import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const deleteCastingFromFirestore = async (castingId, creatorEmail) => {
  if (!castingId || !creatorEmail) return;
  const key = `${creatorEmail.toLowerCase()}_${castingId}`;
  try {
    await deleteDoc(doc(db, 'castings', key));
    console.log('🗑️ Casting eliminado de Firestore:', key);
  } catch (error) {
    console.error('❌ Error al eliminar casting de Firestore:', error);
  }
};
