// screens/HelpSupportScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'; // ✅ Añadimos ícono

export default function HelpSupportScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.screen}>
      {/* ✅ Flecha profesional */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ position: 'absolute', top: 15, left: 20, zIndex: 10 }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🆘 Ayuda y Soporte</Text>
        <Text style={styles.info}>
          Si tienes dudas, sugerencias o problemas con la app, no dudes en escribirnos.
          {'\n\n'}
          ✉️ Correo: soporte@elenlace.app
          {'\n'}
          📱 WhatsApp: +56 9 1234 5678
          {'\n\n'}
          Nuestro equipo te responderá lo antes posible.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    padding: 20,
    paddingBottom: 120,
    marginTop:20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    color: '#D8A353',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  info: {
    color: '#ccc',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
});
