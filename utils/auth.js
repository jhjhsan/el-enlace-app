import AsyncStorage from '@react-native-async-storage/async-storage';

// REGISTRO DE USUARIO NUEVO
export const registerUser = async ({ name, email, password }) => {
  const newUser = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: password.trim(),
    membershipType: 'free',
  };

  const storedUsers = await AsyncStorage.getItem('allUsers');
  const users = storedUsers ? JSON.parse(storedUsers) : [];

  const emailExists = users.some((u) => u.email === newUser.email);
  if (emailExists) {
    throw new Error('Este correo ya está registrado.');
  }

  users.push(newUser);
  await AsyncStorage.setItem('allUsers', JSON.stringify(users));
  await AsyncStorage.setItem('userData', JSON.stringify(newUser));
  await AsyncStorage.setItem('userProfile', JSON.stringify(newUser));
  await AsyncStorage.setItem('userProfileFree', JSON.stringify(newUser));

  return newUser;
};

// INICIO DE SESIÓN (carga perfil completo y lo guarda)
export const loginUser = async (email, password) => {
  const storedUsers = await AsyncStorage.getItem('allUsers');
  const users = storedUsers ? JSON.parse(storedUsers) : [];

  const foundUser = users.find(
    (user) =>
      user.email.toLowerCase() === email.trim().toLowerCase() &&
      user.password === password.trim()
  );

  if (!foundUser) {
    throw new Error('Usuario no encontrado o contraseña incorrecta.');
  }

  const storedProfile = await AsyncStorage.getItem('userProfile');
  const fullProfile = storedProfile ? JSON.parse(storedProfile) : foundUser;

  // 🔄 Guardar el perfil para mantenerlo sincronizado
  await AsyncStorage.setItem('userProfile', JSON.stringify(fullProfile));
  await AsyncStorage.setItem('userData', JSON.stringify(fullProfile));

  return fullProfile;
};

// CIERRE DE SESIÓN (reforzado, no borra perfil)
export const logout = async (setUserData, setIsLoggedIn) => {
  try {
    await AsyncStorage.removeItem('userData');
    await AsyncStorage.removeItem('sessionExpiry');

    const afterLogout = await AsyncStorage.getItem('userData');
    console.log('📦 userData después de logout:', afterLogout); // ← Debe ser null

    setUserData(null);
    setIsLoggedIn(false);
    console.log('✅ Sesión cerrada correctamente');
  } catch (e) {
    console.log('❌ Error al cerrar sesión:', e);
  }
};
