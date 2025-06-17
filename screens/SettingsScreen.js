// screens/SettingsScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../src/firebase/firebaseConfig';
import {
  sendEmailVerification,
  signOut,
  sendPasswordResetEmail,
  deleteUser,
} from 'firebase/auth';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState(auth.currentUser);
  const [isVerified, setIsVerified] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      await user.reload();
      const refreshedUser = auth.currentUser;
      setIsVerified(refreshedUser.emailVerified);
    };
    fetchStatus();
  }, []);

  const handleSendVerification = async () => {
    try {
      await sendEmailVerification(user);
      setShowPasswordModal(true);
    } catch (error) {
      console.error('Error enviando verificación:', error);
    }
  };

  const handleResetPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, user.email);
      setShowPasswordModal(true);
    } catch (error) {
      console.error('Error al enviar reset:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });
    } catch (error) {
      console.log('Error al cerrar sesión:', error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteUser(auth.currentUser);
      navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });
    } catch (error) {
      console.log('Error al eliminar cuenta:', error);
    }
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ position: 'absolute', top: 40, left: 20, zIndex: 10 }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>⚙️ Configuración de Cuenta</Text>

        <Text style={styles.label}>Correo actual:</Text>
        <Text style={styles.text}>{user?.email}</Text>

        <Text style={styles.label}>Estado de verificación:</Text>
        <Text style={styles.text}>{isVerified ? '✅ Verificado' : '❌ No verificado'}</Text>

        {!isVerified && (
          <TouchableOpacity style={styles.button} onPress={handleSendVerification}>
            <Text style={styles.buttonText}>📩 Reenviar verificación</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.button} onPress={handleResetPassword}>
          <Text style={styles.buttonText}>🔐 Cambiar contraseña</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>🚪 Cerrar sesión</Text>
        </TouchableOpacity>
        {/* 📄 Documentos legales */}
<TouchableOpacity
  style={styles.button}
  onPress={() => navigation.navigate('PrivacyPolicy')}
>
  <Text style={styles.buttonText}>🛡️ Política de privacidad</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.button}
  onPress={() => navigation.navigate('TermsAndConditions')}
>
  <Text style={styles.buttonText}>📄 Términos y condiciones</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.button}
  onPress={() => navigation.navigate('LegalNotice')}
>
  <Text style={styles.buttonText}>📌 Aviso legal</Text>
</TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#ff4d4d' }]}
          onPress={() => setShowDeleteModal(true)}
        >
          <Text style={styles.buttonText}>🗑️ Eliminar cuenta</Text>
        </TouchableOpacity>
        
      </ScrollView>

      {/* Modal tras enviar verificación o restablecer contraseña */}
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📩 Revisa tu correo</Text>
            <Text style={styles.modalText}>
              Se ha enviado un enlace para restablecer tu contraseña o verificar tu cuenta.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowPasswordModal(false)}
            >
              <Text style={styles.modalButtonText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmación para eliminar cuenta */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚠️ Confirmar eliminación</Text>
            <Text style={styles.modalText}>
              Esta acción eliminará tu cuenta permanentemente. ¿Deseas continuar?
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowDeleteModal(false);
                handleDeleteAccount();
              }}
            >
              <Text style={styles.modalButtonText}>✅ Eliminar cuenta</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#444', marginTop: 10 }]}
              onPress={() => setShowDeleteModal(false)}
            >
              <Text style={[styles.modalButtonText, { color: '#fff' }]}>❌ Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    padding: 20,
    paddingBottom: 120,
    marginTop: 50,
  },
  title: {
    fontSize: 22,
    color: '#D8A353',
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  label: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 20,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#D8A353',
    padding: 15,
    borderRadius: 10,
    marginTop: 25,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    padding: 25,
    borderRadius: 10,
    borderColor: '#D8A353',
    borderWidth: 1,
    alignItems: 'center',
    width: '85%',
  },
  modalTitle: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    color: '#ccc',
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  modalButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
});
