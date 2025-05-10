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

export default function PostulationHistoryScreen() {
  const navigation = useNavigation();
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    const loadApplications = async () => {
      try {
        const stored = await AsyncStorage.getItem('applications');
        const parsed = stored ? JSON.parse(stored) : [];
        setApplications(parsed.reverse()); // Más recientes primero
      } catch (error) {
        console.error('Error cargando postulaciones:', error);
      }
    };

    const unsubscribe = navigation.addListener('focus', loadApplications);
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📦 Historial de Postulaciones</Text>

        {applications.length === 0 ? (
          <Text style={styles.info}>Aún no has realizado ninguna postulación.</Text>
        ) : (
          applications.map((app, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.label}>🎬 Casting:</Text>
              <Text style={styles.value}>{app.castingTitle}</Text>

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

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>⬅ Volver</Text>
        </TouchableOpacity>
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
  back: {
    marginTop: 20,
    color: '#aaa',
    fontSize: 16,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
