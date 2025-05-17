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

    const emailKey = `userProfile_${normalizedData.email}`;

    // Guardar el perfil principal (usuario actual)
    await AsyncStorage.setItem('userProfile', JSON.stringify(normalizedData));

    // ✅ Guardar también con clave única por email
    await AsyncStorage.setItem(emailKey, JSON.stringify(normalizedData));

    // Guardar también según tipo de cuenta
    if (membershipType === 'free') {
      await AsyncStorage.setItem('userProfileFree', JSON.stringify(normalizedData));
    } else if (membershipType === 'pro') {
      await AsyncStorage.setItem('userProfilePro', JSON.stringify(normalizedData));
    } else if (membershipType === 'elite') {
      await AsyncStorage.setItem('userProfileElite', JSON.stringify(normalizedData));
    }

    // ✅ Activar sesión si corresponde
    if (explicitlyTriggerSession && setUserData && setIsLoggedIn) {
      await AsyncStorage.setItem('userData', JSON.stringify({
        name: normalizedData.name,
        email: normalizedData.email,
      }));

      // ✅ CORREGIDO: ahora cargamos todo el perfil en memoria
      setUserData(normalizedData);
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
