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
  Alert,
  ActivityIndicator,
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
import * as FileSystem from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { goToDashboardTab } from '../utils/navigationHelpers';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../src/firebase/firebaseConfig';
import { rebuildAllProfiles } from '../src/firebase/helpers/rebuildAllProfiles';
import { getAuth, sendEmailVerification } from 'firebase/auth';

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
  const [isSaving, setIsSaving] = useState(false);
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

  const [city, setCity] = useState(null);
  const [cityItems, setCityItems] = useState([]);
  const [address, setAddress] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [description, setDescription] = useState('');
  const [logos, setLogos] = useState([]);
  const [webLink, setWebLink] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profileVideos, setProfileVideos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasOffensiveContent, setHasOffensiveContent] = useState(false);

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

  useEffect(() => {
    const loadProfile = async () => {
      if (userData?.membershipType !== 'elite') {
        setErrorMessage('Solo usuarios Elite pueden completar este perfil.');
        setErrorModalVisible(true);
        navigation.goBack();
        return;
      }

      if (!userData?.hasPaid) {
        await AsyncStorage.removeItem('userProfileElite');
        return;
      }

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
        setProfileVideos(profile.profileVideos || []);
        if (profile.region) setCityItems(regionCityMap[profile.region] || []);
      }
    };
    loadProfile();
  }, [userData]);

  const validateImageWithIA = async (base64) => {
    try {
      const validateMedia = httpsCallable(functions, 'validateMediaContent');
      const result = await validateMedia({ base64Image: base64 });

      if (result.data?.flagged) {
        const categories = Object.keys(result.data.categories)
          .filter((key) => result.data.categories[key])
          .join(', ');
        Alert.alert(
          'Contenido no permitido',
          `La imagen contiene contenido inapropiado (${categories}). Por favor, selecciona otra.`
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('⚠️ Error al validar imagen con IA:', error);
      Alert.alert('Error', 'No se pudo validar la imagen con IA.');
      return false;
    }
  };

  const validateVideoWithIA = async (uri) => {
    try {
      const thumbnail = await VideoThumbnails.getThumbnailAsync(uri, { time: 1000 });
      const base64 = await FileSystem.readAsStringAsync(thumbnail.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const validate = httpsCallable(functions, 'validateMediaContent');
      const result = await validate({ base64Image: base64 });

      if (__DEV__) {
        console.log('📼 Resultado IA video:', result.data);
      }

      if (result.data?.flagged) {
        const categories = Object.keys(result.data.categories)
          .filter((key) => result.data.categories[key])
          .join(', ');
        Alert.alert(
          'Contenido no permitido',
          `El video contiene contenido inapropiado (${categories}). Por favor, selecciona otro.`
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('❌ Error en validación IA video:', error);
      Alert.alert('Error', 'No se pudo validar el video con IA.');
      return false;
    }
  };

  const pickProfilePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Debes permitir acceso a la galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      base64: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets.length > 0) {
      const base64 = result.assets[0].base64;
      const isValid = await validateImageWithIA(base64);

      if (isValid) {
        setProfilePhoto(result.assets[0].uri);
      } else {
        setHasOffensiveContent(true);
      }
    }
  };

  const pickLogo = async () => {
    if (logos.length >= 5) {
      Alert.alert('Límite alcanzado', 'Solo puedes subir hasta 5 imágenes representativas.');
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
      selectionLimit: 5 - logos.length,
      base64: true,
    });

    if (!result.canceled) {
      const validUris = [];
      for (let asset of result.assets) {
        const isValid = await validateImageWithIA(asset.base64);
        if (isValid) {
          validUris.push(asset.uri);
        } else {
          setHasOffensiveContent(true);
        }
      }
      setLogos(prev => [...prev, ...validUris].slice(0, 5));
    }
  };

const pickVideos = async () => {
  if (profileVideos.length >= 3) {
    Alert.alert('Límite alcanzado', 'Solo puedes subir hasta 3 videos institucionales.');
    return;
  }

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permiso requerido', 'Debes permitir acceso a la galería para subir videos.');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    allowsMultipleSelection: true,
    quality: 1,
    selectionLimit: 3 - profileVideos.length,
  });

  if (!result.canceled && result.assets.length > 0) {
    const validUris = [];
    for (let asset of result.assets) {
      const uri = asset.uri;
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        const maxFileSizeBytes = 100 * 1024 * 1024; // 100 MB
        if (fileInfo.size > maxFileSizeBytes) {
          Alert.alert('Archivo demasiado grande', 'El video supera los 100 MB. Intenta seleccionar uno más liviano.');
          continue;
        }

        const { duration } = await VideoThumbnails.getThumbnailAsync(uri, { time: 1000 });
        if (duration / 1000 > 120) {
          Alert.alert('Duración excedida', 'El video no debe superar los 2 minutos de duración.');
          continue;
        }

        const isValid = await validateVideoWithIA(uri);
        if (isValid) {
          const path = `videos/${email.toLowerCase().trim()}_video_${Date.now()}.mp4`;
          const downloadUrl = await uploadMediaToStorage(uri, path);
          if (downloadUrl?.startsWith('https://')) {
            validUris.push(downloadUrl);
          } else {
            Alert.alert('Error', 'No se pudo subir el video. Intenta con otro archivo.');
          }
        } else {
          setHasOffensiveContent(true);
        }
      } catch (error) {
        console.error('❌ Error procesando el video:', error);
        Alert.alert('Error', 'No se pudo procesar el video. Intenta con otro archivo.');
      }
    }
    setProfileVideos(prev => [...prev, ...validUris].slice(0, 3));
  }
};

  const removeLogo = (uri) => {
    setLogos(prev => prev.filter(logo => logo !== uri));
  };

  const removeVideo = (uri) => {
    setProfileVideos(prev => prev.filter(video => video !== uri));
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
  // Validación específica para Instagram
  const instagramValid = instagram.startsWith('@') && instagram.length > 1;
  if (!instagramValid) {
    Alert.alert(
      'Instagram inválido',
      'El usuario de Instagram debe comenzar con "@" y tener al menos 2 caracteres. Ej: @nombreusuario'
    );
    return;
  }

  setErrorMessage('Por favor, completa todos los campos obligatorios correctamente.');
  setErrorModalVisible(true);
  return;
}

    if (!isFormValid()) {
      setErrorMessage('Por favor, completa todos los campos obligatorios correctamente.');
      setErrorModalVisible(true);
      return;
    }

    if (!profilePhoto?.startsWith('http') && !profilePhoto) {
      setErrorMessage('La foto de perfil es obligatoria.');
      setErrorModalVisible(true);
      return;
    }

    if (profileVideos.some(uri => !uri?.startsWith('http') && uri)) {
      setErrorMessage('Alguno de los videos no es válido. Por favor, revisa los videos subidos.');
      setErrorModalVisible(true);
      return;
    }

    if (!description || description.trim().length < 30) {
      setDescripcionError('La descripción debe tener al menos 20 caracteres.');
      Alert.alert('Descripción muy breve', 'Agrega una descripción más detallada (mínimo 30 caracteres).');
      return;
    }

    setIsSaving(true);

    try {
      const webLinkFormatted =
        webLink.trim() !== ''
          ? webLink.startsWith('http') ? webLink.trim() : `https://${webLink.trim()}`
          : '';

      let uploadedProfilePhoto = profilePhoto;
      if (profilePhoto && !profilePhoto.startsWith('http')) {
        const photoPath = `profile_photos/${email.toLowerCase().trim()}_photo_${Date.now()}.jpeg`;
        uploadedProfilePhoto = await uploadMediaToStorage(profilePhoto, photoPath);
        if (!uploadedProfilePhoto?.startsWith('https://')) {
          throw new Error('No se pudo subir la foto de perfil.');
        }
      }

      const uploadedLogos = await Promise.all(
        logos.map((logo, index) =>
          logo.startsWith('http')
            ? logo
            : uploadMediaToStorage(logo, `logos/${email.toLowerCase().trim()}_logo${index + 1}_${Date.now()}.jpg`)
        )
      );

console.log('(NOBRIDGE) LOG ⏳ Iniciando subida de videos:', profileVideos);

const uploadedVideos = [];

for (let i = 0; i < profileVideos.length; i++) {
  const video = profileVideos[i];

  console.log(`(NOBRIDGE) LOG 🎞️ Procesando video [${i + 1}/${profileVideos.length}]:`, video);

  if (video && typeof video === 'string') {
    if (video.startsWith('http')) {
      console.log(`(NOBRIDGE) LOG ⚡ Video ya subido (URL):`, video);
      uploadedVideos.push(video);
    } else {
      try {
        const path = `videos/${email.toLowerCase().trim()}_video${i + 1}_${Date.now()}.mp4`;
        console.log(`(NOBRIDGE) LOG 🚀 Subiendo video local al path:`, path);

        const downloadUrl = await uploadMediaToStorage(video, path);

        console.log(`(NOBRIDGE) LOG ✅ Video subido exitosamente:`, downloadUrl);
        uploadedVideos.push(downloadUrl);
      } catch (e) {
        console.log(`(NOBRIDGE) LOG ❌ Error al subir video ${i + 1}:`, e);
        Alert.alert('Error', `No se pudo subir el video ${i + 1}. Intenta nuevamente.`);
        setIsSaving(false);
        return;
      }
    }
  } else {
    console.log(`(NOBRIDGE) LOG ⚠️ URI de video inválida en posición ${i + 1}:`, video);
    Alert.alert('Error', `Hay un video con formato inválido. Por favor, revísalo.`);
    setIsSaving(false);
    return;
  }
}

console.log('(NOBRIDGE) LOG 🎉 Todos los videos procesados:', uploadedVideos);

      const cleanEmail = email.trim().toLowerCase();
      const formattedInstagram = instagram.trim()
        .replace(/^@/, '')
        .replace(/^https?:\/\/(www\.)?instagram\.com\//, '');
      const finalInstagramURL = `https://www.instagram.com/${formattedInstagram}`;

      const profileData = {
        membershipType: 'elite',
        ...userData,
        accountType: 'agency',
        hasPaid: false,
        id: cleanEmail,
        agencyName,
        representative,
        email: cleanEmail,
        phone,
        instagram: finalInstagramURL,
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
        profileVideos: uploadedVideos,
        updatedAt: new Date().toISOString(),
        timestamp: Date.now(),
        visibleInExplorer: !hasOffensiveContent,
        flagged: hasOffensiveContent,
      };

      await saveUserProfile(profileData, 'elite', setUserData, setIsLoggedIn, true);
      await AsyncStorage.setItem('userData', JSON.stringify(profileData));
      await AsyncStorage.setItem('userProfileElite', JSON.stringify(profileData));
      await AsyncStorage.setItem('eliteProfileCompleted', 'true');
      await rebuildAllProfiles();

      const auth = getAuth();
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        try {
          await sendEmailVerification(auth.currentUser);
          console.log('📧 Correo de verificación enviado al usuario Elite');
        } catch (e) {
          console.error('❌ Error al enviar correo de verificación:', e);
        }
      }

      setModalVisible(true);
    } catch (error) {
      console.error('❌ Error en saveProfile:', error);
      setErrorMessage('Fallo al guardar el perfil. Intenta de nuevo.');
      setErrorModalVisible(true);
    } finally {
      setIsSaving(false);
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
        placeholderTextColor="#777"
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
      {descripcionError ? (
        <Text style={{ color: 'red', marginBottom: 10 }}>{descripcionError}</Text>
      ) : null}

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
              Sube hasta 5 imágenes representativas de tu agencia.
            </Text>
          )}
        </ScrollView>
      </View>

      <Text style={styles.label}>Videos institucionales (máx. 3, opcional)</Text>
      <TouchableOpacity style={styles.imagePicker} onPress={pickVideos}>
        <Text style={styles.imagePickerText}>Subir videos</Text>
      </TouchableOpacity>
      <View style={styles.videoScrollWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ justifyContent: 'center', flexGrow: 1 }}>
          <View style={styles.videoRow}>
            {profileVideos.map((uri, index) => (
              <View key={index} style={styles.videoWrapper}>
                <Video
                  source={{ uri }}
                  useNativeControls
                  resizeMode="cover"
                  style={styles.videoPreview}
                  onError={(e) => {
                    console.log('❌ Error al cargar el video:', e);
                    Alert.alert('Error', 'No se pudo cargar el video. Intenta seleccionar otro archivo.');
                  }}
                />
                <TouchableOpacity onPress={() => removeVideo(uri)} style={styles.deleteVideoButton}>
                  <Text style={styles.deleteVideoText}>🗑️ Eliminar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          {profileVideos.length === 0 && (
            <Text style={styles.noImagesText}>
              Sube hasta 3 videos institucionales (máx. 100 MB y 2 min cada uno).
            </Text>
          )}
        </ScrollView>
      </View>

      <Text style={styles.label}>Enlace web (opcional)</Text>
      <TextInput style={styles.input} value={webLink} onChangeText={setWebLink} />

      <TouchableOpacity
        style={[
          styles.button,
          isSaving && { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
        ]}
        onPress={saveProfile}
        disabled={isSaving}
      >
        {isSaving && <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />}
        <Text style={styles.buttonText}>
          {isSaving ? 'Guardando perfil...' : 'Guardar perfil'}
        </Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalText}>✅ Perfil guardado correctamente</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setModalVisible(false);
                setTimeout(() => {
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [
                        {
                          name: 'MainAppContainer',
                          state: {
                            routes: [
                              {
                                name: 'MainTabs',
                                state: {
                                  routes: [{ name: 'DashboardTab' }],
                                },
                              },
                            ],
                          },
                        },
                      ],
                    })
                  );
                }, 300);
              }}
            >
              <Text style={styles.modalButtonText}>Ir al Dashboard Elite</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 20,
    marginTop: 30,
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
  logoScrollWrapper: {
    marginVertical: 10,
    maxHeight: 120,
  },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginHorizontal: 'auto',
  },
  logoWrapper: {
    position: 'relative',
    marginRight: 10,
    marginBottom: 10,
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
  videoScrollWrapper: {
    marginVertical: 10,
    maxHeight: 220,
  },
  videoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginHorizontal: 'auto',
  },
  videoWrapper: {
    position: 'relative',
    marginRight: 10,
    marginBottom: 10,
  },
  videoPreview: {
    width: 150,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8A353',
  },
  deleteVideoButton: {
    marginTop: 5,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#D8A353',
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: 'center',
  },
  deleteVideoText: {
    color: '#D8A353',
    fontSize: 12,
    textAlign: 'center',
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
  noImagesText: {
    color: '#888',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 10,
  },
});