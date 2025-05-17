import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegisterScreen({ navigation }) {
  const { setUserData } = useUser();
  const [membershipType, setMembershipType] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const toggleCard = (type) => {
    if (membershipType !== type) {
      setMembershipType(type);
      setExpandedCard(type);
    } else {
      setExpandedCard(expandedCard === type ? null : type);
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);

    if (!membershipType) {
      Alert.alert('Error', 'Debes seleccionar un tipo de cuenta.');
      setIsLoading(false);
      return;
    }
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Por favor completa todos los campos.');
      setIsLoading(false);
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Correo no válido.');
      setIsLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      setIsLoading(false);
      return;
    }

    const newUser = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password.trim(),
      membershipType,
    };

    try {
      const storedUsers = await AsyncStorage.getItem('allUsers');
      const users = storedUsers ? JSON.parse(storedUsers) : [];

      const emailExists = users.some((u) => u.email === newUser.email);
      if (emailExists) {
        Alert.alert('Error', 'Este correo ya está registrado.');
        setIsLoading(false);
        return;
      }

      users.push(newUser);
      await AsyncStorage.setItem('allUsers', JSON.stringify(users));
      await AsyncStorage.setItem('userData', JSON.stringify(newUser));
      await AsyncStorage.setItem('fromRegister', 'true');
      await AsyncStorage.setItem('sessionActive', 'true');

      setUserData(newUser);
      setIsLoading(false);
      navigation.replace(membershipType === 'elite' ? 'FormularioElite' : 'FormularioFree');
    } catch (error) {
      console.error('Error al registrar:', error);
      Alert.alert('Error', 'No se pudo registrar el usuario.');
      setIsLoading(false);
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
      <Text style={styles.subtitle}>¿Qué tipo de cuenta quieres crear?</Text>

      <View style={styles.cardGroup}>
        {/* Talento / Profesional */}
        <TouchableOpacity
          style={[
            styles.card,
            membershipType === 'free' && styles.selectedCard,
          ]}
          onPress={() => toggleCard('free')}
        >
          <Text style={styles.cardTitle}>🧑‍🎤 Talento / Profesional Independiente</Text>
          <Text style={styles.cardText}>
            Para personas que ofrecen su imagen, habilidades u oficios en el mundo audiovisual.
          </Text>
          {expandedCard === 'free' && (
            <Text style={styles.cardExtra}>
              • Actor / Actriz{'\n'}
              • Modelo / Extra / Bailarín{'\n'}
              • Camarógrafo / Fotógrafo{'\n'}
              • Maquillista / Peluquero / Estilista{'\n'}
              • Iluminador / Sonidista / Microfonista{'\n'}
              • Editor / Postproductor / Colorista{'\n'}
              • Community manager / Creador digital{'\n'}
              • Asistente de producción / Dirección{'\n'}
              • Chofer / Auto personal para escenas{'\n'}
              • Artista urbano / Ilustrador / Técnico FX
            </Text>
          )}
          <Text style={styles.cardExample}>
            Ejemplo: Si tienes una moto o auto y quieres ofrecerlo para rodajes, este es tu perfil.
          </Text>
        </TouchableOpacity>

        {/* Agencia / Productora */}
        <TouchableOpacity
          style={[
            styles.card,
            membershipType === 'elite' && styles.selectedCard,
          ]}
          onPress={() => toggleCard('elite')}
        >
          <Text style={styles.cardTitle}>🏢 Agencia / Productora / Proveedor</Text>
          <Text style={styles.cardText}>
            Para empresas, agencias o equipos que contratan talentos o prestan servicios a producciones.
          </Text>
          {expandedCard === 'elite' && (
            <Text style={styles.cardExtra}>
              • Agencia de casting / Agencia de modelos{'\n'}
              • Productora audiovisual o fotográfica{'\n'}
              • Coordinadores de producción o locaciones{'\n'}
              • Servicios de transporte, vans, logística{'\n'}
              • Servicios de catering, coffee break, casas rodantes{'\n'}
              • Grúas, camiones, estudios o equipos técnicos
            </Text>
          )}
          <Text style={styles.cardExample}>
            Ejemplo: Si tienes un servicio de catering o arriendas equipos, este es tu perfil.
          </Text>
        </TouchableOpacity>
      </View>

      {/* Formulario */}
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
          size={20}
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
          <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {password.length > 0 && (
        <Text style={[styles.strengthLabel, { color: getStrengthColor() }]}>
          Seguridad: {passwordStrength}
        </Text>
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
          <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Botón con loading */}
      <TouchableOpacity
        style={[styles.button, isLoading && { opacity: 0.6 }]}
        onPress={handleRegister}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.buttonText}>REGISTRARSE</Text>
        )}
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
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    color: '#CCCCCC',
    fontSize: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  cardGroup: {
    flexDirection: 'column',
    gap: 15,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
  },
  selectedCard: {
    borderColor: '#D8A353',
    backgroundColor: '#222',
  },
  cardTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  cardText: {
    color: '#ccc',
    fontSize: 13,
    lineHeight: 18,
  },
  cardExtra: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 5,
    lineHeight: 17,
  },
  cardExample: {
    color: '#888',
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#1A1A1A',
    color: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    paddingRight: 40,
    fontSize: 14,
    borderColor: '#D8A353',
    borderWidth: 1,
    marginBottom: 8,
  },
  inputContainer: {
    marginBottom: 8,
    position: 'relative',
  },
  iconRight: {
    position: 'absolute',
    right: 15,
    top: 12,
  },
  button: {
    backgroundColor: '#D8A353',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 15,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
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
    fontSize: 13,
  },
});
