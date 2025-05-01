import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isValidEmail = (email) => {
    const regex = /\S+@\S+\.\S+/;
    return regex.test(email);
  };

  const handleLogin = async () => {
    try {
      const json = await AsyncStorage.getItem('userData');
      const storedUser = JSON.parse(json);

      if (!storedUser || storedUser.email !== email || storedUser.password !== password) {
        Alert.alert('Acceso denegado', 'Correo o contraseña incorrectos.');
        return;
      }

      await AsyncStorage.setItem('userProfile', JSON.stringify(storedUser));
      navigation.replace('Dashboard');
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'No se pudo acceder. Intenta nuevamente.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
      />

      <Text style={styles.title}>Inicio de sesión</Text>
      <Text style={styles.subtitle}>
        Inicia sesión con tu cuenta <Text style={{ fontWeight: 'bold', color: '#BF872E' }}>EL ENLACE</Text>.
      </Text>

      {/* Input de correo */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="CORREO ELECTRÓNICO"
          placeholderTextColor="#CCCCCC"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Ionicons
          name="checkmark-circle"
          size={24}
          color={isValidEmail(email) ? '#BF872E' : '#555555'}
          style={styles.iconRight}
        />
      </View>

      {/* Input de contraseña */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="CONTRASEÑA"
          placeholderTextColor="#CCCCCC"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.iconRight}>
          <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="#CCCCCC" />
        </TouchableOpacity>
      </View>

      {/* Olvidé contraseña */}
      <TouchableOpacity>
        <Text style={styles.forgotPassword}>Olvidé mi contraseña</Text>
      </TouchableOpacity>

      {/* Botón iniciar sesión */}
      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginButtonText}>INICIAR SESIÓN</Text>
      </TouchableOpacity>

      {/* Registrarse */}
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.registerText}>
          ¿No tienes cuenta? <Text style={{ color: '#BF872E' }}>Regístrate</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 20,
    justifyContent: 'center',
  },
  logo: {
    width: 180,
    height: 180,
    resizeMode: 'contain',
    marginBottom: 20,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  input: {
    backgroundColor: '#1A1A1A',
    color: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    paddingRight: 50,
    fontSize: 16,
  },
  iconRight: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  forgotPassword: {
    color: '#CCCCCC',
    textAlign: 'right',
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#BF872E',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  registerText: {
    color: '#CCCCCC',
    textAlign: 'center',
  },
});
