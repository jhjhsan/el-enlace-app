import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileDetailScreen() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const json =
          (await AsyncStorage.getItem('userProfilePro')) ||
          (await AsyncStorage.getItem('userProfileFree'));

        if (json) {
          const parsed = JSON.parse(json);
          setProfile(parsed);
        }
      } catch (error) {
        console.error('Error cargando el perfil:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#D8A353" size="large" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Cargando...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={{ color: '#fff' }}>No se encontró ningún perfil.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Image
        source={{ uri: profile.profilePhoto }}
        style={styles.profileImage}
      />
      <Text style={styles.name}>{profile.name}</Text>
      <Text style={styles.label}>{profile.category}</Text>

      <View style={styles.section}>
        <Text style={styles.label}>País</Text>
        <Text style={styles.value}>{profile.country || 'No especificado'}</Text>

        <Text style={styles.label}>Ciudad</Text>
        <Text style={styles.value}>{profile.city || 'No especificado'}</Text>

        <Text style={styles.label}>Dirección</Text>
        <Text style={styles.value}>{profile.address || 'No especificado'}</Text>

        <Text style={styles.label}>Descripción</Text>
        <Text style={styles.value}>{profile.description || 'Sin descripción'}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#000',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderColor: '#D8A353',
    borderWidth: 2,
    marginBottom: 15,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
    textAlign: 'center',
  },
  label: {
    fontWeight: 'bold',
    color: '#D8A353',
    marginTop: 10,
  },
  value: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    marginTop: 20,
    width: '100%',
  },
});
