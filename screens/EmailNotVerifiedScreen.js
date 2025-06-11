import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../src/firebase/firebaseConfig';
import { sendEmailVerification } from 'firebase/auth';

export default function EmailNotVerifiedScreen() {
  const navigation = useNavigation();

  const handleResendVerification = async () => {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        alert('Correo de verificación reenviado. Revisa tu bandeja de entrada.');
      } else {
        alert('No se encontró el usuario actual.');
      }
    } catch (error) {
      console.error('Error al reenviar correo:', error);
      alert('No se pudo reenviar el correo. Intenta nuevamente.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>✉️ Verifica tu correo</Text>
      <Text style={styles.message}>
        Hemos enviado un correo de verificación a tu dirección. 
        Debes confirmar tu email antes de continuar usando la app.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.replace('Login')}
      >
        <Text style={styles.buttonText}>Volver a iniciar sesión</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#444', marginTop: 15 }]}
        onPress={handleResendVerification}
      >
        <Text style={[styles.buttonText, { color: '#fff' }]}>Reenviar correo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  message: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#D8A353',
    padding: 12,
    borderRadius: 10,
    width: '80%',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
