// screens/SettingsScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'; // ✅ Importación para la flecha

export default function SettingsScreen() {
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
        <Text style={styles.title}>⚙️ Configuración de Cuenta</Text>
        <Text style={styles.info}>
          Aquí podrás personalizar opciones relacionadas con tu cuenta. Esta sección estará disponible próximamente.
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
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 40,
  },
});
