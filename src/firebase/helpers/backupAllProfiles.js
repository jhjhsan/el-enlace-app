import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { guardarAllProfiles } from './profileHelpers';

export const backupAllProfiles = async () => {
  try {
    const isValidEmail = (email) =>
      typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());

    // Helper para mapear y filtrar una colección
    const fetchProfiles = async (colName, fixedType) => {
      const snap = await getDocs(collection(db, colName));
      return snap.docs
        .map((d) => {
          const data = d.data() || {};
          const email = (data.email || '').toString().trim().toLowerCase();
          if (!isValidEmail(email)) return null;
          return {
            ...data,
            email,
            membershipType: fixedType,     // free | pro | elite
            profileKind: data.profileKind ?? null, // talent | resource (solo informativo)
            profileLock: data.profileLock ?? null, // talent | resource | null
          };
        })
        .filter(Boolean);
    };

    const allProfilesFree  = await fetchProfiles('profilesFree',  'free');
    const allProfilesPro   = await fetchProfiles('profilesPro',   'pro');
    const allProfilesElite = await fetchProfiles('profilesElite', 'elite');

    // allProfiles = Free + Pro (Elite se maneja aparte como ya hacías)
    const allProfiles = [
      ...allProfilesFree,
      ...allProfilesPro,
    ];

    console.log('🧹 allProfiles (free+pro):', allProfiles.length);
    console.log('🧹 allProfilesElite:', allProfilesElite.length);

    // Guardados individuales (útiles para vistas filtradas)
    await AsyncStorage.setItem('allProfilesFree',  JSON.stringify(allProfilesFree));
    await AsyncStorage.setItem('allProfilesPro',   JSON.stringify(allProfilesPro));
    await AsyncStorage.setItem('allProfilesElite', JSON.stringify(allProfilesElite));

    // Guardado “maestro” limpio
    await guardarAllProfiles(allProfiles);

    console.log('✅ Perfiles descargados y guardados localmente (sin profilesResource)');
    return true;
  } catch (error) {
    console.error('❌ Error al respaldar perfiles:', error);
    return false;
  }
};
