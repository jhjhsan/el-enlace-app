import React, { useState } from 'react';
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

export default function PaymentProScreen() {
  const navigation = useNavigation();
  const { setUserData, setIsLoggedIn } = useUser();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    setTimeout(async () => {
      try {
        const json = await AsyncStorage.getItem('userProfile');
        const currentUser = json ? JSON.parse(json) : null;

        if (!currentUser) {
          alert('Error al cargar perfil de usuario.');
          setLoading(false);
          return;
        }

        const updatedProfile = {
          ...currentUser,
          membershipType: 'pro',
        };

        await saveUserProfile(updatedProfile, 'pro', setUserData, setIsLoggedIn, true);

        navigation.replace('CompleteProfile');
      } catch (error) {
        console.error('❌ Error al procesar pago:', error);
        alert('No se pudo completar el pago.');
      } finally {
        setLoading(false);
      }
    }, 2000); // Simula 2 segundos de "procesamiento"
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
      <Text style={styles.title}>Activar Plan Pro 🏆</Text>
      <Text style={styles.description}>
        Obtén acceso completo a fotos, postulaciones ilimitadas, contacto directo y más.
      </Text>

      <Text style={styles.price}>$2.990 CLP / mes</Text>

      <TouchableOpacity
        style={styles.payButton}
        onPress={handlePayment}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.payButtonText}>💳 Confirmar pago</Text>
        )}
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
});
