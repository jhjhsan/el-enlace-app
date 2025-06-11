import { getFirestore, doc, getDoc } from 'firebase/firestore';

const db = getFirestore();

/**
 * Carga el perfil de Firestore usando el email como ID
 * y busca en la colección correcta según membershipType
 */
export const getProfileFromFirestore = async (email, membershipType = 'elite') => {
  try {
    const docId = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const collectionName = membershipType === 'pro' ? 'profilesPro' : 'profiles';
    const docRef = doc(db, collectionName, docId);
    const snapshot = await getDoc(docRef);

if (snapshot.exists()) {
  console.log(`📥 Perfil ${membershipType} cargado desde Firestore`);
  return {
    ...snapshot.data(),
    membershipType: membershipType || 'free', // ✅ Garantiza que no sea undefined
  };
} else {

      console.log(`⚠️ Perfil ${membershipType} no encontrado en Firestore`);
      return null;
    }
  } catch (error) {
    console.error('❌ Error al cargar perfil de Firestore:', error);
    return null;
  }
};
