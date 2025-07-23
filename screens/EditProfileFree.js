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
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import DropDownPicker from 'react-native-dropdown-picker';
import { saveUserProfile } from '../utils/profileStorage';
import { goToProfileTab } from '../utils/navigationHelpers';
import { uploadMediaToStorage } from '../src/firebase/helpers/uploadMediaToStorage';
import * as FileSystem from 'expo-file-system';
import { validateImageWithIA } from '../src/firebase/helpers/validateMediaContent';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const talentCategories = [
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

export default function EditProfileFree({ navigation }) {
  const { setUserData } = useUser();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasOffensiveContent, setHasOffensiveContent] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [edad, setEdad] = useState('');
  const [sexo, setSexo] = useState('');
  const [bookPhotos, setBookPhotos] = useState([]);
  const [category, setCategory] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [searchCategory, setSearchCategory] = useState('');
  const [openSexo, setOpenSexo] = useState(false);
  const [zIndexSexo, setZIndexSexo] = useState(1000);

  const sexoItems = [
    { label: 'Hombre', value: 'Hombre' },
    { label: 'Mujer', value: 'Mujer' },
  ];

  const filteredCategories = talentCategories.filter(cat =>
    cat.toLowerCase().includes(searchCategory.toLowerCase())
  );

  const toggleCategory = (cat) => {
    setCategory(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

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
          setCategory(Array.isArray(savedData.category) ? savedData.category : []);
        }
      } catch (error) {
        console.log('Error al cargar los datos:', error);
      }
    };

    loadUserData();
  }, []);

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
        Alert.alert('Error', 'El archivo seleccionado no es válido.');
        return;
      }

      const emailKey = email.toLowerCase().trim();

      setLoading(true);

      const firebaseUrl = await uploadMediaToStorage(
        uriToUpload,
        `profile_photos/${emailKey}_photo.jpg`
      );

      setLoading(false);

      if (!firebaseUrl || !firebaseUrl.startsWith('https://')) {
        Alert.alert('Error', 'No se pudo subir la imagen.');
        return;
      }

      // Validar con IA
      const validation = await validateImageWithIA(firebaseUrl);
      if (!validation.valid) {
        setHasOffensiveContent(true);
        Alert.alert('Imagen rechazada', 'La imagen contiene contenido ofensivo. Selecciona otra.');
        return;
      }

      setProfilePhoto(firebaseUrl);
    } catch (error) {
      console.error('❌ Error al seleccionar imagen de perfil:', error);
      setLoading(false);
      Alert.alert('Error', 'Ocurrió un error al subir la imagen.');
    }
  };

  const pickBookPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Debes permitir acceso a la galería para subir imágenes.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 3 - bookPhotos.length,
        quality: 1,
      });

      if (result.canceled) return;

      const selectedAssets = result.assets || [];
      if (bookPhotos.length + selectedAssets.length > 3) {
        Alert.alert('Límite de fotos', 'Solo puedes subir hasta 3 fotos en el book.');
        return;
      }

      const emailKey = email.toLowerCase().trim();
      setLoading(true);

      const validUrls = [];

      for (let index = 0; index < selectedAssets.length; index++) {
        const asset = selectedAssets[index];
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        if (!fileInfo.exists) continue;

        const filename = `book_${Date.now()}_${index}.jpg`;
        const firebaseUrl = await uploadMediaToStorage(
          asset.uri,
          `book_photos/${emailKey}_${filename}`
        );

        if (!firebaseUrl || !firebaseUrl.startsWith('https://')) continue;

        const validation = await validateImageWithIA(firebaseUrl);
        if (!validation.valid) {
          setHasOffensiveContent(true);
          Alert.alert('Imagen rechazada', 'Una de las fotos contiene contenido ofensivo.');
          continue;
        }

        validUrls.push(firebaseUrl);
      }

      setBookPhotos(prev => [...prev, ...validUrls]);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error al subir fotos del book:', error);
      setLoading(false);
      Alert.alert('Error', error.message || 'Ocurrió un error al subir las fotos.');
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
      Alert.alert('Campos requeridos', 'Completa todos los campos obligatorios, incluyendo al menos una categoría.');
      return;
    }

    if (!emailRegex.test(email)) {
      Alert.alert('Correo inválido', 'Ingresa un correo electrónico válido.');
      return;
    }

    if (isNaN(Number(edad))) {
      Alert.alert('Edad inválida', 'Ingresa una edad válida en números.');
      return;
    }

    if (name && edad && name.trim() === edad.trim()) {
      Alert.alert('Datos inválidos', 'Nombre y edad no deben coincidir. Verifica los datos.');
      return;
    }

    if (!profilePhoto?.startsWith('https://')) {
      Alert.alert('Foto de perfil inválida', 'La foto de perfil no es válida. Por favor, selecciona una nueva.');
      return;
    }

    if (bookPhotos.some(uri => !uri?.startsWith('https://'))) {
      Alert.alert('Fotos del book inválidas', 'Alguna foto del book no es válida. Por favor, revisa las fotos subidas.');
      return;
    }

    setSaving(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      const profile = {
        id: cleanEmail,
        profilePhoto,
        name,
        email: cleanEmail,
        edad,
        sexo,
        bookPhotos,
        category,
        membershipType: 'free',
        flagged: hasOffensiveContent,
        timestamp: Date.now(),
      };

      await saveUserProfile(profile, 'free', setUserData);
      await AsyncStorage.setItem('userProfileFree', JSON.stringify(profile));
      await AsyncStorage.setItem('userData', JSON.stringify({
        email: cleanEmail,
        membershipType: 'free',
        name,
        profilePhoto,
        sexo,
        edad,
        category,
      }));

      setUserData(profile);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error al guardar perfil:', error);
      Alert.alert('Error', 'No se pudo guardar el perfil. Intenta nuevamente.');
    } finally {
      setSaving(false);
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

        <TouchableOpacity onPress={() => setShowCategoryModal(true)} style={styles.button}>
          <Text style={styles.buttonText}>
            {category.length > 0 ? `${category.length} categorías seleccionadas` : 'Seleccionar categorías'}
          </Text>
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

        <View style={{ zIndex: zIndexSexo, width: '90%', marginBottom: 10 }}>
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

        <TouchableOpacity
          style={[
            styles.saveButton,
            saving && { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving && <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />}
          <Text style={styles.saveButtonText}>
            {saving ? 'Guardando perfil...' : 'Guardar Perfil'}
          </Text>
        </TouchableOpacity>

        {showCategoryModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar categoría..."
                placeholderTextColor="#aaa"
                value={searchCategory}
                onChangeText={setSearchCategory}
              />
              <ScrollView style={{ maxHeight: 300 }}>
                {filteredCategories.map((cat, index) => (
                  <TouchableOpacity key={index} onPress={() => toggleCategory(cat)}>
                    <Text style={[styles.modalItem, category.includes(cat) && styles.selectedCategory]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.modalButton} onPress={() => setShowCategoryModal(false)}>
                <Text style={styles.modalButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showSuccessModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>✅ Tu perfil ha sido actualizado con éxito.</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowSuccessModal(false);
                  goToProfileTab(navigation);
                }}
              >
                <Text style={styles.modalButtonText}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    borderWidth: 0.5,
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
    borderWidth: 0.5,
    marginBottom: 15,
  },
  placeholderText: {
    color: '#CCCCCC',
    textAlign: 'center',
    fontSize: 12,
  },
  input: {
    width: '90%',
    backgroundColor: '#1B1B1B',
    color: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 0.5,
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
    borderWidth: 0.5,
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
    borderWidth: 0.5,
    borderRadius: 10,
  },
  dropdownContainer: {
    backgroundColor: '#000',
    borderColor: '#D8A353',
    maxHeight: 300,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalContent: {
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 12,
    width: '90%',
  },
  searchInput: {
    backgroundColor: '#222',
    color: '#fff',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    borderColor: '#D8A353',
    borderWidth: 0.5,
  },
  modalItem: {
    color: '#ccc',
    paddingVertical: 10,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  selectedCategory: {
    color: '#D8A353',
    fontWeight: 'bold',
  },
  modalButton: {
    marginTop: 10,
    backgroundColor: '#D8A353',
    padding: 10,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#000',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalText: {
    color: '#D8A353',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
});