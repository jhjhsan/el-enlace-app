import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { loginUser } from '../utils/auth';

export default function LoginScreen({ navigation }) {
  const { setUserData, setIsLoggedIn } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa tu email y contraseña.');
      return;
    }

    try {
      const user = await loginUser(email, password);
await AsyncStorage.setItem('sessionActive', 'true');

// 🔽 Obtener el perfil completo desde AsyncStorage
const storedProfile = await AsyncStorage.getItem('userProfile');

if (storedProfile) {
  const fullProfile = JSON.parse(storedProfile);
  setUserData(fullProfile);
  setIsLoggedIn(true);
} else {
  Alert.alert('Error', 'No se pudo cargar el perfil completo.');
}

    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      Alert.alert('Error', error.message);
    }
  };

  const handleRecoverPassword = async () => {
    if (!recoveryEmail) {
      Alert.alert('Campo vacío', 'Ingresa un correo válido.');
      return;
    }

    try {
      const storedUsers = await AsyncStorage.getItem('allUsers');
      const users = storedUsers ? JSON.parse(storedUsers) : [];

      const user = users.find(
        (u) => u.email.toLowerCase() === recoveryEmail.trim().toLowerCase()
      );

      if (user) {
        Alert.alert('Contraseña recuperada', `Tu contraseña es: ${user.password}`);
      } else {
        Alert.alert('No encontrado', 'Ese correo no está registrado.');
      }
    } catch (error) {
      console.log('Error en recuperación:', error);
      Alert.alert('Error', 'No se pudo recuperar la contraseña.');
    } finally {
      setShowModal(false);
      setRecoveryEmail('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar sesión</Text>

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        placeholderTextColor="#999"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#999"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.iconRight}
        >
          <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="#CCCCCC" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>INGRESAR</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setShowModal(true)}>
        <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.registerText}>¿No tienes cuenta? Regístrate</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Recuperar contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu correo"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              value={recoveryEmail}
              onChangeText={setRecoveryEmail}
            />
            <TouchableOpacity style={styles.button} onPress={handleRecoverPassword}>
              <Text style={styles.buttonText}>Recuperar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    color: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderColor: '#D8A353',
    borderWidth: 1,
    marginBottom: 15,
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: 15,
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
    marginBottom: 10,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  registerText: {
    color: '#CCCCCC',
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: 10,
  },
  forgotText: {
    color: '#CCCCCC',
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 10,
    width: '85%',
  },
  modalTitle: {
    color: '#D8A353',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  cancelText: {
    color: '#888',
    marginTop: 15,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
