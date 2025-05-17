import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';

export default function SupportScreen() {
  const { userData } = useUser();
  const navigation = useNavigation();

  useEffect(() => {
    if (userData?.membershipType !== 'elite') {
      Alert.alert(
        'Soporte prioritario exclusivo',
        'Esta sección está disponible solo para usuarios Elite.',
        [{ text: 'Ver planes', onPress: () => navigation.navigate('Subscription') }]
      );
      navigation.goBack();
    }
  }, [userData]);

  return (
    <View style={styles.container}>
      {/* Flecha de volver */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>🛠️ Ayuda y Soporte</Text>
        <Text style={styles.text}>
          Si tienes dudas, problemas con tu cuenta o necesitas asistencia, por favor contáctanos por alguno de los siguientes medios:
        </Text>

        <Text style={styles.item}>📧 Email: soporte@elenlaceapp.com</Text>
        <Text style={styles.item}>📱 WhatsApp: +56 9 8765 4321</Text>
        <Text style={styles.item}>🌐 Sitio web: www.elenlaceapp.com/soporte</Text>

        <Text style={styles.text}>Nuestro equipo te responderá lo antes posible. ¡Gracias por usar El Enlace!</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backButton: {
    position: 'absolute',
    top: 15,
    left: 20,
    zIndex: 10,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  title: {
    color: '#D8A353',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  text: {
    color: '#CCCCCC',
    fontSize: 16,
    marginBottom: 15,
    lineHeight: 22,
  },
  item: {
    color: '#FFD700',
    fontSize: 16,
    marginBottom: 10,
  },
});
