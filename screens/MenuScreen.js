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
import { goToDashboardTab } from '../utils/navigationHelpers';
import { useCallback } from 'react';
import { getFirestore, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

export default function MenuScreen({ navigation }) {
  const { setUserData, setIsLoggedIn, userData } = useUser();

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const hasPaid = String(userData?.hasPaid) === 'true';
const [loadingUserData, setLoadingUserData] = useState(true);

// ✅ AHORA sí puedes definir esto correctamente
const membership = userData?.membershipType || 'free';

  // Define isEliteBlocked and isFreeBlocked constants
  const isEliteBlocked = membership === 'elite' && !hasPaid;
  const isFreeBlocked = membership === 'free';
 const isProBlocked = membership === 'pro';

console.log('🔎 membership:', membership);
console.log('🔎 hasPaid:', hasPaid);
  return (
    <View style={styles.container}>
<TouchableOpacity
  onPress={() => {
    goToDashboardTab(navigation);
  }}
  style={{ position: 'absolute', top: 40, left: 20, zIndex: 10 }}
>
  <Ionicons name="arrow-back" size={28} color="#fff" />
</TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Menú de usuario</Text>
{/* 🔍 Explorar servicios */}
<TouchableOpacity
  style={[styles.menuButton, isFreeBlocked && styles.disabledButton]}
  onPress={() => {
    if (isFreeBlocked) {
      setShowUpgradeModal(true);
    } else {
      navigation.navigate('ExplorePosts');
    }
  }}
>
  <Text style={styles.menuButtonText}>
    {isFreeBlocked ? '🔒 🔍 Explorar servicios' : '🔍 Explorar servicios'}
  </Text>
</TouchableOpacity>

      {membership === 'elite' && (
  <TouchableOpacity
    style={[styles.menuButton, isEliteBlocked && styles.disabledButton]}
    onPress={() => {
      if (isEliteBlocked) {
        setShowUpgradeModal(true);
      } else {
        navigation.navigate('MyCastings');
      }
    }}
  >
    <Text style={styles.menuButtonText}>
      {isEliteBlocked ? '🔒 📋 Mis castings' : '📋 Mis castings'}
    </Text>
  </TouchableOpacity>
)}

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
       <TouchableOpacity
  style={[styles.menuButton, (isEliteBlocked || isFreeBlocked) && styles.disabledButton]}
  onPress={() => {
    if (isEliteBlocked || isFreeBlocked) {
      setShowUpgradeModal(true);
    } else {
      navigation.navigate('MyFocusScreen');
    }
  }}
>
  <Text style={styles.menuButtonText}>
    {(isEliteBlocked || isFreeBlocked) ? '🔒 🧠 Mis Focus publicados' : '🧠 Mis Focus publicados'}
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
  {(isEliteBlocked || isFreeBlocked) ? '🔒 🗣️ Ver Focus Group' : '🗣️ Ver Focus Group'}
</Text>
        </TouchableOpacity>

{/* 📦 Historial de postulaciones (solo para talentos Free y Pro) */}
{membership !== 'elite' && (
  <TouchableOpacity
    style={[
      styles.menuButton,
      membership === 'free' && styles.disabledButton
    ]}
    onPress={() => {
      if (membership === 'free') {
        setShowUpgradeModal(true);
      } else {
        navigation.navigate('PostulationHistory');
      }
    }}
  >
    <Text style={styles.menuButtonText}>
      {membership === 'free'
        ? '🔒 📦 Historial de postulaciones'
        : '📦 Historial de postulaciones'}
    </Text>
  </TouchableOpacity>
)}

        {/* 📥 Ver mensajes */}
<TouchableOpacity
 key="inbox"
  style={styles.menuButton}
  onPress={() => navigation.navigate('Inbox')}
>
<Text style={styles.menuButtonText}>📥 Ver mensajes</Text>

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

        {/* Cerrar sesión */}
        <TouchableOpacity
          style={[styles.menuButton, { backgroundColor: '#400000', marginTop: 40 }]}
          onPress={() => setShowLogoutModal(true)}
        >
          <Text style={[styles.menuButtonText, { color: '#FFDADA' }]}>🚪 Cerrar sesión</Text>
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
              {membership === 'free'
                ? 'Esta función está disponible solo para cuentas Pro. Mejora tu cuenta para acceder a herramientas profesionales.'
                : 'Función no disponible para tu cuenta actual.'}
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
                  setShowLogoutModal(false);
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