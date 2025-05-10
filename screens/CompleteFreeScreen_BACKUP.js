import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { saveUserProfile } from '../utils/profileStorage'; // ✅ Importación correcta
import DropDownPicker from 'react-native-dropdown-picker';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function CompleteFreeScreen({ navigation }) {
  const { userData, setUserData, setIsLoggedIn } = useUser();
  const [profilePhoto, setProfilePhoto] = useState(userData?.profilePhoto || null);
  const [name, setName] = useState(userData?.name || '');
  const [email, setEmail] = useState(userData?.email || '');
  const [bookPhotos, setBookPhotos] = useState([]);
  const [sexo, setSexo] = useState('');
  const [edad, setEdad] = useState('');
  const [openSexo, setOpenSexo] = useState(false);

  const sexoItems = [
    { label: 'Hombre', value: 'Hombre' },
    { label: 'Mujer', value: 'Mujer' },
  ];

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const storedProfile = await AsyncStorage.getItem('userProfileFree');
        if (storedProfile) {
          const profile = JSON.parse(storedProfile);
          setName(profile.name || '');
          setEmail(profile.email || '');
          setProfilePhoto(profile.profilePhoto || null);
          setBookPhotos(profile.bookPhotos || []);
          setSexo(profile.sexo || '');
          setEdad(profile.edad || '');
        }
      } catch (err) {
        console.log('Error al cargar perfil:', err);
      }
    };
    loadProfile();
  }, []);

  const pickProfilePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const pickBookPhotos = async () => {
    if (bookPhotos.length >= 3) {
      Alert.alert('Límite alcanzado', 'Solo puedes subir hasta 3 fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map((a) => a.uri);
      const total = [...bookPhotos, ...uris].slice(0, 3);
      setBookPhotos(total);
    }
  };

  const handleDeletePhoto = (index) => {
    const updated = [...bookPhotos];
    updated.splice(index, 1);
    setBookPhotos(updated);
  };

  const handleSave = async () => {
    const emailRegex = /\S+@\S+\.\S+/;
    if (!name || !email || !profilePhoto || bookPhotos.length < 3) {
      Alert.alert('Error', 'Completa todos los campos requeridos (*).');
      return;
    }
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Ingresa un correo válido.');
      return;
    }

    const fullProfileData = {
      ...userData,
      name,
      email,
      profilePhoto,
      bookPhotos,
      sexo,
      edad,
    };

    try {
        // Guarda todo
        await AsyncStorage.setItem('userProfileFree', JSON.stringify(fullProfileData));
        await AsyncStorage.setItem('userProfile', JSON.stringify(fullProfileData));
        await AsyncStorage.setItem(
          'userData',
          JSON.stringify({
            email,
            membershipType: 'free',
            name,
            profilePhoto,
            sexo,
            edad,
          })
        );
      
        setUserData(fullProfileData);
        setIsLoggedIn(true);
        console.log('✅ Perfil FREE guardado correctamente');
      } catch (error) {
        console.error('❌ Error al guardar perfil:', error);
        Alert.alert('Error', 'Ocurrió un error al guardar el perfil.');
      }
      
      
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#000' }}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.requerido}>* Campos obligatorios</Text>

        {profilePhoto ? (
          <View style={styles.photoContainer}>
            <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
            <TouchableOpacity style={styles.deleteButtonPhoto} onPress={() => setProfilePhoto(null)}>
              <Text style={styles.deleteText}>Eliminar foto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={pickProfilePhoto}>
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Agregar foto de perfil *</Text>
            </View>
          </TouchableOpacity>
        )}

        <TextInput style={styles.input} placeholder="Nombre completo *" placeholderTextColor="#aaa" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Correo electrónico *" placeholderTextColor="#aaa" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Edad" value={edad} onChangeText={setEdad} placeholderTextColor="#aaa" keyboardType="numeric" />

        <View style={{ zIndex: 1000, width: '100%', marginBottom: 10 }}>
          <DropDownPicker
            open={openSexo}
            value={sexo}
            items={sexoItems}
            setOpen={setOpenSexo}
            setValue={setSexo}
            placeholder="Selecciona tu sexo"
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
            listMode="SCROLLVIEW"
            textStyle={{ color: '#D8A353' }}
            placeholderStyle={{ color: '#888' }}
          />
        </View>

        <Text style={styles.label}>Fotos del Book (máx 3): *</Text>
        <View style={styles.gallery}>
          {bookPhotos.map((uri, index) => (
            <View key={index} style={styles.photoItem}>
              <Image source={{ uri }} style={styles.bookImage} />
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeletePhoto(index)}>
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={pickBookPhotos}>
          <Text style={styles.buttonText}>Agregar fotos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Guardar Perfil</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  requerido: {
    color: '#888',
    fontSize: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  placeholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1B1B1B',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#D8A353',
    borderWidth: 2,
    marginBottom: 20,
  },
  placeholderText: {
    color: '#ccc',
    textAlign: 'center',
    fontSize: 13,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderColor: '#D8A353',
    borderWidth: 2,
    marginBottom: 10,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteButtonPhoto: {
    backgroundColor: '#D8A353',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteText: {
    color: '#000',
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    color: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderColor: '#D8A353',
    borderWidth: 1,
    marginBottom: 15,
  },
  saveButton: {
    backgroundColor: '#D8A353',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  label: {
    color: '#D8A353',
    marginBottom: 5,
    fontSize: 14,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginLeft: 0,
    marginTop: 15,
  },
  gallery: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  bookImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  button: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  photoItem: {
    position: 'relative',
    marginHorizontal: 5,
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#000',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 12,
    padding: 2,
    zIndex: 2,
  },
  deleteButtonText: {
    color: '#D8A353',
    fontSize: 14,
  },
  dropdown: {
    backgroundColor: '#1A1A1A',
    borderColor: '#D8A353',
  },
  dropdownContainer: {
    backgroundColor: '#000',
    borderColor: '#D8A353',
    zIndex: 1000,
  },
});
