import { doc, setDoc, getFirestore } from 'firebase/firestore';
const db = getFirestore();

/**
 * Guarda el perfil en Firestore y opcionalmente lo marca como ofensivo.
 * @param {object} user - Objeto del perfil.
 * @param {boolean} flagged - Opcional. Si es true, marca el perfil como sospechoso.
 */
export const saveProfileToFirestore = async (user, flagged = false) => {
  try {
    const docId = user.email.toLowerCase().replace(/[^a-z0-9]/g, '_');

    let collectionName;
    if (user.membershipType === 'elite') {
      collectionName = 'profilesElite';
    } else if (user.membershipType === 'pro') {
      collectionName = 'profilesPro';
    } else {
      collectionName = 'profilesFree';
    }

    const profileToSave = {
      ...user,
      flagged: flagged === true, // ← aquí se marca como sospechoso si corresponde
    };

    await setDoc(doc(db, collectionName, docId), profileToSave);
    console.log(`✅ Perfil guardado en '${collectionName}'${flagged ? ' (sospechoso)' : ''}`);
    return true;
  } catch (error) {
    console.error('❌ Error al guardar en Firestore:', error);
    return false;
  }
};
