import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import BottomBar from '../components/BottomBar';
import { AntDesign } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
  const { userData, setUserData } = useUser();

  useFocusEffect(
    useCallback(() => {
      const loadUser = async () => {
        const json = await AsyncStorage.getItem('userProfileFree');
        if (json) {
          const user = JSON.parse(json);
          setUserData(user);
        }
      };
      loadUser();
    }, [])
  );

  if (!userData) {
    return (
      <View style={styles.screen}>
        <Text style={{ color: '#fff' }}>Cargando perfil...</Text>
      </View>
    );
  }

  const userName = userData.name || 'Usuario';
  const category = userData.category || 'Categoría no definida';
  const email = userData.email || 'Correo no definido';
  const description = userData.description || 'Sin descripción';
  const images = userData.bookPhotos || [];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('EditProfileFree')}>
          <AntDesign name="edit" size={24} color="#D8A353" />
        </TouchableOpacity>

        <Image source={userData.profilePhoto ? { uri: userData.profilePhoto } : require('../assets/imagen5.png')} style={styles.profileImage} />

        <Text style={styles.name}>{userName}</Text>
        <Text style={styles.category}>{category}</Text>

        <Text style={styles.label}>Correo:</Text>
        <View style={styles.descriptionBox}>
          <Text style={styles.text}>{email}</Text>
        </View>

        <Text style={styles.label}>Descripción:</Text>
        <View style={styles.descriptionBox}>
          <Text style={styles.text}>{description}</Text>
        </View>

        <Text style={styles.label}>Fotos:</Text>
        <View style={styles.gallery}>
          {images.map((uri, index) => (
            <Image key={index} source={{ uri }} style={styles.galleryImage} />
          ))}
        </View>
      </ScrollView>

      <BottomBar />
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
    paddingBottom: 100,
  },
  editButton: {
    position: 'absolute',
    top: 50,
    right: 30,
    zIndex: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#D8A353',
    marginTop: 60,
  },
  name: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: 'bold',
    marginTop: 10,
  },
  category: {
    fontSize: 18,
    color: '#CCCCCC',
    marginBottom: 10,
  },
  label: {
    alignSelf: 'flex-start',
    marginLeft: 40,
    marginTop: 20,
    color: '#D8A353',
    fontWeight: 'bold',
    fontSize: 14,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'left',
  },
  descriptionBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 40,
    marginTop: 5,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
    gap: 10,
  },
  galleryImage: {
    width: (width * 0.85 - 40) / 3,
    height: 80,
    borderRadius: 10,
  },
});
