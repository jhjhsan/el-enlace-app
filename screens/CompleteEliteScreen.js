import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  Platform,
  Alert, // ✅ AÑADIDO AQUÍ
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { saveUserProfile } from '../utils/profileStorage';
import { Video } from 'expo-av';
import { CommonActions } from '@react-navigation/native';
import { uploadMediaToStorage } from '../src/firebase/helpers/uploadMediaToStorage';
import { goToDashboardTab } from '../utils/navigationHelpers';

const regionCityMap = {
  'arica_parinacota': [
    { label: 'Arica', value: 'arica' },
    { label: 'Putre', value: 'putre' },
  ],
  'tarapaca': [
    { label: 'Iquique', value: 'iquique' },
    { label: 'Alto Hospicio', value: 'alto_hospicio' },
  ],
  'antofagasta': [
    { label: 'Antofagasta', value: 'antofagasta' },
    { label: 'Calama', value: 'calama' },
  ],
  'atacama': [
    { label: 'Copiapó', value: 'copiapo' },
    { label: 'Vallenar', value: 'vallenar' },
  ],
  'coquimbo': [
    { label: 'La Serena', value: 'la_serena' },
    { label: 'Coquimbo', value: 'coquimbo' },
  ],
  'valparaiso': [
    { label: 'Valparaíso', value: 'valparaiso_ciudad' },
    { label: 'Viña del Mar', value: 'vina' },
  ],
  'metropolitana': [
    { label: 'Santiago', value: 'santiago' },
    { label: 'Maipú', value: 'maipu' },
    { label: 'Puente Alto', value: 'puente_alto' },
  ],
  'ohiggins': [
    { label: 'Rancagua', value: 'rancagua' },
    { label: 'San Fernando', value: 'san_fernando' },
  ],
  'maule': [
    { label: 'Talca', value: 'talca' },
    { label: 'Curicó', value: 'curico' },
  ],
  'nuble': [
    { label: 'Chillán', value: 'chillan' },
  ],
  'biobio': [
    { label: 'Concepción', value: 'concepcion' },
    { label: 'Los Ángeles', value: 'los_angeles' },
  ],
  'araucania': [
    { label: 'Temuco', value: 'temuco' },
    { label: 'Villarrica', value: 'villarrica' },
  ],
  'los_rios': [
    { label: 'Valdivia', value: 'valdivia' },
  ],
  'los_lagos': [
    { label: 'Puerto Montt', value: 'puerto_montt' },
    { label: 'Osorno', value: 'osorno' },
  ],
  'aysen': [
    { label: 'Coyhaique', value: 'coyhaique' },
  ],
  'magallanes': [
    { label: 'Punta Arenas', value: 'punta_arenas' },
  ],
};

