import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadProfileToFirestore } from '../src/firebase/uploadProfileToFirestore'; // Ruta corregida
import { backupAllProfiles } from '../src/firebase/helpers/backupAllProfiles';

export const saveUserProfile = async (
  data,
  membershipType,
  setUserData = null,
  setIsLoggedIn = null,
  explicitlyTriggerSession = false
) => {
  try {
    console.log('🔄 Iniciando saveUserProfile con data:', data);

let existingData = {};
try {
  if (membershipType === 'elite') {
    const existingElite = await AsyncStorage.getItem('userProfileElite');
    existingData = existingElite ? JSON.parse(existingElite) : {};
  } else if (membershipType === 'pro') {
    const existingPro = await AsyncStorage.getItem('userProfilePro');
    existingData = existingPro ? JSON.parse(existingPro) : {};
  } else if (membershipType === 'free') {
    const existingFree = await AsyncStorage.getItem('userProfileFree');
    existingData = existingFree ? JSON.parse(existingFree) : {};
  }
} catch (error) {
  console.error('❌ Error al cargar perfil existente:', error.message || error);
}

const mergedData = { ...existingData, ...data };

// 🧠 Forzar que category siempre sea array
if (mergedData.category && !Array.isArray(mergedData.category)) {
  mergedData.category = [mergedData.category];
}

// 🧠 Forzar que visibleInExplorer sea true si no está definido
if (mergedData.visibleInExplorer === undefined) {
  mergedData.visibleInExplorer = true;
}

const normalizedData = {
  ...mergedData,
  email: mergedData.email.trim().toLowerCase(),
  membershipType: membershipType || 'free',
  timestamp: mergedData.timestamp || Date.now(),
  visibleInExplorer: mergedData.visibleInExplorer,
};

    const emailKey = `userProfile_${normalizedData.email}`;

    // Guardar perfil con clave por email
    await AsyncStorage.setItem(emailKey, JSON.stringify(normalizedData)).catch((error) => {
      console.error('❌ Error al guardar en emailKey:', error.message || error);
      throw error; // Propaga el error
    });
    console.log('✅ Perfil guardado en AsyncStorage para:', emailKey);

    // Guardar perfil según tipo
    if (membershipType === 'free') {
      await AsyncStorage.setItem('userProfileFree', JSON.stringify(normalizedData)).catch((error) => {
        console.error('❌ Error al guardar userProfileFree:', error.message || error);
        throw error;
      });
      const existing = await AsyncStorage.getItem('allProfiles').catch(() => null);
const parsed = existing ? JSON.parse(existing) : [];

const filtered = parsed.filter(p => p.email?.toLowerCase() !== normalizedData.email.toLowerCase());
const updated = [normalizedData, ...filtered];

await AsyncStorage.setItem('allProfiles', JSON.stringify(updated)).catch((error) => {
  console.error('❌ Error al guardar allProfiles (Free):', error.message || error);
});

    } else if (membershipType === 'pro') {
      await AsyncStorage.setItem('userProfilePro', JSON.stringify(normalizedData)).catch((error) => {
        console.error('❌ Error al guardar userProfilePro:', error.message || error);
        throw error;
      });

      const highlightedProfile = { ...normalizedData, isHighlighted: true };
      const existing = await AsyncStorage.getItem('allProfiles').catch((error) => {
        console.error('❌ Error al obtener allProfiles:', error.message || error);
        return null;
      });
      const parsed = existing ? JSON.parse(existing) : [];

   const filtered = parsed.filter(
  p => p.email?.toLowerCase() !== normalizedData.email.toLowerCase()
);
const withoutDupes = [...filtered];

// ⬇️ Asegura que el perfil Pro también se conserve
const existingPro = await AsyncStorage.getItem('userProfilePro').catch(() => null);
if (existingPro) {
  const parsedPro = JSON.parse(existingPro);
  const exists = withoutDupes.some(p => p.email?.toLowerCase() === parsedPro.email.toLowerCase());
  if (!exists) withoutDupes.push(parsedPro);
}

// ⬇️ Añadir el perfil Elite al principio
const updated = [normalizedData, ...withoutDupes];
await AsyncStorage.setItem('allProfiles', JSON.stringify(updated)).catch((error) => {
  console.error('❌ Error al guardar allProfiles:', error.message || error);
  throw error;
});

    } else if (membershipType === 'elite') {
      await AsyncStorage.setItem('userProfileElite', JSON.stringify(normalizedData)).catch((error) => {
        console.error('❌ Error al guardar userProfileElite:', error.message || error);
        throw error;
      });

      const existing = await AsyncStorage.getItem('allProfiles').catch((error) => {
        console.error('❌ Error al obtener allProfiles:', error.message || error);
        return null;
      });
      const parsed = existing ? JSON.parse(existing) : [];

      const filtered = parsed.filter(p => p.email !== normalizedData.email);
      const updated = [normalizedData, ...filtered];
      await AsyncStorage.setItem('allProfiles', JSON.stringify(updated)).catch((error) => {
        console.error('❌ Error al guardar allProfiles:', error.message || error);
        throw error;
      });
      // 💾 Asegurar que los perfiles Elite también se conserven si existen
const existingElite = await AsyncStorage.getItem('userProfileElite').catch(() => null);
if (existingElite) {
  const parsedElite = JSON.parse(existingElite);
  const currentAll = await AsyncStorage.getItem('allProfiles').catch(() => null);
  const parsedAll = currentAll ? JSON.parse(currentAll) : [];

  const withoutDup = parsedAll.filter(p => p.email !== parsedElite.email);
  const mergedList = [parsedElite, ...withoutDup];

  await AsyncStorage.setItem('allProfiles', JSON.stringify(mergedList)).catch((error) => {
    console.error('❌ Error al mantener perfil Elite en allProfiles:', error.message || error);
  });
}

// 💾 Asegurar que los perfiles Pro también se conserven si existen
const existingPro = await AsyncStorage.getItem('userProfilePro').catch(() => null);
if (existingPro) {
  const parsedPro = JSON.parse(existingPro);
  const allProfilesAgain = await AsyncStorage.getItem('allProfiles').catch(() => null);
  const parsedAgain = allProfilesAgain ? JSON.parse(allProfilesAgain) : [];

  const withoutProDup = parsedAgain.filter(p => p.email !== parsedPro.email);
  const updatedWithPro = [parsedPro, ...withoutProDup];

  await AsyncStorage.setItem('allProfiles', JSON.stringify(updatedWithPro)).catch((error) => {
    console.error('❌ Error al mantener perfil Pro en allProfiles:', error.message || error);
  });
}

      const existingEliteList = await AsyncStorage.getItem('allProfilesElite').catch((error) => {
        console.error('❌ Error al obtener allProfilesElite:', error.message || error);
        return null;
      });
      const parsedElite = existingEliteList ? JSON.parse(existingEliteList) : [];

      const eliteFiltered = parsedElite.filter(
  (p) => p.email?.toLowerCase() !== normalizedData.email?.toLowerCase()
);

      const updatedElite = [normalizedData, ...eliteFiltered];
      await AsyncStorage.setItem('allProfilesElite', JSON.stringify(updatedElite)).catch((error) => {
        console.error('❌ Error al guardar allProfilesElite:', error.message || error);
        throw error;
      });
    }

    // Guardar datos mínimos o completos para sesión
    if (setUserData) {
      await AsyncStorage.setItem('userData', JSON.stringify(normalizedData)).catch((error) => {
        console.error('❌ Error al guardar userData:', error.message || error);
        throw error;
      });
      setUserData(normalizedData);
      console.log('🔁 Guardando perfil con whatsapp:', normalizedData.whatsapp);

      if (explicitlyTriggerSession && setIsLoggedIn) {
        setIsLoggedIn(true);
        console.log('✅ Sesión activada desde saveUserProfile');
      } else {
        console.log('🔄 Contexto actualizado sin activar sesión');
      }
    }

    // Condicionar la subida a Firestore
    console.log('🚀 Intentando subir perfil a Firestore...');
    if (process.env.NODE_ENV !== 'development' || typeof global.Expo === 'undefined') {
      console.log('🔥 LLAMANDO uploadProfileToFirestore...');
      await uploadProfileToFirestore(normalizedData).catch((error) => {
        console.error('❌ Error al subir a Firestore:', error.message || error);
        throw error;
      });
      console.log('✅ Perfil subido a Firestore');
    } else {
      console.warn('⚠️ Subida a Firestore omitida en Expo Go (desarrollo)');
    }

    console.log('✅ saveUserProfile completado');

    await backupAllProfiles(); // ⬅️ 👈 LO PEGAS AQUÍ

    return true;
  } catch (error) {
    console.error('❌ Error general en saveUserProfile:', error.message || error);
    return false;
  }
};
