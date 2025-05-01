// screens/ExploreProfilesScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ExploreProfilesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Pantalla de Exploración de Perfiles</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#D8A353',
    fontSize: 18,
  },
});
