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
import BottomBar from '../components/BottomBar';
import DropDownPicker from 'react-native-dropdown-picker';
import { saveUserProfile } from '../utils/profileStorage';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function EditProfileFree({ navigation }) {
  const { setUserData } = useUser();

  const [name, setName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [bookPhotos, setBookPhotos] = useState([]);
  const [open, setOpen] = useState(false);
  const [zIndex, setZIndex] = useState(1000);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const storedProfile = await AsyncStorage.getItem('userProfileFree');
        if (storedProfile) {
          const profile = JSON.parse(storedProfile);
          setName(profile.name || '');
          setSelectedCategories((profile.category || '').split(', ').filter(Boolean));
          setEmail(profile.email || '');
          setDescription(profile.description || '');
          setProfilePhoto(profile.profilePhoto || null);
          setBookPhotos(profile.bookPhotos || []);
        }
      } catch (err) {
        console.log('Error al cargar perfil:', err);
      }
    };

    loadProfile();
  }, []);

  const categorias = [
    "Actor",
    "Actriz",
    "Ambientador",
    "Animador/Presentador",
    "Asistente de cámara",
    "Asistente de dirección",
    "Asistente de producción",
    "Asistente de vestuario",
    "Bailarín",
    "Caracterizador (FX maquillaje)",
    "Camarógrafo",
    "Colorista",
    "Community manager",
    "Continuista",
    "Coordinador de locaciones",
    "Creador de contenido digital",
    "Decorador de set",
    "Diseñador de arte",
    "Diseñador gráfico",
    "Doble de acción",
    "Dueño de locación",
    "Editor de video",
    "Escenógrafo",
    "Extra",
    "Fotógrafo de backstage",
    "Iluminador",
    "Ilustrador/Storyboarder",
    "Maquillista",
    "Microfonista",
    "Modelo",
    "Modelo publicitario",
    "Niño actor",
    "Operador de drone",
    "Otro/No especificado",
    "Peluquero/Estilista",
    "Perteneciente a una agencia de casting",
    "Postproductor",
    "Productor",
    "Propietario de auto clásico para escenas",
    "Propietario de auto personal para escenas",
    "Propietario de camión de arte",
    "Propietario de casa rodante",
    "Propietario de grúa para filmación",
    "Propietario de moto o bicicleta para escenas",
    "Propietario de estudio fotográfico",
    "Propietario de van de producción",
    "Proveedor de coffee break/snacks",
    "Proveedor de servicios de catering",
    "Proveedor de transporte de producción",
    "Proveedor de transporte de talentos",
    "Sonidista",
    "Stage manager",
    "Técnico de efectos especiales",
    "Técnico de grúa",
    "Vestuarista"
  ];

  const categoryItems = categorias.map(cat => ({ label: cat, value: cat }));

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
      const uris = result.assets.map(a => a.uri);
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
    if (selectedCategories.length === 0) {
      Alert.alert('Campo requerido', 'Debes seleccionar al menos una categoría.');
      return;
    }

    const profile = {
      name,
      category: selectedCategories.join(', '),
      email,
      description,
      profilePhoto,
      bookPhotos,
    };

    const success = await saveUserProfile(profile, 'free', setUserData);

    if (success) {
      Alert.alert('Perfil guardado', 'Tu perfil ha sido actualizado.');
      navigation.navigate('Profile');
    } else {
      Alert.alert('Error al guardar', 'Ocurrió un error al guardar tu perfil.');
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            open ? { paddingBottom: 1900 } : { paddingBottom: 950 },
          ]}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
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
            placeholder="Nombre completo"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#aaa"
          />

          <View style={[styles.dropdownWrapper, { zIndex }]}>
            <DropDownPicker
              multiple={true}
              min={0}
              max={5}
              open={open}
              value={selectedCategories}
              items={categoryItems}
              setOpen={(val) => {
                setOpen(val);
                setZIndex(val ? 2000 : 1000);
              }}
              setValue={setSelectedCategories}
              placeholder="Selecciona tu(s) categoría(s)"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              textStyle={{ color: '#D8A353', fontSize: 13 }}
              labelStyle={{ color: '#D8A353' }}
              placeholderStyle={{ color: '#888' }}
              itemStyle={{ paddingVertical: 6 }}
              arrowIconStyle={{ tintColor: '#D8A353' }}
              listMode="SCROLLVIEW"
              dropDownDirection="AUTO"
            />
          </View>

          {selectedCategories.length > 0 && (
            <View style={styles.selectedContainer}>
              {selectedCategories.map((cat, index) => (
                <View key={index} style={styles.selectedChip}>
                  <Text style={styles.selectedChipText}>{cat}</Text>
                </View>
              ))}
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            placeholderTextColor="#aaa"
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Descripción breve"
            value={description}
            onChangeText={setDescription}
            placeholderTextColor="#aaa"
            multiline
            numberOfLines={4}
          />

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

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Guardar Perfil</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  container: {
    alignItems: 'center',
    paddingTop: 40,
    zIndex: 0,
  },
  input: {
    width: '80%',
    backgroundColor: '#1B1B1B',
    color: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderColor: '#D8A353',
    borderWidth: 1,
  },
  textArea: { height: 100 },
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
  placeholderText: { color: '#CCCCCC', fontSize: 12, textAlign: 'center' },
  label: {
    color: '#D8A353',
    marginBottom: 5,
    fontSize: 14,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginLeft: 40,
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
  buttonText: { color: '#000', fontWeight: 'bold' },
  saveButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  saveButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dropdownWrapper: {
    width: '80%',
    marginBottom: 10,
    alignSelf: 'center',
  },
  dropdown: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
  },
  dropdownContainer: {
    backgroundColor: '#000',
    borderColor: '#D8A353',
    maxHeight: SCREEN_HEIGHT * 150,
  },
  selectedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  selectedChip: {
    backgroundColor: '#D8A353',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    margin: 5,
  },
  selectedChipText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
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
  
});
