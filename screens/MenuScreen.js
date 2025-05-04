import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import BottomBar from '../components/BottomBar';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MenuScreen({ navigation }) {
  const { setUserData, setIsLoggedIn } = useUser();

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userProfile');
    await AsyncStorage.removeItem('userProfilePro');
    setUserData(null);
    setIsLoggedIn(false);
    navigation.replace('Splash');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        <Text style={styles.title}>Menú de usuario</Text>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ViewPosts')}>
          <Text style={styles.buttonText}>📋 Ver mis publicaciones</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Promote')}>
          <Text style={styles.buttonText}>🚀 Promocionar </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Subscription')}>
          <Text style={styles.buttonText}>👑 Suscripción y membresía</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('SettingsScreen')}>
          <Text style={styles.buttonText}>⚙️ Configuración</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            Alert.alert('Próximamente', 'Sección de ayuda y soporte en desarrollo.')
          }>
          <Text style={styles.buttonText}>🆘 Ayuda y soporte</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#400000', marginTop: 220 }]}
          onPress={handleLogout}
        >
          <Text style={[styles.buttonText, { color: '#FFDADA' }]}>🚪 Cerrar sesión</Text>
        </TouchableOpacity>

      </ScrollView>
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
    padding: 20,
    paddingBottom: 140,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D8A353',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#1A1A1A',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 25,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
