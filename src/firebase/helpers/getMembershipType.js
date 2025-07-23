import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const getMembershipType = async (email) => {
  const docId = email.trim().toLowerCase(); // ✅ Usa el email real como ID
  console.log('🧪 Buscando membershipType para:', docId);

  // 🥇 PRIMERO buscar en 'profilesElite'
  const refElite = doc(db, 'profilesElite', docId);
  const snapshotElite = await getDoc(refElite);
  if (snapshotElite.exists()) {
    const data = snapshotElite.data();
    console.log('📂 Encontrado en "profilesElite":', data.membershipType);
    return data.membershipType || 'elite';
  }

  // 🥈 LUEGO buscar en 'profilesPro'
  const refPro = doc(db, 'profilesPro', docId);
  const snapshotPro = await getDoc(refPro);
  if (snapshotPro.exists()) {
    const data = snapshotPro.data();
    console.log('📂 Encontrado en "profilesPro":', data.membershipType);
    return data.membershipType || 'pro';
  }

  // 🔚 Buscar en 'profilesFree'
  const refFree = doc(db, 'profilesFree', docId);
  const snapshotFree = await getDoc(refFree);
  if (snapshotFree.exists()) {
    const data = snapshotFree.data();
    console.log('📂 Encontrado en "profilesFree":', data.membershipType);
    return data.membershipType || 'free';
  }

  console.log('❌ No se encontró perfil en ninguna colección');
  return null;
};
