import React, { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import RootNavigator from './navigation/RootNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProvider } from './contexts/UserContext';
import { NavigationReadyProvider } from './contexts/NavigationReady';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { checkAuthState } from './src/firebase/helpers/authHelper';

SplashScreen.preventAutoHideAsync();

const MyDarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#000',
  },
};

export default function AppEntry() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [initialUserData, setInitialUserData] = useState(null);

  useEffect(() => {
    const loadAndValidateUser = async () => {
      try {
        const userDataJson = await AsyncStorage.getItem('userData');
        const parsedUserData = userDataJson ? JSON.parse(userDataJson) : null;

        // Validar con Firebase si está logueado y verificado
        checkAuthState(async (authResult) => {
          if (authResult?.user && authResult.isVerified) {
            setInitialUserData(parsedUserData); // ✅ usuario válido
          } else {
            setInitialUserData(null); // 🚫 no autenticado o no verificado
            await AsyncStorage.removeItem('userData'); // limpia sesión inválida
            await AsyncStorage.removeItem('sessionActive');
          }

          setIsAppReady(true); // Ya podemos renderizar la app
        });
      } catch (e) {
        console.error('❌ Error cargando datos del usuario:', e);
        setIsAppReady(true);
      }
    };

    loadAndValidateUser();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (isAppReady) {
      await SplashScreen.hideAsync();
    }
  }, [isAppReady]);

  if (!isAppReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style="light" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#D8A353" />
      </View>
    );
  }

  return (
    <UserProvider initialUserData={initialUserData}>
      <NavigationReadyProvider>
        <View style={{ flex: 1, backgroundColor: '#000' }} onLayout={onLayoutRootView}>
          <StatusBar style="light" backgroundColor="#000" />
          <NavigationContainer theme={MyDarkTheme}>
            <RootNavigator />
          </NavigationContainer>
        </View>
      </NavigationReadyProvider>
    </UserProvider>
  );
}
