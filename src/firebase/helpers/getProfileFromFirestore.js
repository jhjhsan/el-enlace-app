import { getFirestore, doc, getDoc } from 'firebase/firestore';

const db = getFirestore();

/**
 * Busca el perfil del usuario en todas las colecciones posibles
 */
export const getProfileFromFirestore = async (email) => {
  try {
    const docId = email.trim().toLowerCase();
    const collections = ['profilesElite', 'profilesPro', 'profilesFree', 'profiles'];

    for (const collectionName of collections) {
      const docRef = doc(db, collectionName, docId);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        console.log(`✅ Perfil encontrado en ${collectionName}`);
        return {
          ...snapshot.data(),
          membershipType:
            snapshot.data().membershipType ||
            (collectionName.includes('Elite') ? 'elite' :
            collectionName.includes('Pro') ? 'pro' :
            'free'),
        };
      }
    }

    console.log('⚠️ Perfil no encontrado en ninguna colección');
    return null;
  } catch (error) {
    console.error('❌ Error al cargar perfil desde Firestore:', error);
    return null;
  }
};
