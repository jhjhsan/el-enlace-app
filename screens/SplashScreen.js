import React, { useRef, useEffect } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function SplashScreen() {
  const rotateZ = useRef(new Animated.Value(0)).current;
  const rotateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.timing(rotateZ, {
          toValue: 1,
          duration: 5000, // Giro lento en eje Z
          useNativeDriver: true,
        }),
        Animated.timing(rotateY, {
          toValue: 1,
          duration: 4000, // Giro en eje Y con diferente velocidad
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const spinZ = rotateZ.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spinY = rotateY.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#000" />
      <Animated.Image
        source={require('../assets/logo.png')}
        style={[
          styles.logo,
          {
            transform: [
              { perspective: 1000 }, // Simula profundidad 3D
              { rotateY: spinY },
              { rotateZ: spinZ },
            ],
          },
        ]}
        resizeMode="contain"
      />
    </View>
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
    width: 260,
    height: 260,
  },
});
