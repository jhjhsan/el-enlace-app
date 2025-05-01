// screens/SplashScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';

export default function SplashScreen() {
  const { setUserData, setIsLoggedIn } = useUser(); // ✅ asegúrate de tener esto en tu contexto
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

    const checkSession = async () => {
      try {
        const json = await AsyncStorage.getItem('userProfile');
        if (json) {
          const profile = JSON.parse(json);
          setUserData(profile);
          setIsLoggedIn(true); // 🔁 activa AppNavigator
        } else {
          setIsLoggedIn(false); // 🔁 activa AuthNavigator
        }
      } catch (err) {
        console.warn('Error leyendo sesión:', err);
        setIsLoggedIn(false);
      }
    };

    setTimeout(checkSession, 2000); // espera 2 segundos
  }, [rotateAnim, setUserData, setIsLoggedIn]);

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
