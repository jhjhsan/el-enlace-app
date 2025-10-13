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
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { saveProfileToFirestore } from '../src/firebase/helpers/saveProfileToFirestore';
import {
  goToInitialRedirect,
  goToFormularioFree,
  goToCompleteElite,
} from '../utils/navigationHelpers';
import { registerWithEmail } from '../src/firebase/helpers/authHelper';
import BackButton from '../components/BackButton';
import AgencyRegisterForm from './AgencyRegisterForm';
import TalentRegisterForm from './TalentRegisterForm';
import { sendEmailVerification } from 'firebase/auth';
import { guardarAllProfiles } from '../src/firebase/helpers/profileHelpers';

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
  const [showForm, setShowForm] = useState(false);

  const [isMinor, setIsMinor] = useState(false);
  const [representativeName, setRepresentativeName] = useState('');
  const [representativeID, setRepresentativeID] = useState('');
  const [relationship, setRelationship] = useState('');
  const [legalConsent, setLegalConsent] = useState(false);
  const [representativeEmail, setRepresentativeEmail] = useState('');

// ==== TALENTOS / PROFESIONALES (perfiles personales) ====
const CATEGORIES_TALENT = [
  // Interpretación / Frente a cámara
  "Actor", "Actriz", "Niño actor", "Doble de acción / Stunt", "Extra",
  "Animador / Presentador", "Host / Maestro de ceremonias", "Modelo", "Modelo publicitario",
  "Influencer / Creador de contenido", "Locutor / Voz en off",

  // Dirección / Producción
  "Director/a", "Asistente de dirección 1º AD", "Asistente de dirección 2º AD", "Script / Continuista",
  "Productor/a general", "Productor/a ejecutivo/a", "Jefe/a de producción", "Asistente de producción",
  "Coordinador/a de producción", "Location manager", "Location assistant",

  // Cámara / Imagen
  "Director/a de fotografía", "Camarógrafo / Operador de cámara", "1º Asistente de cámara (1AC)",
  "2º Asistente de cámara (2AC)", "Data wrangler", "DIT (Técnico de imagen digital)",
  "Operador de steadicam", "Operador de gimbal", "Operador de drone",

  // Iluminación / Grip
  "Gaffer / Jefe de eléctricos", "Best boy eléctricos", "Eléctrico",
  "Key grip / Jefe de grip", "Best boy grip", "Grip", "Dolly grip",

  // Sonido
  "Jefe/a de sonido directo", "Microfonista / Boom operator", "Utility de sonido",

  // Arte / Vestuario / Maquillaje
  "Director/a de arte", "Escenógrafo/a", "Ambientador/a", "Utilero/a (Props)",
  "Carpintero/a de arte", "Troquelador/a / Constructor/a de set",
  "Vestuarista / Diseñador/a de vestuario", "Asistente de vestuario", "Sastre / Modista",
  "Maquillista", "Peluquero / Estilista", "Caracterizador (FX Makeup)",

  // Foto fija
  "Fotógrafo/a de still", "Fotógrafo/a de backstage",

  // Postproducción
  "Editor/a de video", "Asistente de edición", "Colorista", "VFX Artist / Compositor",
  "Motion graphics", "Roto / Clean-up", "Doblaje / ADR (actor/actriz de voz)", "Foley artist",
  "Diseñador/a de sonido", "Mezclador/a de sonido (re-recording mixer)",

  // Guion / Coordinación creativa
  "Guionista", "Script doctor", "Story editor", "Supervisor/a de guion",
  "Ilustrador / Storyboarder", "Concept artist",

  // Dirección de casting / Coordinación de talentos
  "Director/a de casting (persona)", "Asistente de casting",

  // Coreografías / Especialidades
  "Coreógrafo/a", "Bailarín / Bailarina", "Coordinador/a de stunts",
  "Entrenador/a actoral / Coach", "Coordinador/a de intimidad",
  "Coordinador/a de animales", "Músico / Compositor/a",

  // Digital / Social
  "Community manager (freelance)", "Content strategist (freelance)",

  // Otros
  "Ilustrador/a", "Diseñador/a gráfico/a", "Fotógrafo/a", "Realizador/a",
  "Periodista / Redactor/a", "Traductor/a / Subtitulador/a",
  "Otros / No especificado",
];

