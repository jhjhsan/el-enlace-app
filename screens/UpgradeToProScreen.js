import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import BackButton from '../components/BackButton';

export default function UpgradeToProScreen({ navigation }) {
  const { userData, setUserData, setIsLoggedIn } = useUser();

  const handleUpgrade = async () => {
    try {
      if (!userData) {
        Alert.alert('Error', 'No se encontró información del usuario.');
        return;
      }

      const upgradedProfile = {
        ...userData,
        membershipType: 'pro',
      };

      await AsyncStorage.setItem('userProfile', JSON.stringify(upgradedProfile));
      await AsyncStorage.setItem('userProfilePro', JSON.stringify(upgradedProfile));
      await AsyncStorage.setItem('userData', JSON.stringify(upgradedProfile));

      if (setUserData) setUserData(upgradedProfile);
      if (setIsLoggedIn) setIsLoggedIn(true);

      Alert.alert('✅ Éxito', 'Tu cuenta ahora es Pro.');
      navigation.replace('CompleteProfile'); // Asegúrate de tener esta ruta
    } catch (error) {
      console.error('Error al activar Pro:', error);
      Alert.alert('Error', 'No se pudo activar el plan Pro.');
    }
  };

  return (
    <View style={styles.container}>
      <BackButton />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>🏆 Plan Pro – Talento profesional</Text>
        <Text style={styles.description}>Con el plan Pro puedes:</Text>
        <Text style={styles.bullet}>• Ver fotos y videos completos</Text>
        <Text style={styles.bullet}>• Contactar directamente a agencias</Text>
        <Text style={styles.bullet}>• Postular a castings y servicios</Text>
        <Text style={styles.bullet}>• Recibir notificaciones inteligentes</Text>
        <Text style={styles.bullet}>• Aparecer en búsquedas destacadas</Text>
        <Text style={styles.price}>Solo $2.990 CLP / mes</Text>

        <TouchableOpacity style={styles.button} onPress={handleUpgrade}>
          <Text style={styles.buttonText}>📈 Activar plan Pro por $2.990 CLP</Text>
        </TouchableOpacity>
        <Text style={[styles.text, { fontSize: 12, color: '#777', marginTop: 20 }]}>
  Este centro de soporte es exclusivo para temas técnicos, de cuenta o uso de la app "El Enlace". No reemplaza asesorías laborales, sindicales ni legales externas.
</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 25,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 30, // <-- añadido
    marginBottom: 20,
    textAlign: 'center',
  },  
  scroll: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  description: {
    color: '#CCCCCC',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  bullet: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 8,
  },
  price: {
    color: '#FFD700',
    fontSize: 16,
    marginVertical: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#D8A353',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginTop: 10,
    borderColor: '#FFD700',
    borderWidth: 1,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },

});
