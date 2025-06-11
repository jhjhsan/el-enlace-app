import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function CastingDetailScreen({ route }) {
  const navigation = useNavigation();
  const { userData } = useUser();
  const { casting } = route.params || {};
  const [remainingPostulations, setRemainingPostulations] = useState(null);

  const isOwner = casting?.creatorId === userData?.id;

  useEffect(() => {
    const fetchPostulationLimit = async () => {
      if (userData?.membershipType === 'free') {
        try {
          const data = await AsyncStorage.getItem('freePostulationLimit');
          const now = new Date();
          const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;

          if (data) {
            const parsed = JSON.parse(data);
            if (parsed.month === currentMonth) {
              setRemainingPostulations(2 - parsed.count);
            } else {
              setRemainingPostulations(2);
            }
          } else {
            setRemainingPostulations(2);
          }
        } catch (error) {
          console.error('Error al obtener el límite de postulaciones:', error);
        }
      }
    };

    fetchPostulationLimit();
  }, [userData]);

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{casting?.title || 'Título del Casting'}</Text>
        <Text style={styles.description}>
          {casting?.description || 'Descripción del casting no disponible.'}
        </Text>

        {casting?.image && (
          <Image source={{ uri: casting.image }} style={styles.image} />
        )}

<View style={styles.detailBox}>
  <Text style={styles.detailText}>Categoría: {casting?.category || 'General'}</Text>
  <Text style={styles.detailText}>Ubicación: {casting?.location || 'No especificada'}</Text>
  <Text style={styles.detailText}>Fecha límite: {casting?.deadline || 'No informada'}</Text>
</View>


        {!isOwner && userData?.membershipType === 'free' && remainingPostulations !== null && (
          <Text style={styles.remaining}>
            Postulaciones restantes este mes: {remainingPostulations}
          </Text>
        )}

{!isOwner &&
  userData?.accountType !== 'agency' &&
  (userData?.membershipType === 'pro' || userData?.membershipType === 'free') && (
    <TouchableOpacity
      style={styles.applyButton}
      onPress={() =>
        navigation.navigate('SubmitApplication', {
          castingId: casting?.id,
          castingTitle: casting?.title,
        })
      }
    >
      <Text style={styles.applyText}>Postularme a este Casting</Text>
    </TouchableOpacity>
)}

{isOwner && userData?.accountType === 'agency' && userData?.membershipType === 'elite' && (
  <TouchableOpacity
    style={styles.viewApplicationsButton}
    onPress={() =>
      navigation.navigate('ViewApplications', {
        castingId: casting?.id,
        castingTitle: casting?.title,
      })
    }
  >
    <Text style={styles.buttonText}>📥 Ver postulaciones recibidas</Text>
  </TouchableOpacity>
)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
    marginTop:30,
  },
  backButton: {
    position: 'absolute',
    top: -5,
    left: 20,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  container: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 120,
  },
  title: {
    fontSize: 22,
    color: '#D8A353',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 15,
    textAlign: 'justify',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
  detailBox: {
    width: '100%',
    backgroundColor: '#1B1B1B',
    padding: 15,
    borderRadius: 10,
    borderColor: '#D8A353',
    borderWidth: 1,
    marginBottom: 20,
  },
  detailText: {
    color: '#ccc',
    fontSize: 13,
    marginBottom: 5,
  },
  remaining: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  applyButton: {
    backgroundColor: '#8B0000',
    paddingVertical: 15,
    borderRadius: 10,
    width: '100%',
    marginBottom: 20,
  },
  applyText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  viewApplicationsButton: {
    backgroundColor: '#1B1B1B',
    paddingVertical: 15,
    borderRadius: 10,
    width: '100%',
    borderColor: '#D8A353',
    borderWidth: 1,
  },
  buttonText: {
    color: '#D8A353',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});