import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SubscriptionScreen({ navigation }) {
  const handlePayment = () => {
    Linking.openURL('https://tuweb.com/webpay'); // 🔁 Reemplaza con tu URL de WebPay real
  };

  const activarProManual = async () => {
    try {
      const json = await AsyncStorage.getItem('userProfile');
      if (json) {
        const perfil = JSON.parse(json);
        perfil.membershipType = 'pro';
        await AsyncStorage.setItem('userProfile', JSON.stringify(perfil));
        Alert.alert('¡Activado!', 'Ahora tienes cuenta Pro 🏆');
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo activar el modo Pro');
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logo} />

      <Text style={styles.title}>🎬 Membresía Pro</Text>
      <Text style={styles.subtitle}>Accede a todos los beneficios de ser un usuario Pro:</Text>

      <View style={styles.benefits}>
        <Text style={styles.bullet}>✔️ Publicar servicios ilimitados</Text>
        <Text style={styles.bullet}>✔️ Contactar talentos directamente</Text>
        <Text style={styles.bullet}>✔️ Ver perfiles completos (con contacto y portafolio)</Text>
        <Text style={styles.bullet}>✔️ Aparecer en resultados destacados</Text>
        <Text style={styles.bullet}>✔️ Estadísticas de visitas a tu perfil y servicios</Text>
        <Text style={styles.bullet}>✔️ Soporte prioritario y asesoría personalizada</Text>
        <Text style={styles.bullet}>✔️ Publicar proyectos para buscar talentos</Text>
        <Text style={styles.bullet}>✔️ Descargar postulantes en Excel o PDF</Text>
        <Text style={styles.bullet}>✔️ Acceso a verificación de cuenta (badge dorado)</Text>
        <Text style={styles.bullet}>✔️ Publicar banners publicitarios en el Dashboard</Text>
        <Text style={styles.bullet}>✔️ Acceso a postulaciones filtradas por categoría</Text>
        <Text style={styles.bullet}>✔️ Invitaciones a castings privados y oportunidades exclusivas</Text>
        <Text style={styles.bullet}>✔️ Subir video de presentación + book profesional</Text>
        <Text style={styles.bullet}>✔️ Filtraciones personalizadas por edad, ubicación, categoría y más</Text>
      </View>

      <TouchableOpacity style={styles.payButton} onPress={handlePayment}>
        <Text style={styles.payButtonText}>💳 Pagar con WebPay - $4.990 CLP</Text>
      </TouchableOpacity>

      {/* ✅ Botón adicional solo para pruebas */}
      <TouchableOpacity
        style={[styles.payButton, { backgroundColor: '#555' }]}
        onPress={activarProManual}
      >
        <Text style={[styles.payButtonText, { color: '#fff' }]}>
          Activar cuenta Pro (modo test)
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.back}>⬅ Volver al inicio</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    color: '#D8A353',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 15,
    textAlign: 'center',
  },
  benefits: {
    marginBottom: 30,
    alignSelf: 'flex-start',
  },
  bullet: {
    color: '#FFFFFF',
    fontSize: 12,
    marginVertical: 4,
  },
  payButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  payButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'center',
  },
  back: {
    color: '#CCCCCC',
    fontSize: 14,
    textDecorationLine: 'underline',
    marginTop: 10,
  },
});
