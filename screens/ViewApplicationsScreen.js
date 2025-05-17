import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Video } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { exportApplicationsToExcel, exportApplicationsToPDF } from '../utils/exportUtils';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';

export default function ViewApplicationsScreen({ route }) {
  const { castingId } = route.params || {};
  const [applications, setApplications] = useState([]);
  const navigation = useNavigation();
  const { userData } = useUser();

  useEffect(() => {
    if (userData?.membershipType !== 'elite') {
      Alert.alert(
        'Función exclusiva',
        'Solo los usuarios Elite pueden ver y exportar postulaciones.',
        [{ text: 'Ver planes', onPress: () => navigation.navigate('Subscription') }]
      );
      navigation.goBack();
    }
  }, [userData]);

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

  const sanitizeProfileData = (profile) => {
    const cleaned = { ...profile };
    if (!cleaned.profilePhoto?.startsWith('http') && !cleaned.profilePhoto?.startsWith('file')) {
      cleaned.profilePhoto = null;
    }
    return cleaned;
  };

  return (
    <View style={styles.screen}>
      {/* Flecha de volver */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

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

              <TouchableOpacity
                style={styles.profilePreview}
                onPress={() => {
                  const cleaned = sanitizeProfileData(app.profile);
                  navigation.navigate('ProfileDetail', {
                    profileData: cleaned,
                    returnTo: 'ViewApplications',
                  });
                }}
              >
                {app.profile.profilePhoto ? (
                  <Image source={{ uri: app.profile.profilePhoto }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}><Text>👤</Text></View>
                )}
                <Text style={styles.name}>{app.profile.name || 'Sin nombre'}</Text>
                <Text style={styles.link}>Ver perfil</Text>
              </TouchableOpacity>

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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  backButton: {
    position: 'absolute',
    top: 15,
    left: 20,
    zIndex: 10,
    backgroundColor: 'transparent',
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
  profilePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  name: {
    color: '#fff',
    fontWeight: 'bold',
    flex: 1,
  },
  link: {
    color: '#D8A353',
    fontSize: 13,
    textDecorationLine: 'underline',
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
});
