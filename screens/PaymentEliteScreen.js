import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { saveUserProfile } from '../utils/profileStorage';
import { CommonActions } from '@react-navigation/native';
import { goToProfileTab } from '../utils/navigationHelpers';
import { saveSubscriptionHistory } from '../src/firebase/helpers/saveSubscriptionHistory';

export default function PaymentEliteScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { goTo } = route.params || {};
  const { setUserData, setIsLoggedIn } = useUser();
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
const [inTrial, setInTrial] = useState(false);

useEffect(() => {
  const checkTrial = async () => {
    const userRaw = await AsyncStorage.getItem('userData');
    if (userRaw) {
      const user = JSON.parse(userRaw);
      if (user.trialEndsAt && !user.hasPaid) {
        const trialEnd = new Date(user.trialEndsAt).getTime();
        const now = Date.now();
        setInTrial(now <= trialEnd);
      }
    }
  };
  checkTrial();
}, []);

const handlePayment = async (tipoPlan) => {
  setLoading(true);
  setTimeout(async () => {
    try {
      const json = await AsyncStorage.getItem('userProfileElite');
      const currentUser = json ? JSON.parse(json) : null;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const updatedProfile = {
        ...currentUser,
        membershipType: 'elite',
        hasPaid: true,
        subscriptionType: tipoPlan,
        subscriptionStart: new Date().toISOString(),
        paymentMethod: 'simulado',
      };

      await saveUserProfile(updatedProfile, 'elite', setUserData, setIsLoggedIn, true);
      const updatedUser = {
  ...currentUser,
  membershipType: 'elite',
  hasPaid: true,
};
await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
setUserData(updatedUser);

 await saveSubscriptionHistory({
  email: updatedProfile.email,
  planType: 'elite',
  paymentMethod: 'simulado',
  durationMonths: tipoPlan === 'anual' ? 12 : 1,
});
      await AsyncStorage.setItem('eliteProfileCompleted', 'true');
      setShowWelcome(true);
    } catch (error) {
      console.error('❌ Error al procesar pago:', error);
    } finally {
      setLoading(false);
    }
  }, 2000);
};

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <Image source={require('../assets/logo.png')} style={styles.logo} />
      <Text style={styles.title}>Activar Plan Elite 👑</Text>
      <Text style={styles.description}>
        Accede a publicación de castings, descarga de postulaciones, filtros avanzados, promoción y más.
      </Text>

     <Text style={styles.price}>
  1er mes GRATIS — luego elige entre mensual o anual
</Text>

<TouchableOpacity
  style={styles.payButton}
  onPress={() => handlePayment('mensual')}
  disabled={loading}
>
  {loading ? (
    <ActivityIndicator color="#000" />
  ) : (
    <Text style={styles.payButtonText}>
      💳 {inTrial
        ? 'Activar después del mes gratis'
        : 'Confirmar Plan Mensual (3 meses a $9.990, luego $19.990 CLP/mes)'}
    </Text>
  )}
</TouchableOpacity>

<TouchableOpacity
  style={[styles.payButton, { marginTop: 12 }]}
  onPress={() => handlePayment('anual')}
  disabled={loading}
>
  <Text style={styles.payButtonText}>
    💳 {inTrial
      ? 'Activar después del mes gratis'
      : 'Confirmar Plan Anual ($149.900)'}
  </Text>
</TouchableOpacity>

      {/* Modal de bienvenida */}
      {showWelcome && (
        <Modal transparent animationType="fade" visible={showWelcome}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>👑 ¡Bienvenido al Plan Elite!</Text>
              <Text style={styles.modalText}>
                Ahora tienes acceso a todas las funciones exclusivas para agencias: publicación de castings, descarga de postulaciones, filtros avanzados, y más.
              </Text>
   <TouchableOpacity
  style={styles.modalButton}
  onPress={async () => {
    setShowWelcome(false);
    const profileCompleted = await AsyncStorage.getItem('eliteProfileCompleted');

    if (profileCompleted === 'true') {
      goToProfileTab(navigation);
    } else {
      goToCompleteElite(navigation);
    }
  }}
>
  <Text style={styles.modalButtonText}>Continuar</Text>
</TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  price: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  payButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  payButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  modalBox: {
    backgroundColor: '#1B1B1B',
    padding: 25,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8A353',
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    color: '#D8A353',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
