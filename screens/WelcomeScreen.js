import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
      />
      <Text style={styles.title}>Conecta. Colabora. Crea.</Text>
      <Text style={styles.subtitle}>
        Publica tu perfil o encuentra el talento ideal en segundos.
      </Text>

      {/* Botón para ir a Login */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.replace('Login')} // 👈 Aquí hacemos la navegación
      >
        <Text style={styles.buttonText}>COMENZAR</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // fondo negro
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#BF872E', // dorado principal
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC', // gris claro
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#A77423', // dorado oscuro para el botón
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
