import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadProfileToFirestore } from '../src/firebase/uploadProfileToFirestore';
import { backupAllProfiles } from '../src/firebase/helpers/backupAllProfiles';
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { guardarAllProfiles } from '../src/firebase/helpers/profileHelpers';

// ✅ Helper: Solo perfiles PRO pueden llevar destacado (opt-in)
const buildProHighlightPayload = (profile, { activate = false, days = 30 } = {}) => {
  const out = { ...profile };

  // Normalizamos campos por si vienen undefined
  if (!Object.prototype.hasOwnProperty.call(out, 'isHighlighted')) out.isHighlighted = false;
  if (!Object.prototype.hasOwnProperty.call(out, 'highlightedUntil')) out.highlightedUntil = null;

  // Activar solo si es PRO y se solicita explícitamente
  if (out.membershipType === 'pro' && activate === true) {
    out.isHighlighted = true;

    // Extiende a partir del mayor entre "ahora" o "vigente"
    const now = Date.now();
    const prevUntil = out.highlightedUntil ? new Date(out.highlightedUntil).getTime() : 0;
    const base = prevUntil > now ? prevUntil : now;
    const until = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();

    out.highlightedUntil = until;
  } else {
    // Desactivar si no corresponde
    out.isHighlighted = false;
    out.highlightedUntil = null;
  }

  return out;
};

