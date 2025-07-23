import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const deactivateEliteIfUnpaid = async (email) => {
  const firestore = getFirestore();
  const docId = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const eliteRef = doc(firestore, 'profilesElite', docId);

  try {
    // 🔄 Cambiar en Firestore
    await updateDoc(eliteRef, {
      hasPaid: false,
    });
    console.log('✅ hasPaid actualizado a false en Firestore');

    // 🔄 Cambiar en AsyncStorage
    const userDataString = await AsyncStorage.getItem('userData');
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      if (userData.membershipType === 'elite') {
        userData.hasPaid = false;
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        console.log('✅ hasPaid actualizado a false en AsyncStorage');
      }
    }

  } catch (error) {
    console.error('❌ Error al desactivar funciones Elite:', error.message);
  }
};
