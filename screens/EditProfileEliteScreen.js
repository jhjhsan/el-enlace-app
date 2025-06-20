import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { useUser } from '../contexts/UserContext';
import BackButton from '../components/BackButton';
import { Video } from 'expo-av';
import { uploadMediaToStorage } from '../src/firebase/helpers/uploadMediaToStorage';  
import { goToProfileTab } from '../utils/navigationHelpers';

const regionCityMap = {
  'arica_parinacota': [ { label: 'Arica', value: 'arica' }, { label: 'Putre', value: 'putre' } ],
  'tarapaca': [ { label: 'Iquique', value: 'iquique' }, { label: 'Alto Hospicio', value: 'alto_hospicio' } ],
  'antofagasta': [ { label: 'Antofagasta', value: 'antofagasta' }, { label: 'Calama', value: 'calama' } ],
  'atacama': [ { label: 'Copiapó', value: 'copiapo' }, { label: 'Vallenar', value: 'vallenar' } ],
  'coquimbo': [ { label: 'La Serena', value: 'la_serena' }, { label: 'Coquimbo', value: 'coquimbo' } ],
  'valparaiso': [ { label: 'Valparaíso', value: 'valparaiso_ciudad' }, { label: 'Viña del Mar', value: 'vina' } ],
  'metropolitana': [ { label: 'Santiago', value: 'santiago' }, { label: 'Maipú', value: 'maipu' }, { label: 'Puente Alto', value: 'puente_alto' } ],
  'ohiggins': [ { label: 'Rancagua', value: 'rancagua' }, { label: 'San Fernando', value: 'san_fernando' } ],
  'maule': [ { label: 'Talca', value: 'talca' }, { label: 'Curicó', value: 'curico' } ],
  'nuble': [ { label: 'Chillán', value: 'chillan' } ],
  'biobio': [ { label: 'Concepción', value: 'concepcion' }, { label: 'Los Ángeles', value: 'los_angeles' } ],
  'araucania': [ { label: 'Temuco', value: 'temuco' }, { label: 'Villarrica', value: 'villarrica' } ],
  'los_rios': [ { label: 'Valdivia', value: 'valdivia' } ],
  'los_lagos': [ { label: 'Puerto Montt', value: 'puerto_montt' }, { label: 'Osorno', value: 'osorno' } ],
  'aysen': [ { label: 'Coyhaique', value: 'coyhaique' } ],
  'magallanes': [ { label: 'Punta Arenas', value: 'punta_arenas' } ],
};

const regionItems = Object.entries(regionCityMap).map(([key, _]) => ({
  label: key.replace(/_/g, ' ').toUpperCase(),
  value: key,
}));

export default function EditProfileEliteScreen({ navigation }) {
  const { setUserData } = useUser();
  const [agencyName, setAgencyName] = useState('');
  const [representative, setRepresentative] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState(null);
  const [city, setCity] = useState(null);
  const [cityItems, setCityItems] = useState([]);
  const [address, setAddress] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [eliteCategory, setEliteCategory] = useState('');
  const [description, setDescription] = useState('');
  const [logos, setLogos] = useState([]);
  const [webLink, setWebLink] = useState('');
  const [instagram, setInstagram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [profileVideo, setProfileVideo] = useState(null);


  useEffect(() => {
    const loadData = async () => {
      const json = await AsyncStorage.getItem('userProfileElite');
      if (json) {
        const data = JSON.parse(json);
        setAgencyName(data.agencyName || '');
        setRepresentative(data.representative || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setRegion(data.region || null);
        setCity(data.city || null);
        setAddress(data.address || '');
        setCompanyType(data.companyType || '');
        setEliteCategory(data.eliteCategory || '');
        setDescription(data.description || '');
        setLogos(data.logos || []);
        setWebLink(data.webLink || '');
        setInstagram(data.instagram || '');
        setWhatsapp(data.whatsapp || '');
        setProfilePhoto(data.profilePhoto || null);
        setProfileVideo(data.profileVideo || null);
        if (data.region) setCityItems(regionCityMap[data.region] || []);
      }
    };
    loadData();
  }, []);

const pickProfilePhoto = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });

  if (!result.canceled) {
    const uri = result.assets[0].uri;
    const downloadUrl = await uploadMediaToStorage(uri, `profile_photos/${Date.now()}_profile.jpg`);
    if (downloadUrl) setProfilePhoto(downloadUrl);
  }
};

