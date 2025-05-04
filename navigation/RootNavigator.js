import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';

import SplashScreen from '../screens/SplashScreen';
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
  const { isLoggedIn } = useUser();
  const [checkingLogin, setCheckingLogin] = useState(true);

  useEffect(() => {
    // Simula carga inicial o puedes hacer validaciones extra si es necesario
    const timeout = setTimeout(() => {
      setCheckingLogin(false);
    }, 1000); // espera opcional de 1s para efecto splash

    return () => clearTimeout(timeout);
  }, []);

  if (checkingLogin) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D8A353" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={MyDarkTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <Stack.Screen name="Splash" component={SplashScreen} />
        ) : (
          <Stack.Screen name="MainApp" component={AppNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
