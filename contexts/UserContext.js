import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(null); // ← importante: inicia en null
  const [sessionExpiry, setSessionExpiry] = useState(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem('userData');
        const storedExpiry = await AsyncStorage.getItem('sessionExpiry');

        if (storedUserData) {
          const parsedUser = JSON.parse(storedUserData);
          if (parsedUser?.name && parsedUser?.email) {
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
      }
    };

    loadSession();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (sessionExpiry && Date.now() > sessionExpiry) {
        console.log('⏰ Sesión expirada automáticamente');
        setUserData(null);
        setIsLoggedIn(false);
        await AsyncStorage.multiRemove(['userData', 'sessionExpiry', 'sessionActive']);
      }
    }, 60000);

    return () => clearInterval(interval);
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
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
