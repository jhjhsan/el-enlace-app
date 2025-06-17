import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import { registerWithEmail } from '../src/firebase/helpers/authHelper';
import { saveProfileToFirestore } from '../src/firebase/helpers/saveProfileToFirestore';
import { goToInitialRedirect } from '../utils/navigationHelpers';


export default function RegisterScreen({ navigation }) {
  const { setUserData, setIsLoggedIn } = useUser();
  const [membershipType, setMembershipType] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState([]);
  const [modalTitle, setModalTitle] = useState('');

  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const talentCategories = [
    "Actor", "Actriz", "Animador / presentador", "Artista urbano", "Bailarín / bailarina",
    "Camarógrafo", "Caracterizador (maquillaje FX)", "Colorista", "Community manager",
    "Continuista", "Creador de contenido digital", "Decorador de set", "Diseñador de arte",
    "Diseñador gráfico", "Doble de acción", "Editor de video", "Escenógrafo",
    "Extra", "Fotógrafo de backstage", "Iluminador", "Ilustrador / storyboarder",
    "Maquillista", "Microfonista", "Modelo", "Modelo publicitario", "Niño actor",
    "Operador de drone", "Peluquero / estilista", "Postproductor", "Productor",
    "Promotoras", "Servicios de catering", "Sonidista", "Stage manager",
    "Técnico de efectos especiales", "Técnico de grúa", "Vestuarista",
    "Ambientador", "Asistente de cámara", "Asistente de dirección",
    "Asistente de producción", "Asistente de vestuario",
    "Transporte de talentos", "Autos personales", "Motos o bicicletas para escenas",
    "Grúas para filmación", "Camiones de arte para rodajes", "Casas rodantes para producción",
    "Estudio fotográfico", "Transporte de producción", "Vans de producción",
    "Coffee break / snacks", "Otros / No especificado"
  ];

  const eliteCategories = [
    "Agencia de casting", "Agencia de modelos", "Agencia de talentos", "Agencia de publicidad",
    "Agencia de eventos", "Productora audiovisual", "Productora cinematográfica",
    "Productora de televisión", "Productora de contenido digital", "Productora de comerciales",
    "Coordinadora de producción", "Empresa de producción técnica", "Casa productora de videoclips",
    "Estudio de producción fotográfica", "Estudio de grabación", "Estudio de doblaje",
    "Casa de postproducción", "Plataforma de casting o booking", "Empresa de alquiler de equipos",
    "Empresa de transporte de producción", "Empresa de catering para rodajes",
    "Proveedor de casas rodantes", "Proveedor de coffee break / snacks",
    "Proveedor de autos o vans para filmación", "Agencia de contenido digital",
    "Plataforma de medios / streaming", "Otros / Empresa no especificada"
  ];

  const showModal = (type) => {
    setMembershipType(type);
    setModalTitle(type === 'free' ? 'Categorías para Talento' : 'Categorías para Agencia');
    setModalContent(type === 'free' ? talentCategories : eliteCategories);
    setModalVisible(true);
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideModal = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setModalVisible(false));
  };

  const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

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

  const getStrengthColor = () => passwordStrength === 'Fuerte' ? '#00ff99' : passwordStrength === 'Media' ? '#ffcc00' : '#ff4444';

  const handleRegister = async () => {
    setIsLoading(true);

    try {
      if (!acceptedPolicies) {
  Alert.alert('Debes aceptar las políticas', 'Para continuar, debes aceptar los términos y condiciones y la política de privacidad.');
  setIsLoading(false);
  return;
}
      if (!membershipType) {
        Alert.alert('Error', 'Selecciona un tipo de cuenta.');
        setIsLoading(false);
        return;
      }
      if (!name || !email || !password || !confirmPassword) {
        Alert.alert('Error', 'Completa todos los campos.');
        setIsLoading(false);
        return;
      }
      if (!isValidEmail(email)) {
        Alert.alert('Error', 'Correo inválido.');
        setIsLoading(false);
        return;
      }
      const passwordIsSecure = password.length >= 6 && /[A-Z]/.test(password);

if (!passwordIsSecure) {
  Alert.alert('Contraseña insegura', 'Debe tener al menos 6 caracteres y una letra mayúscula.');
  setIsLoading(false);
  return;
}

      if (password !== confirmPassword) {
        Alert.alert('Error', 'Las contraseñas no coinciden.');
        setIsLoading(false);
        return;
      }

     const firebaseResult = await registerWithEmail(email.trim().toLowerCase(), password.trim());
if (!firebaseResult.success) {
  if (firebaseResult.error?.code === 'auth/email-already-in-use') {
    Alert.alert('Este correo ya está registrado', 'Inicia sesión o usa otro correo.');
  } else {
    Alert.alert('Error al registrar', 'No se pudo crear la cuenta en Firebase.');
  }
  setIsLoading(false);
  return;
}

// LIMPIAR DATOS ANTIGUOS
await AsyncStorage.multiRemove([
  'userData',
  'userProfileFree',
  'userProfilePro',
  'userProfileElite',
  'fromRegister',
  'allUsers' // Esto eliminará todos los usuarios anteriores al registrar uno nuevo
]);

    const newUser = {
  name: name.trim(),
  email: email.trim().toLowerCase(),
  accountType: membershipType === 'elite' ? 'agency' : 'talent',
  membershipType: membershipType,
};

if (membershipType === 'elite') {
  newUser.hasPaid = false;
}

      const storedUsers = await AsyncStorage.getItem('allUsers');
      const users = storedUsers ? JSON.parse(storedUsers) : [];

      if (users.some((u) => u.email === newUser.email)) {
        Alert.alert('Error', 'Correo ya registrado.');
        setIsLoading(false);
        return;
      }

      users.push(newUser);
      await AsyncStorage.setItem('allUsers', JSON.stringify(users));
      await AsyncStorage.setItem('userData', JSON.stringify(newUser));
      await AsyncStorage.setItem('acceptedPolicies', 'true');
      setUserData(newUser);
      // Si es Pro o Elite, agregar 30 días de prueba gratuita
if (membershipType === 'pro' || membershipType === 'elite') {
  const now = new Date();
  const trialEndDate = new Date(now.setDate(now.getDate() + 30));
  newUser.trialEndsAt = trialEndDate.toISOString(); // Se guarda como ISO para Firestore
  newUser.subscriptionStart = new Date().toISOString();
  newUser.subscriptionType = 'trial';
  newUser.hasPaid = false; // Garantizamos el estado inicial
}
      await saveProfileToFirestore(newUser);
      await AsyncStorage.setItem('fromRegister', 'true');
      await AsyncStorage.setItem('sessionActive', 'true');

 setIsLoading(false);
setIsLoggedIn(true);

setTimeout(() => {
  goToInitialRedirect(navigation);
}, 100);

    } catch (error) {
      console.error('Error al registrar:', error);
      Alert.alert('Error', 'No se pudo registrar. Intenta de nuevo.');
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear cuenta</Text>
      <Text style={styles.subtitle}>Selecciona tu tipo de cuenta</Text>

      <TouchableOpacity style={[styles.card, membershipType === 'free' && styles.selectedCard]} onPress={() => showModal('free')}>
        <Text style={styles.cardTitle}>🧑‍🎤 Talento / Profesional Independiente</Text>
        <Text style={styles.cardText}>Para quienes ofrecen sus habilidades en el mundo audiovisual.</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.card, membershipType === 'elite' && styles.selectedCard]} onPress={() => showModal('elite')}>
        <Text style={styles.cardTitle}>🏢 Agencia / Productora / Proveedor</Text>
        <Text style={styles.cardText}>Para empresas o servicios que contratan talentos o apoyan rodajes.</Text>
      </TouchableOpacity>

      <TextInput style={styles.input} placeholder="Nombre completo" placeholderTextColor="#999" value={name} onChangeText={setName} />

      <View style={styles.inputContainer}>
        <TextInput style={styles.input} placeholder="Correo electrónico" placeholderTextColor="#999" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <Ionicons name="checkmark-circle" size={20} color={isValidEmail(email) ? '#D8A353' : '#555'} style={styles.iconRight} />
      </View>

      <View style={styles.inputContainer}>
        <TextInput style={styles.input} placeholder="Contraseña" placeholderTextColor="#999" secureTextEntry={!showPassword} value={password} onChangeText={handlePasswordChange} />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.iconRight}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#ccc" />
        </TouchableOpacity>
      </View>
