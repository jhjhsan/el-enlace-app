import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';

import BottomBar from '../components/BottomBar';
import { AntDesign } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
  const { userData, setUserData } = useUser();
  const [selectedImage, setSelectedImage] = useState(null);
  const profileScaleAnim = useRef(new Animated.Value(1)).current;
  const [profileEnlarged, setProfileEnlarged] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const loadUser = async () => {
        try {
          let json = await AsyncStorage.getItem('userProfileFree');
          if (!json) {
            json = await AsyncStorage.getItem('userProfile');
          }
          if (json) {
            const user = JSON.parse(json);
            setUserData(user);
            console.log('📦 Datos cargados en perfil:', user);
          }
        } catch (e) {
          console.log('❌ Error cargando perfil:', e);
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

  const {
    name = 'Usuario',
    email = 'Correo no definido',
    edad = 'No definida',
    sexo = 'No definido',
    profilePhoto,
    bookPhotos = [],
  } = userData;

  const handleProfileImagePress = () => {
    Animated.timing(profileScaleAnim, {
      toValue: profileEnlarged ? 1 : 1.5,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setProfileEnlarged(!profileEnlarged);
    });
  };

  const handleToggleImage = (uri) => {
    if (selectedImage === uri) {
      setSelectedImage(null);
    } else {
      setSelectedImage(uri);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('EditProfileFree')}>
          <AntDesign name="edit" size={24} color="#D8A353" />
        </TouchableOpacity>

        {profilePhoto ? (
          <TouchableOpacity onPress={handleProfileImagePress}>
            <Animated.Image
              source={{ uri: profilePhoto }}
              style={[styles.profileImage, { transform: [{ scale: profileScaleAnim }] }]}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.noPhoto}>
            <Text style={styles.noPhotoText}>Sin foto de perfil</Text>
          </View>
        )}

        <Text style={styles.name}>{name}</Text>

        <View style={styles.infoBox}>
          <Text style={styles.label}>Correo:</Text>
          <Text style={styles.text}>{email}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.label}>Edad:</Text>
          <Text style={styles.text}>{edad}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.label}>Sexo:</Text>
          <Text style={styles.text}>{sexo}</Text>
        </View>

        {bookPhotos.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Book de Fotos:</Text>
            <View style={styles.gallery}>
              {bookPhotos.map((uri, index) => (
                <TouchableOpacity key={index} onPress={() => handleToggleImage(uri)}>
                  <Image
                    source={{ uri }}
                    style={selectedImage === uri ? styles.largeImage : styles.galleryImage}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
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
  noPhoto: {
    width: 100,
    height: 100,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#D8A353',
    marginTop: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  noPhotoText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  name: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: 'bold',
    marginTop: 10,
  },
  infoBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    width: '85%',
  },
  label: {
    color: '#D8A353',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  sectionTitle: {
    alignSelf: 'flex-start',
    marginLeft: 40,
    marginTop: 40,
    color: '#D8A353',
    fontWeight: 'bold',
    fontSize: 14,
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
  largeImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    margin: 5,
  },
});
