import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { guardarAllProfiles } from './profileHelpers';

export const rebuildAllProfiles = async () => {
  try {
    const normalizeEmail = (email) =>
      email?.toLowerCase().trim().replace(/\s+/g, '').replace(/[^a-z0-9@._\-+]/gi, '');

    const isValidEmail = (email) => {
      if (!email || typeof email !== 'string') return false;

      const cleaned = email.trim().toLowerCase();
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);

      if (
        !isValid &&
        cleaned.includes('@') &&
        cleaned.length > 5 &&
        cleaned.includes('@cl')
      ) {
        console.warn('📛 Correo malformado detectado y descartado (Elite):', cleaned);
      }

      return isValid;
    };

    console.log('🔁 Iniciando reconstrucción de allProfiles desde Firestore...');
    const db = getFirestore(getApp());
    const collectionsToRead = ['profilesFree', 'profilesPro', 'profilesElite'];
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
        const raw = doc.data();
       const data = {
  ...raw,
  name: raw.name?.trim() || '',
  profilePhoto: raw.profilePhoto || raw.profilePhotoUrl || '',
  email: raw.email?.trim().toLowerCase() || '',
  id: raw.id || raw.email?.trim().toLowerCase() || '',
  membershipType:
    raw.membershipType ||
    (col === 'profilesElite'
      ? 'elite'
      : col === 'profilesPro'
      ? 'pro'
      : 'free'),
  profileKind: raw.profileKind || raw.type || null,   // 👈 aquí agregas
  profileLock: raw.profileLock ?? null,               // 👈 aquí agregas
};

        const email = data.email;
        if (!isValidEmail(email)) return;
        if (!email || data.visibleInExplorer === false) return;

        if (!data.name || !data.profilePhoto) {
          console.warn('⚠️ Perfil incompleto, no se guardará en allProfiles:', email);
          return;
        }

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

    // 🔁 Recuperar perfiles actuales y combinar con los nuevos
    const existingRaw = await AsyncStorage.getItem('allProfiles');
    const existing = existingRaw ? JSON.parse(existingRaw) : [];

    const merged = [...profiles];

    for (const old of existing) {
      const exists = merged.find(p => normalizeEmail(p.email) === normalizeEmail(old.email));
      if (!exists && old.name && old.profilePhoto) {
        merged.push(old);
        console.log(`📌 Perfil preservado desde local: ${old.email}`);
      }
    }

    profiles = merged;

    // ✅ Guardar después del merge final
    await guardarAllProfiles(profiles);
    console.log(`✅ allProfiles reconstruido con ${profiles.length} perfiles`);

    await AsyncStorage.setItem('allProfilesElite', JSON.stringify(elites));
    console.log(`💎 allProfilesElite actualizado con ${elites.length} perfiles elite`);

    if (currentUserEmail && isValidEmail(currentUserEmail)) {
      const ownProfile = profiles.find(
        (p) => p.email?.toLowerCase() === currentUserEmail
      );
 if (ownProfile) {
  const key =
    {
      free: 'userProfileFree',
      pro: 'userProfilePro',
      elite: 'userProfileElite',
    }[ownProfile.membershipType] || 'userProfileFree';  // 👈 fallback seguro

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
