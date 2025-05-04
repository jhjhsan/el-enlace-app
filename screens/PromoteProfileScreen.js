import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomBar from '../components/BottomBar';

export default function PromoteProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📢 Promocionar Perfil</Text>
      <Text style={styles.subtitle}>
        Aquí podrás destacar tu perfil para llegar a más agencias y productoras.
      </Text>
      <Text style={styles.info}>
        Esta funcionalidad estará disponible pronto con opciones de pago y duración personalizada.
      </Text>
      <BottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    color: '#D8A353',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  info: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
});
