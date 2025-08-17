import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { useUser } from '../contexts/UserContext';
import BackButton from '../components/BackButton';
import { Video } from 'expo-av';
import { uploadMediaToStorage } from '../src/firebase/helpers/uploadMediaToStorage';
import { goToProfileTab } from '../utils/navigationHelpers';
import * as FileSystem from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../src/firebase/firebaseConfig';
import { useFocusEffect } from '@react-navigation/native';

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
const normalizarInstagram = (input) => {
  if (!input) return '';
  let cleaned = input.trim();

  // Si empieza con @, quita solo el @ para normalizar luego
  if (cleaned.startsWith('@')) {
    cleaned = cleaned.slice(1);
  }

  // Quitar posibles URLs
  cleaned = cleaned.replace(/(https?:\/\/)?(www\.)?instagram\.com\//, '');
  cleaned = cleaned.replace(/\/$/, '');

  // Devuelve con @ para mostrar en el TextInput
  return '@' + cleaned;
};

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
  const [eliteCategory, setEliteCategory] = useState('');
  const [description, setDescription] = useState('');
  const [logos, setLogos] = useState([]);
  const [webLink, setWebLink] = useState('');
  const [instagram, setInstagram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profileVideos, setProfileVideos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasOffensiveContent, setHasOffensiveContent] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [descripcionError, setDescripcionError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const json = await AsyncStorage.getItem('userProfileElite');
      if (json) {
        const data = JSON.parse(json);
        setProfile(data);
        setAgencyName(data.agencyName || '');
        setRepresentative(data.representative || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setRegion(data.region || null);
        setCity(data.city || null);
        setAddress(data.address || '');
        setEliteCategory(data.eliteCategory || '');
        setDescription(data.description || '');
        setLogos(data.logos || []);
        setWebLink(data.webLink || '');
        setInstagram(normalizarInstagram(data.instagram));
        setWhatsapp(data.whatsapp || '');
        setProfilePhoto(data.profilePhoto || null);
        setProfileVideos(data.profileVideos || []);
        if (data.region) setCityItems(regionCityMap[data.region] || []);
      }
    };
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const reloadProfile = async () => {
        const json = await AsyncStorage.getItem('userProfileElite');
        if (json) {
          const data = JSON.parse(json);
          setProfile(data);
          if (data.logos && Array.isArray(data.logos) && data.logos.length > 0) {
            setLogos(data.logos);
          }
          if (data.profileVideos && Array.isArray(data.profileVideos)) {
            setProfileVideos(data.profileVideos);
          }
          console.log('♻️ Perfil Elite recargado desde AsyncStorage');
        }
      };
      reloadProfile();
    }, [])
  );

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
      aspect: [1, 1],
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      const base64 = result.assets[0].base64;
      const isValid = await validateImageWithIA(base64);

      if (!isValid) {
        setHasOffensiveContent(true);
        return;
      }

      let downloadUrl = uri;
      if (!uri.startsWith('http')) {
        const extension = uri.split('.').pop().split('?')[0] || 'jpg';
        const uniquePath = `profile_photos/${email.toLowerCase().trim()}_photo_${Date.now()}.${extension}`;
        downloadUrl = await uploadMediaToStorage(uri, uniquePath);
        if (!downloadUrl?.startsWith('https://')) {
          Alert.alert('Error', 'No se pudo subir la foto de perfil.');
          return;
        }
      }

      setHasOffensiveContent(false);
      setProfilePhoto(downloadUrl);
      const currentData = await AsyncStorage.getItem('userProfileElite');
      const parsedData = currentData ? JSON.parse(currentData) : {};
      await AsyncStorage.setItem('userProfileElite', JSON.stringify({ ...parsedData, profilePhoto: downloadUrl }));
      setUserData({ ...parsedData, profilePhoto: downloadUrl });
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
          let downloadUrl = asset.uri;
          if (!asset.uri.startsWith('http')) {
            const extension = asset.uri.split('.').pop().split('?')[0] || 'jpg';
            const path = `logos/${email.toLowerCase().trim()}_logo_${Date.now()}.${extension}`;
            downloadUrl = await uploadMediaToStorage(asset.uri, path);
            if (!downloadUrl?.startsWith('https://')) {
              Alert.alert('Error', 'No se pudo subir la imagen.');
              continue;
            }
          }
          validUris.push(downloadUrl);
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
            let downloadUrl = uri;
            if (!uri.startsWith('http')) {
              const path = `videos/${email.toLowerCase().trim()}_video_${Date.now()}.mp4`;
              downloadUrl = await uploadMediaToStorage(uri, path);
              if (!downloadUrl?.startsWith('https://')) {
                Alert.alert('Error', 'No se pudo subir el video.');
                continue;
              }
            }
            validUris.push(downloadUrl);
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
    const instagramValid = normalizarInstagram(instagram).match(/^@\w{1,30}$/);

    return (
      agencyName.trim() &&
      representative.trim() &&
      emailRegex.test(email) &&
      phoneRegex.test(phone) &&
      region &&
      city &&
      address.trim() &&
      eliteCategory.trim() &&
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

    if (!profilePhoto?.startsWith('http')) {
      setErrorMessage('La foto de perfil es obligatoria.');
      setErrorModalVisible(true);
      return;
    }

    if (profileVideos.some(uri => !uri?.startsWith('http'))) {
      setErrorMessage('Alguno de los videos no es válido. Por favor, revisa los videos subidos.');
      setErrorModalVisible(true);
      return;
    }

    if (!description || description.trim().length < 30) {
      setDescripcionError('La descripción debe tener al menos 30 caracteres.');
      Alert.alert('Descripción muy breve', 'Agrega una descripción más detallada (mínimo 30 caracteres).');
      return;
    }

    setIsSaving(true);

    try {
      const webLinkFormatted =
        webLink.trim() !== ''
          ? webLink.startsWith('http') ? webLink.trim() : `https://${webLink.trim()}`
          : '';

      const formattedInstagram = normalizarInstagram(instagram).replace(/^@/, '');
      const finalInstagramURL = `https://www.instagram.com/${formattedInstagram}`;
   
      const cleanEmail = email.trim().toLowerCase();

      const profileData = {
        membershipType: 'elite',
        id: cleanEmail,
        agencyName,
        representative,
        email: cleanEmail,
        phone,
        region,
        city,
        address,
        companyType: eliteCategory,
        eliteCategory,
        description,
        logos,
        webLink: webLinkFormatted,
        instagram: finalInstagramURL,
        whatsapp,
        profilePhoto,
        profileVideos,
        updatedAt: new Date().toISOString(),
        timestamp: Date.now(),
        flagged: hasOffensiveContent,
        visibleInExplorer: !hasOffensiveContent,
      };

      await AsyncStorage.setItem('userProfileElite', JSON.stringify(profileData));
      await AsyncStorage.setItem('userData', JSON.stringify(profileData));
      await AsyncStorage.setItem('eliteProfileCompleted', 'true');
      setUserData(profileData);
      setModalVisible(true);
    } catch (error) {
      console.error('❌ Error al guardar perfil:', error);
      setErrorMessage('Fallo al guardar el perfil. Intenta de nuevo.');
      setErrorModalVisible(true);
    } finally {
      setIsSaving(false);
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
            source={{
              uri:
                profilePhoto && profilePhoto.startsWith('http')
                  ? profilePhoto
                  : profile?.profilePhoto && profile?.profilePhoto.startsWith('http')
                  ? profile?.profilePhoto
                  : 'https://via.placeholder.com/100',
            }}
            style={styles.profileImage}
            onError={() => {
              console.log('❌ Error al mostrar imagen de perfil. Mostrando placeholder.');
              setProfilePhoto(null);
            }}
          />
          <Text style={styles.imagePickerText}>Tocar para cambiar foto de perfil</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Nombre de la agencia *</Text>
        <TextInput style={styles.input} value={agencyName} onChangeText={setAgencyName} />

        <Text style={styles.label}>Representante legal *</Text>
        <TextInput style={styles.input} value={representative} onChangeText={setRepresentative} />

        <Text style={styles.label}>Correo electrónico *</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />

        <Text style={styles.label}>Teléfono (ej. +56912345678) *</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <Text style={styles.label}>Instagram (@usuario) *</Text>
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
          keyboardType="phone-pad"
          placeholder="+56912345678"
          placeholderTextColor="#777"
          autoCapitalize="none"
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

        <Text style={styles.label}>Web (opcional)</Text>
        <TextInput style={styles.input} value={webLink} onChangeText={setWebLink} />

        <Text style={styles.label}>Imágenes representativas (máx. 5) *</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickLogo}>
          <Text style={styles.imagePickerText}>Subir imagen</Text>
        </TouchableOpacity>
        <ScrollView horizontal style={styles.logoRow} showsHorizontalScrollIndicator={false}>
          {logos.map((uri, i) => (
            <View key={i} style={styles.logoWrapper}>
              <Image source={{ uri }} style={styles.logo} />
              <TouchableOpacity style={styles.removeButton} onPress={() => removeLogo(uri)}>
                <Text style={styles.removeText}>✖</Text>
              </TouchableOpacity>
            </View>
          ))}
          {logos.length === 0 && (
            <Text style={styles.noImagesText}>
              Sube hasta 5 imágenes representativas de tu agencia.
            </Text>
          )}
        </ScrollView>

        <Text style={styles.label}>Videos institucionales (máx. 3, opcional)</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickVideos}>
          <Text style={styles.imagePickerText}>Subir videos</Text>
        </TouchableOpacity>
        <ScrollView horizontal style={styles.videoRow} showsHorizontalScrollIndicator={false}>
          {profileVideos.map((uri, index) => (
            <View key={index} style={styles.videoWrapper}>
              <Video
                source={{ uri }}
                useNativeControls
                resizeMode="contain"
                style={styles.videoPreview}
                onError={(e) => {
                  console.log('❌ Error al cargar el video:', e);
                  Alert.alert('Error', 'No se pudo cargar el video. Intenta seleccionar otro archivo.');
                }}
              />
              <TouchableOpacity style={styles.deleteVideoButton} onPress={() => removeVideo(uri)}>
                <Text style={styles.deleteVideoText}>🗑️ Eliminar</Text>
              </TouchableOpacity>
            </View>
          ))}
          {profileVideos.length === 0 && (
            <Text style={styles.noImagesText}>
              Sube hasta 3 videos institucionales (máx. 100 MB y 2 min cada uno).
            </Text>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[
            styles.button,
            (isSaving || !isFormValid()) && { opacity: 0.5 },
            isSaving && { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
          ]}
          disabled={isSaving || !isFormValid()}
          onPress={saveProfile}
        >
          {isSaving && <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />}
          <Text style={styles.buttonText}>
            {isSaving ? 'Cargando...' : 'Actualizar perfil'}
          </Text>
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
  videoRow: { marginVertical: 10, maxHeight: 220 },
  videoWrapper: { position: 'relative', marginRight: 10, marginBottom: 10 },
  videoPreview: { width: 150, height: 100, borderRadius: 10, borderWidth: 1, borderColor: '#D8A353', backgroundColor: '#000' },
  deleteVideoButton: { marginTop: 5, backgroundColor: '#000', borderWidth: 1, borderColor: '#D8A353', borderRadius: 5, paddingVertical: 5, paddingHorizontal: 10, alignSelf: 'center' },
  deleteVideoText: { color: '#D8A353', fontSize: 12, textAlign: 'center' },
  button: { backgroundColor: '#D8A353', padding: 15, borderRadius: 10, alignItems: 'center', marginVertical: 20 },
  buttonText: { color: '#000', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#1A1A1A', padding: 20, borderRadius: 10, alignItems: 'center', width: '80%' },
  modalText: { color: '#fff', fontSize: 16, marginBottom: 15 },
  modalButton: { backgroundColor: '#D8A353', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  modalButtonText: { color: '#000', fontWeight: 'bold' },
  noImagesText: { color: '#888', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginVertical: 10 },
});