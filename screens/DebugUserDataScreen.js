import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';


export default function DebugUserDataScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [profileData, setProfileData] = useState(null);

  const loadData = async () => {
    try {
      const userJson = await AsyncStorage.getItem('userData');
      const profileJson = await AsyncStorage.getItem('userProfile');
      setUserData(userJson ? JSON.parse(userJson) : {});
      setProfileData(profileJson ? JSON.parse(profileJson) : {});
    } catch (error) {
      console.log('Error leyendo datos:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🔍 Datos del usuario (userData)</Text>
      <Text style={styles.box}>{JSON.stringify(userData, null, 2)}</Text>

      <Text style={styles.title}>📂 Perfil completo (userProfile)</Text>
      <Text style={styles.box}>{JSON.stringify(profileData, null, 2)}</Text>

      <TouchableOpacity style={styles.button} onPress={loadData}>
        <Text style={styles.buttonText}>🔄 Recargar</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#444' }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>↩️ Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#000',
    flexGrow: 1,
  },
  title: {
    color: '#D8A353',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  box: {
    color: '#ccc',
    backgroundColor: '#1A1A1A',
    padding: 15,
    borderRadius: 8,
    fontSize: 13,
  },
  
  button: {
    backgroundColor: '#D8A353',
    padding: 12,
    marginTop: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  
});
