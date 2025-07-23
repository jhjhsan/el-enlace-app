import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { guardarAllProfiles } from './profileHelpers';

export const backupAllProfiles = async () => {
  try {
    const isValidEmail = (email) => {
      if (!email || typeof email !== 'string') {
        return false;
      }

      // Normalizar el correo
      const cleaned = email
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9@._\-+]/gi, '')
        .replace(/@{2,}/g, '@');

      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);

      if (!isValid) {
        console.warn('Correo normalizado no válido:', cleaned);
      }

      return isValid;
    };

    const freeSnapshot = await getDocs(collection(db, 'profilesFree'));
    const allProfilesFree = freeSnapshot.docs
      .map((doc) => {
        // Usar el campo 'email' del documento si existe, o reconstruir desde doc.id
        const data = doc.data();
        const email = data.email || doc.id.replace(/_/g, '@');
        return { ...data, email, membershipType: 'free' };
      })
      .filter((profile) => isValidEmail(profile.email));

    const proSnapshot = await getDocs(collection(db, 'profilesPro'));
    const allProfilesPro = proSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        const email = data.email || doc.id.replace(/_/g, '@');
        return { ...data, email, membershipType: 'pro' };
      })
      .filter((profile) => isValidEmail(profile.email));

    const eliteSnapshot = await getDocs(collection(db, 'profilesElite'));
    const allProfilesElite = eliteSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        const email = data.email || doc.id.replace(/_/g, '@');
        return { ...data, email, membershipType: 'elite' };
      })
      .filter((profile) => isValidEmail(profile.email));

    const allProfiles = [...allProfilesFree, ...allProfilesPro];

    console.log('🧹 Limpiando allProfiles, entradas válidas:', allProfiles);
    console.log('🧹 Limpiando allProfilesElite, entradas válidas:', allProfilesElite);

    await AsyncStorage.setItem('allProfilesFree', JSON.stringify(allProfilesFree));
    await guardarAllProfiles(allProfiles);
    await AsyncStorage.setItem('allProfilesElite', JSON.stringify(allProfilesElite));

    console.log('✅ Perfiles descargados y guardados localmente');
  } catch (error) {
    console.error('❌ Error al respaldar perfiles:', error);
  }
};