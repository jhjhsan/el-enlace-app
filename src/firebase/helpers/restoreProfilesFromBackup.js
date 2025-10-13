// src/firebase/helpers/restoreProfilesFromBackup.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { guardarAllProfiles } from './profileHelpers';

// Helper: extrae un array de un doc que puede venir como {list:[...]} o directamente [...]
const extractList = (snap) => {
  if (!snap?.exists()) return null;
  const data = snap.data();
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.list)) return data.list;
  console.warn('⚠️ Formato desconocido en backup, se omite:', data);
  return null;
};

export const restoreProfilesFromBackup = async () => {
  try {
    console.log('♻️ Restaurando perfiles desde backups/* ...');

    // Obligatorios/Históricos
    const allProfilesSnap      = await getDoc(doc(db, 'backups', 'allProfiles'));
    const allProfilesEliteSnap = await getDoc(doc(db, 'backups', 'allProfilesElite'));

    // Opcionales (para granularidad)
    const allProfilesFreeSnap  = await getDoc(doc(db, 'backups', 'allProfilesFree'));
    const allProfilesProSnap   = await getDoc(doc(db, 'backups', 'allProfilesPro'));

    // Maestro (mezcla de free/pro) – se guarda con limpieza adicional
    const allProfilesList = extractList(allProfilesSnap);
    if (allProfilesList) {
      await guardarAllProfiles(allProfilesList);
      console.log(`📥 allProfiles restaurado (${allProfilesList.length})`);
    } else {
      console.log('ℹ️ No se restauró allProfiles (no encontrado o vacío).');
    }

    // Elite (se mantiene separado)
    const eliteList = extractList(allProfilesEliteSnap);
    if (eliteList) {
      await AsyncStorage.setItem('allProfilesElite', JSON.stringify(eliteList));
      console.log(`📥 allProfilesElite restaurado (${eliteList.length})`);
    } else {
      console.log('ℹ️ No se restauró allProfilesElite (no encontrado o vacío).');
    }

    // Backups opcionales: útiles para vistas filtradas
    const freeList = extractList(allProfilesFreeSnap);
    if (freeList) {
      await AsyncStorage.setItem('allProfilesFree', JSON.stringify(freeList));
      console.log(`📥 allProfilesFree restaurado (${freeList.length})`);
    }

    const proList = extractList(allProfilesProSnap);
    if (proList) {
      await AsyncStorage.setItem('allProfilesPro', JSON.stringify(proList));
      console.log(`📥 allProfilesPro restaurado (${proList.length})`);
    }

    console.log('✅ Restauración desde backups finalizada.');
    return true;
  } catch (error) {
    console.error('❌ Error al restaurar perfiles desde backups:', error);
    return false;
  }
};
