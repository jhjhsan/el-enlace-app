// contexts/UserContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Cargar el perfil desde AsyncStorage al iniciar
  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const proProfile = await AsyncStorage.getItem('userProfilePro');
        const freeProfile = await AsyncStorage.getItem('userProfile');

        if (proProfile) {
          setUserData(JSON.parse(proProfile));
          setIsLoggedIn(true);
        } else if (freeProfile) {
          setUserData(JSON.parse(freeProfile));
          setIsLoggedIn(true);
        } else {
          setUserData(null);
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.log('Error cargando datos del usuario:', error);
      }
    };

    loadUserFromStorage();
  }, []);

  return (
    <UserContext.Provider value={{ userData, setUserData, isLoggedIn, setIsLoggedIn }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