// ==== RECURSOS / SERVICIOS / INFRAESTRUCTURA (no personales) ====
const CATEGORIES_RESOURCE = [
  // Locaciones y espacios
  "Estudio fotográfico", "Estudio de filmación / plató", "Foro / Escenario",
  "Locaciones (catálogo/servicio)", "Casas / Departamentos para rodaje",
  "Oficinas / Comercios para rodaje", "Bodegas / Galpones", "Espacios públicos (gestión de permisos)",

  // Transporte y móviles
  "Transporte de producción", "Vans de producción", "Camiones de arte",
  "Camión de iluminación / grip", "Motorhome / Casa rodante", "Camerino móvil",
  "Transporte de talentos / chofer", "Autos personales para escena",
  "Autos de época", "Autos deportivos / especiales", "Motos / Bicicletas para escenas",

  // Equipos (renta)
  "Renta de cámaras", "Renta de lentes", "Renta de video assist / DIT",
  "Renta de iluminación", "Renta de grip / rigging", "Renta de sonido",
  "Renta de drones", "Renta de steady / gimbal", "Renta de monitoreo inalámbrico",
  "Renta de generadores", "Renta de data storage / DIT carts",

  // Arte / Construcción / Props
  "Renta de utilería (props)", "Taller de arte / maestranza", "Construcción de sets",
  "Greens / Vegetación para set", "Renta de mobiliario / ambientación",
  "Renta de vestuario / guardarropía", "Sastrería / Ajustes de vestuario",

  // Efectos y seguridad
  "Efectos especiales mecánicos", "Efectos de lluvia / viento / nieve",
  "Pirotecnia (con permisos)", "Coordinación de stunts (empresa)",
  "Seguridad para rodaje", "Paramédico / Unidad médica",

  // Servicios de producción
  "Catering para rodaje", "Coffee break / Snacks", "Craft service",
  "Baños químicos", "Carpas / Toldo / Sombras", "Vallas / Control de público",
  "Aseo / Limpieza set", "Gestión de permisos / Trámites", "Seguros de producción",

  // Post / Audio / Salas
  "Casa de postproducción", "Sala de edición", "Sala de color / grading",
  "Estudio de sonido / mezcla", "Estudio de doblaje / locución",

  // Almacenaje y logística
  "Bodega / Storage de producción", "Mensajería / Courier de producción",

  // Animales / Especiales
  "Animales para rodaje (con handler)", "Armería escénica (con permisos)",

  // Otros recursos
  "Plataformas / Casting software", "Plataformas de streaming / media",
  "Otros / No especificado"
];

// 👉 Compatibilidad con la UI actual de este archivo (un único selector para FREE):
const talentCategories = [...CATEGORIES_TALENT, ...CATEGORIES_RESOURCE];


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

