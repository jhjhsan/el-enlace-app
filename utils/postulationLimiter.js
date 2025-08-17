import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Verifica si el usuario Free aún puede postular este mes.
 * Límite: 4 postulaciones/mes.
 * Si puede, incrementa el contador y devuelve { allowed: true, remaining }.
 * Si no puede, devuelve { allowed: false, remaining: 0 }.
 */
const STORAGE_KEY = 'freePostulationLimit';
const MAX_FREE = 4;

export const checkAndIncrementPostulation = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;

    let info = raw ? JSON.parse(raw) : { count: 0, month: currentMonth };

    // Nuevo mes → reinicia
    if (info.month !== currentMonth) {
      info = { count: 0, month: currentMonth };
    }

    // Límite alcanzado
    if (info.count >= MAX_FREE) {
      return { allowed: false, remaining: 0 };
    }

    // Incrementa y persiste
    info.count += 1;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(info));

    return { allowed: true, remaining: Math.max(0, MAX_FREE - info.count) };
  } catch (error) {
    console.error('Error en checkAndIncrementPostulation:', error);
    // Si prefieres no bloquear en error, cambia allowed a true
    return { allowed: false, remaining: 0, error: true };
  }
};
