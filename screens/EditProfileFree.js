import React, { useEffect, useState } from 'react';
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
import DropDownPicker from 'react-native-dropdown-picker';
import { saveUserProfile } from '../utils/profileStorage';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function EditProfileFree({ navigation }) {
  const { setUserData } = useUser();
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [edad, setEdad] = useState('');
  const [sexo, setSexo] = useState('');
  const [bookPhotos, setBookPhotos] = useState([]);

  const [openSexo, setOpenSexo] = useState(false);
  const [zIndexSexo, setZIndexSexo] = useState(1000);

  const sexoItems = [
    { label: 'Hombre', value: 'Hombre' },
    { label: 'Mujer', value: 'Mujer' },
  ];

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const json = await AsyncStorage.getItem('userProfileFree');
        if (json) {
          const savedData = JSON.parse(json);
          setProfilePhoto(savedData.profilePhoto || null);
          setName(savedData.name || '');
          setEmail(savedData.email || '');
          setEdad(savedData.edad || '');
          setSexo(savedData.sexo || '');
          setBookPhotos(savedData.bookPhotos || []);
        }
      } catch (error) {
        console.log('Error al cargar los datos:', error);
      }
    };

    loadUserData();
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
    if (!name || !email || !profilePhoto || bookPhotos.length < 1) {
      Alert.alert('Campos requeridos', 'Completa todos los campos antes de guardar.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Correo inválido', 'Por favor ingresa un correo electrónico válido.');
      return;
    }
    if (name && edad && name.trim() === edad.trim()) {
        Alert.alert('Datos inválidos', 'Nombre y edad no deben ser iguales.');
        return;
      }      
    const profile = {
      profilePhoto,
      name,
      email,
      edad,
      sexo,
      bookPhotos,
      membershipType: 'free',
    };

    try {
      await saveUserProfile(profile, 'free');
      await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
      await AsyncStorage.setItem('userData', JSON.stringify({
        email,
        membershipType: 'free',
        name,
        profilePhoto,
        sexo,
        edad,
      }));
      setUserData(profile);
goToProfileTab(navigation);

    } catch (err) {
      console.log('Error al guardar perfil:', err);
      Alert.alert('Error', 'No se pudo guardar el perfil.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#000' }}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.requiredNote}>* Campos requeridos</Text>

        <TouchableOpacity onPress={pickProfilePhoto}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Agregar foto de perfil</Text>
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Nombre completo*"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#aaa"
        />

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico*"
          value={email}
          onChangeText={setEmail}
          placeholderTextColor="#aaa"
          keyboardType="email-address"
        />

<TextInput
  style={styles.input}
  placeholder="Edad"
  value={edad}
  onChangeText={setEdad}
  placeholderTextColor="#aaa"
  keyboardType="numeric"
  autoComplete="off"
  textContentType="none"
/>

        <View style={{ zIndex: zIndexSexo, width: '80%', marginBottom: 10 }}>
          <DropDownPicker
            open={openSexo}
            value={sexo}
            items={sexoItems}
            setOpen={(val) => {
              setOpenSexo(val);
              setZIndexSexo(val ? 2000 : 1000);
            }}
            setValue={setSexo}
            placeholder="Selecciona tu sexo"
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
            textStyle={{ color: '#D8A353', fontSize: 13 }}
            labelStyle={{ color: '#D8A353' }}
            placeholderStyle={{ color: '#888' }}
            listMode="SCROLLVIEW"
          />
        </View>

        <Text style={styles.label}>Fotos del Book (máx 3)*:</Text>
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
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#000',
  },
  requiredNote: {
    color: '#D8A353',
    marginBottom: 10,
    fontSize: 12,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#D8A353',
    marginBottom: 15,
  },
  placeholder: {
    width: 100,
    height: 100,
    borderRadius: 60,
    backgroundColor: '#1B1B1B',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#D8A353',
    borderWidth: 2,
    marginBottom: 15,
  },
  placeholderText: {
    color: '#CCCCCC',
    textAlign: 'center',
    fontSize: 12,
  },
  input: {
    width: '80%',
    backgroundColor: '#1B1B1B',
    color: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
  },
  label: {
    color: '#D8A353',
    marginBottom: 5,
    fontSize: 14,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginLeft: '10%',
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
  saveButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 15,
    borderRadius: 10,
    width: '80%',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  dropdown: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
  },
  dropdownContainer: {
    backgroundColor: '#000',
    borderColor: '#D8A353',
    maxHeight: 300,
  },
});
