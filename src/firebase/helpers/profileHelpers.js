import AsyncStorage from '@react-native-async-storage/async-storage';

export const guardarAllProfiles = async (lista) => {
  try {
const limpio = lista.filter(p => {
  if (!p || typeof p !== 'object') return false;

  const email = (p.email || '').trim().toLowerCase();

  // Mostrar si viene mal
  if (email.includes('@@')) {
    console.warn('🚫 Correo con doble arroba detectado en guardarAllProfiles:', email);
  }

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!isValid) {
    console.warn('❌ Correo descartado por inválido:', email);
  }

  return isValid;
});

    await AsyncStorage.setItem('allProfiles', JSON.stringify(limpio));
    console.log(`✅ guardados ${limpio.length} perfiles limpios`);
  } catch (e) {
    console.warn('❌ Error guardando allProfiles filtrado:', e.message);
  }
};

