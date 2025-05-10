import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveUserProfile = async (
  data,
  membershipType,
  setUserData = null,
  setIsLoggedIn = null,
  explicitlyTriggerSession = false
) => {
  try {
    const normalizedData = {
      ...data,
      email: data.email.trim().toLowerCase(),
      membershipType: membershipType || 'free',
    };

    // Guardar el perfil principal
    await AsyncStorage.setItem('userProfile', JSON.stringify(normalizedData));

    // Guardar también según tipo de cuenta
    if (membershipType === 'free') {
      await AsyncStorage.setItem('userProfileFree', JSON.stringify(normalizedData));
    } else if (membershipType === 'pro') {
      await AsyncStorage.setItem('userProfilePro', JSON.stringify(normalizedData));
    } else if (membershipType === 'elite') {
      await AsyncStorage.setItem('userProfileElite', JSON.stringify(normalizedData));
    }

    // ✅ Solo activar sesión si se indica explícitamente
    if (explicitlyTriggerSession && setUserData && setIsLoggedIn) {
      await AsyncStorage.setItem(
        'userData',
        JSON.stringify({
          name: normalizedData.name,
          email: normalizedData.email,
        })
      );
      setUserData({
        name: normalizedData.name,
        email: normalizedData.email,
      });
      setIsLoggedIn(true);
      console.log('✅ Sesión activada explícitamente desde saveUserProfile');
    }

    console.log('✅ Perfil guardado correctamente:', normalizedData);
    return true;
  } catch (error) {
    console.error('❌ Error al guardar perfil:', error);
    return false;
  }
};
