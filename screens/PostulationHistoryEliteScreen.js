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
import { Video } from 'expo-av'; // ✅
import { exportSelectedToPDF } from '../utils/exportUtils';
import CheckBox from '@react-native-community/checkbox';

export default function PostulationHistoryEliteScreen() {
  const navigation = useNavigation();
  const [postulations, setPostulations] = useState([]);
  const [agencyEmail, setAgencyEmail] = useState(null);
const [selectedPostulations, setSelectedPostulations] = useState([]);
  useEffect(() => {
    const loadData = async () => {
      const json =
  (await AsyncStorage.getItem('userProfileElite')) ||
  (await AsyncStorage.getItem('userProfile'));
      const user = json ? JSON.parse(json) : null;
      const membership = user?.membershipType || 'free';

      if (user?.email) setAgencyEmail(user.email);

      const allCastingsRaw = await AsyncStorage.getItem('allCastings');
      const allPostulationsRaw = await AsyncStorage.getItem('allPostulations');

      const allCastings = allCastingsRaw ? JSON.parse(allCastingsRaw) : [];
      const allPostulations = allPostulationsRaw ? JSON.parse(allPostulationsRaw) : [];

      const myCastings = allCastings.filter(c => c.authorEmail === user.email);

   const relevantPostulations = allPostulations
  .filter(p => myCastings.some(c => c.id === p.castingId))
  .map(p => ({
    ...p,
    age: p.age || '-',
    estatura: p.estatura || '-',
    shirtSize: p.shirtSize || '-',
    pantsSize: p.pantsSize || '-',
    shoeSize: p.shoeSize || '-',
    phone: p.phone || '-',
    email: p.email || '-',
    instagram: p.instagram || '-',
    skinColor: p.skinColor || '-',
    hairColor: p.hairColor || '-',
    eyeColor: p.eyeColor || '-',
    tattoos: p.tattoos || '-',
    piercings: p.piercings || '-',
    region: p.region || '-',
    ethnicity: p.ethnicity || '-',
    sexo: p.sexo || '-',
    acting1: p.acting1 || '',
    acting2: p.acting2 || '',
    acting3: p.acting3 || '',
    profilePhoto: p.profilePhoto || '',
    profileVideo: p.profileVideo || '',
    bookPhotos: p.bookPhotos || [],
  }));

      setPostulations(relevantPostulations.reverse());
    };

    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.screen}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ position: 'absolute', top: 40, left: 20, zIndex: 1000 }}
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
                <View key={index} style={[styles.card, { flexDirection: 'row', alignItems: 'center' }]}>
                  <CheckBox
                    value={selectedPostulations.includes(item.email)}
                    onValueChange={() => {
                      setSelectedPostulations(prev =>
                        prev.includes(item.email)
                          ? prev.filter(id => id !== item.email)
                          : [...prev, item.email]
                      );
                    }}
                  />
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() =>
                      navigation.navigate('ProfileDetail', {
                        profileData: item,
                        returnTo: 'PostulationHistoryElite',
                      })
                    }
                  >
                    <Image
                      source={{ uri: item.profilePhoto || 'https://via.placeholder.com/100' }}
                      style={styles.avatar}
                    />
                    <View style={styles.cardInfo}>
                      <Text style={styles.name}>{item.name}</Text>
                      <Text style={styles.category}>
                        {Array.isArray(item.category) ? item.category.join(', ') : item.category}
                      </Text>
                      <Text style={styles.location}>{item.region || 'Región'}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.exportButtonsContainer}>
        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: '#FF0000' }]}
      onPress={() =>
  exportSelectedToPDF(
    postulations.filter(p => selectedPostulations.includes(p.email)),
    'Seleccionados'
  )
}
        >
          <Ionicons name="document-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
          <Text style={[styles.exportButtonText, { color: '#fff' }]}>Exportar seleccionados</Text>
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
avatar: {
  width: 70,
  height: 70,
  borderRadius: 35,
  marginRight: 10,
  borderColor: '#D8A353',
  borderWidth: 1,
},
cardInfo: {
  flex: 1,
  justifyContent: 'center',
},
name: {
  color: '#fff',
  fontWeight: 'bold',
  fontSize: 16,
},
category: {
  color: '#aaa',
  fontSize: 14,
},
location: {
  color: '#888',
  fontSize: 13,
},

});
