// screens/MembershipElite.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import BottomBar from '../components/BottomBar';

export default function MembershipElite({ navigation }) {
  const handleSubscribe = () => {
    Alert.alert('Pago exitoso', 'Felicidades, ahora eres miembro Elite 🎉');
    // Aquí podrías actualizar el membershipType en AsyncStorage y redirigir al Dashboard
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Membresía Elite 👑</Text>

        <Text style={styles.description}>
          Accede a todas las funciones de la app sin restricciones:
        </Text>
        <Text style={styles.benefit}>✅ Publicar servicios y castings</Text>
        <Text style={styles.benefit}>✅ Postular a oportunidades</Text>
        <Text style={styles.benefit}>✅ Descargar perfiles en PDF o Excel</Text>
        <Text style={styles.benefit}>✅ Descuentos en anuncios promocionales</Text>

        <View style={styles.pricingBox}>
          <Text style={styles.price}>$7.990 CLP / mes</Text>
        </View>

        <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe}>
          <Text style={styles.subscribeButtonText}>💳 Suscribirme ahora</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 20,
    paddingBottom: 140,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D8A353',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  benefit: {
    color: '#FFFFFF',
    fontSize: 14,
    marginVertical: 4,
  },
  pricingBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 15,
    borderColor: '#D8A353',
    borderWidth: 1,
    marginVertical: 20,
  },
  price: {
    fontSize: 20,
    color: '#D8A353',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subscribeButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 20,
  },
  subscribeButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backButtonText: {
    color: '#D8A353',
    fontSize: 14,
  },
});
