import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions, useNavigation } from '@react-navigation/native';
import {
  goToFormularioFree,
  goToCompleteProfile,
  goToCompleteElite,
} from '../utils/navigationHelpers';
import { backupAllProfiles } from '../src/firebase/helpers/backupAllProfiles'; // ⬅️ Asegúrate de tener esto arriba
import { getFirestore, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { deactivateEliteIfUnpaid } from '../src/firebase/helpers/deactivateEliteIfUnpaid';
import { addDoc, collection } from 'firebase/firestore';
import { rebuildAllProfiles } from '../src/firebase/helpers/rebuildAllProfiles';
import SplashScreen from '../screens/SplashScreen';

/* ====== VALIDACIÓN DE EMAIL ROBUSTA (REEMPLAZA PARCHE POR CORREO) ====== */
const norm = (e) => (e || '').toLowerCase().trim();

const isValidEmail = (e) => {
  if (!e || typeof e !== 'string') return false;
  const email = e.trim().toLowerCase();
  // Regex estándar + evita doble '@'
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.includes('@@');
};

async function hardResetForBadEmail(navigation) {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const extra = keys.filter(
      (k) =>
        k.startsWith('notifications_') ||
        k.startsWith('messages_') ||
        k.startsWith('inbox_')
    );
    const base = [
      'user','userData','userEmail','userProfile',
      'userProfileFree','userProfilePro','userProfileElite',
      'allProfiles','allProfilesFree','allProfilesPro','allProfilesElite',
      'professionalMessages','pendingNotifications',
      'hasOnboarded'
      // Nota: NO borro expoPushToken para no interferir con push
    ];
    await AsyncStorage.multiRemove([...new Set([...base, ...extra])]);
  } catch {}
  navigation.dispatch(
    CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })
  );
}
/* ====== FIN PARCHE ====== */

