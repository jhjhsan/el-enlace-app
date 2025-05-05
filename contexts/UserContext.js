import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Cargar datos del usuario desde AsyncStorage al iniciar la app
  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const eliteProfile = await AsyncStorage.getItem('userProfileElite');
        const proProfile = await AsyncStorage.getItem('userProfilePro');
        const freeProfile = await AsyncStorage.getItem('userProfile');

        if (eliteProfile) {
          setUserData(JSON.parse(eliteProfile));
          setIsLoggedIn(true);
        } else if (proProfile) {
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
        setUserData(null);
        setIsLoggedIn(false);
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
