// screens/HelpSupportScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function HelpSupportScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.screen}>
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

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>⬅ Volver</Text>
        </TouchableOpacity>
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
  back: {
    marginTop: 420,
    color: '#aaa',
    fontSize: 16,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
