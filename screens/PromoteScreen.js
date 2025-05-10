import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function PromoteScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>¿Qué deseas promocionar?</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('PromoteProfile')}
        >
          <Text style={styles.buttonText}>🚀 Promocionar mi perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('PromotePost')}
        >
          <Text style={styles.buttonText}>📢 Promocionar una publicación</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>⬅ Volver</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 100, 
  },
  title: {
    fontSize: 24,
    color: '#D8A353',
    fontWeight: 'bold',
    marginBottom: 120,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#1A1A1A',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: 'bold',
  },
  back: {
    marginTop: 30,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
