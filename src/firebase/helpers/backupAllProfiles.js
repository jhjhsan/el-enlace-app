import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const backupAllProfiles = async () => {
  try {
    const allProfilesRaw = await AsyncStorage.getItem('allProfiles');
    const allProfilesEliteRaw = await AsyncStorage.getItem('allProfilesElite');

    const allProfiles = allProfilesRaw ? JSON.parse(allProfilesRaw) : [];
    const allProfilesElite = allProfilesEliteRaw ? JSON.parse(allProfilesEliteRaw) : [];

    await setDoc(doc(db, 'backups', 'allProfiles'), { list: allProfiles });
    await setDoc(doc(db, 'backups', 'allProfilesElite'), { list: allProfilesElite });

    console.log('✅ Perfiles respaldados correctamente en Firestore');
  } catch (error) {
    console.error('❌ Error al respaldar perfiles:', error);
  }
};