<Text style={{ color: '#888', fontSize: 12, marginBottom: 5 }}>
  Mínimo 6 caracteres y una letra mayúscula
</Text>

      {password.length > 0 && <Text style={[styles.strengthLabel, { color: getStrengthColor() }]}>Seguridad: {passwordStrength}</Text>}

      <View style={styles.inputContainer}>
        <TextInput style={styles.input} placeholder="Repetir contraseña" placeholderTextColor="#999" secureTextEntry={!showConfirmPassword} value={confirmPassword} onChangeText={setConfirmPassword} />
        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.iconRight}>
          <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#ccc" />
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
  <TouchableOpacity onPress={() => setAcceptedPolicies(!acceptedPolicies)} style={styles.checkbox}>
    {acceptedPolicies && <View style={styles.checkboxChecked} />}
  </TouchableOpacity>
  <Text style={styles.checkboxText}>
    Acepto los{' '}
    <Text style={styles.linkText} onPress={() => navigation.navigate('TermsAndConditionsScreen')}>Términos</Text>{' '}
    y la{' '}
    <Text style={styles.linkText} onPress={() => navigation.navigate('PrivacyPolicyScreen')}>Política de Privacidad</Text>.
  </Text>
</View>

      <TouchableOpacity style={[styles.button, isLoading && { opacity: 0.6 }]} onPress={handleRegister} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>REGISTRARSE</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.loginText}>¿Ya tienes cuenta? Inicia sesión</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={hideModal}
      >
        <View style={styles.modalOverlay}>
          {/* Área fuera del modal (para cerrar) */}
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={hideModal}
          />

          {/* Contenido del modal */}
          <Animated.View style={[styles.modalContent, {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          }]}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>

            <ScrollView
              style={{ maxHeight: '100%' }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled
            >
              {modalContent.map((cat, idx) => (
                <Text key={idx} style={styles.modalItem}>• {cat}</Text>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.modalClose} onPress={hideModal}>
              <Text style={styles.modalCloseText}>✕ Cerrar</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Área debajo del modal (para cerrar si toca abajo) */}
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={hideModal}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, marginTop: 25 },
  title: { color: '#D8A353', fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { color: '#ccc', fontSize: 16, marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: '#1A1A1A', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#333', marginBottom: 15 },
  selectedCard: { borderColor: '#D8A353', backgroundColor: '#222' },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  cardText: { color: '#ccc', fontSize: 14 },
  input: { backgroundColor: '#1A1A1A', color: '#FFFFFF', borderRadius: 10, padding: 10, paddingRight: 40, fontSize: 14, borderColor: '#D8A353', borderWidth: 1, marginBottom: 8 },
  inputContainer: { marginBottom: 8, position: 'relative' },
  iconRight: { position: 'absolute', right: 15, top: 12 },
  strengthLabel: { marginBottom: 10, fontWeight: 'bold', marginLeft: 5, fontSize: 13 },
  button: { backgroundColor: '#D8A353', padding: 12, borderRadius: 10, marginTop: 10, marginBottom: 15 },
  buttonText: { color: '#000', fontWeight: 'bold', fontSize: 15, textAlign: 'center' },
  loginText: { color: '#CCCCCC', textAlign: 'center', textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: {
    backgroundColor: '#111',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxHeight: '85%',
  },
  modalTitle: { color: '#D8A353', fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  modalList: { marginBottom: 15 },
  modalItem: { color: '#ccc', fontSize: 14, marginVertical: 2 },
  modalClose: { alignSelf: 'flex-end', marginTop: 5 },
  modalCloseText: { color: '#D8A353', fontSize: 14, fontWeight: 'bold' },
  checkbox: {
  width: 20,
  height: 20,
  borderWidth: 2,
  borderColor: '#D8A353',
  borderRadius: 4,
  marginRight: 10,
  justifyContent: 'center',
  alignItems: 'center',
},
checkboxChecked: {
  width: 12,
  height: 12,
  backgroundColor: '#D8A353',
  borderRadius: 2,
},
checkboxText: {
  color: '#ccc',
  flex: 1,
  fontSize: 13,
  lineHeight: 18,
},
linkText: {
  color: '#4DA6FF',
  textDecorationLine: 'underline',
},

});