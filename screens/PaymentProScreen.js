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
          subscriptionType: tipoPlan,         // 'beta' en prueba cerrada
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
          durationMonths: 1,                  // 1 mes por defecto en beta
        });

        // ✅ Limpiar notificaciones pendientes del plan Free
        if (updatedProfile.email) {
          await AsyncStorage.removeItem(`pendingNotifications_${updatedProfile.email}`);
          console.log('🔔 Notificaciones pendientes eliminadas tras subir a Pro');
        }

        navigation.replace('CompleteProfile');
      } catch (error) {
        console.error('❌ Error al procesar pago:', error);
        alert('No se pudo completar la activación.');
      } finally {
        setLoading(false);
      }
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <Image source={require('../assets/logo.png')} style={styles.logo} />

      <Text style={styles.title}>Activar Plan Pro 🏆</Text>
      <Text style={styles.description}>
        Modo prueba cerrada: activación simulada para testeo.
      </Text>

      <TouchableOpacity
        style={styles.ctaButton}
        onPress={() => handlePayment('beta')}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.ctaButtonText}>Actualizar a Pro</Text>
        )}
      </TouchableOpacity>

      {inTrial ? (
        <Text style={styles.trialNote}>
          Estás en periodo de prueba. Puedes activar Pro igualmente.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backBtn: {
    position: 'absolute',
    top: 45,
    left: 20,
    zIndex: 10,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 28,
    resizeMode: 'contain',
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  ctaButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '85%',
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  trialNote: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});
