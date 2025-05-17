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
  Modal,
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
      toValue: profileEnlarged ? 1 : 1.6,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setProfileEnlarged(!profileEnlarged);
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('EditProfileFree')}>
          <AntDesign name="edit" size={24} color="#D8A353" />
        </TouchableOpacity>
        <Text style={styles.freeBadge}>Miembro Free 🎬</Text>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bookScroll}>
              {bookPhotos.slice(0, 3).map((uri, index) => (
                <View key={index} style={styles.bookImageWrapper}>
                  <TouchableOpacity onPress={() => setSelectedImage(uri)}>
                    <Image source={{ uri }} style={styles.bookImage} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        <Modal
          visible={selectedImage !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.fullscreenContainer} onPress={() => setSelectedImage(null)}>
              <Image source={{ uri: selectedImage }} style={styles.fullscreenImage} />
            </TouchableOpacity>
          </View>
        </Modal>
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
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#D8A353',
    marginTop: 60,
  },
  noPhoto: {
    width: 120,
    height: 120,
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
    marginTop: 2,
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
  bookScroll: {
    width: '90%',
    marginBottom: 10,
    marginTop: 10,
  },
  bookImageWrapper: {
    marginRight: 10,
  },
  bookImage: {
    width: 100,
    height: 140,
    borderRadius: 8,
    borderColor: '#D8A353',
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenContainer: {
    width: '90%',
    height: '80%',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  freeBadge: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 30,
    marginBottom: -50,
  },
});
