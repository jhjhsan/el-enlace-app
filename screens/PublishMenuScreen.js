import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';

export default function PublishMenuScreen() {
  const navigation = useNavigation();
  const { userData } = useUser();
  const [membershipType, setMembershipType] = useState(userData?.membershipType || 'free');

  useEffect(() => {
    const loadMembership = async () => {
      const json = await AsyncStorage.getItem('userProfile');
      if (json) {
        const user = JSON.parse(json);
        setMembershipType(user.membershipType || 'free');
      }
    };
    loadMembership();
  }, []);

  const showRestrictedAlert = () => {
    Alert.alert('Función exclusiva', 'Solo disponible para usuarios Pro o Elite.');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Opciones de publicación</Text>

        {/* Publicar Casting (Solo Elite) */}
        <TouchableOpacity
          style={[
            styles.button,
            membershipType !== 'elite' && styles.lockedButton,
          ]}
          onPress={() => {
            if (membershipType !== 'elite') {
              showRestrictedAlert();
            } else {
              navigation.navigate('PublishCastingScreen');
            }
          }}
        >
          <Text style={styles.buttonText}>
            {membershipType !== 'elite' ? '🔒 🎬 Publicar casting' : '🎬 Publicar casting'}
          </Text>
        </TouchableOpacity>

        {/* Publicar Servicio (Solo Pro y Elite) */}
        <TouchableOpacity
          style={[
            styles.button,
            membershipType === 'free' && styles.lockedButton,
          ]}
          onPress={() => {
            if (membershipType === 'free') {
              showRestrictedAlert();
            } else {
              navigation.navigate('Publish');
            }
          }}
        >
          <Text style={styles.buttonText}>
            {membershipType === 'free' ? '🔒 🛠️ Publicar servicio' : '🛠️ Publicar servicio'}
          </Text>
        </TouchableOpacity>

        {/* Publicar Focus (Solo Pro y Elite) */}
        <TouchableOpacity
          style={[
            styles.button,
            membershipType === 'free' && styles.lockedButton,
          ]}
          onPress={() => {
            if (membershipType === 'free') {
              showRestrictedAlert();
            } else {
              navigation.navigate('PublishFocusScreen');
            }
          }}
        >
          <Text style={styles.buttonText}>
            {membershipType === 'free' ? '🔒 🎯 Publicar focus' : '🎯 Publicar focus'}
          </Text>
        </TouchableOpacity>

        {/* Promocionar Perfil (Solo Elite) */}
        <TouchableOpacity
          style={[
            styles.button,
            membershipType !== 'elite' && styles.lockedButton,
          ]}
          onPress={() => {
            if (membershipType !== 'elite') {
              showRestrictedAlert();
            } else {
              navigation.navigate('Promote');
            }
          }}
        >
          <Text style={styles.buttonText}>
            {membershipType !== 'elite' ? '🔒 💎 Promocionar perfil' : '💎 Promocionar perfil'}
          </Text>
        </TouchableOpacity>

        {/* Botón para volver */}
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
    alignItems: 'center',
    paddingVertical: 40,
    paddingBottom: 100,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  button: {
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
  },
  lockedButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: 'bold',
  },
  back: {
    marginTop: 260,
    color: '#aaa',
    fontSize: 16,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});
