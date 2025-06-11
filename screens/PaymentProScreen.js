import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { saveUserProfile } from '../utils/profileStorage';
import { saveSubscriptionHistory } from '../src/firebase/helpers/saveSubscriptionHistory';

export default function PaymentProScreen() {
  const navigation = useNavigation();
  const { setUserData, setIsLoggedIn } = useUser();
  const [loading, setLoading] = useState(false);
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
  const json =
  (await AsyncStorage.getItem('userProfilePro')) ||
  (await AsyncStorage.getItem('userProfile'));
console.log('🔍 userProfile encontrado:', json);

let currentUser = json ? JSON.parse(json) : null;

if (!currentUser) {
  const userRaw = await AsyncStorage.getItem('userData');
  if (userRaw) {
    currentUser = JSON.parse(userRaw);
  }
}

if (!currentUser) {
  alert('Error al cargar perfil del usuario.');
  setLoading(false);
  return;
}

  
        const updatedProfile = {
          ...currentUser,
          membershipType: 'pro',
          timestamp: Date.now(),
          subscriptionStart: new Date().toISOString(),
subscriptionType: tipoPlan,
paymentMethod: 'simulado',
hasPaid: true,
        };
  
        await saveUserProfile(updatedProfile, 'pro', setUserData, setIsLoggedIn, true);
        await AsyncStorage.setItem('userData', JSON.stringify(updatedProfile));
setUserData(updatedProfile);

await saveSubscriptionHistory({
  email: updatedProfile.email,
  planType: 'pro',
  paymentMethod: 'simulado',
  durationMonths: tipoPlan === 'anual' ? 12 : 1,
});


  // ✅ Eliminar notificaciones pendientes del plan Free
if (updatedProfile.email) {
  await AsyncStorage.removeItem(`pendingNotifications_${updatedProfile.email}`);
  console.log('🔔 Notificaciones pendientes eliminadas tras subir a Pro');
}

        navigation.replace('CompleteProfile');
  
      } catch (error) {
        console.error('❌ Error al procesar pago:', error);
        alert('No se pudo completar el pago.');
      } finally {
        setLoading(false);
      }
    }, 2000);
  };  

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ position: 'absolute', top: 45, left: 20, zIndex: 10 }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <Image source={require('../assets/logo.png')} style={styles.logo} />
      <Text style={styles.title}>Activar Plan Pro 🏆</Text>
      <Text style={styles.description}>
        Obtén acceso completo a fotos, postulaciones ilimitadas, contacto directo y más.
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
  💳 {inTrial ? 'Activar después del mes gratis' : 'Confirmar Plan Mensual ($3.490)'}
</Text>
  )}
</TouchableOpacity>

<TouchableOpacity
  style={[styles.payButton, { marginTop: 12 }]}
  onPress={() => handlePayment('anual')}
  disabled={loading}
>
 <Text style={styles.payButtonText}>
  💳 {inTrial ? 'Activar después del mes gratis' : 'Confirmar Plan Anual ($29.990)'}
</Text>
</TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  logo: {
    width: 100,
    height: 100,
    top: 0, 
    marginBottom: 50,
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
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  payButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
