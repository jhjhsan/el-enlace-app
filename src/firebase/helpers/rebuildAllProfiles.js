import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { guardarAllProfiles } from './profileHelpers';

export const rebuildAllProfiles = async () => {
  try {
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;

  const cleaned = email.trim().toLowerCase();

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);

  if (
    !isValid &&
    cleaned.includes('@') &&
    cleaned.length > 5 &&
    cleaned.includes('@cl')  // ⚠️ Caso típico del error
  ) {
    console.warn('📛 Correo malformado detectado y descartado (Elite):', cleaned);
  }

  return isValid;
};

    console.log('🔁 Iniciando reconstrucción de allProfiles desde Firestore...');
    const db = getFirestore(getApp());
    const collectionsToRead = ['profiles', 'profilesPro', 'profilesElite'];
    const tempMap = new Map();
    const rank = { free: 1, pro: 2, elite: 3 };

    // Obtener userData para preservarlo
    const userDataRaw = await AsyncStorage.getItem('userData');
    const userData = userDataRaw ? JSON.parse(userDataRaw) : null;
    console.log('📦 userData cargado:', userData?.email);

    const currentUserEmail = (await AsyncStorage.getItem('userEmail'))?.toLowerCase();

    for (const col of collectionsToRead) {
      const snapshot = await getDocs(collection(db, col));
      snapshot.forEach((doc) => {
        const data = doc.data();
        let cleanEmail = data.email?.trim().toLowerCase();
        if (!isValidEmail(cleanEmail)) return;
        data.email = cleanEmail;
        const email = cleanEmail;
        if (!email || data.visibleInExplorer === false) return;

        const existing = tempMap.get(email);
        const newRank = rank[data.membershipType] || 0;
        const existingRank = rank[existing?.membershipType] || 0;

        if (!existing || newRank > existingRank) {
          tempMap.set(email, data);
          console.log(`🆕 Guardado: ${email} (${data.membershipType})`);
        } else {
          console.log(`🚫 Ignorado (ya hay superior): ${email} (${data.membershipType})`);
        }
      });
    }

    let profiles = Array.from(tempMap.values());
    const elites = profiles.filter(p => p.membershipType === 'elite');

    // Asegurar que el perfil de userData se incluya
    if (userData?.email && isValidEmail(userData.email)) {
      const normalizedEmail = userData.email.trim().toLowerCase();
      if (!profiles.some(p => p.email === normalizedEmail)) {
        profiles.push({ ...userData, email: normalizedEmail });
        console.log(`➕ Añadido userData a allProfiles: ${normalizedEmail}`);
      }
      if (userData.membershipType === 'elite' && !elites.some(p => p.email === normalizedEmail)) {
        elites.push({ ...userData, email: normalizedEmail });
        console.log(`➕ Añadido userData a allProfilesElite: ${normalizedEmail}`);
      }
    }

    await guardarAllProfiles(profiles);
    console.log(`✅ allProfiles reconstruido con ${profiles.length} perfiles`);

    await AsyncStorage.setItem('allProfilesElite', JSON.stringify(elites));
    console.log(`💎 allProfilesElite actualizado con ${elites.length} perfiles elite`);

    if (currentUserEmail && isValidEmail(currentUserEmail)) {
      const ownProfile = profiles.find(
        (p) => p.email?.toLowerCase() === currentUserEmail
      );
      if (ownProfile) {
        const key = {
          free: 'userProfileFree',
          pro: 'userProfilePro',
          elite: 'userProfileElite',
        }[ownProfile.membershipType || 'free'];
        await AsyncStorage.setItem(key, JSON.stringify(ownProfile));
        console.log(`🧠 Perfil propio restaurado localmente como ${key}`);
      } else {
        console.warn('⚠️ No se encontró un perfil con ese email en Firestore.');
      }
    } else {
      console.warn('⚠️ No se encontró userEmail en AsyncStorage o es inválido.');
    }
  } catch (error) {
    console.error('❌ Error en rebuildAllProfiles:', error);
  }
};