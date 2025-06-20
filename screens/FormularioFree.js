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
import { validateImageWithIA } from '../src/firebase/helpers/validateMediaContent';
import * as FileSystem from 'expo-file-system'; // si aún no está
import { uploadMediaToStorage } from '../src/firebase/helpers/uploadMediaToStorage'; 
import { getAuth, sendEmailVerification } from 'firebase/auth';
import { ScrollView } from 'react-native';
import * as MediaLibrary from 'expo-media-library';

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
const [category, setCategory] = useState([]);
const [showCategoryModal, setShowCategoryModal] = useState(false);
const [searchCategory, setSearchCategory] = useState('');
const categoriesList = [
  "Actor", "Actriz", "Animador / presentador", "Artista urbano", "Bailarín / bailarina",
  "Camarógrafo", "Caracterizador (maquillaje FX)", "Colorista", "Community manager",
  "Continuista", "Creador de contenido digital", "Decorador de set", "Diseñador de arte",
  "Diseñador gráfico", "Doble de acción", "Editor de video", "Escenógrafo",
  "Extra", "Fotógrafo de backstage", "Iluminador", "Ilustrador / storyboarder",
  "Maquillista", "Microfonista", "Modelo", "Modelo publicitario", "Niño actor",
  "Operador de drone", "Peluquero / estilista", "Postproductor", "Productor",
  "Promotoras", "Servicios de catering", "Sonidista", "Stage manager",
  "Técnico de efectos especiales", "Técnico de grúa", "Vestuarista",
  "Ambientador", "Asistente de cámara", "Asistente de dirección",
  "Asistente de producción", "Asistente de vestuario",
  "Transporte de talentos", "Autos personales", "Motos o bicicletas para escenas",
  "Grúas para filmación", "Camiones de arte para rodajes", "Casas rodantes para producción",
  "Estudio fotográfico", "Transporte de producción", "Vans de producción",
  "Coffee break / snacks", "Otros / No especificado"
];
const filteredCategories = categoriesList.filter(cat =>
  cat.toLowerCase().includes(searchCategory.toLowerCase())
);

const toggleCategory = (cat) => {
  setCategory(prev => 
    prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
  );
};



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
  setCategory(Array.isArray(profile.category) ? profile.category : []); // ✅ ← AQUÍ
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
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Debes permitir acceso a la galería para subir imágenes.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    console.log('🧪 Imagen seleccionada:', asset.uri);

    // 🧪 Si estás en Expo, simulamos URL real para testear visualmente
    if (__DEV__ && asset.uri.startsWith('file://')) {
      setProfilePhoto(asset.uri);
      Alert.alert('⚠️ Imagen cargada localmente (solo en Expo)');
      return;
    }

    const emailKey = email.toLowerCase().trim();

    const firebaseUrl = await uploadMediaToStorage(
      asset.uri,
      `profile_photos/${emailKey}_photo.jpg`
    );

    if (!firebaseUrl || !firebaseUrl.startsWith('https://')) {
      setModalMessage('No se pudo subir la imagen.');
      setModalVisible(true);
      return;
    }

    const validation = await validateImageWithIA(firebaseUrl);
    if (!validation.valid) {
      setModalMessage('La imagen contiene contenido ofensivo.');
      setModalVisible(true);
      return;
    }

    setProfilePhoto(firebaseUrl);
    Alert.alert('✅ Foto de perfil subida y validada');
  } catch (error) {
    console.log('❌ Error al seleccionar imagen de perfil:', error);
  }
};

