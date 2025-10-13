import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import FormularioFree from '../screens/FormularioFree';
import CompleteEliteScreen from '../screens/CompleteEliteScreen'; // ✅ IMPORTANTE
import AppNavigator from './AppNavigator';
import { useUser } from '../contexts/UserContext';
import { useNavigationReady } from '../contexts/NavigationReady';
import TermsAndConditionsScreen from '../screens/TermsAndConditionsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isLoggedIn, setIsLoggedIn, setUserData } = useUser();
  const { setIsReady } = useNavigationReady();
  const [checkingLogin, setCheckingLogin] = useState(true);

  useEffect(() => {
    const checkStoredSession = async () => {
      try {
        const userJson = await AsyncStorage.getItem('userData');
        if (userJson) {
          const parsed = JSON.parse(userJson);
          if (parsed?.email && parsed?.membershipType) {
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
          setIsReady(true);
        }, 5000);
      }
    };

    checkStoredSession();
  }, []);

if (checkingLogin) {
  return <SplashScreen />; // ✅ Tu splash con logo girando
}

  return (
   <Stack.Navigator screenOptions={{ headerShown: false }}>
  {isLoggedIn ? (
    <Stack.Screen name="MainAppContainer" component={AppNavigator} />
  ) : (
    <>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="FormularioFree" component={FormularioFree} />
      <Stack.Screen name="CompleteElite" component={CompleteEliteScreen} />
      <Stack.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
    </>
  )}
</Stack.Navigator>

  );
}
