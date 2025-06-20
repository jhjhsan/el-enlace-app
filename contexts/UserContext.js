import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [sessionExpiry, setSessionExpiry] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // 🔧 NUEVO

  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem('userData');
        const storedExpiry = await AsyncStorage.getItem('sessionExpiry');

        if (storedUserData) {
          const parsedUser = JSON.parse(storedUserData);

          // ✅ Asignar ID si no existe
          if (!parsedUser?.id && parsedUser?.email) {
            parsedUser.id = parsedUser.email;
          }

          // ✅ Validación de datos mínimos
          if (parsedUser?.email && (parsedUser?.name || parsedUser?.agencyName)) {
            setUserData(parsedUser);
            setIsLoggedIn(true);
            console.log('✅ Sesión activada con perfil válido:', parsedUser);
          } else {
            setUserData(null);
            setIsLoggedIn(false);
            console.log('🔒 Perfil inválido (nombre o email faltan).');
          }
        } else {
          setUserData(null);
          setIsLoggedIn(false);
          console.log('🔒 No hay sesión activa (userData no encontrado)');
        }

        if (storedExpiry) {
          setSessionExpiry(JSON.parse(storedExpiry));
        }
      } catch (e) {
        console.log('❌ Error al cargar sesión:', e);
        setUserData(null);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false); // 🔧 NUEVO
      }
    };

    loadSession();
  }, []);
   useEffect(() => {
  if (!sessionExpiry) return;
  console.log('🔁 Sesión persistente habilitada. Ya no se cerrará automáticamente.');
}, [sessionExpiry]);

  return (
    <UserContext.Provider
      value={{
        userData,
        setUserData,
        isLoggedIn,
        setIsLoggedIn,
        sessionExpiry,
        setSessionExpiry,
        isLoading, // 🔧 NUEVO
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
