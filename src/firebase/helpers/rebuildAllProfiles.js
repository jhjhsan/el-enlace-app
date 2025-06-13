// 📁 src/firebase/helpers/rebuildAllProfiles.js

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 🔄 Reconstruye el array allProfiles mezclando los perfiles Free, Pro y Elite si existen,
 * evitando duplicados y manteniendo el array existente si falta alguno.
 */
export const rebuildAllProfiles = async () => {
  try {
    console.log('🔁 Iniciando reconstrucción de allProfiles...');

    const proRaw = await AsyncStorage.getItem('userProfilePro');
    const eliteRaw = await AsyncStorage.getItem('userProfileElite');
    const freeRaw = await AsyncStorage.getItem('userProfileFree');
    const existingAllRaw = await AsyncStorage.getItem('allProfiles');

    const pro = proRaw ? JSON.parse(proRaw) : null;
    const elite = eliteRaw ? JSON.parse(eliteRaw) : null;
    const free = freeRaw ? JSON.parse(freeRaw) : null;
    const existingAll = existingAllRaw ? JSON.parse(existingAllRaw) : [];

    const seen = new Set();
    const result = [];

    if (pro?.email && !seen.has(pro.email.toLowerCase())) {
      result.push(pro);
      seen.add(pro.email.toLowerCase());
    }

    if (elite?.email && elite.visibleInExplorer !== false && !seen.has(elite.email.toLowerCase())) {
      result.push(elite);
      seen.add(elite.email.toLowerCase());
    }

    if (free?.email && free.visibleInExplorer !== false && !seen.has(free.email.toLowerCase())) {
      result.push(free);
      seen.add(free.email.toLowerCase());
    }

    // 🔄 Añadir perfiles anteriores si no están duplicados
    for (const p of existingAll) {
      if (p?.email && !seen.has(p.email.toLowerCase())) {
        result.push(p);
        seen.add(p.email.toLowerCase());
      }
    }

    await AsyncStorage.setItem('allProfiles', JSON.stringify(result));
    console.log(`✅ allProfiles reconstruido con ${result.length} perfiles`);

    // 🧠 Además guardar allProfilesElite si hay perfil elite
    if (elite?.email) {
      await AsyncStorage.setItem('allProfilesElite', JSON.stringify([elite]));
      console.log('✅ allProfilesElite actualizado con 1 perfil elite');
    }

  } catch (error) {
    console.error('❌ Error en rebuildAllProfiles:', error);
  }
};
