// utils/profileStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveUserProfile = async (data, membershipType, setUserData) => {
  try {
    const id = Date.now().toString();
    const profileData = {
      ...data,
      id,
      membershipType,
    };

    // Guardar para listados generales
    await AsyncStorage.setItem(`userProfile_${id}`, JSON.stringify(profileData));

    // Guardar perfil activo según tipo
    const activeKey = membershipType === 'pro' ? 'userProfilePro' : 'userProfileFree';
    await AsyncStorage.setItem(activeKey, JSON.stringify(profileData));

    // Guardar referencia general también (opcional)
    await AsyncStorage.setItem('userProfile', JSON.stringify(profileData));

    // Actualizar contexto del usuario
    if (setUserData) setUserData(profileData);

    return true;
  } catch (error) {
    console.error('Error al guardar el perfil:', error);
    return false;
  }
};
