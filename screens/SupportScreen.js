import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import BottomBar from '../components/BottomBar';

export default function SupportScreen() {
  return (
    <View style={styles.container}>
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
      <BottomBar />
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
