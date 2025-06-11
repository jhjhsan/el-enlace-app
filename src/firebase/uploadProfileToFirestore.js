import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

export const uploadProfileToFirestore = async (profileData) => {
  try {
    const emailKey = profileData.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const collectionName = profileData.membershipType === 'pro' ? 'profilesPro' : 'profiles';

    console.log('🧪 Subiendo perfil a Firestore:', profileData);

    // Crear una copia limpia del perfil
    const cleanProfile = {};
    for (const [key, value] of Object.entries(profileData)) {
      if (value !== undefined && value !== null && value !== '') {
        cleanProfile[key] = value;
      }
    }

    // Agregar campos fijos
    // Agregar campos fijos
const now = new Date().toISOString();
cleanProfile.debugUpload = true;
cleanProfile.updatedAt = now;
cleanProfile.lastUpdatedAt = now;

    await setDoc(doc(db, collectionName, emailKey), cleanProfile);

    console.log(`✅ Perfil subido a '${collectionName}' con ID:`, emailKey);
    return true;
  } catch (error) {
    console.error('❌ Error al subir perfil a Firestore:', error);
    return false;
  }
};
