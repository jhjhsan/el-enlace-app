import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Linking,
} from 'react-native';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

export default function MenuScreen({ navigation }) {
  const { setUserData, setIsLoggedIn, userData } = useUser();

  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [newNotificationsCount, setNewNotificationsCount] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const hasPaid = String(userData?.hasPaid) === 'true';
const [loadingUserData, setLoadingUserData] = useState(true);


// ✅ AHORA sí puedes definir esto correctamente
const membership = userData?.membershipType || 'free';

  // Define isEliteBlocked and isFreeBlocked constants
  const isEliteBlocked = membership === 'elite' && !hasPaid;
  const isFreeBlocked = membership === 'free';
  const isProBlocked = membership === 'pro';

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

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ position: 'absolute', top: 40, left: 20, zIndex: 10 }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Menú de usuario</Text>

        {/* 📋 Mis castings */}
        <TouchableOpacity
  style={[styles.menuButton, (isEliteBlocked || isFreeBlocked || isProBlocked) && styles.disabledButton]}
  onPress={() => {
    if (isEliteBlocked || isFreeBlocked || isProBlocked) {
      setShowUpgradeModal(true);
    } else {
      navigation.navigate('MyCastings');
    }
  }}
>
  <Text style={styles.menuButtonText}>
    {(isEliteBlocked || isFreeBlocked || isProBlocked) ? '🔒 📋 Mis castings' : '📋 Mis castings'}
  </Text>
</TouchableOpacity>

        {/* 📋 Mis servicios */}
        <TouchableOpacity
          style={[styles.menuButton, (isEliteBlocked || isFreeBlocked) && styles.disabledButton]}
          onPress={() => {
            if (isEliteBlocked || isFreeBlocked) {
              setShowUpgradeModal(true);
            } else {
              navigation.navigate('MyServices');
            }
          }}
        >
          <Text style={styles.menuButtonText}>
            {(isEliteBlocked || isFreeBlocked) ? '🔒 📋 Mis servicios' : '📋 Mis servicios'}
          </Text>
        </TouchableOpacity>

        {/* 📢 Ver publicaciones guardadas */}
        <TouchableOpacity
          style={[styles.menuButton, (isEliteBlocked || isFreeBlocked) && styles.disabledButton]}
          onPress={() => {
            if (isEliteBlocked || isFreeBlocked) {
              setShowUpgradeModal(true);
            } else {
              navigation.navigate('ViewPosts');
            }
          }}
        >
          <Text style={styles.menuButtonText}>
            {(isEliteBlocked || isFreeBlocked) ? '🔒 📢 Ver publicaciones guardadas' : '📢 Ver publicaciones guardadas'}
          </Text>
        </TouchableOpacity>

        {/* 🎯 Publicar Focus */}
        <TouchableOpacity
          style={[styles.menuButton, (isEliteBlocked || isFreeBlocked) && styles.disabledButton]}
          onPress={() => {
            if (isEliteBlocked || isFreeBlocked) {
              setShowUpgradeModal(true);
            } else {
              navigation.navigate('FocusListScreen');
            }
          }}
        >
          <Text style={styles.menuButtonText}>
            {(isEliteBlocked || isFreeBlocked) ? '🔒 🧠 Ver Focus Group' : '🧠 Ver Focus Group'}
          </Text>
        </TouchableOpacity>

       {/* 📦 Historial de postulaciones (solo talentos Pro) */}
{membership !== 'elite' && (
  <TouchableOpacity
    style={[styles.menuButton, (isEliteBlocked || isFreeBlocked) && styles.disabledButton]}
    onPress={() => {
      if (isEliteBlocked || isFreeBlocked) {
        setShowUpgradeModal(true);
      } else {
        navigation.navigate('PostulationHistory');
      }
    }}
  >
    <Text style={styles.menuButtonText}>
      {(isEliteBlocked || isFreeBlocked)
        ? '🔒 📦 Historial de postulaciones'
        : '📦 Historial de postulaciones'}
    </Text>
  </TouchableOpacity>
)}

        {/* 📥 Ver mensajes */}
      <TouchableOpacity
  style={styles.menuButton}
  onPress={() => navigation.navigate('Inbox')}
>
  <Text style={styles.menuButtonText}>
    📥 Ver mensajes{newMessagesCount > 0 ? ` (${newMessagesCount} nuevo${newMessagesCount > 1 ? 's' : ''})` : ''}
  </Text>
