import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Video } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkAndIncrementPostulation } from '../utils/postulationLimiter';
import { Ionicons } from '@expo/vector-icons';
import { syncApplicationToFirestore } from '../src/firebase/helpers/syncApplicationToFirestore';

export default function SubmitApplicationScreen({ route, navigation }) {
  const { castingId, castingTitle } = route.params || {};
  const [actingVideos, setActingVideos] = useState([null, null, null]);
  const [userProfile, setUserProfile] = useState(null);
  const [remainingPostulations, setRemainingPostulations] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      const json = await AsyncStorage.getItem('userProfile');
      if (json) setUserProfile(JSON.parse(json));
    };

    const getRemainingPostulations = async () => {
      try {
        const data = await AsyncStorage.getItem('freePostulationLimit');
        if (data) {
          const parsed = JSON.parse(data);
          const now = new Date();
          const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;
          if (parsed.month === currentMonth) {
            setRemainingPostulations(2 - parsed.count);
          } else {
            setRemainingPostulations(2);
          }
        } else {
          setRemainingPostulations(2);
        }
      } catch (error) {
        console.error('Error al obtener postulaciones restantes:', error);
        setRemainingPostulations(null);
      }
    };

    loadProfile();
    getRemainingPostulations();
  }, []);

  const pickVideo = async (index) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'video/*',
      copyToCacheDirectory: true,
    });

    if (result.type === 'success') {
      const updated = [...actingVideos];
      updated[index] = result.uri;
      setActingVideos(updated);
    }
  };

  const handleSubmit = async () => {
    const filteredVideos = actingVideos.filter(Boolean);

    if (!userProfile) {
      Alert.alert('Error', 'Perfil del usuario no disponible.');
      return;
    }

    const membershipType = userProfile?.membershipType || 'free';

    if (membershipType === 'free') {
      const { allowed, remaining, error } = await checkAndIncrementPostulation();

      if (error) {
        Alert.alert('Error', 'No se pudo verificar el límite de postulaciones.');
        return;
      }

      if (!allowed) {
        Alert.alert(
          'Límite alcanzado',
          'Solo puedes postularte a 2 castings por mes con el plan Free. Mejora a Pro para postulaciones ilimitadas.'
        );
        return;
      }
    }

    const applicationData = {
      castingId: castingId || 'sin-id',
      castingTitle: castingTitle || 'Sin título',
      timestamp: new Date().toISOString(),
      videos: filteredVideos,
      profile: {
        name: userProfile.name || '',
        email: userProfile.email || '',
        age: userProfile.age || '',
        sex: userProfile.sex || '',
        height: userProfile.height || '',
        region: userProfile.region || '',
        city: userProfile.city || '',
        address: userProfile.address || '',
        ethnicity: userProfile.ethnicity || '',
        phoneNumber: userProfile.phoneNumber || '',
        instagram: userProfile.instagram || '',
        profilePhoto: userProfile.profilePhoto || '',
        presentationVideo: userProfile.presentationVideo || '',
        bookPhotos: userProfile.bookPhotos || [],
        categories: userProfile.categories || [],
      },
    };

    try {
      const existing = await AsyncStorage.getItem('applications');
      const parsed = existing ? JSON.parse(existing) : [];

      const alreadyApplied = parsed.some(
        (app) => app.castingId === castingId && app.profile?.email === userProfile.email
      );

      if (alreadyApplied) {
        Alert.alert('Ya postulado', 'Ya enviaste una postulación a este casting.');
        return;
      }

      parsed.push(applicationData);
      await AsyncStorage.setItem('applications', JSON.stringify(parsed));
      await syncApplicationToFirestore(applicationData);

      Alert.alert('✅ Postulación enviada', 'Tu postulación fue guardada con éxito.');
      navigation.goBack();
    } catch (error) {
      console.error('Error al guardar postulación:', error);
      Alert.alert('Error', 'Hubo un problema al enviar la postulación.');
    }
  };

  return (
    <View style={styles.screen}>
      {/* Flecha de volver */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>
          Postulación al casting:{"\n"}
          <Text style={styles.castingTitle}>{castingTitle || 'Sin título'}</Text>
        </Text>

        {userProfile?.membershipType === 'free' && remainingPostulations !== null && (
          <Text style={styles.remaining}>
            Postulaciones restantes este mes: {remainingPostulations}
          </Text>
        )}

        <Text style={styles.note}>
          * Puedes subir hasta 3 videos de actuación. Estos NO se guardarán en tu perfil. Son solo para esta postulación.
        </Text>

        {actingVideos.map((video, index) => (
          <View key={index} style={styles.videoContainer}>
            {video ? (
              <Video
                source={{ uri: video }}
                useNativeControls
                resizeMode="contain"
                style={styles.video}
              />
            ) : (
              <Text style={styles.placeholder}>Acting {index + 1} no cargado</Text>
            )}
            <TouchableOpacity style={styles.button} onPress={() => pickVideo(index)}>
              <Text style={styles.buttonText}>Subir Acting {index + 1}</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>Enviar postulación</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    top: 20,
    backgroundColor: '#000',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  container: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingBottom: 120,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    top: 0,
    marginBottom: 5,
  },
  castingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'normal',
  },
  remaining: {
    color: '#fff',
    fontSize: 14,
    marginTop: 5,
    marginBottom: 15,
    textAlign: 'center',
  },
  note: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  videoContainer: {
    marginBottom: 25,
    alignItems: 'center',
  },
  placeholder: {
    color: '#888',
    marginBottom: 10,
  },
  video: {
    width: 300,
    height: 200,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#D8A353',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  submitButton: {
    marginTop: 30,
    backgroundColor: '#D8A353',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  submitText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
