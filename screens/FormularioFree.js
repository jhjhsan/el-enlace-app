import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DropDownPicker from 'react-native-dropdown-picker';
import { useUser } from '../contexts/UserContext';
import { saveUserProfile } from '../utils/profileStorage';
// Si deseas usar Ionicons en vez de emoji flecha:
import { Ionicons } from '@expo/vector-icons';


const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function FormularioFree({ navigation }) {
  const { setUserData, setIsLoggedIn, userData } = useUser();

  const [name, setName] = useState(userData?.name || '');
  const [email, setEmail] = useState(userData?.email || '');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [bookPhotos, setBookPhotos] = useState([]);
  const [sexo, setSexo] = useState('');
  const [edad, setEdad] = useState('');
  const [openSexo, setOpenSexo] = useState(false);
  const [zIndexSexo, setZIndexSexo] = useState(500);

  const sexoItems = [
    { label: 'Hombre', value: 'Hombre' },
    { label: 'Mujer', value: 'Mujer' },
  ];

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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!name || !email || !profilePhoto || bookPhotos.length < 1 || !sexo || !edad) {
      Alert.alert('Error', 'Completa todos los campos obligatorios.');
      return;
    }

    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Ingresa un correo válido.');
      return;
    }

    if (isNaN(Number(edad))) {
      Alert.alert('Error', 'Ingresa una edad válida en números.');
      return;
    }

    const fullProfile = {
      name,
      email,
      membershipType: 'free',
      profilePhoto,
      bookPhotos,
      sexo,
      edad,
    };

    try {
      const fromRegister = await AsyncStorage.getItem('fromRegister');

      if (fromRegister === 'true') {
        await saveUserProfile(
          fullProfile,
          'free',
          setUserData,
          setIsLoggedIn,
          true
        );
        await AsyncStorage.setItem('sessionActive', 'true');
        await AsyncStorage.removeItem('fromRegister');
        console.log('✅ Perfil guardado y sesión activada tras registro');
      } else {
        await saveUserProfile(fullProfile, 'free');
        console.log('📄 Perfil editado sin reactivar sesión');
      }

      Alert.alert('Perfil guardado', 'Tus datos fueron actualizados correctamente.');
    } catch (e) {
      console.log('Error al guardar perfil:', e);
      Alert.alert('Error', 'No se pudo guardar el perfil.');
    }
  };

  return (
    
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.title}>Formulario Free ✅</Text>

        <TouchableOpacity onPress={pickProfilePhoto}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Subir foto de perfil</Text>
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          placeholder="Nombre completo"
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholderTextColor="#999"
        />
        <TextInput
          placeholder="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          placeholderTextColor="#999"
        />
        <TextInput
          placeholder="Edad"
          value={edad}
          onChangeText={setEdad}
          style={styles.input}
          placeholderTextColor="#999"
          keyboardType="numeric"
        />

        <View style={[styles.dropdownWrapper, { zIndex: zIndexSexo }]}>
          <DropDownPicker
            open={openSexo}
            value={sexo}
            items={sexoItems}
            setOpen={(val) => {
              setOpenSexo(val);
              setZIndexSexo(val ? 2000 : 500);
            }}
            setValue={setSexo}
            placeholder="Selecciona tu sexo"
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
            textStyle={{ color: '#D8A353' }}
            placeholderStyle={{ color: '#888' }}
          />
        </View>

        <Text style={styles.label}>Fotos del Book (máx 3):</Text>
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
        <Text style={styles.notice}>
          * Todos los campos deben estar completos para guardar el perfil
        </Text>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Guardar perfil</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  inner: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 100,
  },
  title: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
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
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
    borderColor: '#D8A353',
    borderWidth: 2,
  },
  placeholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1B1B1B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderColor: '#D8A353',
    borderWidth: 2,
  },
  placeholderText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  dropdownWrapper: {
    width: '100%',
    marginBottom: 10,
  },
  dropdown: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
  },
  dropdownContainer: {
    backgroundColor: '#000',
    borderColor: '#D8A353',
    maxHeight: 700,
  },
  label: {
    color: '#D8A353',
    alignSelf: 'flex-start',
    marginBottom: 10,
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
  photoItem: {
    position: 'relative',
    marginHorizontal: 5,
  },
  deleteButton: {
    position: 'absolute',
    top: -6,
    right: -6,
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
  notice: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
});
