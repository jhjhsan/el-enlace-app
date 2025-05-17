import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import FormularioFree from '../screens/FormularioFree';
import AppNavigator from './AppNavigator';
import { useUser } from '../contexts/UserContext';

const Stack = createNativeStackNavigator();

const MyDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#000',
  },
};

export default function RootNavigator() {
  const { isLoggedIn, setIsLoggedIn, setUserData } = useUser();
  const [checkingLogin, setCheckingLogin] = useState(true);

  useEffect(() => {
    const checkStoredSession = async () => {
      try {
        const userJson = await AsyncStorage.getItem('userData');

        if (userJson) {
          const parsed = JSON.parse(userJson);
          if (parsed?.email && parsed?.name) {
            setUserData(parsed);
            setIsLoggedIn(true);
          } else {
            setIsLoggedIn(false);
          }
        } else {
          setIsLoggedIn(false);
        }
      } catch (e) {
        console.log('❌ Error comprobando sesión:', e);
        setIsLoggedIn(false);
      } finally {
        setTimeout(() => {
          setCheckingLogin(false);
        }, 1000);
      }
    };

    checkStoredSession();
  }, []);

  if (checkingLogin) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer theme={MyDarkTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="MainApp" component={AppNavigator} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="FormularioFree" component={FormularioFree} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