const pickLogo = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 1,
    aspect: [1, 1],
  });

  if (!result.canceled) {
    const uri = result.assets[0].uri;
    const downloadUrl = await uploadMediaToStorage(uri, `logos/${Date.now()}_logo.jpg`);
    if (downloadUrl) {
      setLogos((prev) => [...prev, downloadUrl].slice(0, 5));
    }
  }
};

const pickVideo = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    allowsEditing: false,
    quality: 1,
  });

  if (!result.canceled) {
    const uri = result.assets[0].uri;
    const downloadUrl = await uploadMediaToStorage(uri, `videos/${Date.now()}_institutional.mp4`);
    if (downloadUrl) setProfileVideo(downloadUrl);
  }
};

  const removeLogo = (uri) => {
    setLogos((prev) => prev.filter((logo) => logo !== uri));
  };

  const isFormValid = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?56[2-9]\d{8}$/;
    return (
      agencyName &&
      representative &&
      emailRegex.test(email) &&
      phoneRegex.test(phone) &&
      region &&
      city &&
      address &&
      companyType &&
      eliteCategory.trim() &&
      description &&
      logos.length > 0 &&
      instagram.startsWith('@')
    );
  };

  const saveProfile = async () => {
    if (!isFormValid()) {
      setModalVisible(true);
      return;
    }

    const profileData = {
      membershipType: 'elite',
      agencyName,
      representative,
      email,
      phone,
      region,
      city,
      address,
      companyType,
      eliteCategory,
      description,
      logos,
      webLink,
      instagram,
      whatsapp,
      profilePhoto,
      profileVideo,
      updatedAt: new Date().toISOString(),
    };
  
    try {
      await AsyncStorage.setItem('userProfileElite', JSON.stringify(profileData));
      await AsyncStorage.setItem('eliteProfileCompleted', 'true'); // ✅ NUEVA LÍNEA
      setUserData(profileData);
      setModalVisible(true);
    } catch (error) {
      console.log('Error al guardar perfil:', error);
    }
  };
  
  return (
    <>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: 45, paddingBottom: 80 }}>
  <TouchableOpacity
  onPress={() => navigation.goBack()}
  style={{
    position: 'absolute',
    top: 15,
    left: -20, 
    zIndex: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 5,
    borderRadius: 20,
  }}
>
  <BackButton />
</TouchableOpacity>
      <Text style={styles.header}>✏️ Editar perfil de agencia</Text>

      <TouchableOpacity onPress={pickProfilePhoto} style={styles.profileImagePicker}>
        <Image
          source={{ uri: profilePhoto || 'https://via.placeholder.com/100' }}
          style={styles.profileImage}
        />
        <Text style={styles.imagePickerText}>Tocar para cambiar foto de perfil</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Nombre de la agencia *</Text>
      <TextInput style={styles.input} value={agencyName} onChangeText={setAgencyName} />

      <Text style={styles.label}>Representante legal *</Text>
      <TextInput style={styles.input} value={representative} onChangeText={setRepresentative} />

      <Text style={styles.label}>Correo electrónico *</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />

      <Text style={styles.label}>Teléfono *</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

      <Text style={styles.label}>Instagram (@usuario) *</Text>
      <TextInput style={styles.input} value={instagram} onChangeText={setInstagram} />

      <Text style={styles.label}>WhatsApp (opcional)</Text>
<TextInput
  style={styles.input}
  value={whatsapp}
  onChangeText={setWhatsapp}
  keyboardType="phone-pad"
  placeholder="+56912345678"
  placeholderTextColor="#777"