export const saveUserProfile = async (
  data,
  membershipType,
  setUserData = null,
  setIsLoggedIn = null,
  explicitlyTriggerSession = false
) => {
  try {
    console.log('🔄 Iniciando saveUserProfile con data:', data);

    // Validar correos
    const isValidEmail = (email) => {
      if (!email || typeof email !== 'string') {
        console.warn('Email is undefined or not a string:', email);
        return false;
      }
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    if (!isValidEmail(data.email)) {
      console.error('❌ Email inválido:', data.email);
      throw new Error('Correo electrónico inválido');
    }
    if (data.representativeEmail && !isValidEmail(data.representativeEmail)) {
      console.error('❌ Representative email inválido:', data.representativeEmail);
      throw new Error('Correo del representante inválido');
    }

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

    // 💡 Inferimos accountType correctamente según el tipo real de perfil (REEMPLAZO)
    const inferredAccountType =
      mergedData.profileKind === 'resource' ||
      mergedData.profileLock === 'resource' ||
      mergedData.accountType === 'resource'
        ? 'resource'
        : (mergedData.accountType || existingData.accountType || 'talent');

    const normalizedData = {
      ...mergedData,
      email: mergedData.email.trim().toLowerCase(),
      membershipType: membershipType || 'free',
      timestamp: mergedData.timestamp || Date.now(),
      visibleInExplorer: mergedData.visibleInExplorer,
      // Tipos de perfil
      profileKind: mergedData.profileKind ?? existingData.profileKind ?? null,   // 'talent' | 'resource'
      profileLock: mergedData.profileLock ?? existingData.profileLock ?? null,   // 'talent' | 'resource' | null
      // 🔧 Persistimos el tipo de cuenta correcto
      accountType: inferredAccountType,
    };

    // ⬇️ Forzar que userData tenga los campos esenciales
    if (!normalizedData.hasOwnProperty('hasPaid')) {
      normalizedData.hasPaid = false;
    }
    if (!normalizedData.hasOwnProperty('trialEndsAt')) {
      normalizedData.trialEndsAt = null;
    }
    if (!normalizedData.hasOwnProperty('membershipType')) {
      normalizedData.membershipType = membershipType || 'free';
    }

    const sanitizedEmail = normalizedData.email.replace(/[@.]/g, '_');
    const emailKey = `userProfile_${sanitizedEmail}`;

    // Guardar perfil con clave por email
    await AsyncStorage.setItem(emailKey, JSON.stringify(normalizedData)).catch((error) => {
      console.error('❌ Error al guardar en emailKey:', error.message || error);
      throw error;
    });
    console.log('✅ Perfil guardado en AsyncStorage para:', emailKey);

    // ⬅️⬅️⬅️ ARREGLO MÍNIMO: espejo canonical que AppEntry/RootNavigator leen al iniciar
    const canonical = {
      ...normalizedData,
      profileStatus:
        membershipType === 'free' ? 'free_completed' :
        membershipType === 'pro' ? 'pro_completed' :
        membershipType === 'elite' ? 'elite_completed' :
        'completed',
      freeCompleted: membershipType === 'free' ? true : !!normalizedData.freeCompleted,
    };

    await AsyncStorage.setItem('userProfile', JSON.stringify(canonical)).catch((error) => {
      console.error('❌ Error al guardar userProfile (canonical):', error.message || error);
      throw error;
    });
    // ⬅️⬅️⬅️ FIN ARREGLO

    // Guardar perfil según tipo
    if (membershipType === 'free') {
      // ❌ FREE no puede ser destacado
      delete normalizedData.isHighlighted;
      delete normalizedData.highlightedUntil;

      await AsyncStorage.setItem('userProfileFree', JSON.stringify(normalizedData)).catch((error) => {
        console.error('❌ Error al guardar userProfileFree:', error.message || error);
        throw error;
      });

      // 🧹 Eliminar perfil Pro si existe
      await AsyncStorage.removeItem('userProfilePro');
      console.log('🧹 Eliminado userProfilePro al cambiar a cuenta Free');

      const existing = await AsyncStorage.getItem('allProfiles').catch(() => null);
      const parsed = existing ? JSON.parse(existing) : [];
      console.log('📦 allProfiles existente:', parsed);
      const filtered = parsed.filter(p => p.email?.toLowerCase() !== normalizedData.email.toLowerCase());
      const updated = [normalizedData, ...filtered];

      // 🛡️ DEBUG para detectar si algún perfil está corrupto
      updated.forEach(p => {
        if (p.email?.includes('@@')) {
          console.warn('🐛 PERFIL CORRUPTO detectado antes de guardarAllProfiles (ELITE):', p.email);
        }
      });

      console.log('📦 allProfiles actualizado:', updated);
      await guardarAllProfiles(updated).catch(error => {
        console.error('❌ Error al guardar allProfiles:', error.message || error);
      });

    } else if (membershipType === 'pro') {
      // ✅ PRO: único que puede ser destacado (NO activar en upgrade normal)
      const proPayload = buildProHighlightPayload({ ...normalizedData }, { activate: false, days: 0 });

      await AsyncStorage.setItem('userProfilePro', JSON.stringify(proPayload)).catch((error) => {
        console.error('❌ Error al guardar userProfilePro:', error.message || error);
        throw error;
      });

      // 🔁 Espejo canónico DEBE reflejar el payload PRO
      await AsyncStorage.setItem('userProfile', JSON.stringify(proPayload)).catch((error) => {
        console.error('❌ Error al actualizar userProfile espejo (PRO):', error.message || error);
      });

      // 🧹 Eliminar perfil Free si existe
      await AsyncStorage.removeItem('userProfileFree');
      console.log('🧹 Eliminado userProfileFree al cambiar a cuenta Pro');

      const existing = await AsyncStorage.getItem('allProfiles').catch((error) => {
        console.error('❌ Error al obtener allProfiles:', error.message || error);
        return null;
      });
      const parsed = existing ? JSON.parse(existing) : [];
      console.log('📦 allProfiles existente:', parsed);
      const filtered = parsed.filter(
        p => p.email?.toLowerCase() !== proPayload.email.toLowerCase()
      );
      const withoutDupes = [...filtered];

      // ⬇️ Asegura que el perfil Pro también se conserve (ya con flags correctos)
      const existingPro = await AsyncStorage.getItem('userProfilePro').catch(() => null);
      if (existingPro) {
        const parsedPro = JSON.parse(existingPro);
        const exists = withoutDupes.some(p => p.email?.toLowerCase() === parsedPro.email.toLowerCase());
        if (!exists) withoutDupes.push(parsedPro);
      }

      // ⬇️ Añadir el perfil Pro al principio (IMPORTANTE: usamos proPayload, no normalizedData)
      const updated = [proPayload, ...withoutDupes];
      console.log('📦 allProfiles actualizado:', updated);
      await guardarAllProfiles(updated).catch(error => {

        console.error('❌ Error al guardar allProfiles:', error.message || error);
        throw error;
      });

    } else if (membershipType === 'elite') {
      // ❌ ELITE no puede ser destacado → limpiar flags
      delete normalizedData.isHighlighted;
      delete normalizedData.highlightedUntil;

      await AsyncStorage.setItem('userProfileElite', JSON.stringify(normalizedData)).catch((error) => {
        console.error('❌ Error al guardar userProfileElite:', error.message || error);
        throw error;
      });

      const existing = await AsyncStorage.getItem('allProfiles').catch((error) => {
        console.error('❌ Error al obtener allProfiles:', error.message || error);
        return null;
      });
      const parsed = existing ? JSON.parse(existing) : [];
      console.log('📦 allProfiles existente:', parsed);
      const filtered = parsed.filter(p => p.email !== normalizedData.email);
      const updated = [normalizedData, ...filtered];
      console.log('📦 allProfiles actualizado:', updated);
      await guardarAllProfiles(updated).catch(error => {

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
        console.log('📦 allProfilesElite actualizado:', mergedList);
        await guardarAllProfiles(mergedList).catch(error => {

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
        console.log('📦 allProfiles con Pro actualizado:', updatedWithPro);
        await guardarAllProfiles(updatedWithPro).catch(error => {

          console.error('❌ Error al mantener perfil Pro en allProfiles:', error.message || error);
        });
      }

      const existingEliteList = await AsyncStorage.getItem('allProfilesElite').catch((error) => {
        console.error('❌ Error al obtener allProfilesElite:', error.message || error);
        return null;
      });
      const parsedElite = existingEliteList ? JSON.parse(existingEliteList) : [];
      console.log('📦 allProfilesElite existente:', parsedElite);
      const eliteFiltered = parsedElite.filter(
        (p) => p.email?.toLowerCase() !== normalizedData.email?.toLowerCase()
      );
      const updatedElite = [normalizedData, ...eliteFiltered];
      console.log('📦 allProfilesElite actualizado:', updatedElite);
      await AsyncStorage.setItem('allProfilesElite', JSON.stringify(updatedElite)).catch((error) => {
        console.error('❌ Error al guardar allProfilesElite:', error.message || error);
        throw error;
      });
    }

    // Guardar datos mínimos o completos para sesión
    if (setUserData) {
      // ⬅️ Usar payload PRO si aplica, para no perder flags en contexto
      const dataForContext =
        membershipType === 'pro'
          ? (await (async () => {
              try {
                const storedPro = await AsyncStorage.getItem('userProfilePro');
                return storedPro ? JSON.parse(storedPro) : normalizedData;
              } catch { return normalizedData; }
            })())
          : normalizedData;

      await AsyncStorage.setItem('userData', JSON.stringify(dataForContext)).catch((error) => {
        console.error('❌ Error al guardar userData:', error.message || error);
        throw error;
      });
      setUserData(dataForContext);
      console.log('🔁 Guardando perfil con whatsapp:', dataForContext.whatsapp);

      if (explicitlyTriggerSession && setIsLoggedIn) {
        setIsLoggedIn(true);
        console.log('✅ Sesión activada desde saveUserProfile');
      } else {
        console.log('🔄 Contexto actualizado sin activar sesión');
      }
    }

    // Condicionar la subida a Firestore
    console.log('🚀 Intentando subir perfil a Firestore...');
    if (typeof global.Expo === 'undefined') {
      console.log('🔥 LLAMANDO uploadProfileToFirestore...');
      await uploadProfileToFirestore(normalizedData).catch((error) => {
        console.error('❌ Error al subir a Firestore:', error.message || error);
        throw error;
      });
      console.log('✅ Perfil subido a Firestore');

      // 🧠 Asegura que el tipo de cuenta esté actualizado en Firestore principal
      try {
        const db = getFirestore(getApp());
        const userId = normalizedData.email.trim().toLowerCase(); // ✅ Usar el email limpio como ID

        const targetCollection = normalizedData.membershipType === 'elite'
          ? 'profilesElite'
          : normalizedData.membershipType === 'pro'
            ? 'profilesPro'
            : 'profilesFree'; // 👈 antes decía 'profiles'

        // 🔒 Mismo criterio: solo PRO puede llevar flags de destacado
        // ⬇️ Importante: NO activar destacado en guardados normales
        const firestorePayload =
          normalizedData.membershipType === 'pro'
            ? buildProHighlightPayload({ ...normalizedData }, { activate: false, days: 0 })
            : (() => {
                const x = { ...normalizedData };
                x.isHighlighted = false;
                x.highlightedUntil = null;
                return x;
              })();

        await setDoc(doc(db, targetCollection, userId), {
          ...firestorePayload, // ✅ Subir todos los datos reales con flags solo si es PRO
          updatedAt: new Date().toISOString()
        }, { merge: true });

        console.log(`✅ Perfil guardado correctamente en '${targetCollection}' con ID '${userId}'`);

        console.log(`🔁 membershipType actualizado en ${targetCollection}: ${normalizedData.membershipType}`);

        const collections = {
          free: ['profilesPro', 'profilesElite'],
          pro: ['profilesFree', 'profilesElite'],
          elite: ['profilesFree', 'profilesPro'],
        };

        const toDelete = collections[normalizedData.membershipType] || [];

        for (const col of toDelete) {
          const docRef = doc(db, col, userId);
          await deleteDoc(docRef);
          console.log(`🗑️ Eliminado completamente el perfil duplicado en '${col}'`);
        }
      } catch (e) {
        console.warn('⚠️ Error al actualizar Firestore o eliminar duplicados:', e.message);
      }
    } else {
      console.warn('⚠️ Subida a Firestore omitida en Expo Go (desarrollo)');
    }

    console.log('✅ saveUserProfile completado');
    console.log('💾 Iniciando backupAllProfiles...');
    await backupAllProfiles();

    return true;
  } catch (error) {
    console.error('❌ Error general en saveUserProfile:', error.message || error);
    return false;
  }
};
