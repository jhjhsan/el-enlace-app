import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Video } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { exportApplicationsToExcel, exportApplicationsToPDF } from '../utils/exportUtils';

export default function ViewApplicationsScreen({ route, navigation }) {
  const { castingId } = route.params || {};
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    const loadApplications = async () => {
      try {
        const data = await AsyncStorage.getItem('applications');
        const parsed = data ? JSON.parse(data) : [];
        const filtered = parsed.filter(app => app.castingId === castingId);
        setApplications(filtered);
      } catch (error) {
        console.error('Error al cargar postulaciones:', error);
      }
    };

    const unsubscribe = navigation.addListener('focus', loadApplications);
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📥 Postulaciones Recibidas</Text>
        <Text style={styles.counter}>Total: {applications.length}</Text>

        {applications.length === 0 ? (
          <Text style={styles.empty}>No hay postulaciones aún para este casting.</Text>
        ) : (
          applications.map((app, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.label}>🕒 Enviado:</Text>
              <Text style={styles.value}>{new Date(app.timestamp).toLocaleString()}</Text>

              {app.videos?.map((uri, i) => (
                <Video
                  key={i}
                  source={{ uri }}
                  useNativeControls
                  resizeMode="contain"
                  style={styles.video}
                />
              ))}
            </View>
          ))
        )}

        <TouchableOpacity style={styles.exportExcelButton} onPress={exportApplicationsToExcel}>
          <Text style={styles.exportExcelText}>📤 Exportar a Excel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.exportPdfButton} onPress={exportApplicationsToPDF}>
          <Text style={styles.exportPdfText}>🧾 Exportar a PDF</Text>
        </TouchableOpacity>

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
    paddingBottom: 140,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  counter: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  empty: {
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  label: {
    color: '#D8A353',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  value: {
    color: '#ccc',
    marginBottom: 10,
  },
  video: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
    marginBottom: 10,
  },
  exportExcelButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  exportExcelText: {
    color: '#000',
    fontWeight: 'bold',
  },
  exportPdfButton: {
    backgroundColor: '#8B0000',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 25,
  },
  exportPdfText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  back: {
    marginTop: 380,
    color: '#aaa',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
