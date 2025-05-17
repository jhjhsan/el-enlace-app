import AsyncStorage from '@react-native-async-storage/async-storage';

/* ========== REGISTRO DE USUARIO NUEVO ========== */
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

  // Guardar como sesión activa y perfil base
  await AsyncStorage.setItem('userData', JSON.stringify(newUser));
  await AsyncStorage.setItem('userProfile', JSON.stringify(newUser));
  await AsyncStorage.setItem('userProfileFree', JSON.stringify(newUser));
  await AsyncStorage.setItem(`userProfile_${newUser.email}`, JSON.stringify(newUser));

  return newUser;
};

/* ========== INICIO DE SESIÓN ========== */
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

  const cleanEmail = foundUser.email.toLowerCase();
  const userProfileKey = `userProfile_${cleanEmail}`;

  // 🧹 Limpieza previa de perfiles anteriores
  await AsyncStorage.multiRemove([
    'userProfile',
    'userProfileFree',
    'userProfilePro',
    'userProfileElite',
  ]);

  // Cargar perfil extendido si existe
  const extendedProfileJson = await AsyncStorage.getItem(userProfileKey);
  const extendedProfile = extendedProfileJson
    ? JSON.parse(extendedProfileJson)
    : foundUser;

  // Guardar sesión actual
  await AsyncStorage.setItem('userProfile', JSON.stringify(extendedProfile));
  await AsyncStorage.setItem('userData', JSON.stringify(extendedProfile));

  // Guardar también según tipo de membresía
  const type = extendedProfile.membershipType || 'free';
  if (type === 'free') {
    await AsyncStorage.setItem('userProfileFree', JSON.stringify(extendedProfile));
  } else if (type === 'pro') {
    await AsyncStorage.setItem('userProfilePro', JSON.stringify(extendedProfile));
  } else if (type === 'elite') {
    await AsyncStorage.setItem('userProfileElite', JSON.stringify(extendedProfile));
  }

  return extendedProfile;
};

/* ========== CIERRE DE SESIÓN ========== */
export const logout = async (setUserData, setIsLoggedIn) => {
  try {
    await AsyncStorage.removeItem('userData');
    await AsyncStorage.removeItem('sessionExpiry');

    const afterLogout = await AsyncStorage.getItem('userData');
    console.log('📦 userData después de logout:', afterLogout); // ← Debe ser null

    if (setUserData) setUserData(null);
    if (setIsLoggedIn) setIsLoggedIn(false);

    console.log('✅ Sesión cerrada correctamente');
  } catch (e) {
    console.log('❌ Error al cerrar sesión:', e);
  }
};
