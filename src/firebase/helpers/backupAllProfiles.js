import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const backupAllProfiles = async () => {
  try {
    // 🔄 Obtener perfiles Pro
    const proSnapshot = await getDocs(collection(db, 'profilesPro'));
    const allProfiles = proSnapshot.docs.map((doc) => ({
      ...doc.data(),
      email: doc.id.replace(/_/g, '@'),
      membershipType: 'pro',
    }));

    // 🔄 Obtener perfiles Elite
    const eliteSnapshot = await getDocs(collection(db, 'profiles'));
    const allProfilesElite = eliteSnapshot.docs.map((doc) => ({
      ...doc.data(),
      email: doc.id.replace(/_/g, '@'),
      membershipType: 'elite',
    }));

    // 💾 Guardar en AsyncStorage
    await AsyncStorage.setItem('allProfiles', JSON.stringify(allProfiles));
    await AsyncStorage.setItem('allProfilesElite', JSON.stringify(allProfilesElite));

    console.log('✅ Perfiles descargados y guardados localmente');
  } catch (error) {
    console.error('❌ Error al respaldar perfiles:', error);
  }
};
