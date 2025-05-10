// screens/SplashScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';

export default function SplashScreen() {
  const { setUserData, setIsLoggedIn } = useUser();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();

    const loadUser = async () => {
      try {
        const expiryString = await AsyncStorage.getItem('sessionExpiry');
        const now = Date.now();

        if (expiryString && parseInt(expiryString) < now) {
          console.log('⏰ Sesión expirada. Cerrando sesión...');
          await AsyncStorage.multiRemove(['userData', 'sessionExpiry']);
          setUserData(null);
          setIsLoggedIn(false);
          return;
        }

        const elite = await AsyncStorage.getItem('userProfileElite');
        const pro = await AsyncStorage.getItem('userProfilePro');
        const free = await AsyncStorage.getItem('userProfileFree');
        const general = await AsyncStorage.getItem('userProfile');
        const profile = elite || pro || free || general;

        console.log('🔍 Perfil detectado (raw):', profile);

        if (profile && profile !== 'null' && profile !== '{}') {
          try {
            const parsed = JSON.parse(profile);
            if (parsed && parsed.email) {
              setUserData(parsed);
              await AsyncStorage.setItem(
                'userData',
                JSON.stringify({ email: parsed.email, membershipType: parsed.membershipType || 'free' })
              );              
              setIsLoggedIn(true);
              console.log('✅ Sesión activada con perfil válido:', parsed);
            } else {
              throw new Error('Perfil sin datos suficientes');
            }
          } catch (parseErr) {
            console.warn('⚠️ Error al parsear perfil:', parseErr);
            setUserData(null);
            setIsLoggedIn(false);
          }
        } else {
          console.log('🛑 No se encontró perfil válido. Redirigiendo a Login');
          setUserData(null);
          setIsLoggedIn(false);
        }        

      } catch (err) {
        console.warn('❌ Error leyendo sesión:', err);
        setUserData(null);
        setIsLoggedIn(false);
      }
    };

    const timer = setTimeout(loadUser, 2000);
    return () => clearTimeout(timer);
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.Image
        source={require('../assets/logo.png')}
        style={[styles.logo, { transform: [{ rotate: spin }] }]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
});
