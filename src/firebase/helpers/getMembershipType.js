import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const getMembershipType = async (email) => {
  const docId = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
  console.log('🧪 Buscando membershipType para:', docId);

  // 🥇 PRIMERO buscar en 'profilesPro'
  const refPro = doc(db, 'profilesPro', docId);
  const snapshotPro = await getDoc(refPro);

  if (snapshotPro.exists()) {
    const data = snapshotPro.data();
    console.log('📂 Encontrado en "profilesPro":', data.membershipType);
    return data.membershipType || 'pro';
  }

  // 🥈 LUEGO buscar en 'profiles'
  const ref = doc(db, 'profiles', docId);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    const data = snapshot.data();
    console.log('📂 Encontrado en "profiles":', data.membershipType);
    return data.membershipType || 'free';
  }

  console.log('❌ No se encontró perfil en ninguna colección');
  return null;
};
