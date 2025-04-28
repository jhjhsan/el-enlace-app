import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomBar from '../components/BottomBar';

export default function MenuScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Menú</Text>
        <Text style={styles.text}>Aquí podrás acceder a configuraciones y soporte.</Text>
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
