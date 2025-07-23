import AsyncStorage from '@react-native-async-storage/async-storage';

export const borrarUsuarioCompleto = async (email) => {
  try {
    const claves = await AsyncStorage.getAllKeys();
    const normalizado = email.trim().toLowerCase();

    const clavesAEliminar = claves.filter((clave) =>
      clave.includes(normalizado) ||
      clave.includes('userData') ||
      clave.includes('userProfile') ||
      clave.includes('notifications_') ||
      clave === 'professionalMessages' ||
      clave === 'allProfiles' ||
      clave === 'allProfilesFree' ||
      clave === 'allProfilesPro' ||
      clave === 'allProfilesElite' ||
      clave === 'allUsers'
    );

    await AsyncStorage.multiRemove(clavesAEliminar);
    console.log('🧼 Usuario completamente eliminado de AsyncStorage');
  } catch (error) {
    console.error('❌ Error al eliminar usuario:', error);
  }
};
