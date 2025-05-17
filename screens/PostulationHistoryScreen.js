import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons'; // ✅ flecha

export default function PostulationHistoryScreen() {
  const navigation = useNavigation();
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    const validateAccess = async () => {
      const json = await AsyncStorage.getItem('userProfile');
      if (json) {
        const user = JSON.parse(json);
        const membership = user?.membershipType || 'free';
        if (membership === 'free') {
          alert('Esta función es exclusiva para usuarios Pro o Elite.');
          navigation.goBack();
        }
      }
    };

    validateAccess();

    const loadApplications = async () => {
      try {
        const stored = await AsyncStorage.getItem('applications');
        const parsed = stored ? JSON.parse(stored) : [];
        setApplications(parsed.reverse());
      } catch (error) {
        console.error('Error cargando postulaciones:', error);
      }
    };

    const unsubscribe = navigation.addListener('focus', loadApplications);
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.screen}>
      {/* ✅ Flecha profesional */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{
          position: 'absolute',
          top: 15,
          left: 20,
          zIndex: 2000,
        }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { marginTop: 40 }]}>
          📦 Historial de Postulaciones
        </Text>

        {applications.length === 0 ? (
          <Text style={styles.info}>Aún no has realizado ninguna postulación.</Text>
        ) : (
          applications.map((app, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.label}>🎬 Casting:</Text>
              <Text style={styles.value}>{app.castingTitle || 'Sin título disponible'}</Text>

              <Text style={styles.label}>📅 Fecha:</Text>
              <Text style={styles.value}>
                {new Date(app.timestamp).toLocaleDateString('es-CL', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>

              <Text style={styles.label}>🆔 ID del casting:</Text>
              <Text style={styles.value}>{app.castingId}</Text>

              {Array.isArray(app.videos) && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {app.videos.map((uri, i) => (
                    <Video
                      key={i}
                      source={{ uri }}
                      useNativeControls
                      resizeMode="contain"
                      style={[styles.video, { width: 300, marginRight: 10 }]}
                    />
                  ))}
                </ScrollView>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    padding: 20,
    paddingBottom: 120,
  },
  title: {
    fontSize: 22,
    color: '#D8A353',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  info: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 40,
  },
  card: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  label: {
    color: '#D8A353',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  value: {
    color: '#ccc',
    marginBottom: 8,
  },
  video: {
    height: 200,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
    marginBottom: 10,
  },
});
