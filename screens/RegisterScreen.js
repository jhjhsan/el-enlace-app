import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegisterScreen({ navigation }) {
  const { setUserData } = useUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');

  const isValidEmail = (email) => {
    const regex = /\S+@\S+\.\S+/;
    return regex.test(email);
  };

  const evaluatePasswordStrength = (password) => {
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);
    const isLong = password.length >= 8;

    if (hasLetters && hasNumbers && hasSpecial && isLong) return 'Fuerte';
    if ((hasLetters && hasNumbers && isLong) || (hasLetters && hasSpecial && isLong)) return 'Media';
    return 'Débil';
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    setPasswordStrength(evaluatePasswordStrength(text));
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Por favor completa todos los campos.');
      return;
    }
  
    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Correo no válido.');
      return;
    }
  
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }
  
    const newUser = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password.trim(),
      membershipType: 'free',
    };
  
    try {
      const storedUsers = await AsyncStorage.getItem('allUsers');
      const users = storedUsers ? JSON.parse(storedUsers) : [];
  
      const emailExists = users.some((u) => u.email === newUser.email);
      if (emailExists) {
        Alert.alert('Error', 'Este correo ya está registrado.');
        return;
      }
  
      users.push(newUser);
      await AsyncStorage.setItem('allUsers', JSON.stringify(users));
      await AsyncStorage.setItem('userData', JSON.stringify(newUser));
      await AsyncStorage.setItem('fromRegister', 'true'); // ✅ Bandera para formulario
      await AsyncStorage.setItem('sessionActive', 'true'); // ✅ Esto activa sesión persistente
  
      setUserData(newUser);
      navigation.replace('FormularioFree');
  
    } catch (error) {
      console.error('Error al registrar:', error);
      Alert.alert('Error', 'No se pudo registrar el usuario.');
    }

  };

  const getStrengthColor = () => {
    if (passwordStrength === 'Fuerte') return '#00ff99';
    if (passwordStrength === 'Media') return '#ffcc00';
    return '#ff4444';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear cuenta</Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre completo"
        placeholderTextColor="#999"
        value={name}
        onChangeText={setName}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <Ionicons
          name="checkmark-circle"
          size={24}
          color={isValidEmail(email) ? '#D8A353' : '#555'}
          style={styles.iconRight}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#999"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={handlePasswordChange}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.iconRight}>
          <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="#ccc" />
        </TouchableOpacity>
      </View>

      {password.length > 0 && (
        <Text style={[styles.strengthLabel, { color: getStrengthColor() }]}>Seguridad: {passwordStrength}</Text>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Repetir contraseña"
          placeholderTextColor="#999"
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.iconRight}>
          <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={24} color="#ccc" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>REGISTRARSE</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.loginText}>¿Ya tienes cuenta? Inicia sesión</Text>
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
  },
  title: {
    color: '#D8A353',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1A1A1A',
    color: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    paddingRight: 50,
    fontSize: 16,
    borderColor: '#D8A353',
    borderWidth: 1,
    marginBottom: 10,
  },
  inputContainer: {
    marginBottom: 10,
    position: 'relative',
  },
  iconRight: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  button: {
    backgroundColor: '#D8A353',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  loginText: {
    color: '#CCCCCC',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  strengthLabel: {
    marginBottom: 10,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});
