import { doc, setDoc, getFirestore } from 'firebase/firestore';
const db = getFirestore();

/**
 * Guarda el perfil en Firestore.
 * Plan soportado: 'free' | 'pro' | 'elite'
 * Tipo de perfil (informativo): profileKind = 'talent' | 'resource'
 */
export const saveProfileToFirestore = async (user, flagged = false) => {
  try {
    if (!user?.email) {
      console.error('❌ saveProfileToFirestore: email faltante');
      return false;
    }

    // Normalización y docId seguro
    const email = String(user.email).trim().toLowerCase();
    const docId = email.replace(/[^a-z0-9]/g, '_');

    // Colección según membershipType (solo free/pro/elite)
    const mt = (user.membershipType || 'free').toLowerCase();
    const collectionName =
      mt === 'elite' ? 'profilesElite' :
      mt === 'pro'   ? 'profilesPro'   :
                       'profilesFree';

    const nowIso = new Date().toISOString();

    const profileToSave = {
      ...user,
      email,                         // normalizado
      membershipType: mt,            // free | pro | elite
      // Informativo, NO colección: talent | resource
      profileKind: user.profileKind ?? null,
      profileLock: user.profileLock ?? null,
      flagged: flagged === true,
      updatedAt: nowIso,
      createdAt: user.createdAt || nowIso,
      // Marcadores útiles (sin "resource" como plan)
      isElite: mt === 'elite',
      isPro:   mt === 'pro',
      isFree:  mt === 'free',
      // Rol derivado SOLO si lo usas en UI; no afecta colección:
      role: user.profileKind === 'resource' ? 'resource' : 'talent',
    };

    await setDoc(doc(db, collectionName, docId), profileToSave, { merge: true });
    console.log(`✅ Perfil guardado/actualizado en '${collectionName}'${flagged ? ' (sospechoso)' : ''}`);
    return true;
  } catch (error) {
    console.error('❌ Error al guardar en Firestore:', error);
    return false;
  }
};