const pickBookPhotos = async () => {
  if (bookPhotos.length >= 3) {
    setModalMessage('Solo puedes subir hasta 3 fotos.');
    setModalVisible(true);
    return;
  }

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permiso requerido', 'Debes permitir acceso a la galería.');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    quality: 1,
  });

  if (!result.canceled && result.assets.length > 0) {
    const safeUris = [];
    const emailKey = email.toLowerCase().trim();

    for (let i = 0; i < result.assets.length && bookPhotos.length + safeUris.length < 3; i++) {
      const asset = result.assets[i];
      if (!asset?.uri) continue;
     
      console.log('🧪 URI imagen seleccionada:', asset.uri);

      // En modo desarrollo (Expo), simular subida para ver resultado
      if (__DEV__ && asset.uri.startsWith('file://')) {
        safeUris.push(asset.uri);
        continue;
      }

      const firebaseUrl = await uploadMediaToStorage(
        asset.uri,
        `book_photos/${emailKey}_book${Date.now()}_${i + 1}.jpg`
      );

      if (!firebaseUrl || !firebaseUrl.startsWith('https://')) {
        setModalMessage('Error al subir una imagen.');
        setModalVisible(true);
        return;
      }

      const validation = await validateImageWithIA(firebaseUrl);
      if (!validation.valid) {
        setModalMessage('Una imagen fue rechazada por contenido ofensivo.');
        setModalVisible(true);
        return;
      }

      safeUris.push(firebaseUrl);
    }

    const total = [...bookPhotos, ...safeUris].slice(0, 3);
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

  try {
    const emailKey = email.toLowerCase().trim();

    const uploadedProfilePhoto = profilePhoto;
    const uploadedBookPhotos = bookPhotos;

    const fullProfile = {
      id: email,
      name,
      email,
      accountType: 'talent',
      membershipType: 'free',
      profilePhoto: uploadedProfilePhoto,
      bookPhotos: uploadedBookPhotos,
      sexo,
      edad,
      category,
      visibleInExplorer: true,
      timestamp: Date.now(),
    };

    const fromRegister = await AsyncStorage.getItem('fromRegister');

    if (fromRegister === 'true') {
  await saveUserProfile(fullProfile, 'free', setUserData, setIsLoggedIn, true);
  await AsyncStorage.setItem('sessionActive', 'true');
  await AsyncStorage.removeItem('fromRegister');
  try {
    goToDashboardTab(navigation);
  } catch (e) {
    console.log('⚠️ Error al redirigir:', e);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'DashboardScreen' }],
      })
    );
  }
} else {
  await saveUserProfile(fullProfile, 'free', setUserData, setIsLoggedIn);
}

    const auth = getAuth();
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      await sendEmailVerification(auth.currentUser);
      Alert.alert(
        'Verificación enviada',
        'Te hemos enviado un correo para verificar tu cuenta. Revisa tu bandeja de entrada.'
      );
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
  <TouchableOpacity
  style={[styles.input, { justifyContent: 'center' }]}
  onPress={() => setShowCategoryModal(true)}
>
  <Text style={{ color: category.length ? '#fff' : '#888' }}>
    {category.length > 0 ? category.join(', ') : 'Seleccionar Categorías*'}
  </Text>
</TouchableOpacity>

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
{showCategoryModal && (
  <View style={styles.modalOverlay}>
    <View style={[styles.modalContent, { maxHeight: '80%' }]}>
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar categoría..."
        placeholderTextColor="#aaa"
        value={searchCategory}
        onChangeText={setSearchCategory}
      />

      <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator>
        {filteredCategories.map((cat, index) => (
          <TouchableOpacity key={index} onPress={() => toggleCategory(cat)}>
            <Text
              style={[
                styles.modalItem,
                category.includes(cat) && styles.selectedCategory,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.modalButton}
        onPress={() => setShowCategoryModal(false)}
      >
        <Text style={styles.modalButtonText}>Cerrar</Text>
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
  searchInput: {
  backgroundColor: '#1B1B1B',
  borderColor: '#D8A353',
  borderWidth: 1,
  borderRadius: 10,
  padding: 8,
  marginBottom: 10,
  color: '#fff',
},
modalItem: {
  color: '#D8A353',
  fontSize: 16,
  paddingVertical: 8,
  textAlign: 'center',
},
selectedCategory: {
  fontWeight: 'bold',
  color: '#D8A353',
  textDecorationLine: 'underline',
},

});