/>


      <Text style={styles.label}>Región *</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={region}
          onValueChange={(value) => {
            setRegion(value);
            setCity(null);
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

      <Text style={styles.label}>Dirección *</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} />

      <Text style={styles.label}>Categoría de la empresa *</Text>

<View style={styles.pickerWrapper}>
  <Picker
    selectedValue={eliteCategory}
    onValueChange={(value) => setEliteCategory(value)}
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

      <Text style={styles.label}>Descripción *</Text>
      <TextInput style={[styles.input, styles.multilineInput]} value={description} onChangeText={setDescription} multiline numberOfLines={4} />

<Text style={styles.label}>Web o Instagram (opcional)</Text>
<TextInput style={styles.input} value={webLink} onChangeText={setWebLink} />

<Text style={styles.label}>Logos (máx. 5) *</Text>
<TouchableOpacity style={styles.imagePicker} onPress={pickLogo}>
  <Text style={styles.imagePickerText}>Subir imagen</Text>
</TouchableOpacity>

<ScrollView horizontal style={styles.logoRow}>
  {logos.map((uri, i) => (
    <View key={i} style={styles.logoWrapper}>
      <Image source={{ uri }} style={styles.logo} />
      <TouchableOpacity style={styles.removeButton} onPress={() => removeLogo(uri)}>
        <Text style={styles.removeText}>✖</Text>
      </TouchableOpacity>
    </View>
  ))}
</ScrollView>

<Text style={styles.label}>Video institucional (opcional)</Text>
{profileVideo ? (
  <View style={styles.videoPreviewContainer}>
    <Video
      source={{ uri: profileVideo }}
      useNativeControls
      resizeMode="contain"
      style={styles.videoPreview}
    />
    <TouchableOpacity
      style={styles.removeButton}
      onPress={() => setProfileVideo(null)}
    >
      <Text style={styles.removeText}>✖</Text>
    </TouchableOpacity>
  </View>
) : (
  <TouchableOpacity style={styles.imagePicker} onPress={pickVideo}>
    <Text style={styles.imagePickerText}>Subir video</Text>
  </TouchableOpacity>
)}

<TouchableOpacity
  style={[styles.button, !isFormValid() && { backgroundColor: '#D8A353', opacity: 0.5 }]}
  disabled={!isFormValid()}
  onPress={saveProfile}
>
  <Text style={styles.buttonText}>Actualizar perfil</Text>
</TouchableOpacity>

<Modal visible={modalVisible} transparent animationType="fade">
  <View style={styles.modalOverlay}>
    <View style={styles.modalBox}>
      <Text style={styles.modalText}>✅ Perfil actualizado correctamente</Text>
      <TouchableOpacity
        style={styles.modalButton}
      onPress={() => {
  setModalVisible(false);
  goToProfileTab(navigation);
}}
      >
        <Text style={styles.modalButtonText}>Volver</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20 },
  header: { color: '#D8A353', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  label: { color: '#CCCCCC', marginTop: 15 },
  input: { backgroundColor: '#1A1A1A', borderRadius: 10, padding: 10, color: '#FFFFFF' },
  multilineInput: { height: 100, textAlignVertical: 'top' },
  pickerWrapper: { backgroundColor: '#1A1A1A', borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#444' },
  picker: { color: '#FFFFFF', height: 50 },
  imagePicker: { backgroundColor: '#1A1A1A', borderRadius: 10, padding: 15, alignItems: 'center', marginVertical: 10 },
  imagePickerText: { color: '#CCCCCC', textAlign: 'center', marginTop: 5 },
  profileImagePicker: { alignItems: 'center', marginVertical: 0, marginTop: -10 },
  profileImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#D8A353' },
  logoRow: { marginVertical: 10, maxHeight: 120 },
  logoWrapper: { position: 'relative', marginRight: 10 },
  logo: { width: 100, height: 100, borderRadius: 10 },
  removeButton: { position: 'absolute', top: 0, right: 0, backgroundColor: 'rgba(255, 0, 0, 0.7)', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  removeText: { color: '#FFF', fontSize: 12 },
  button: { backgroundColor: '#D8A353', padding: 15, borderRadius: 10, alignItems: 'center', marginVertical: 20 },
  buttonText: { color: '#000', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#1A1A1A', padding: 20, borderRadius: 10, alignItems: 'center', width: '80%' },
  modalText: { color: '#fff', fontSize: 16, marginBottom: 15 },
  modalButton: { backgroundColor: '#D8A353', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  modalButtonText: { color: '#000', fontWeight: 'bold' },
  videoPreviewContainer: {
  marginTop: 10,
  backgroundColor: '#1B1B1B',
  borderRadius: 10,
  padding: 10,
  alignItems: 'center',
},
videoPreview: {
  width: 300,
  height: 180,
  borderRadius: 10,
  backgroundColor: '#000',
},
});