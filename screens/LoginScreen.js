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
import { auth } from '../src/firebase/firebaseConfig'; // ✅ Correcto
import { CommonActions } from '@react-navigation/native';
import { isEmailVerified } from '../src/firebase/helpers/authHelper'; // si no está ya importado
import { resetPassword } from '../src/firebase/helpers/authHelper';
import { loginWithEmail } from '../src/firebase/helpers/authHelper';
import { getProfileFromFirestore } from '../src/firebase/helpers/getProfileFromFirestore.js'; // ✅
import { getMembershipType } from '../src/firebase/helpers/getMembershipType';
import { getPushToken } from '../src/firebase/helpers/pushHelper';
import { saveUserProfile } from '../utils/profileStorage';
import { ActivityIndicator } from 'react-native';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../src/firebase/firebaseConfig'; // usa el path que uses tú
import { guardarAllProfiles } from '../src/firebase/helpers/profileHelpers';

import {
  goToProfileTab,
  goToFormularioFree,
  goToCompleteProfile,
  goToCompleteElite,
  goToDashboardTab,       // ✅ AGREGA ESTO
  goToDashboardElite      // ✅ Y ESTO TAMBIÉN
} from '../utils/navigationHelpers';

export default function LoginScreen({ navigation }) {
  const { setUserData, setIsLoggedIn } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

const handleLogin = async () => {
  setIsLoading(true);
  try {
    const cleanedEmail = email.trim().toLowerCase();
    const cleanedPassword = password.trim();
    console.log('Intentando login con:', cleanedEmail, cleanedPassword);

    const result = await loginWithEmail(cleanedEmail, cleanedPassword);

    if (!result.success) {
      console.log('Error de login:', result);

      if (result.needsVerification) {
        Alert.alert(
          'Verifica tu correo',
          'Debes confirmar tu correo electrónico antes de ingresar. Revisa tu bandeja de entrada.'
        );
      } else {
        Alert.alert('Error', result.error?.code || result.error?.message || 'No se pudo iniciar sesión.');
      }

      setIsLoading(false);
      return;
    }

    const user = result.user;
    console.log('✅ Login exitoso con UID:', user.uid);

  if (!user.emailVerified) {
  Alert.alert(
    'Verifica tu correo',
    'Debes confirmar tu correo electrónico antes de ingresar. Revisa tu bandeja de entrada. Si no lo encuentras, revisa el correo no deseado.'
  );
  setIsLoading(false);
  return;
}

    await AsyncStorage.setItem('sessionActive', 'true');

 const detectedMembershipType = await getMembershipType(cleanedEmail);
if (!detectedMembershipType) {
  Alert.alert('Error', 'No se pudo detectar el tipo de cuenta del usuario.');
  setIsLoading(false);
  return;
}

// ✅ Si es Pro o Elite, eliminamos perfil Free de Firestore
if (detectedMembershipType === 'pro' || detectedMembershipType === 'elite') {
  await deleteFreeProfile(cleanedEmail);
}

    const firestoreProfile = await getProfileFromFirestore(cleanedEmail, detectedMembershipType);
    if (!firestoreProfile) {
      Alert.alert('Error', 'No se pudo cargar el perfil desde Firestore.');
      setIsLoading(false);
      return;
    }

    const { membershipType } = firestoreProfile;

    try {
      await saveUserProfile(firestoreProfile, membershipType, setUserData, setIsLoggedIn, true);
      await AsyncStorage.setItem('userData', JSON.stringify({
  ...firestoreProfile,
  membershipType,
  email: cleanedEmail,
}));
// 🔁 Limpieza automática de conversaciones archivadas
try {
  const json = await AsyncStorage.getItem('professionalMessages');
  const allMessages = json ? JSON.parse(json) : [];

  const filtered = allMessages.filter((conv) => conv.archived !== true);

  if (filtered.length !== allMessages.length) {
    const safe = (allMessages || []).map((conv) => ({
  ...conv,
  messages: (conv.messages || []).slice(-50), // Limita a últimos 50
}));
await AsyncStorage.setItem('professionalMessages', JSON.stringify(safe));

    console.log(`🧹 Conversaciones archivadas eliminadas automáticamente (${allMessages.length - filtered.length})`);
  }
} catch (e) {
  console.warn('⚠️ Error al limpiar conversaciones archivadas:', e.message);
}

console.log('💾 userData guardado en AsyncStorage:', {
  ...firestoreProfile,
  membershipType,
  email: cleanedEmail,
});

      const list = [firestoreProfile];

      if (membershipType === 'pro') {
        const eliteProfile = await getProfileFromFirestore(cleanedEmail, 'elite');
        if (eliteProfile && eliteProfile.membershipType === 'elite') {
          if (eliteProfile.visibleInExplorer === undefined) {
            eliteProfile.visibleInExplorer = true;
          }
          list.push(eliteProfile);
          await AsyncStorage.setItem('userProfileElite', JSON.stringify(eliteProfile));
          await AsyncStorage.setItem('allProfilesElite', JSON.stringify([eliteProfile]));
          console.log('✅ Perfil Elite también recuperado desde Firestore');
        } else {
          console.log('ℹ️ No se encontró perfil Elite adicional');
        }
      }

      const seen = new Set();
      const deduplicated = list.filter(p => {
        const email = p.email?.toLowerCase();
        if (!email || seen.has(email)) return false;
        seen.add(email);
        return p.visibleInExplorer !== false;
      });

      await combinarPerfilesLocales(deduplicated);
      console.log('✅ allProfiles reconstruido con', deduplicated.length, 'perfiles');
    } catch (error) {
      console.error('❌ Error en login o reconstrucción:', error);
      Alert.alert('Error', error.message || 'Ocurrió un error inesperado.');
      setIsLoading(false);
      return;
    }

    console.log('🟢 Login completo. Redirección a cargo de InitialRedirectScreen.');
    setIsLoading(false);
    
  } catch (error) {
    console.error('❌ Error al iniciar sesión:', error);
    Alert.alert('Error', error.message || 'Ocurrió un error inesperado.');
    setIsLoading(false);
  }
};

const handleRecoverPassword = async () => {
  if (!recoveryEmail) {
    Alert.alert('Campo vacío', 'Ingresa un correo válido.');
    return;
  }

  const result = await resetPassword(recoveryEmail.trim().toLowerCase());

  if (result.success) {
    Alert.alert(
      'Correo enviado',
      'Revisa tu bandeja de entrada para restablecer tu contraseña.'
    );
  } else {
    Alert.alert(
      'Error',
      'No se pudo enviar el correo. Asegúrate de que el correo sea válido y esté registrado.'
    );
  }

  setShowModal(false);
  setRecoveryEmail('');
};

const combinarPerfilesLocales = async (nuevos) => {
  try {
    const anterioresRaw = await AsyncStorage.getItem('allProfiles');
    const anteriores = anterioresRaw ? JSON.parse(anterioresRaw) : [];

    const combinados = [...anteriores, ...nuevos].filter((p, index, self) =>
      index === self.findIndex((q) => q.email === p.email)
    );

    await guardarAllProfiles(combinados);
    console.log('🧪 allProfiles actualizado con', combinados.length, 'perfiles totales');
  } catch (err) {
    console.error('❌ Error al combinar perfiles locales:', err);
  }
};
const deleteFreeProfile = async (email) => {
  const docId = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
  try {
    await deleteDoc(doc(db, 'profiles', docId));
    console.log('🧹 Perfil Free eliminado de Firestore');
  } catch (e) {
    console.warn('⚠️ No se pudo eliminar perfil Free:', e.message);
  }
};

  return (
    <View style={styles.container}>

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

<TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
  {isLoading ? (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#000" style={{ marginRight: 8 }} />
      <Text style={styles.buttonText}>Cargando...</Text>
    </View>
  ) : (
    <Text style={styles.buttonText}>INGRESAR</Text>
  )}
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
