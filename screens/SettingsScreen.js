// screens/SettingsScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  ActivityIndicator, TextInput, Alert, Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../src/firebase/firebaseConfig';
import {
  sendEmailVerification, signOut, sendPasswordResetEmail, deleteUser,
  reauthenticateWithCredential, EmailAuthProvider
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import deleteUserDataDeep from '../src/firebase/helpers/deleteUserDataDeep';

// ===== URLs web =====
const PRIVACY_URL = 'https://www.elenlace.cl/privacidad';
const DELETE_URL  = 'https://www.elenlace.cl/eliminar-cuenta';
const CSAE_URL    = 'https://www.elenlace.cl/seguridad-ninos';
const HELP_URL    = 'https://www.elenlace.cl/ayuda';

// Helper abrir enlace
async function openLink(url) {
  try {
    const ok = await Linking.canOpenURL(url);
    if (ok) return Linking.openURL(url);
  } catch (_) {}
  Alert.alert('No se pudo abrir', `Copia este enlace en tu navegador:\n${url}`);
}

// Limpieza de storage
async function cleanLocalStorageAfterDelete() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const known = new Set([
      'userProfile','userProfileFree','userProfilePro','userProfileElite',
      'userData','allProfiles','allProfilesPro','allProfilesElite','professionalMessages',
    ]);
    const toRemove = new Set([...known]);
    keys.forEach(k => { if (k && (k.startsWith('notifications_') || known.has(k))) toRemove.add(k); });
    if (toRemove.size > 0) await AsyncStorage.multiRemove(Array.from(toRemove));
  } catch (e) { console.warn('cleanLocalStorageAfterDelete warn:', e?.message || e); }
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState(auth.currentUser);
  const [isVerified, setIsVerified] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        await user?.reload?.();
        const refreshed = auth.currentUser;
        setUser(refreshed || null);
        setIsVerified(!!refreshed?.emailVerified);
      } catch {}
    };
    fetchStatus();
  }, []);

  const handleSendVerification = async () => {
    try {
      if (!user) throw new Error('No hay sesión activa');
      await sendEmailVerification(user);
      setShowPasswordModal(true);
    } catch {
      Alert.alert('Error', 'No se pudo enviar la verificación.');
    }
  };

  const handleResetPassword = async () => {
    try {
      if (!user?.email) throw new Error('No hay correo asociado');
      await sendPasswordResetEmail(auth, user.email);
      setShowPasswordModal(true);
    } catch {
      Alert.alert('Error', 'No se pudo enviar el enlace de restablecimiento.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });
    } catch {
      Alert.alert('Error', 'No se pudo cerrar sesión.');
    }
  };

  const askDeleteAccount = () => setShowDeleteModal(true);
  const proceedDeleteAfterConfirm = () => { setShowDeleteModal(false); setShowReauthModal(true); };

  const performAccountDeletion = async () => {
    if (!user?.email) return Alert.alert('Error', 'No hay sesión activa.');
    if (!password.trim()) return Alert.alert('Contraseña requerida', 'Ingresa tu contraseña para continuar.');

    setDeleting(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, password.trim());
      await reauthenticateWithCredential(user, credential);
      await deleteUserDataDeep(user.uid, user.email);
      await cleanLocalStorageAfterDelete();
      await deleteUser(auth.currentUser);
      navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });
    } catch (error) {
      const code = String(error?.code || '');
      let msg = 'No se pudo eliminar la cuenta.';
      if (code.includes('auth/wrong-password')) msg = 'Contraseña incorrecta. Intenta nuevamente.';
      else if (code.includes('auth/too-many-requests')) msg = 'Demasiados intentos. Intenta más tarde.';
      else if (code.includes('auth/requires-recent-login')) msg = 'Por seguridad, vuelve a iniciar sesión.';
      Alert.alert('Error', msg);
    } finally {
      setDeleting(false);
      setShowReauthModal(false);
      setPassword('');
    }
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity
        disabled={deleting}
        onPress={() => navigation.goBack()}
        style={{ position: 'absolute', top: 40, left: 20, zIndex: 10, opacity: deleting ? 0.5 : 1 }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>⚙️ Configuración de Cuenta</Text>

        <Text style={styles.label}>Correo actual:</Text>
        <Text style={styles.text}>{user?.email || '—'}</Text>

        <Text style={styles.label}>Estado de verificación:</Text>
        <Text style={styles.text}>{isVerified ? '✅ Verificado' : '❌ No verificado'}</Text>

        {!isVerified && (
          <TouchableOpacity style={styles.button} onPress={handleSendVerification} disabled={deleting || !user}>
            <Text style={styles.buttonText}>📩 Reenviar verificación</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={deleting || !user?.email}>
          <Text style={styles.buttonText}>🔐 Cambiar contraseña</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleLogout} disabled={deleting}>
          <Text style={styles.buttonText}>🚪 Cerrar sesión</Text>
        </TouchableOpacity>

        {/* ✅ Un solo botón: abre la política en la WEB */}
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('PrivacyPolicy')} disabled={deleting}>
    <Text style={styles.buttonText}>🛡️ Política de privacidad</Text>
  </TouchableOpacity>

        {/* Internas que ya tienes (si las usas) */}
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('TermsAndConditions')} disabled={deleting}>
          <Text style={styles.buttonText}>📄 Términos y condiciones</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('LegalNotice')} disabled={deleting}>
          <Text style={styles.buttonText}>📌 Aviso legal</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('PrivacySecurity', { email: user?.email })}
          disabled={deleting}
        >
          <Text style={styles.buttonText}>🔒 Privacidad y seguridad</Text>
        </TouchableOpacity>

        {/* Enlaces web adicionales (mismo estilo) */}
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ChildSafety')} disabled={deleting}>
    <Text style={styles.buttonText}>👶 Seguridad de los niños</Text>
  </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('HelpSupport')} disabled={deleting}>
  <Text style={styles.buttonText}>❓ Ayuda / Soporte</Text>
