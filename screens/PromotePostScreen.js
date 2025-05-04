import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomBar from '../components/BottomBar';

export default function PromotePostScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📢 Promocionar Publicación</Text>
      <Text style={styles.subtitle}>
        Podrás dar mayor visibilidad a tus castings o servicios destacados.
      </Text>
      <Text style={styles.info}>
        Pronto podrás seleccionar la duración, el alcance y realizar el pago de forma segura.
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
