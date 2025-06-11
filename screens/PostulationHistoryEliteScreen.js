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

export default function PostulationHistoryEliteScreen() {
  const navigation = useNavigation();
  const [postulations, setPostulations] = useState([]);
  const [agencyEmail, setAgencyEmail] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const json =
  (await AsyncStorage.getItem('userProfileElite')) ||
  (await AsyncStorage.getItem('userProfile'));
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

  return (
    <View style={styles.screen}>
      {/* 🔙 Botón atrás */}
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
  Object.entries(
    postulations.reduce((acc, p) => {
      if (!acc[p.castingId]) acc[p.castingId] = [];
      acc[p.castingId].push(p);
      return acc;
    }, {})
  ).map(([castingId, group]) => (
    <View key={castingId}>
      <Text style={styles.castingHeader}>🎬 {group[0].castingTitle || 'Sin título'}</Text>
      {group.map((item, index) => (
        <View key={index} style={styles.card}>
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
                <Image key={i} source={{ uri }} style={styles.image} />
              ))}
            </ScrollView>
          )}
        </View>
      ))}
    </View>
  ))
)}

      </ScrollView>
     <View style={styles.exportButtonsContainer}>
  <TouchableOpacity
    style={[styles.exportButton, { backgroundColor: '#FF0000' }]} // rojo PDF
    onPress={() => console.log('📄 Exportar PDF')}
  >
    <Ionicons name="document-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
    <Text style={[styles.exportButtonText, { color: '#fff' }]}>Exportar PDF</Text>
  </TouchableOpacity>
</View>
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
  marginTop: 100,
  marginBottom: 50,
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
castingHeader: {
  color: '#D8A353',
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 10,
  marginTop: 30,
  textAlign: 'left',
},

});
