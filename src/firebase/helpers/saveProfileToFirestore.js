import { doc, setDoc, getFirestore } from 'firebase/firestore';
const db = getFirestore();

export const saveProfileToFirestore = async (user) => {
  try {
    const docId = user.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await setDoc(doc(db, 'profiles', docId), user);
    console.log('✅ Perfil guardado en Firestore');
    return true;
  } catch (error) {
    console.error('❌ Error al guardar en Firestore:', error);
    return false;
  }
};