</TouchableOpacity>


        {/* 📊 Ver mis anuncios */}
        <TouchableOpacity
          style={[styles.menuButton, (isEliteBlocked || isFreeBlocked) && styles.disabledButton]}
          onPress={() => {
            if (isEliteBlocked || isFreeBlocked) {
              setShowUpgradeModal(true);
            } else {
              navigation.navigate('MyAds');
            }
          }}
        >
          <Text style={styles.menuButtonText}>
            {(isEliteBlocked || isFreeBlocked) ? '🔒 📊 Ver mis anuncios' : '📊 Ver mis anuncios'}
          </Text>
        </TouchableOpacity>

        {/* 👑 Suscripción y membresía */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate('Subscription')}
        >
          <Text style={styles.menuButtonText}>👑 Suscripción y membresía</Text>
        </TouchableOpacity>

        {/* ⚙️ Configuración de cuenta */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.menuButtonText}>⚙️ Configuración de cuenta</Text>
        </TouchableOpacity>

        {/* 🆘 Ayuda y soporte */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate('HelpSupport')}
        >
          <Text style={styles.menuButtonText}>🆘 Ayuda y soporte</Text>
        </TouchableOpacity>

        {/* 📢 Contactar al soporte */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() =>
            Linking.openURL(
              'mailto:soporte@elenlace.app?subject=Necesito%20ayuda%20con%20la%20app&body=Hola%20equipo%20de%20El%20Enlace,%20tengo%20una%20consulta...'
            )
          }
        >
          <Text style={styles.menuButtonText}>📢 Contactar al soporte</Text>
        </TouchableOpacity>
{/* 🛡️ Política de privacidad */}
<TouchableOpacity
  style={styles.menuButton}
  onPress={() => navigation.navigate('PrivacyPolicy')}
>
  <Text style={styles.menuButtonText}>🛡️ Política de privacidad</Text>
</TouchableOpacity>

{/* 📄 Términos y condiciones */}
<TouchableOpacity
  style={styles.menuButton}
  onPress={() => navigation.navigate('TermsAndConditions')}
>
  <Text style={styles.menuButtonText}>📄 Términos y condiciones</Text>
</TouchableOpacity>

{/* 📌 Aviso legal */}
<TouchableOpacity
  style={styles.menuButton}
  onPress={() => navigation.navigate('LegalNotice')}
>
  <Text style={styles.menuButtonText}>📌 Aviso legal</Text>
</TouchableOpacity>

        {/* Cerrar sesión */}
        <TouchableOpacity
          style={[styles.menuButton, { backgroundColor: '#400000', marginTop: 40 }]}
          onPress={() => setShowLogoutModal(true)}
        >
          <Text style={[styles.menuButtonText, { color: '#FFDADA' }]}>🚪 Cerrar sesión</Text>
        </TouchableOpacity>

        {/* Reiniciar app (desarrollo) */}
        <TouchableOpacity
          style={[styles.menuButton, { backgroundColor: '#222', marginTop: 10 }]}
          onPress={() => setShowResetModal(true)}
        >
          <Text style={styles.menuButtonText}>🧹 Reiniciar app (desarrollo)</Text>
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
          <Text style={styles.upgradeTitle}>🔒 Acceso restringido</Text>
          <Text style={styles.upgradeText}>

          {membership === 'elite' && !hasPaid
  ? "Tu cuenta Elite aún no está activa. Completa el pago para desbloquear las funciones exclusivas para agencias."
  : "Función exclusiva para usuarios con plan Pro. Mejora tu cuenta para acceder a herramientas profesionales."}
</Text>

            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => {
                setShowUpgradeModal(false);
                navigation.navigate('Subscription');
              }}
            >
              <Text style={styles.upgradeButtonText}>Ver plan</Text>
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
// ⚠️ IMPORTANTE: No borrar 'allProfiles' ni 'allProfilesElite' para no romper el explorador de perfiles
await AsyncStorage.multiRemove([
  'userData',
  'userProfile',
  'userProfileElite',
  'userProfilePro',
  'userProfileFree',
  'eliteProfileCompleted',
  'isLoggedIn'
]); // ✅ Solo borra sesión y perfil activo

    setUserData(null);
    setIsLoggedIn(false); // Esto automáticamente mostrará Login
    setShowLogoutModal(false); // Oculta el modal
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

      {/* Modal de reinicio de app */}
      <Modal
        visible={showResetModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.upgradeModal}>
            <Text style={styles.upgradeTitle}>🧹 Reiniciar Aplicación</Text>
            <Text style={styles.upgradeText}>
              ¿Estás seguro de que deseas borrar todos los datos locales? Esta acción no se puede deshacer.
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={async () => {
                await AsyncStorage.multiRemove([
  'userData',
  'userProfile',
  'userProfileElite',
  'userProfilePro',
  'userProfileFree',
  'eliteProfileCompleted',
  'isLoggedIn',
]);
                setUserData(null);
                setIsLoggedIn(false);
                setShowResetModal(false);
                navigation.reset({
  index: 0,
  routes: [{ name: 'InitialRedirect' }],
});

              }}
            >
              <Text style={styles.upgradeButtonText}>✅ Sí, borrar todo</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowResetModal(false)}>
              <Text style={{ color: '#aaa', marginTop: 10 }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
  style={[styles.menuButton, { backgroundColor: '#222', marginTop: 10 }]}
  onPress={() => navigation.navigate('DebugUserData')}
>
  <Text style={styles.menuButtonText}>🔍 Debug User Data</Text>
</TouchableOpacity>
          </View>
        </View>
      </Modal>

     
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: {
    padding: 20,
    paddingBottom: 140,
    marginTop: 30,
    alignItems: 'center', // Centra los elementos horizontalmente
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D8A353',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#1A1A1A',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 9,
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
  menuButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 12, // Altura consistente
    paddingHorizontal: 30, // Más espacio interno para que el texto no se vea apretado
    marginBottom: 8,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  menuButtonText: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: '500',
  },  
});