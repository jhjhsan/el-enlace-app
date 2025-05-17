import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Verifica si el usuario Free aún puede postular este mes.
 * Si puede, incrementa el contador y devuelve `{ allowed: true, remaining: X }`.
 * Si no puede, devuelve `{ allowed: false, remaining: 0 }`.
 */
export const checkAndIncrementPostulation = async () => {
  try {
    const postulationLimitData = await AsyncStorage.getItem('freePostulationLimit');
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`; // Ej: "2025-5"

    let limitInfo = postulationLimitData ? JSON.parse(postulationLimitData) : {
      count: 0,
      month: currentMonth,
    };

    // Si es un nuevo mes, reinicia el contador
    if (limitInfo.month !== currentMonth) {
      limitInfo = { count: 0, month: currentMonth };
    }

    // Si ya alcanzó el límite
    if (limitInfo.count >= 2) {
      return { allowed: false, remaining: 0 };
    }

    // Aumenta el contador
    limitInfo.count += 1;
    await AsyncStorage.setItem('freePostulationLimit', JSON.stringify(limitInfo));

    return { allowed: true, remaining: 2 - limitInfo.count };
  } catch (error) {
    console.error('Error en checkAndIncrementPostulation:', error);
    return { allowed: false, remaining: 0, error: true };
  }
};
