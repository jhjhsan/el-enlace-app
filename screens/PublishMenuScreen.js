import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PublishMenuScreen({ navigation }) {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>¿Qué deseas hacer?</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Publish')}
        >
          <Text style={styles.buttonText}>📢 Publicar un servicio</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('CompleteProfile')}
        >
          <Text style={styles.buttonText}>🎭 Publicar perfil profesional</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('PromoteProfile')}
        >
          <Text style={styles.buttonText}>👑 Promocionar mi perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('PromotePost')}
        >
          <Text style={styles.buttonText}>📣 Promocionar una publicación</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Flecha de volver al dashboard al fondo */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Dashboard')}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={18} color="#FFF" />
        <Text style={styles.backText}>Volver</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between',
  },
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    color: '#D8A353',
    fontWeight: 'bold',
    marginBottom: 40,
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  backText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
  },
});
