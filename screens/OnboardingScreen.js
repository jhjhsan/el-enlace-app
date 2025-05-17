import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Video } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OnboardingScreen({ navigation }) {
  useEffect(() => {
    // Marcamos que el tutorial ya fue visto al entrar
    AsyncStorage.setItem('hasSeenTutorial', 'true');
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎬 Bienvenido a El Enlace</Text>
      <Text style={styles.text}>Conoce cómo funciona la app en este breve tutorial.</Text>

      <Video
        source={{ uri: 'https://www.w3schools.com/html/mov_bbb.mp4' }} // reemplazar por tu propio video
        rate={1.0}
        volume={1.0}
        isMuted={false}
        resizeMode="contain"
        useNativeControls
        shouldPlay
        style={styles.video}
      />

      <TouchableOpacity style={styles.button} onPress={() => navigation.replace('MainApp')}>
        <Text style={styles.buttonText}>Saltar y continuar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#D8A353',
    textAlign: 'center',
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  video: {
    width: '100%',
    height: 220,
    backgroundColor: '#111',
    borderRadius: 10,
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#D8A353',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
