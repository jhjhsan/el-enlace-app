import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import BottomBar from '../components/BottomBar';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

export default function MenuScreen({ navigation }) {
  const { setUserData, setIsLoggedIn, userData } = useUser();
  const membership = userData?.membershipType || 'free';
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [newNotificationsCount, setNewNotificationsCount] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const checkNewMessages = async () => {
        const json = await AsyncStorage.getItem('professionalMessages');
        if (!json) return;
        const all = JSON.parse(json);
        const myNew = all.filter(
          (msg) =>
            msg.to === userData.email &&
            !msg.response &&
            !msg.archived
        );
        setNewMessagesCount(myNew.length);
      };

      const checkNewNotifications = async () => {
        const profile = await AsyncStorage.getItem('userProfile');
        if (!profile) return;
        const user = JSON.parse(profile);
        const raw = await AsyncStorage.getItem(`notifications_${user.id}`);
        const all = raw ? JSON.parse(raw) : [];
        setNewNotificationsCount(all.length);
      };

      checkNewMessages();
      checkNewNotifications();
    }, [])
  );

  const handleRestricted = () => {
    setShowUpgradeModal(true);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ position: 'absolute', top: 15, left: 20, zIndex: 10 }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Menú de usuario</Text>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('MyCastings')}>
          <Text style={styles.buttonText}>📋 Mis castings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('MyServices')}>
          <Text style={styles.buttonText}>📋 Mis servicios</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ViewPosts')}>
          <Text style={styles.buttonText}>📢 Ver publicaciones guardadas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, membership === 'free' && styles.disabledButton]}
          onPress={() => {
            membership !== 'free'
              ? navigation.navigate('FocusListScreen')
              : handleRestricted();
          }}
        >
          <Text style={styles.buttonText}>
            {membership === 'free' ? '🔒 🧠 Ver Focus Group' : '🧠 Ver Focus Group'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, membership === 'free' && styles.disabledButton]}
          onPress={() => {
            membership !== 'free'
              ? navigation.navigate('PostulationHistory')
              : handleRestricted();
          }}
        >
          <Text style={styles.buttonText}>
            {membership === 'free' ? '🔒 📦 Historial de postulaciones' : '📦 Historial de postulaciones'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, membership === 'free' && styles.disabledButton]}
          onPress={() => {
            membership !== 'free'
              ? navigation.navigate('Inbox')
              : handleRestricted();
          }}
        >
          <Text style={styles.buttonText}>
            {membership === 'free'
              ? '🔒 📥 Ver mensajes'
              : `📥 Ver mensajes${newMessagesCount > 0 ? ` (${newMessagesCount} nuevo${newMessagesCount > 1 ? 's' : ''})` : ''}`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, membership === 'free' && styles.disabledButton]}
          onPress={() => {
            membership !== 'free'
              ? navigation.navigate('Notification')
              : handleRestricted();
          }}
        >
          <Text style={styles.buttonText}>
            {membership === 'free'
              ? '🔒 📢 Ver notificaciones'
              : `📢 Ver notificaciones${newNotificationsCount > 0 ? ` (${newNotificationsCount} nueva${newNotificationsCount > 1 ? 's' : ''})` : ''}`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
  style={styles.button}
  onPress={() => navigation.navigate('MyAds')}
>
  <Text style={styles.buttonText}>📊 Ver mis anuncios</Text>
</TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Subscription')}>
          <Text style={styles.buttonText}>👑 Suscripción y membresía</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.buttonText}>⚙️ Configuración de cuenta</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('HelpSupport')}>
          <Text style={styles.buttonText}>🆘 Ayuda y soporte</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            Linking.openURL(
              'mailto:soporte@elenlace.app?subject=Necesito%20ayuda%20con%20la%20app&body=Hola%20equipo%20de%20El%20Enlace,%20tengo%20una%20consulta...'
            )
          }
        >
          <Text style={styles.buttonText}>📢 Contactar al soporte</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#400000', marginTop: 40 }]}
          onPress={() => setShowLogoutModal(true)}
        >
          <Text style={[styles.buttonText, { color: '#FFDADA' }]}>🚪 Cerrar sesión</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#222', marginTop: 10 }]}
          onPress={async () => {
            Alert.alert('Advertencia', '¿Seguro que deseas borrar todos los datos locales?', [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Sí, borrar todo',
                onPress: async () => {
                  await AsyncStorage.clear();
                  setUserData(null);
                  setIsLoggedIn(false);
                },
              },
            ]);
          }}
        >
          <Text style={[styles.buttonText, { color: '#FF5555' }]}>🧹 Reiniciar app (desarrollo)</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de membresía */}
      <Modal
        visible={showUpgradeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.upgradeModal}>
            <Text style={styles.upgradeTitle}>🔒 Función exclusiva para miembros Pro o Elite</Text>
            <Text style={styles.upgradeText}>
              Mejora tu membresía para acceder a esta funcionalidad premium.
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => {
                setShowUpgradeModal(false);
                navigation.navigate('Subscription');
              }}
            >
              <Text style={styles.upgradeButtonText}>💳 Ver planes</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowUpgradeModal(false)}>
              <Text style={{ color: '#aaa', marginTop: 10 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de cierre de sesión */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.upgradeModal}>
            <Text style={styles.upgradeTitle}>¿Deseas cerrar sesión?</Text>
            <Text style={styles.upgradeText}>Tu sesión se cerrará, pero los datos permanecerán guardados en el dispositivo.</Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={async () => {
                try {
                  await AsyncStorage.removeItem('userData');
                  setUserData(null);
                  setIsLoggedIn(false);
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  });
                } catch (error) {
                  console.error('❌ Error al cerrar sesión:', error);
                }
              }}
            >
              <Text style={styles.upgradeButtonText}>✅ Cerrar sesión</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowLogoutModal(false)}>
              <Text style={{ color: '#aaa', marginTop: 10 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: {
    padding: 20,
    paddingBottom: 140,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D8A353',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#1A1A1A',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeModal: {
    backgroundColor: '#1B1B1B',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderColor: '#D8A353',
    borderWidth: 1,
    marginHorizontal: 30,
    zIndex: 1000,
    elevation: 20,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D8A353',
    marginBottom: 10,
    textAlign: 'center',
  },
  upgradeText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  upgradeButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  upgradeButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
});
