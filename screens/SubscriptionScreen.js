import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SubscriptionScreen({ navigation }) {
  const [membershipType, setMembershipType] = useState('free');

  useEffect(() => {
    const loadMembership = async () => {
      const json = await AsyncStorage.getItem('userProfile');
      if (json) {
        const user = JSON.parse(json);
        setMembershipType(user.membershipType || 'free');
      }
    };
    loadMembership();
  }, []);

  const handlePayment = async (plan) => {
    try {
      const json = await AsyncStorage.getItem('userProfile');
      if (json) {
        const user = JSON.parse(json);
        const updatedUser = { ...user, membershipType: plan };
        await AsyncStorage.setItem('userProfile', JSON.stringify(updatedUser));
        setMembershipType(plan);
        navigation.replace('Dashboard');
      }
    } catch (error) {
      console.warn('Error actualizando membresía:', error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logo} />

      <Text style={styles.title}>📊 Planes de membresía — El Enlace (CLP)</Text>

      <View style={styles.planBox}>
        <Text style={styles.planTitle}>🎬 Plan Free</Text>
        <Text style={styles.bullet}>✅ Explorar perfiles</Text>
        <Text style={styles.bullet}>❌ Ver fotos y videos completos</Text>
        <Text style={styles.bullet}>❌ Contactar perfiles</Text>
        <Text style={styles.bullet}>❌ Postular a castings/servicios</Text>
        <Text style={styles.bullet}>❌ Publicar castings o servicios</Text>
        <Text style={styles.bullet}>❌ Descargar postulaciones</Text>
        <Text style={styles.bullet}>💸 Gratis</Text>

        {/* Botón temporal solo para desarrollo */}
        <TouchableOpacity
  style={[styles.payButton, { backgroundColor: '#444', marginTop: 10 }]}
  onPress={async () => {
    try {
      const json = await AsyncStorage.getItem('userProfile');
      if (json) {
        const user = JSON.parse(json);
        const updatedUser = { ...user, membershipType: 'free' };
        await AsyncStorage.setItem('userProfile', JSON.stringify(updatedUser));
        navigation.replace('Dashboard'); // Redirige al Dashboard que ya detecta el tipo
      }
    } catch (error) {
      console.warn('Error forzando cuenta free:', error);
    }
  }}
>
  <Text style={[styles.payButtonText, { color: '#FFF' }]}>➡️ Ir al Dashboard Free (modo test)</Text>
</TouchableOpacity>

      </View>

      <View style={styles.planBox}>
        <Text style={styles.planTitle}>🏆 Plan Pro</Text>
        <Text style={styles.bullet}>✅ Ver fotos y videos completos</Text>
        <Text style={styles.bullet}>✅ Contactar perfiles</Text>
        <Text style={styles.bullet}>✅ Postular a castings/servicios</Text>
        <Text style={styles.bullet}>❌ Publicar castings o servicios</Text>
        <Text style={styles.bullet}>❌ Descargar postulaciones</Text>
        <Text style={styles.bullet}>$2.990 CLP</Text>
        <TouchableOpacity style={styles.payButton} onPress={() => handlePayment('pro')}>
          <Text style={styles.payButtonText}>💳 Pagar Plan Pro</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.planBox}>
        <Text style={styles.planTitle}>👑 Plan Elite</Text>
        <Text style={styles.bullet}>✅ Publicar servicios ilimitados</Text>
        <Text style={styles.bullet}>✅ Contactar talentos directamente</Text>
        <Text style={styles.bullet}>✅ Ver perfiles completos</Text>
        <Text style={styles.bullet}>✅ Aparecer en resultados destacados</Text>
        <Text style={styles.bullet}>✅ Estadísticas de visitas</Text>
        <Text style={styles.bullet}>✅ Soporte prioritario</Text>
        <Text style={styles.bullet}>✅ Publicar proyectos</Text>
        <Text style={styles.bullet}>✅ Descargar postulantes en Excel/PDF</Text>
        <Text style={styles.bullet}>✅ Badge dorado y banners</Text>
        <Text style={styles.bullet}>✅ Castings privados y filtros avanzados</Text>
        <Text style={styles.bullet}>$7.990 CLP</Text>
        <TouchableOpacity style={styles.payButton} onPress={() => handlePayment('elite')}>
          <Text style={styles.payButtonText}>💳 Pagar Plan Elite</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.note}>Puedes actualizar tu cuenta en cualquier momento.</Text>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.back}>⬅ Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    color: '#D8A353',
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
  },
  planBox: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D8A353',
    marginBottom: 10,
    textAlign: 'center',
  },
  bullet: {
    color: '#FFFFFF',
    fontSize: 13,
    marginVertical: 2,
  },
  payButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  payButtonText: {
    textAlign: 'center',
    color: '#000',
    fontWeight: 'bold',
  },
  note: {
    color: '#CCCCCC',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  back: {
    color: '#CCCCCC',
    fontSize: 14,
    textDecorationLine: 'underline',
    marginTop: 15,
  },
});
