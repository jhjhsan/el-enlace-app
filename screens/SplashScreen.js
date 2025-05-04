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
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();

    const loadUser = async () => {
      try {
        const pro = await AsyncStorage.getItem('userProfilePro');
        const free = await AsyncStorage.getItem('userProfile');
        const profile = pro || free;

        if (profile) {
          setUserData(JSON.parse(profile));
          setIsLoggedIn(true);
        } else {
          setUserData(null);
          setIsLoggedIn(false);
        }

        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }).start(() => {
          if (profile) {
            navigation.replace('Dashboard');
          } else {
            navigation.replace('Login');
          }
        });

      } catch (err) {
        console.warn('Error leyendo sesión:', err);
        setUserData(null);
        setIsLoggedIn(false);
        navigation.replace('Login');
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