export default function CompleteEliteScreen() {
const { userData, setUserData, setIsLoggedIn } = useUser();
  const navigation = useNavigation();

  const [isEditing, setIsEditing] = useState(false);
  const [agencyName, setAgencyName] = useState('');
  const [representative, setRepresentative] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [descripcionError, setDescripcionError] = useState('');
  const [region, setRegion] = useState(null);
  const [descripcion, setDescripcion] = useState('');

  const regionNameMap = {
    arica_parinacota: 'Arica y Parinacota',
    tarapaca: 'Tarapacá',
    antofagasta: 'Antofagasta',
    atacama: 'Atacama',
    coquimbo: 'Coquimbo',
    valparaiso: 'Valparaíso',
    metropolitana: 'Región Metropolitana',
    ohiggins: 'O’Higgins',
    maule: 'Maule',
    nuble: 'Ñuble',
    biobio: 'Biobío',
    araucania: 'La Araucanía',
    los_rios: 'Los Ríos',
    los_lagos: 'Los Lagos',
    aysen: 'Aysén',
    magallanes: 'Magallanes',
  };
  
  const [regionItems] = useState(
    Object.keys(regionCityMap).map(key => ({
      label: regionNameMap[key],
      value: key,
    }))
  );  
  const [city, setCity] = useState(null);
  const [cityItems, setCityItems] = useState([]);
  const [address, setAddress] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [description, setDescription] = useState('');
  const [logos, setLogos] = useState([]);
  const [webLink, setWebLink] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null); // Nuevo estado para foto de perfil
  const [profileVideo, setProfileVideo] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  
  useEffect(() => {
    const loadProfile = async () => {
      if (userData?.membershipType !== 'elite') {
        setErrorMessage('Solo usuarios Elite pueden completar este perfil.');
        setErrorModalVisible(true);
        navigation.goBack();
        return;
      }
  
      // Si es un nuevo Elite (hasPaid: false), no cargamos datos antiguos
      if (!userData?.hasPaid) {
        // Nuevo usuario Elite, deja el formulario limpio
        await AsyncStorage.removeItem('userProfile');
        return;
      }
  
      // Si ha pagado y ya completó perfil, podemos permitir edición
      const savedProfile = await AsyncStorage.getItem('userProfileElite');
      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        setIsEditing(true);
        setAgencyName(profile.agencyName || '');
        setRepresentative(profile.representative || '');
        setEmail(profile.email || '');
        setPhone(profile.phone || '');
        setInstagram(profile.instagram || '');
        setWhatsapp(profile.whatsapp || '');
        setRegion(profile.region || null);
        setCity(profile.city || null);
        setAddress(profile.address || '');
        setCompanyType(profile.companyType || '');
        setDescription(profile.description || '');
        setLogos(profile.logos || []);
        setWebLink(profile.webLink || '');
        setProfilePhoto(profile.profilePhoto || null);
        if (profile.region) setCityItems(regionCityMap[profile.region] || []);
      }
    };
    loadProfile();
  }, [userData]);  

{descripcionError ? (
  <Text style={{ color: 'red', marginBottom: 10 }}>{descripcionError}</Text>
) : null}

const pickLogo = async () => {
  if (logos.length >= 5) {
    alert('Solo puedes subir hasta 5 imágenes representativas.');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    quality: 1,
    selectionLimit: 5 - logos.length,
  });

  if (!result.canceled) {
    const newUris = result.assets.map(asset => asset.uri);
    const combined = [...logos, ...newUris].slice(0, 5); // máximo 5
    setLogos(combined);
  }
};

  const pickProfilePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      aspect: [1, 1],
    });
    if (!result.canceled) {
      setProfilePhoto(result.assets[0].uri);
    }
  };
  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });
  
    if (!result.canceled) {
      setProfileVideo(result.assets[0].uri);
    }
  };
  
  const removeLogo = (uri) => {
    setLogos((prev) => prev.filter((logo) => logo !== uri));
  };

  const isFormValid = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?56[2-9]\d{8}$/;
    const instagramValid = instagram.startsWith('@') && instagram.length > 1;

    return (
        agencyName.trim() &&
        representative.trim() &&
        emailRegex.test(email) &&
        phoneRegex.test(phone) &&
        region &&
        city &&
        address.trim() &&
        companyType.trim() &&
        description.trim() &&
        logos.length > 0 &&
        instagramValid
      );      
  };

