import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import BottomBar from '../components/BottomBar';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout } from '../utils/auth';

export default function MenuScreen({ navigation }) {
  const { setUserData, setIsLoggedIn, userData } = useUser();
  const membership = userData?.membershipType || 'free';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Menú de usuario</Text>

        {/* Mis castings */}
        <TouchableOpacity
          style={[styles.button, membership === 'free' && styles.disabledButton]}
          onPress={() => {
            if (membership !== 'free') {
              navigation.navigate('MyCastings');
            } else {
              Alert.alert('Función exclusiva', 'Solo disponible para usuarios Pro o Elite.');
            }
          }}
        >
          <Text style={styles.buttonText}>
            {membership === 'free' ? '🔒 📋 Mis castings' : '📋 Mis castings'}
          </Text>
        </TouchableOpacity>

        {/* Mis servicios */}
        <TouchableOpacity
          style={[styles.button, membership === 'free' && styles.disabledButton]}
          onPress={() => {
            if (membership !== 'free') {
              navigation.navigate('MyServices');
            } else {
              Alert.alert('Función exclusiva', 'Solo disponible para usuarios Pro o Elite.');
            }
          }}
        >
          <Text style={styles.buttonText}>
            {membership === 'free' ? '🔒 📋 Mis servicios' : '📋 Mis servicios'}
          </Text>
        </TouchableOpacity>

        {/* Ver Focus Group */}
        <TouchableOpacity
          style={[styles.button, membership === 'free' && styles.disabledButton]}
          onPress={() => {
            if (membership !== 'free') {
              navigation.navigate('FocusListScreen');
            } else {
              Alert.alert('Función exclusiva', 'Solo disponible para usuarios Pro o Elite.');
            }
          }}
        >
          <Text style={styles.buttonText}>
            {membership === 'free' ? '🔒 🧠 Ver Focus Group' : '🧠 Ver Focus Group'}
          </Text>
        </TouchableOpacity>

        {/* Historial de postulaciones */}
        <TouchableOpacity
          style={[styles.button, membership === 'free' && styles.disabledButton]}
          onPress={() => {
            if (membership !== 'free') {
              navigation.navigate('PostulationHistory');
            } else {
              Alert.alert('Función exclusiva', 'Solo disponible para usuarios Pro o Elite.');
            }
          }}
        >
          <Text style={styles.buttonText}>
            {membership === 'free' ? '🔒 📦 Historial de postulaciones' : '📦 Historial de postulaciones'}
          </Text>
        </TouchableOpacity>

        {/* Ver publicaciones guardadas */}
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ViewPosts')}>
          <Text style={styles.buttonText}>📢 Ver publicaciones guardadas</Text>
        </TouchableOpacity>

        {/* Suscripción y membresía */}
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Subscription')}>
          <Text style={styles.buttonText}>👑 Suscripción y membresía</Text>
        </TouchableOpacity>

        {/* Configuración */}
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.buttonText}>⚙️ Configuración de cuenta</Text>
        </TouchableOpacity>

        {/* Ayuda y soporte */}
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('HelpSupport')}>
          <Text style={styles.buttonText}>🆘 Ayuda y soporte</Text>
        </TouchableOpacity>

        {/* Contactar soporte */}
        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            Linking.openURL(
              'mailto:soporte@elenlace.app?subject=Necesito%20ayuda%20con%20la%20app&body=Hola%20equipo%20de%20El%20Enlace,%20tengo%20una%20consulta...'
            )
          }
        >
          <Text style={styles.buttonText}>📢 Contactar al soporte</Text>
        </TouchableOpacity>

        <TouchableOpacity
  style={[styles.button, { backgroundColor: '#400000', marginTop: 40 }]}
  onPress={() => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await logout(setUserData, setIsLoggedIn);
        },
      },
    ]);
  }}
>
  <Text style={[styles.buttonText, { color: '#FFDADA' }]}>🚪 Cerrar sesión</Text>
</TouchableOpacity>


        {/* 🧹 Botón reinicio de app */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#222', marginTop: 10 }]}
          onPress={async () => {
            Alert.alert('Advertencia', '¿Seguro que deseas borrar todos los datos locales?', [
              {
                text: 'Cancelar',
                style: 'cancel',
              },
              {
                text: 'Sí, borrar todo',
                onPress: async () => {
                  await AsyncStorage.clear();
                  setUserData(null);
                  setIsLoggedIn(false);
                },
              },
            ]);
          }}
        >
          <Text style={[styles.buttonText, { color: '#FF5555' }]}>🧹 Reiniciar app (desarrollo)</Text>
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
  disabledButton: {
    opacity: 0.5,
  },
});
