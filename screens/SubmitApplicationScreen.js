import React, { useState } from 'react';
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

export default function SubmitApplicationScreen({ route, navigation }) {
  const { castingId, castingTitle } = route.params || {};
  const [actingVideos, setActingVideos] = useState([null, null, null]);

  const pickVideo = async (index) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'video/*',
      copyToCacheDirectory: true,
    });

    if (result.type === 'success') {
      const updatedVideos = [...actingVideos];
      updatedVideos[index] = result.uri;
      setActingVideos(updatedVideos);
    }
  };

  const handleSubmit = async () => {
    const filteredVideos = actingVideos.filter(Boolean);

    try {
      const applicationData = {
        castingId: castingId || 'sin-id',
        castingTitle: castingTitle || 'Sin título',
        videos: filteredVideos,
        timestamp: new Date().toISOString(),
      };

      const existing = await AsyncStorage.getItem('applications');
      const parsed = existing ? JSON.parse(existing) : [];

      parsed.push(applicationData);
      await AsyncStorage.setItem('applications', JSON.stringify(parsed));

      console.log('Postulación guardada localmente:', applicationData);
      Alert.alert('✅ Postulación enviada', 'Tu postulación fue enviada con éxito.');
      navigation.goBack();
    } catch (error) {
      console.error('Error al guardar postulación:', error);
      Alert.alert('Error', 'Hubo un problema al enviar la postulación.');
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>
          Postulación al casting:{"\n"}
          <Text style={styles.castingTitle}>{castingTitle || 'Sin título'}</Text>
        </Text>

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
              <Text style={styles.placeholder}>Video {index + 1} no cargado</Text>
            )}
            <TouchableOpacity style={styles.button} onPress={() => pickVideo(index)}>
              <Text style={styles.buttonText}>Subir Video {index + 1}</Text>
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
    backgroundColor: '#000',
  },
  container: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingBottom: 120,
  },
  title: {
    color: '#D8A353',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  castingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'normal',
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