</TouchableOpacity>

        {/* Web: instrucciones de eliminación + botón rojo in-app (requisito Apple) */}
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('DeleteAccountInfo')} disabled={deleting}>
    <Text style={styles.buttonText}>🗑️ Instrucciones para eliminar cuenta</Text>
  </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#ff4d4d' }]}
          onPress={askDeleteAccount}
          disabled={deleting}
        >
          {deleting ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>🗑️ Eliminar cuenta</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal info */}
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📩 Revisa tu correo</Text>
            <Text style={styles.modalText}>
              Se ha enviado un enlace para restablecer tu contraseña o verificar tu cuenta.
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => setShowPasswordModal(false)}>
              <Text style={styles.modalButtonText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirmación de borrado */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚠️ Confirmar eliminación</Text>
            <Text style={styles.modalText}>
              Esta acción eliminará tu cuenta permanentemente. ¿Deseas continuar?
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={proceedDeleteAfterConfirm} disabled={deleting}>
              <Text style={styles.modalButtonText}>✅ Eliminar cuenta</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#444', marginTop: 10 }]}
              onPress={() => setShowDeleteModal(false)}
              disabled={deleting}
            >
              <Text style={[styles.modalButtonText, { color: '#fff' }]}>❌ Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reautenticación */}
      <Modal visible={showReauthModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔐 Reautenticación requerida</Text>
            <Text style={styles.modalText}>Ingresa tu contraseña para eliminar la cuenta de forma segura.</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña"
              placeholderTextColor="#888"
              secureTextEntry
              style={styles.input}
              editable={!deleting}
            />
            <TouchableOpacity style={styles.modalButton} onPress={performAccountDeletion} disabled={deleting}>
              {deleting ? <ActivityIndicator color="#000" /> : <Text style={styles.modalButtonText}>Eliminar definitivamente</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#444', marginTop: 10 }]}
              onPress={() => !deleting && setShowReauthModal(false)}
              disabled={deleting}
            >
              <Text style={[styles.modalButtonText, { color: '#fff' }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  container: { padding: 20, paddingBottom: 120, marginTop: 50 },
  title: { fontSize: 22, color: '#D8A353', fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  label: { color: '#aaa', fontSize: 12, marginTop: 20 },
  text: { color: '#fff', fontSize: 14, marginBottom: 10 },
  button: {
    backgroundColor: '#D8A353',
    padding: 15,
    borderRadius: 10,
    marginTop: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#000', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1a1a1a', padding: 25, borderRadius: 10, borderColor: '#D8A353', borderWidth: 1, alignItems: 'center', width: '85%' },
  modalTitle: { color: '#D8A353', fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalText: { color: '#ccc', fontSize: 13, marginBottom: 20, textAlign: 'center' },
  modalButton: { backgroundColor: '#D8A353', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 10 },
  modalButtonText: { color: '#000', fontWeight: 'bold' },
  input: {
    width: '100%',
    borderWidth: 1, borderColor: '#333', borderRadius: 10,
    padding: 12, color: '#fff', marginBottom: 12, backgroundColor: '#111',
  },
});
