import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';

export default function SplashScreen() {
  const { setUserData, setIsLoggedIn } = useUser();
  const navigation = useNavigation();

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animación giratoria
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();

    const loadUser = async () => {
      try {
        const json =
          (await AsyncStorage.getItem('userProfilePro')) ||
          (await AsyncStorage.getItem('userProfile'));
        if (json) {
          const profile = JSON.parse(json);
          setUserData(profile);
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.warn('Error leyendo sesión:', err);
      }
    };

    const timer = setTimeout(async () => {
      await loadUser();

      // Fade elegante antes de navegar
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        navigation.replace('MainApp'); // Ahora va al stack completo
      });
    }, 2000);

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
