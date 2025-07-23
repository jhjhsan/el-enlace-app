import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

export const uploadProfileToFirestore = async (profileData) => {
  try {
    // Validar correos
    if (!profileData.email || typeof profileData.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      console.error('❌ Email inválido:', profileData.email);
      throw new Error('Correo electrónico inválido');
    }
    if (profileData.representativeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.representativeEmail)) {
      console.error('❌ Representative email inválido:', profileData.representativeEmail);
      throw new Error('Correo del representante inválido');
    }

    const emailKey = profileData.email.trim().toLowerCase(); // ✅ El email real como ID

    const collectionName =
      profileData.membershipType === 'elite'
        ? 'profilesElite'
        : profileData.membershipType === 'pro'
          ? 'profilesPro'
          : 'profilesFree';

    console.log('🧪 Subiendo perfil a Firestore:', profileData);

    // 🧹 Eliminar perfil anterior si existe en otra colección
    const allCollections = ['profilesFree', 'profilesPro', 'profilesElite'];
    for (const collection of allCollections) {
      if (collection !== collectionName) {
        const otherDocRef = doc(db, collection, emailKey);
        const otherDocSnap = await getDoc(otherDocRef);
        if (otherDocSnap.exists()) {
          await deleteDoc(otherDocRef);
          console.log(`🧹 Eliminado perfil anterior en '${collection}'`);
        }
      }
    }

    // Agrega campos de seguimiento
    const now = new Date().toISOString();
    const cleanProfile = {
      ...profileData,
      debugUpload: true,
      updatedAt: now,
      lastUpdatedAt: now,
    };

    await setDoc(doc(db, collectionName, emailKey), cleanProfile, { merge: true });
  
    // 🔥 Limpieza opcional: eliminar documento antiguo si tenía ID mal formado
const legacyKey = profileData.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
if (legacyKey !== emailKey) {
  for (const col of ['profilesFree', 'profilesPro', 'profilesElite']) {
    const legacyRef = doc(db, col, legacyKey);
    const legacySnap = await getDoc(legacyRef);
    if (legacySnap.exists()) {
      await deleteDoc(legacyRef);
      console.log(`🧹 Eliminado documento legacy '${legacyKey}' en ${col}`);
    }
  }
}

    console.log(`✅ Perfil subido a '${collectionName}' con ID:`, emailKey);
    return true;
  } catch (error) {
    console.error('❌ Error al subir perfil a Firestore:', error);
    return false;
  }
};