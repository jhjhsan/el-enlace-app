import React, { useState, useEffect } from 'react';
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
import { CommonActions } from '@react-navigation/native';
import { goToDashboardTab } from '../utils/navigationHelpers';

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
  const [modalVisible, setModalVisible] = useState(false);
const [modalMessage, setModalMessage] = useState('');


useEffect(() => {
  const loadProfile = async () => {
    try {
      const json = await AsyncStorage.getItem('userProfileFree');
      if (json) {
        const profile = JSON.parse(json);
        setName(profile.name || '');
        setEmail(profile.email || '');
        setSexo(profile.sexo || '');
        setEdad(profile.edad || '');
        setProfilePhoto(profile.profilePhoto || null);
        setBookPhotos(profile.bookPhotos || []);
      }
    } catch (error) {
      console.log('❌ Error al cargar perfil Free:', error);
    }
  };

  loadProfile();
}, []);

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
        setModalMessage('Solo puedes subir hasta 3 fotos.');
        setModalVisible(true);
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
      setModalMessage('Completa todos los campos obligatorios.');
      setModalVisible(true);
      return;
  }

  if (!emailRegex.test(email)) {
      setModalMessage('Ingresa un correo válido.');
      setModalVisible(true);
      return;        
  }

  if (isNaN(Number(edad))) {
      setModalMessage('Ingresa una edad válida en números.');
      setModalVisible(true);
      return;        
  }
  if (name && edad && name.trim() === edad.trim()) {
      setModalMessage('Nombre y edad no deben coincidir. Verifica los datos.');
      setModalVisible(true);
      return;
  }      
  const fullProfile = {
    id: email,
    name,
    email,
    accountType: 'talent',
    membershipType: 'free',
    profilePhoto,
    bookPhotos,
    sexo,
    edad,
    visibleInExplorer: true,
    timestamp: Date.now(),
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
      navigation.navigate('MainTabs', { screen: 'DashboardTab' });
    } else {
      await saveUserProfile(
        fullProfile,
        'free',
        setUserData,
        setIsLoggedIn
      );
      console.log('📄 Perfil editado y contexto actualizado');
    }
  } catch (e) {
    console.log('Error al guardar perfil:', e);
    setModalMessage('No se pudo guardar el perfil.');
    setModalVisible(true);
  } 
}; 

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
  autoComplete="off"
  textContentType="none"
/>
  
          <View style={[styles.dropdownWrapper, { zIndex: zIndexSexo }]}>
            <DropDownPicker
              open={openSexo}
              value={sexo}
              items={[
                { label: 'Hombre', value: 'Hombre' },
                { label: 'Mujer', value: 'Mujer' },
              ]}
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
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeletePhoto(index)}
                >
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
  
      {modalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>{modalMessage}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
          </View>
      )}
    </>
  );
}
  
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    marginTop:30,
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
    borderWidth: 0.5,
    marginBottom: 15,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
    borderColor: '#D8A353',
    borderWidth: 0.5,
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
    borderWidth: 0.5,
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
    borderWidth: 0.5,
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalContent: {
    backgroundColor: '#1B1B1B',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
    width: '80%',
    alignItems: 'center',
  },
  modalText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },  
});
