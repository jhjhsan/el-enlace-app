import AsyncStorage from '@react-native-async-storage/async-storage';

export const loadUserProfile = async (setUserData, setIsLoggedIn) => {
  try {
    const elite = await AsyncStorage.getItem('userProfileElite');
    const pro = await AsyncStorage.getItem('userProfilePro');
    const free = await AsyncStorage.getItem('userProfileFree');
    const general = await AsyncStorage.getItem('userProfile');

    const profile = elite || pro || free || general;

    if (profile) {
      const parsed = JSON.parse(profile);
      if (setUserData) setUserData(parsed);
      if (setIsLoggedIn) setIsLoggedIn(true);
      console.log('✅ Perfil cargado correctamente:', parsed);
      return parsed;
    } else {
      console.log('⚠️ No se encontró perfil guardado');
      if (setIsLoggedIn) setIsLoggedIn(false);
      return null;
    }
  } catch (error) {
    console.error('❌ Error al cargar perfil:', error);
    if (setIsLoggedIn) setIsLoggedIn(false);
    return null;
  }
};