export default function InitialRedirectScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    const checkUser = async () => {
      try {
        /* ====== CHEQUEO TEMPRANO DE EMAIL INVÁLIDO REAL ====== */
        try {
          const rawUserData = await AsyncStorage.getItem('userData');
          const rawUserProfile = await AsyncStorage.getItem('userProfile');
          const rawUserEmail = await AsyncStorage.getItem('userEmail');

          const userDataTmp = rawUserData ? JSON.parse(rawUserData) : null;
          const profileTmp = rawUserProfile ? JSON.parse(rawUserProfile) : null;

          const emailCandidate =
            norm(userDataTmp?.email) ||
            norm(profileTmp?.email) ||
            norm(rawUserEmail);

          // ✅ Solo resetea si el email es realmente inválido
          if (emailCandidate && !isValidEmail(emailCandidate)) {
            console.log('[InitialRedirect] Hard reset por email inválido:', emailCandidate);
            return await hardResetForBadEmail(navigation);
          }
        } catch {}
        /* ====== FIN CHEQUEO ====== */

        const userDataString = await AsyncStorage.getItem('userData');
        if (!userDataString) {
          console.log('🔒 No hay sesión activa (userData vacío)');
          return navigation.navigate('Login');
        }

        const userData = JSON.parse(userDataString);

        // ✅ Ahora que userData existe, puedes guardar el email
        if (userData?.email) {
          await AsyncStorage.setItem('userEmail', userData.email.toLowerCase());
        }

        // 🔧 Normaliza accountType si el perfil es de RECURSOS (INSERTADO)
        try {
          if (userData?.profileKind === 'resource' || userData?.profileLock === 'resource') {
            if (userData.accountType !== 'resource') {
              userData.accountType = 'resource';
              await AsyncStorage.setItem('userData', JSON.stringify(userData));
              console.log('🔧 accountType normalizado a "resource" (perfil de Recursos)');
            }
          }
        } catch (e) {
          console.log('⚠️ No se pudo persistir la normalización de accountType', e);
        }

        // 🔒 Limpieza preventiva de perfiles que no correspondan
        const membership = userData?.membershipType;

        if (membership !== 'free') {
          await AsyncStorage.removeItem('userProfileFree');
        }
        if (membership !== 'pro') {
          await AsyncStorage.removeItem('userProfilePro');
        }
        if (membership !== 'elite') {
          await AsyncStorage.removeItem('userProfileElite');
        }

        // Validación robusta
        if (!userData || !userData.email || !userData.membershipType) {
          console.warn('⚠️ userData incompleto. Cancelando navegación.');
          return;
        }

        const email = userData.email;
        const membershipType = userData.membershipType;
        const hasPaid = userData.hasPaid ?? false;
        const trialEndsAt = userData.trialEndsAt ?? null;

        console.log('🔍 userData recuperado:', userData);

        // ⚠️ Si no hay tipo de cuenta definido
        if (!membershipType || !email) return;

        // 🚫 Verificar si expiró el período de prueba
        const now = Date.now();
        if (trialEndsAt && !hasPaid) {
          const trialEnd = new Date(trialEndsAt).getTime();
          if (now > trialEnd) {
            console.log('⏳ Prueba expirada. Evaluando downgrade...');

            const docId = email.toLowerCase().replace(/[^a-z0-9]/g, '_');

            if (membershipType === 'pro') {
              try {
                await deleteDoc(doc(getFirestore(), 'profilesPro', docId));
                console.log('🗑 Perfil Pro eliminado de Firestore');
              } catch (err) {
                console.warn('⚠️ No se pudo eliminar perfil Pro:', err.message);
              }

              await AsyncStorage.removeItem('userProfilePro');

              const downgraded = {
                ...userData,
                membershipType: 'free',
                hasPaid: false,
                trialEndsAt: null,
              };
              await AsyncStorage.setItem('userData', JSON.stringify(downgraded));
              console.log('⬇️ userData degradado a Free');

              await addDoc(collection(getFirestore(), 'downgradeLogs'), {
                email,
                date: new Date().toISOString(),
                reason: 'trialExpired-pro',
              });

              return goToFormularioFree(navigation);
            }

            if (membershipType === 'elite') {
              await deactivateEliteIfUnpaid(email);

              const updatedUserData = {
                ...userData,
                hasPaid: false,
              };
              await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
              console.log('🔒 Funciones Elite bloqueadas (sin degradar perfil)');

              await addDoc(collection(getFirestore(), 'downgradeLogs'), {
                email,
                date: new Date().toISOString(),
                reason: 'trialExpired-elite',
              });

              return navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'MainTabs' }],
                })
              );
            }
          }
        }

        // 📦 Verificar si el perfil está guardado según el tipo
        let profile = null;

        if (membershipType === 'pro') {
          profile = await AsyncStorage.getItem('userProfilePro');

          if (profile) {
            const parsed = JSON.parse(profile);

            // ⬇️⬇️⬇️ REEMPLAZO: validación bifurcada TALENTO vs RECURSOS
            const isResource =
              parsed?.profileKind === 'resource' ||
              parsed?.profileLock === 'resource' ||
              parsed?.accountType === 'resource';

            let incompleto = false;

            if (isResource) {
              // Requisitos mínimos para PRO RECURSOS
              const reqResource = ['resourceTitle', 'resourceType', 'resourceDescription', 'resourceLocation', 'profilePhoto'];
              incompleto = reqResource.some((campo) => {
                const val = parsed[campo];
                return !val || (Array.isArray(val) && val.length === 0) || (typeof val === 'string' && !val.trim());
              });
            } else {
              // Requisitos mínimos para PRO TALENTO (como tenías antes)
              const reqTalent = ['name', 'profilePhoto', 'sexo', 'age', 'estatura', 'bookPhotos', 'profileVideo', 'category'];
              incompleto = reqTalent.some((campo) => {
                const val = parsed[campo];
                return !val || (Array.isArray(val) && val.length === 0);
              });
            }

            if (incompleto) {
              console.log('🛑 Perfil Pro incompleto. Redirigiendo a CompleteProfile...');
              return goToCompleteProfile(navigation);
            }
            // ⬆️⬆️⬆️ FIN REEMPLAZO

            console.log('✅ Perfil Pro completo. Ir a MainTabs.');
            await rebuildAllProfiles();
            await backupAllProfiles();
            await AsyncStorage.setItem('userProfile', profile); // base para notificaciones

            return navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
              })
            );
          } else {
            console.log('🛑 No hay perfil Pro aún. Redirigiendo a CompleteProfile...');
            return goToCompleteProfile(navigation);
          }
        }

        if (membershipType === 'elite') {
          profile = await AsyncStorage.getItem('userProfileElite');
          let parsed = profile ? JSON.parse(profile) : null;

          // ⛑ Intenta restaurar desde userData si falta algo
          if (!parsed?.profilePhoto || !parsed?.profileVideo || !parsed?.logos?.length) {
            const fallback = await AsyncStorage.getItem('userData');
            const temp = fallback ? JSON.parse(fallback) : null;

            if (
              temp?.membershipType === 'elite' &&
              temp?.profilePhoto &&
              temp?.logos?.length > 0
            ) {
              parsed = temp;
              await AsyncStorage.setItem('userProfileElite', fallback);
              console.log('🛠 Restaurado userProfileElite desde userData');
            }
          }

          // 🧠 Si aún no hay perfil válido, intenta recuperar desde Firestore
          if (!parsed?.profilePhoto || !parsed?.profileVideo || !parsed?.logos?.length) {
            try {
              const emailKey = email.trim().toLowerCase();
              const eliteProfileRef = doc(getFirestore(), 'profilesElite', emailKey);
              const eliteSnap = await getDoc(eliteProfileRef);

              if (eliteSnap.exists()) {
                parsed = eliteSnap.data();
                await AsyncStorage.setItem('userProfileElite', JSON.stringify(parsed));
                await AsyncStorage.setItem('userData', JSON.stringify({ ...parsed, membershipType: 'elite', email }));
                console.log('📦 Restaurado perfil Elite desde Firestore');
              } else {
                console.warn('⚠️ No se encontró perfil Elite en Firestore');
              }
            } catch (e) {
              console.error('❌ Error al recuperar perfil Elite desde Firestore:', e);
            }
          }
          console.log('🧪 Perfil Elite recuperado:', parsed);

          if (
            parsed?.profilePhoto &&
            parsed?.logos?.length > 0
          ) {
            await rebuildAllProfiles();
            await backupAllProfiles();
            await AsyncStorage.setItem('userProfile', JSON.stringify(parsed));
            console.log('✅ Perfil Elite completo. Perfiles actualizados, redirigiendo a MainTabs.');
            
            return navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
              })
            );
          } else {
            return goToCompleteElite(navigation);
          }
        }

        if (membershipType === 'free') {
          profile = await AsyncStorage.getItem('userProfileFree');
          let parsed = profile ? JSON.parse(profile) : null;

          if (
            !parsed?.profilePhoto ||
            !Array.isArray(parsed.category) || parsed.category.length === 0 ||
            !parsed.edad || !parsed.sexo
          ) {
            console.log('🛑 Perfil Free incompleto. Redirigiendo a FormularioFree...');
            return goToFormularioFree(navigation);
          }

          if (!parsed) {
            const fallback = await AsyncStorage.getItem('userData');
            const recovered = fallback ? JSON.parse(fallback) : null;

            if (recovered?.membershipType === 'free') {
              console.log('🛠 Restaurando userProfileFree desde userData');
              await AsyncStorage.setItem('userProfileFree', fallback);
              parsed = recovered; // ← actualiza el `parsed` original
            } else {
              console.warn('⚠️ No se pudo restaurar perfil Free desde userData.');
            }
          }

          await rebuildAllProfiles(); 
          await backupAllProfiles();
          const finalProfile = await AsyncStorage.getItem('userProfileFree');
          if (finalProfile) {
            await AsyncStorage.setItem('userProfile', finalProfile); // ← PERFIL BASE PARA NOTIFICATIONS
          }

          return navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            })
          );
        }

        // 🛑 Seguridad: si ninguna condición redirige, forzar navegación al login
        setTimeout(() => {
          console.warn('⚠️ Tiempo agotado sin redirección. Forzando ir a Login.');
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            })
          );
        }, 5000); // Espera 5 segundos y fuerza ir a Login

      } catch (error) {
        console.error('Error en InitialRedirectScreen:', error);
      }
    };

    checkUser();
  }, []);

  return <SplashScreen />;
}
