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
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DropDownPicker from 'react-native-dropdown-picker';
import { useUser } from '../contexts/UserContext';
import { saveUserProfile } from '../utils/profileStorage';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { goToDashboardTab } from '../utils/navigationHelpers';
import { validateImageWithIA } from '../src/firebase/helpers/validateMediaContent';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { FlatList } from 'react-native';
import { uploadMediaToStorage } from '../src/firebase/helpers/uploadMediaToStorage'; 
import { getAuth, sendEmailVerification } from 'firebase/auth';

console.log('🧪 ImagePicker cargado:', ImagePicker);

const SCREEN_HEIGHT = Dimensions.get('window').height;

const resizeProfilePhoto = async (uri) => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 720 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (e) {
    console.error('Error al redimensionar perfil:', e);
    return uri;
  }
};

const resizeBookPhoto = async (uri) => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1080 } }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (e) {
    console.error('Error al redimensionar book:', e);
    return uri;
  }
};

export default function FormularioFree({ navigation }) {
  const { setUserData, setIsLoggedIn, userData } = useUser();
  const [loading, setLoading] = useState(false);
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
  const [hasOffensiveContent, setHasOffensiveContent] = useState(false);

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
    setCategory(prev => {
      if (prev.includes(cat)) {
        return prev.filter(c => c !== cat);
      } else if (prev.length < 3) {
        return [...prev, cat];
      } else {
        Alert.alert('Límite alcanzado', 'Solo puedes seleccionar hasta 3 categorías.');
        return prev;
      }
    });
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
          setCategory(Array.isArray(profile.category) ? profile.category : []);
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
        Alert.alert('Permiso requerido', 'Debes permitir acceso a la galería.');
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

      const uriToUpload = asset.uri;

      const fileInfo = await FileSystem.getInfoAsync(uriToUpload);
      if (!fileInfo.exists) {
        return;
      }

      const emailKey = (email || userData?.email || '')
        .toLowerCase()
        .replace(/\s/g, '')
        .replace(/[@.]/g, '_');

      setLoading(true);
      const resizedUri = await resizeProfilePhoto(uriToUpload);
      const firebaseUrl = await uploadMediaToStorage(
        resizedUri,
        `profile_photos/${emailKey}_photo.jpg`
      );
      setLoading(false);

      if (!firebaseUrl || !firebaseUrl.startsWith('https://')) {
        setModalMessage('No se pudo subir la imagen.');
        setModalVisible(true);
        return;
      }

      setProfilePhoto(firebaseUrl);

      setTimeout(async () => {
        const validation = await validateImageWithIA(firebaseUrl);
        if (!validation.valid) {
          setProfilePhoto(null);
          setHasOffensiveContent(true);
          setModalMessage('La imagen contiene contenido ofensivo. Por favor selecciona otra.');
          setModalVisible(true);
        }
      }, 500);
    } catch (error) {
      console.error('❌ Error al seleccionar imagen de perfil:', error);
      setModalMessage('Ocurrió un error al subir la imagen.');
      setModalVisible(true);
      setLoading(false);
    }
  };

  const pickBookPhotos = async () => {
    if (bookPhotos.length >= 3) {
      Alert.alert(
        'Límite alcanzado',
        'Solo puedes subir hasta 3 fotos en el book. Si quieres cambiar una, elimina primero una foto existente.'
      );
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Debes permitir acceso a la galería para subir imágenes.');
        return;
      }

      const maxSelectable = 3 - bookPhotos.length;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (result.canceled) return;

      const selectedAssets = result.assets || [];

      if (selectedAssets.length > maxSelectable) {
        Alert.alert(
          'Demasiadas fotos seleccionadas',
          `Solo puedes seleccionar ${maxSelectable} foto${maxSelectable === 1 ? '' : 's'} más.`
        );
        return;
      }

      const emailKey = (email || userData?.email || '')
        .toLowerCase()
        .replace(/\s/g, '')
        .replace(/[@.]/g, '_');

      setLoading(true);

      const uploadPromises = selectedAssets.map(async (asset, index) => {
        const uriToUpload = asset.uri;

        const fileInfo = await FileSystem.getInfoAsync(uriToUpload);
        if (!fileInfo.exists) {
          throw new Error('Archivo no válido.');
        }

        const resizedUri = await resizeBookPhoto(uriToUpload);
        const filename = `book_${Date.now()}_${index}.jpg`;

        const firebaseUrl = await uploadMediaToStorage(
          resizedUri,
          `book_photos/${emailKey}_${filename}`
        );

        if (!firebaseUrl || !firebaseUrl.startsWith('https://')) {
          throw new Error('No se pudo subir una de las imágenes.');
        }

        setTimeout(async () => {
          const validation = await validateImageWithIA(firebaseUrl);
          if (!validation.valid) {
            setBookPhotos(prev => prev.filter(uri => uri !== firebaseUrl));
            setHasOffensiveContent(true);
            setModalMessage('Una de las fotos contiene contenido ofensivo. Debes cambiarla.');
            setModalVisible(true);
          }
        }, 500);

        return firebaseUrl;
      });

      const urls = await Promise.all(uploadPromises);
      setBookPhotos(prev => [...prev, ...urls]);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error al subir fotos del book:', error);
      setLoading(false);
      setModalMessage(error.message || 'Ocurrió un error al subir las fotos.');
      setModalVisible(true);
    }
  };

  const handleDeletePhoto = (index) => {
    const updated = [...bookPhotos];
    updated.splice(index, 1);
    setBookPhotos(updated);
  };

  const handleSave = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!name || !email || !profilePhoto || bookPhotos.length < 1 || !sexo || !edad || category.length === 0) {
      setModalMessage('Completa todos los campos obligatorios, incluyendo al menos una categoría.');
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

    // Verificar que las imágenes sean URLs válidas
    if (!profilePhoto?.startsWith('https://')) {
      setModalMessage('La foto de perfil no es válida. Por favor, selecciona una nueva.');
      setModalVisible(true);
      return;
    }

    if (bookPhotos.some(uri => !uri?.startsWith('https://'))) {
      setModalMessage('Alguna foto del book no es válida. Por favor, revisa las fotos subidas.');
      setModalVisible(true);
      return;
    }

    try {
      setLoading(true);
      console.log('👤 Firebase user activo en este momento:', getAuth().currentUser);

      const cleanEmail = email.trim().toLowerCase();

      const fullProfile = {
        id: cleanEmail,
        name,
        email: cleanEmail,
        accountType: 'talent',
        membershipType: 'free',
        profilePhoto,
        bookPhotos,
        sexo,
        edad,
        category,
        visibleInExplorer: !hasOffensiveContent,
        flagged: hasOffensiveContent,
        timestamp: Date.now(),
      };

      const fromRegister = await AsyncStorage.getItem('fromRegister');

      if (fromRegister === 'true') {
        await saveUserProfile(fullProfile, 'free', setUserData, setIsLoggedIn, true);
        await AsyncStorage.setItem('sessionActive', 'true');
        await AsyncStorage.removeItem('fromRegister');
        await AsyncStorage.setItem('hasCompletedFreeForm', 'true');
        await AsyncStorage.setItem('userData', JSON.stringify(fullProfile));
        console.log('🔐 Marcado hasCompletedFreeForm como true');
        console.log('💾 userData guardado para uso global (Pro incluido)');

        try {
          const auth = getAuth();
          if (auth.currentUser && !auth.currentUser.emailVerified) {
            await sendEmailVerification(auth.currentUser);
            Alert.alert(
              'Verificación enviada',
              'Te hemos enviado un correo para verificar tu cuenta. Puedes revisarlo cuando gustes.'
            );
          }
        } catch (err) {
          console.warn('❌ Error al enviar correo de verificación:', err);
        }

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
      setLoading(false);
    } catch (e) {
      console.log('Error al guardar perfil:', e);
      setLoading(false);
      setModalMessage('No se pudo guardar el perfil.');
      setModalVisible(true);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D8A353" />
        <Text style={{ color: '#D8A353', marginTop: 10 }}>Subiendo imagen...</Text>
      </View>
    );
  }

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

            <TouchableOpacity
              style={[
                styles.input,
                {
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                },
              ]}
              onPress={() => {
                if (category.length >= 3) {
                  Alert.alert('Límite alcanzado', 'Solo puedes seleccionar hasta 3 categorías.');
                  return;
                }
                setShowCategoryModal(true);
              }}
            >
              <Text
                style={{ color: category.length ? '#fff' : '#888', flex: 1 }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {category.length === 0
                  ? 'Seleccionar Categorías*'
                  : `${category.length} categoría${category.length > 1 ? 's' : ''} seleccionada${category.length > 1 ? 's' : ''}`}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#D8A353" />
            </TouchableOpacity>

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

            <View style={{ width: '100%', marginBottom: 15 }}>
              <Text style={styles.label}>Sexo:</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    sexo === 'Hombre' && styles.optionSelected,
                  ]}
                  onPress={() => setSexo('Hombre')}
                >
                  <Text style={styles.optionText}>Hombre</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    sexo === 'Mujer' && styles.optionSelected,
                  ]}
                  onPress={() => setSexo('Mujer')}
                >
                  <Text style={styles.optionText}>Mujer</Text>
                </TouchableOpacity>
              </View>
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
            <Text style={styles.photoCount}>
              Has subido {bookPhotos.length} de 3 fotos permitidas
            </Text>

            <TouchableOpacity style={styles.button} onPress={pickBookPhotos}>
              <Text style={styles.buttonText}>Agregar fotos</Text>
            </TouchableOpacity>
            <Text style={styles.notice}>
              * Todos los campos deben estar completos para guardar el perfil
            </Text>
            <TouchableOpacity
              style={[
                styles.saveButton,
                loading && { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
              ]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading && <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />}
              <Text style={styles.saveButtonText}>
                {loading ? 'Guardando perfil...' : 'Guardar perfil'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
            <FlatList
              style={{ maxHeight: 300 }}
              data={filteredCategories}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => toggleCategory(item)}>
                  <Text
                    style={[
                      styles.modalItem,
                      category.includes(item) && styles.selectedCategory,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator
            />
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
    marginTop: 30,
  },
  inner: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 50,
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
    paddingHorizontal: 15,
    paddingVertical: 10,
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
    borderWidth: 0.5,
    borderRadius: 10,
  },
  dropdownContainer: {
    backgroundColor: '#000',
    borderColor: '#D8A353',
    borderWidth: 0.5,
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
    borderWidth: 0.5,
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
    borderWidth: 0.5,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    color: '#fff',
    width: '80%',
    alignSelf: 'center',
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
  scrollContent: {
    paddingBottom: 50,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
    backgroundColor: '#1A1A1A',
  },
  optionSelected: {
    backgroundColor: '#D8A353',
  },
  optionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  photoCount: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 10,
    alignSelf: 'center',
  },
});