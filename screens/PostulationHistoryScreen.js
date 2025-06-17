import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import XLSX from 'xlsx';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import * as Sharing from 'expo-sharing';

export default function PostulationHistoryScreen() {

  const navigation = useNavigation();
  const [postulations, setPostulations] = useState([]);
  const [agencyEmail, setAgencyEmail] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const json = await AsyncStorage.getItem('userProfile');
      const user = json ? JSON.parse(json) : null;
      const membership = user?.membershipType || 'free';

      setAgencyEmail(user.email);

      const allCastingsRaw = await AsyncStorage.getItem('allCastings');
      const allPostulationsRaw = await AsyncStorage.getItem('allPostulations');

      const allCastings = allCastingsRaw ? JSON.parse(allCastingsRaw) : [];
      const allPostulations = allPostulationsRaw ? JSON.parse(allPostulationsRaw) : [];

      const myCastings = allCastings.filter(c => c.authorEmail === user.email);

      const relevantPostulations = allPostulations.filter(p =>
        myCastings.some(c => c.id === p.castingId)
      );

      setPostulations(relevantPostulations.reverse());
    };

    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  const exportToExcel = async () => {
    if (postulations.length === 0) return alert('No hay postulaciones para exportar.');

    const ws = XLSX.utils.json_to_sheet(postulations);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Postulaciones');

    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const uri = FileSystem.cacheDirectory + 'postulaciones.xlsx';

    await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Exportar Excel',
    });
  };

  const exportToPDF = async () => {
    if (postulations.length === 0) return alert('No hay postulaciones para exportar.');

    let html = `<h1>Postulaciones Recibidas</h1>`;
    postulations.forEach((p, i) => {
      html += `
        <h3>Postulación #${i + 1}</h3>
        <p><strong>Casting:</strong> ${p.castingTitle}</p>
        <p><strong>Postulante:</strong> ${p.name}</p>
        <p><strong>Email:</strong> ${p.email}</p>
        <p><strong>Fecha:</strong> ${new Date(p.timestamp).toLocaleString('es-CL')}</p>
        <hr/>
      `;
    });

    const file = await RNHTMLtoPDF.convert({
      html,
      fileName: 'postulaciones',
      base64: false,
    });

    await Sharing.shareAsync(file.filePath, {
      mimeType: 'application/pdf',
      dialogTitle: 'Exportar PDF',
    });
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{
          position: 'absolute',
          top: 40,
          left: 20,
          zIndex: 1000,
        }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📥 Postulaciones Recibidas</Text>

        {postulations.length === 0 ? (
          <Text style={styles.info}>Aún no has recibido postulaciones.</Text>
        ) : (
          postulations.map((item, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.label}>🎬 Casting:</Text>
              <Text style={styles.value}>{item.castingTitle || 'Sin título'}</Text>

              <Text style={styles.label}>🧑 Postulante:</Text>
              <Text style={styles.value}>{item.name}</Text>

              <Text style={styles.label}>📧 Email:</Text>
              <Text style={styles.value}>{item.email}</Text>

              <Text style={styles.label}>📅 Fecha:</Text>
              <Text style={styles.value}>
                {new Date(item.timestamp).toLocaleDateString('es-CL', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>

              {item.videos?.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {item.videos.map((uri, i) => (
                    <Video
                      key={i}
                      source={{ uri }}
                      useNativeControls
                      resizeMode="contain"
                      style={styles.video}
                    />
                  ))}
                </ScrollView>
              )}

              {item.photos?.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {item.photos.map((uri, i) => (
                    <Image
                      key={i}
                      source={{ uri }}
                      style={styles.image}
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
    paddingBottom: 100,
  },
  title: {
    fontSize: 22,
    color: '#D8A353',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 20,
  },
  info: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 60,
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
    marginBottom: 10,
  },
  video: {
    height: 200,
    width: 300,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
    marginRight: 10,
  },
  image: {
    height: 180,
    width: 120,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
  },
  exportButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D8A353',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  exportButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