const saveProfile = async () => {
if (!isFormValid()) {
  setErrorMessage('Por favor, completa todos los campos obligatorios correctamente.');
  setErrorModalVisible(true);
  return;
}

  try {
    const webLinkFormatted =
      webLink.trim() !== ''
        ? webLink.startsWith('http')
          ? webLink.trim()
          : `https://${webLink.trim()}`
        : '';

   // ⬇️ OMITIMOS subida a Firebase mientras usamos Expo Go
const uploadedProfilePhoto = profilePhoto || null;
const uploadedLogos = logos || [];
const uploadedVideo = profileVideo || null;

console.log('FOTO local:', uploadedProfilePhoto);
console.log('VIDEO local:', uploadedVideo);
console.log('LOGOS locales:', uploadedLogos);
if (!description || description.trim().length < 30) {
  setDescripcionError('La descripción debe tener al menos 30 caracteres.');
  Alert.alert(
    'Descripción muy breve',
    'Agrega una descripción más detallada (mínimo 30 caracteres).'
  );
  return;
} else {
  setDescripcionError('');
}

    // ⬇️ AHORA SÍ: Crea el objeto final con las URLs subidas
   const profileData = {
  membershipType: 'elite',
  ...userData,
      accountType: 'agency',
      hasPaid: false,
      agencyName,
      representative,
      email,
      phone,
      instagram,
      whatsapp,
      region,
      city,
      address,
      companyType,
      category: [companyType],
      description,
      logos: uploadedLogos,
      webLink: webLinkFormatted,
      profilePhoto: uploadedProfilePhoto,
      profileVideo: uploadedVideo,
      updatedAt: new Date().toISOString(),
      timestamp: Date.now(),
      visibleInExplorer: true,
    };

    console.log('👀 Datos a guardar:', profileData);
    await saveUserProfile(profileData, 'elite', setUserData, setIsLoggedIn, true);
    await AsyncStorage.setItem('eliteProfileCompleted', 'true');
    setModalVisible(true);
  } catch (error) {
    console.error('❌ Error en saveProfile:', error);
    setErrorMessage('Fallo al guardar el perfil. Intenta de nuevo.');
    setErrorModalVisible(true);
  }
};

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 80 }}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.header}>👑 Completar perfil de agencia</Text>
      <Text style={styles.subHeader}>Completa tu perfil para empezar a gestionar castings</Text>

      <Text style={styles.label}>Nombre de la empresa o servicio *</Text>
<TextInput style={styles.input} value={agencyName} onChangeText={setAgencyName} />

      <Text style={styles.label}>Foto de perfil *</Text>
<TouchableOpacity style={styles.photoCircle} onPress={pickProfilePhoto}>
  {profilePhoto ? (
    <Image source={{ uri: profilePhoto }} style={styles.profilePhotoPreview} />
  ) : (
    <View style={styles.cameraIconWrapper}>
      <Ionicons name="camera" size={24} color="#D8A353" />
    </View>
  )}
</TouchableOpacity>
<Text style={styles.photoHint}>Toca el círculo para subir una imagen</Text>

      <Text style={styles.label}>Nombre del representante legal *</Text>
      <TextInput style={styles.input} value={representative} onChangeText={setRepresentative} />

      <Text style={styles.label}>Correo electrónico *</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />

      <Text style={styles.label}>Teléfono (ej. +56912345678) *</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Text style={styles.label}>Instagram *</Text>
<TextInput
  style={styles.input}
  value={instagram}
  onChangeText={setInstagram}
  placeholder="@ejemplo"
  placeholderTextColor="#777"
  autoCapitalize="none"
/>
<Text style={styles.label}>WhatsApp (opcional)</Text>
<TextInput
  style={styles.input}
  value={whatsapp}
  onChangeText={setWhatsapp}
  placeholder="Ej: +56912345678"
  keyboardType="phone-pad"
  autoCapitalize="none"
