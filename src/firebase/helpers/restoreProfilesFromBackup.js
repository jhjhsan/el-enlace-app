import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const restoreProfilesFromBackup = async () => {
  try {
    const allProfilesSnap = await getDoc(doc(db, 'backups', 'allProfiles'));
    const allProfilesEliteSnap = await getDoc(doc(db, 'backups', 'allProfilesElite'));

    if (allProfilesSnap.exists()) {
      const { list } = allProfilesSnap.data();
      await AsyncStorage.setItem('allProfiles', JSON.stringify(list));
      console.log('📥 allProfiles restaurado desde Firestore');
    }

    if (allProfilesEliteSnap.exists()) {
      const { list } = allProfilesEliteSnap.data();
      await AsyncStorage.setItem('allProfilesElite', JSON.stringify(list));
      console.log('📥 allProfilesElite restaurado desde Firestore');
    }
  } catch (error) {
    console.error('❌ Error al restaurar perfiles:', error);
  }
};
