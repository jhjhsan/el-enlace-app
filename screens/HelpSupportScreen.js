// screens/HelpSupportScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function HelpSupportScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.screen}>
      {/* Flecha de volver */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ position: 'absolute', top: 40, left: 20, zIndex: 10 }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🆘 Centro de Ayuda</Text>
        <Text style={styles.info}>
          ¿Tienes preguntas, sugerencias o problemas con la app? Estamos aquí para ayudarte.
          {'\n\n'}
          📧 Correo: soporte@elenlace.cl
          {'\n'}
          📱 WhatsApp: +56 9 1234 5678
          {'\n'}
          🌐 Web: www.elenlace.cl/ayuda
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
    marginTop: 30,
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