/>

      <Text style={styles.label}>Región *</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={region}
          onValueChange={(value) => {
            setRegion(value);
            setCity('');
            setCityItems(regionCityMap[value] || []);
          }}
          style={styles.picker}
          dropdownIconColor="#fff"
        >
          <Picker.Item label="Selecciona una región" value={null} />
          {regionItems.map((item) => (
            <Picker.Item key={item.value} label={item.label} value={item.value} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Ciudad *</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={city}
          onValueChange={(value) => setCity(value)}
          enabled={region !== null}
          style={styles.picker}
          dropdownIconColor="#fff"
        >
          <Picker.Item label="Selecciona una ciudad" value={null} />
          {cityItems.map((item) => (
            <Picker.Item key={item.value} label={item.label} value={item.value} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Dirección completa *</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        placeholder="Ej: Av. Siempre Viva 123, Santiago"
      />

<Text style={styles.label}>Tipo de empresa *</Text>
<View style={styles.pickerWrapper}>
  <Picker
    selectedValue={companyType}
    onValueChange={(value) => setCompanyType(value)}
    style={styles.picker}
    dropdownIconColor="#fff"
  >
    <Picker.Item label="Selecciona una categoría" value="" />
    <Picker.Item label="Agencia de casting" value="Agencia de casting" />
    <Picker.Item label="Agencia de modelos" value="Agencia de modelos" />
    <Picker.Item label="Agencia de talentos" value="Agencia de talentos" />
    <Picker.Item label="Agencia de publicidad" value="Agencia de publicidad" />
    <Picker.Item label="Agencia de eventos" value="Agencia de eventos" />
    <Picker.Item label="Productora audiovisual" value="Productora audiovisual" />
    <Picker.Item label="Productora cinematográfica" value="Productora cinematográfica" />
    <Picker.Item label="Productora de televisión" value="Productora de televisión" />
    <Picker.Item label="Productora de contenido digital" value="Productora de contenido digital" />
    <Picker.Item label="Productora de comerciales" value="Productora de comerciales" />
    <Picker.Item label="Coordinadora de producción" value="Coordinadora de producción" />
    <Picker.Item label="Empresa de producción técnica" value="Empresa de producción técnica" />
    <Picker.Item label="Casa productora de videoclips" value="Casa productora de videoclips" />
    <Picker.Item label="Estudio de producción fotográfica" value="Estudio de producción fotográfica" />
    <Picker.Item label="Estudio de grabación" value="Estudio de grabación" />
    <Picker.Item label="Estudio de doblaje" value="Estudio de doblaje" />
    <Picker.Item label="Casa de postproducción" value="Casa de postproducción" />
    <Picker.Item label="Plataforma de casting o booking" value="Plataforma de casting o booking" />
    <Picker.Item label="Empresa de alquiler de equipos" value="Empresa de alquiler de equipos" />
    <Picker.Item label="Empresa de transporte de producción" value="Empresa de transporte de producción" />
    <Picker.Item label="Empresa de catering para rodajes" value="Empresa de catering para rodajes" />
    <Picker.Item label="Proveedor de casas rodantes" value="Proveedor de casas rodantes" />
    <Picker.Item label="Proveedor de coffee break / snacks" value="Proveedor de coffee break / snacks" />
    <Picker.Item label="Proveedor de autos o vans para filmación" value="Proveedor de autos o vans para filmación" />
    <Picker.Item label="Agencia de contenido digital" value="Agencia de contenido digital" />
    <Picker.Item label="Plataforma de medios / streaming" value="Plataforma de medios / streaming" />
    <Picker.Item label="Otros / Empresa no especificada" value="Otros / Empresa no especificada" />
  </Picker>
</View>

      <Text style={styles.label}>Descripción corta *</Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        placeholder="Ej: Somos una agencia con 10 años de experiencia en casting publicitario y audiovisual"
        placeholderTextColor="#777"
      />

      <Text style={styles.label}>Logos o imágenes representativas (máx. 5) *</Text>
      <TouchableOpacity style={styles.imagePicker} onPress={pickLogo}>
        <Text style={styles.imagePickerText}>Subir imagen</Text>
      </TouchableOpacity>
      <View style={styles.logoScrollWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ justifyContent: 'center', flexGrow: 1 }}>
  <View style={styles.logoRow}>
    {logos.map((uri, index) => (
              <View key={index} style={styles.logoWrapper}>
                <Image source={{ uri }} style={styles.logo} />
                <TouchableOpacity onPress={() => removeLogo(uri)} style={styles.removeButton}>
                  <Text style={styles.removeText}>✖</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          {logos.length === 0 && (
  <Text style={styles.noImagesText}>
    Sube hasta 3 imágenes representativas de tu agencia.
  </Text>
)}

        </ScrollView>
        {errorModalVisible && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalText}>❌ {errorMessage}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setErrorModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      <Text style={styles.label}>Video institucional (opcional)</Text>

{profileVideo ? (
  <View style={styles.videoPreviewContainer}>
    <Video
      source={{ uri: profileVideo }}
      useNativeControls
      resizeMode="cover"
      style={styles.videoPreview}
      onError={(e) => {
        console.log('❌ Error al cargar el video:', e);
        alert('No se pudo cargar el video. Intenta seleccionar otro archivo.');
      }}
    />
    <TouchableOpacity
      style={styles.deleteVideoButton}
      onPress={() => setProfileVideo(null)}
    >
      <Text style={styles.deleteVideoText}>🗑️ Eliminar Video</Text>
    </TouchableOpacity>
  </View>
) : (
  <TouchableOpacity style={styles.imagePicker} onPress={pickVideo}>
    <Text style={styles.imagePickerText}>Subir video</Text>
  </TouchableOpacity>
)}


      <Text style={styles.label}>Enlace web o Instagram (opcional)</Text>
      <TextInput style={styles.input} value={webLink} onChangeText={setWebLink} />

     <TouchableOpacity
  style={styles.button}
  onPress={saveProfile}
>
  <Text style={styles.buttonText}>Guardar perfil</Text>
</TouchableOpacity>

      <View style={{ flex: 1 }}>
        {/* Modal de éxito */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalText}>✅ Perfil guardado correctamente</Text>
<TouchableOpacity
  style={styles.modalButton}
  onPress={() => {
    setModalVisible(false);
    setTimeout(() => {
     goToDashboardTab(navigation);

    }, 300); // Espera breve para evitar conflictos con montado de contextos
  }}
>

  <Text style={styles.modalButtonText}>Ir al Dashboard Elite</Text>
</TouchableOpacity>

            </View>
          </View>
        </Modal>

        {/* Modal de error */}
        <Modal visible={errorModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalText}>❌ {errorMessage}</Text>
              <TouchableOpacity style={styles.modalButton} onPress={() => setErrorModalVisible(false)}>
                <Text style={styles.modalButtonText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 20,
    marginTop:30,
  },
  header: {
    color: '#D8A353',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subHeader: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    color: '#CCCCCC',
    marginVertical: 10,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    color: '#FFFFFF',
    marginBottom: 5,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  dropdown: {
    backgroundColor: '#1A1A1A',
    borderColor: '#444',
    marginVertical: 5,
  },
  dropdownContainer: {
    backgroundColor: '#1A1A1A',
    borderColor: '#444',
  },
  imagePicker: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginVertical: 10,
  },
  imagePickerText: {
    color: '#CCCCCC',
  },
  logoContainer: {
    marginVertical: 10,
    maxHeight: 120,
  },
  logoWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  removeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: '#FFF',
    fontSize: 12,
  },
  button: {
    backgroundColor: '#D8A353',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 20,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  logoScrollWrapper: {
    marginVertical: 10,
    maxHeight: 120,
  },
  logoRow: {
    justifyContent: 'center',
flexWrap: 'wrap',
marginHorizontal: 'auto',

  },  
  pickerWrapper: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    marginBottom: 10,
  },
  picker: {
    color: '#FFFFFF',
  },
  profilePhotoPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#D8A353',
    marginVertical: 10,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalBox: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '80%',
  },
  modalText: {
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  photoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1A1A1A',
    borderColor: '#D8A353',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  profilePhotoPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraIconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoHint: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 15,
  },
  videoPreviewContainer: {
  width: '100%',
  alignItems: 'center',
  marginVertical: 10,
  backgroundColor: '#1B1B1B',
  borderWidth: 1,
  borderColor: '#D8A353',
  borderRadius: 10,
  padding: 10,
},
videoPreview: {
  width: '100%',
  height: 180,
  borderRadius: 8,
},
deleteVideoButton: {
  marginTop: 10,
  backgroundColor: '#000',
  borderWidth: 1,
  borderColor: '#D8A353',
  borderRadius: 5,
  paddingVertical: 5,
  paddingHorizontal: 10,
},
deleteVideoText: {
  color: '#D8A353',
  fontSize: 14,
  textAlign: 'center',
},

  noImagesText: {
  color: '#888',
  fontSize: 13,
  fontStyle: 'italic',
  textAlign: 'center',
  marginBottom: 10,
},
});