const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const cleaned = email
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9@._\-+]/gi, '')
    .replace(/@{2,}/g, '@')

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);

  if (
    !isValid &&
    cleaned &&
    typeof cleaned === 'string' &&
    cleaned.includes('@') &&
    cleaned.length > 5 &&
    !cleaned.includes('@gmail@') // ← evita falsos positivos molestos
  ) {
    console.warn('Correo normalizado no válido:', cleaned);
  }

  return isValid;
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

  const getStrengthColor = () => passwordStrength === 'Fuerte' ? '#00ff99' : passwordStrength === 'Media' ? '#ffcc00' : '#ff4444';

  const cleanAsyncStorage = async () => {
    try {

      const allUsersJson = await AsyncStorage.getItem('allUsers');
      let allUsers = allUsersJson ? JSON.parse(allUsersJson) : [];
      const allProfilesJson = await AsyncStorage.getItem('allProfiles');
      let allProfiles = allProfilesJson ? JSON.parse(allProfilesJson) : [];
      const allProfilesEliteJson = await AsyncStorage.getItem('allProfilesElite');
      let allProfilesElite = allProfilesEliteJson ? JSON.parse(allProfilesEliteJson) : [];

      console.log('📦 allUsers antes de limpieza:', allUsers);
      console.log('📦 allProfiles antes de limpieza:', allProfiles);
      console.log('📦 allProfilesElite antes de limpieza:', allProfilesElite);

      allUsers = allUsers.filter((user) => isValidEmail(user.email));
      allProfiles = allProfiles.filter((profile) => isValidEmail(profile.email));
      allProfilesElite = allProfilesElite.filter((profile) => isValidEmail(profile.email));

      console.log('🧹 Limpiando allUsers, entradas válidas:', allUsers);
      console.log('🧹 Limpiando allProfiles, entradas válidas:', allProfiles);
      console.log('🧹 Limpiando allProfilesElite, entradas válidas:', allProfilesElite);

      await AsyncStorage.setItem('allUsers', JSON.stringify(allUsers));
      await guardarAllProfiles(allProfiles);
      await AsyncStorage.setItem('allProfilesElite', JSON.stringify(allProfilesElite));
      console.log('✅ AsyncStorage limpiado correctamente');
    } catch (error) {
      console.error('❌ Error al limpiar AsyncStorage:', error);
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    await cleanAsyncStorage();

    // Validar campos de menor de edad
    if (isMinor) {
      if (!representativeName || !representativeID || !representativeEmail || !relationship || !legalConsent) {
        Alert.alert('Datos incompletos', 'Completa todos los campos del representante legal y acepta el consentimiento.');
        setIsLoading(false);
        return;
      }
      if (!isValidEmail(representativeEmail)) {
        Alert.alert('Error', 'Correo del representante inválido.');
        setIsLoading(false);
        return;
      }
    }

    try {
      // Validar campos principales
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
        console.warn('Campos vacíos detectados:', { name, email, password, confirmPassword });
        Alert.alert('Error', 'Completa todos los campos.');
        setIsLoading(false);
        return;
      }
      if (!isValidEmail(email)) {
        console.warn('Correo inválido:', email);
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

      const auth = getAuth();
      console.log('👤 Usuario actual antes de crear cuenta:', auth.currentUser);

      const firebaseResult = await registerWithEmail(email.trim().toLowerCase(), password.trim());
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password.trim());
      console.log('✅ Usuario autenticado tras registro:', auth.currentUser);

   // ⏳ Esperar a enviar verificación luego del guardado en el perfil

      if (!firebaseResult.success) {
        if (firebaseResult.error?.code === 'auth/email-already-in-use') {
          Alert.alert('Este correo ya está registrado', 'Inicia sesión o usa otro correo.');
        } else {
          Alert.alert('Error al registrar', 'No se pudo crear la cuenta en Firebase.');
        }
        setIsLoading(false);
        return;
      }

      // Limpiar datos antiguos
      await AsyncStorage.multiRemove([
        'userData',
        'userProfileFree',
        'userProfilePro',
        'userProfileElite',
        'fromRegister',
        'allUsers',
      ]);

      const newUser = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        accountType: membershipType === 'elite' ? 'agency' : 'talent',
        membershipType: membershipType,
        ...(isMinor && {
          representativeEmail: representativeEmail.trim().toLowerCase(),
          representativeName,
          representativeID,
          relationship,
          legalConsent,
        }),
      };
      console.log('🆕 New User:', newUser);

      // Validar antes de guardar
      if (!isValidEmail(newUser.email) || (isMinor && !isValidEmail(newUser.representativeEmail))) {
        console.warn('Correo inválido detectado antes de guardar:', newUser);
        Alert.alert('Error', 'Correo inválido detectado.');
        setIsLoading(false);
        return;
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

      if (membershipType === 'free') {
        await AsyncStorage.setItem('hasCompletedFreeForm', 'false');
      }
      if (membershipType === 'pro' || membershipType === 'elite') {
        const now = new Date();
        const trialEndDate = new Date(now.setDate(now.getDate() + 30));
        newUser.trialEndsAt = trialEndDate.toISOString();
        newUser.subscriptionStart = new Date().toISOString();
        newUser.subscriptionType = 'trial';
        newUser.hasPaid = false;
      }

      await saveProfileToFirestore(newUser);
      await AsyncStorage.setItem('fromRegister', 'true');
      await AsyncStorage.setItem('sessionActive', 'true');

      setIsLoading(false);
      setIsLoggedIn(true);
      if (membershipType === 'free') {
        goToFormularioFree(navigation);
      } else if (membershipType === 'elite') {
        goToCompleteElite(navigation);
      } else {
        goToCompleteProfile(navigation);
      }
    } catch (error) {
      console.error('Error al registrar:', error);
      Alert.alert('Error', 'No se pudo registrar. Intenta de nuevo.');
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {!showForm && (
        <>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Selecciona tu tipo de cuenta</Text>

          <TouchableOpacity
            style={[styles.card, membershipType === 'free' && styles.selectedCard]}
            onPress={() => showModal('free')}
          >
            <Text style={styles.cardTitle}>🎭 Talento / Profesional Independiente</Text>
            <Text style={styles.cardText}>Para quienes ofrecen sus habilidades en el mundo audiovisual.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, membershipType === 'elite' && styles.selectedCard]}
            onPress={() => showModal('elite')}
          >
            <Text style={styles.cardTitle}>🏢 Agencia / Productora / Proveedor</Text>
            <Text style={styles.cardText}>Para empresas o servicios que contratan talentos o apoyan rodajes.</Text>
          </TouchableOpacity>
        </>
      )}

      {showForm && membershipType === 'free' && (
        <TalentRegisterForm
          name={name}
          setName={setName}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          acceptedPolicies={acceptedPolicies}
          setAcceptedPolicies={setAcceptedPolicies}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          showConfirmPassword={showConfirmPassword}
          setShowConfirmPassword={setShowConfirmPassword}
          passwordStrength={passwordStrength}
          handlePasswordChange={handlePasswordChange}
          getStrengthColor={getStrengthColor}
          isValidEmail={isValidEmail}
          isMinor={isMinor}
          setIsMinor={setIsMinor}
          representativeName={representativeName}
          setRepresentativeName={setRepresentativeName}
          representativeID={representativeID}
          setRepresentativeID={setRepresentativeID}
          representativeEmail={representativeEmail}
          setRepresentativeEmail={setRepresentativeEmail}
          relationship={relationship}
          setRelationship={setRelationship}
          legalConsent={legalConsent}
          setLegalConsent={setLegalConsent}
          navigation={navigation}
          setShowForm={setShowForm}
          membershipType={membershipType}
          setMembershipType={setMembershipType}
          isLoading={isLoading}
          handleRegisterPress={handleRegister}
        />
      )}
      {showForm && membershipType === 'elite' && (
        <AgencyRegisterForm
          name={name}
          setName={setName}
          representativeName={representativeName}
          setRepresentativeName={setRepresentativeName}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          acceptedPolicies={acceptedPolicies}
          setAcceptedPolicies={setAcceptedPolicies}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          showConfirmPassword={showConfirmPassword}
          setShowConfirmPassword={setShowConfirmPassword}
          passwordStrength={passwordStrength}
          handlePasswordChange={handlePasswordChange}
          getStrengthColor={getStrengthColor}
          isValidEmail={isValidEmail}
          isLoading={isLoading}
          handleRegisterPress={handleRegister}
          navigation={navigation}
          setShowForm={setShowForm}
          membershipType={membershipType}
          setMembershipType={setMembershipType}
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={hideModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={hideModal}
          />
          <Animated.View style={[styles.modalContent, {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          }]}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <ScrollView
              style={{
                maxHeight: membershipType === 'free' ? 500 : '100%',
              }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled
            >
              {modalContent.map((cat, idx) => (
                <Text key={idx} style={styles.modalItem}>• {cat}</Text>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }}>
              <TouchableOpacity style={[styles.button, { flex: 1, marginRight: 5 }]} onPress={hideModal}>
                <Text style={styles.buttonText}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { flex: 1, marginLeft: 5 }]}
                onPress={() => {
                  hideModal();
                  setShowForm(true);
                }}
              >
                <Text style={styles.buttonText}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
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