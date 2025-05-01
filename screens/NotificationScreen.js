import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomBar from '../components/BottomBar';

export default function NotificationScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Notificaciones</Text>
        <Text style={styles.text}>Aquí recibirás todas las alertas importantes.</Text>
      </View>
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#D8A353',
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
  },
});
