import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Image, Animated, Modal, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useUser } from '../contexts/UserContext';
import { saveUserProfile } from '../utils/profileStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DropDownPicker from 'react-native-dropdown-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Ionicons } from '@expo/vector-icons';
import { goToProfileTab } from '../utils/navigationHelpers';
import { validateImageWithIA } from '../src/firebase/helpers/validateMediaContent';
import { uploadMediaToStorage } from '../src/firebase/helpers/uploadMediaToStorage';
import { rebuildAllProfiles } from '../src/firebase/helpers/rebuildAllProfiles';
import { Platform } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../src/firebase/firebaseConfig';
import { validateVideoWithIA } from '../src/firebase/helpers/validateVideoWithIA';

export default function CompleteProfileScreen({ navigation }) {
  const { userData, setUserData } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [validandoImagenes, setValidandoImagenes] = useState(false);
  const [validandoTotal, setValidandoTotal] = useState(0);
  const [validandoActual, setValidandoActual] = useState(0);
  const [validandoVideo, setValidandoVideo] = useState(false);
  const [puntos, setPuntos] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(userData?.profilePhoto || null);
  const [name, setName] = useState(userData?.name || '');
  const [sexo, setSexo] = useState(userData?.sexo || '');
  const [age, setAge] = useState(userData?.age || '');
  const [estatura, setEstatura] = useState(userData?.estatura || '');
  const [skinColor, setSkinColor] = useState(userData?.skinColor || '');
  const [eyeColor, setEyeColor] = useState(userData?.eyeColor || '');
  const [hairColor, setHairColor] = useState(userData?.hairColor || '');
  const [tattoos, setTattoos] = useState(userData?.tattoos || '');
  const [tattoosLocation, setTattoosLocation] = useState(userData?.tattoosLocation || '');
  const [piercings, setPiercings] = useState(userData?.piercings || '');
  const [piercingsLocation, setPiercingsLocation] = useState(userData?.piercingsLocation || '');
  const [shirtSize, setShirtSize] = useState(userData?.shirtSize || '');
  const [pantsSize, setPantsSize] = useState(userData?.pantsSize || '');
  const [shoeSize, setShoeSize] = useState(userData?.shoeSize || '');
  const [email, setEmail] = useState(userData?.email || '');
  const [phone, setPhone] = useState(userData?.phone || '');
  const [instagram, setInstagram] = useState(userData?.instagram?.replace(/^@/, '') || '');
  const [bookPhotos, setBookPhotos] = useState(userData?.bookPhotos || []);
  const [category, setCategory] = useState(Array.isArray(userData?.category) ? userData.category : []);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [searchCategory, setSearchCategory] = useState('');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const bannerOpacity = useState(new Animated.Value(0))[0];
  const [profileVideo, setProfileVideo] = useState(userData?.profileVideo || null);
  const [country, setCountry] = useState(userData?.country || '');
  const [ciudad, setCiudad] = useState(userData?.ciudad || '');
  const [address, setAddress] = useState(userData?.address || '');
  const [ethnicity, setEthnicity] = useState(userData?.ethnicity || '');
  const [region, setRegion] = useState(userData?.region || '');
  const [comuna, setComuna] = useState(userData?.comuna || '');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageModalVisible, setImageModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [openSexo, setOpenSexo] = useState(false);
  const [zIndexSexo, setZIndexSexo] = useState(950);
  const [openCiudad, setOpenCiudad] = useState(false);
  const [zIndexCiudad, setZIndexCiudad] = useState(850);
  const [openEthnicity, setOpenEthnicity] = useState(false);
  const [zIndexEthnicity, setZIndexEthnicity] = useState(900);
  const [openRegion, setOpenRegion] = useState(false);
  const [zIndexRegion, setZIndexRegion] = useState(800);
  const [openCountry, setOpenCountry] = useState(false);
  const [zIndexCountry, setZIndexCountry] = useState(1000);

  const ethnicityItems = [
    { label: 'Afrodescendiente', value: 'afrodescendiente' },
    { label: 'Caucásico', value: 'caucasico' },
    { label: 'Latino', value: 'latino' },
    { label: 'Asiático', value: 'asiatico' },
    { label: 'Indígena', value: 'indigena' },
    { label: 'Otro', value: 'otro' },
  ];
  const countryItems = [
    { label: 'Chile', value: 'Chile' },
  ];
  const regionItems = [
    { label: 'Arica y Parinacota', value: 'arica-y-parinacota' },
    { label: 'Tarapacá', value: 'tarapaca' },
    { label: 'Antofagasta', value: 'antofagasta' },
    { label: 'Atacama', value: 'atacama' },
    { label: 'Coquimbo', value: 'coquimbo' },
    { label: 'Valparaíso', value: 'valparaiso' },
    { label: 'Región Metropolitana', value: 'región metropolitana' },
    { label: 'Libertador General Bernardo O\'Higgins', value: 'libertador-general-bernardo-ohiggins' },
    { label: 'Maule', value: 'maule' },
    { label: 'Ñuble', value: 'nuble' },
    { label: 'Biobío', value: 'biobio' },
    { label: 'La Araucanía', value: 'la-araucania' },
    { label: 'Los Ríos', value: 'los-rios' },
    { label: 'Los Lagos', value: 'los-lagos' },
    { label: 'Aysén del General Carlos Ibáñez del Campo', value: 'aysen-del-general-carlos-ibanez-del-campo' },
    { label: 'Magallanes y de la Antártida Chilena', value: 'magallanes-y-de-la-antartida-chilena' },
  ];
  const ciudadItems = [
    { label: 'Santiago', value: 'santiago' },
    { label: 'Valparaíso', value: 'valparaiso' },
    { label: 'Concepción', value: 'concepcion' },
    { label: 'La Serena', value: 'la-serena' },
    { label: 'Antofagasta', value: 'antofagasta' },
    { label: 'Temuco', value: 'temuco' },
    { label: 'Puerto Montt', value: 'puerto-montt' },
    { label: 'Iquique', value: 'iquique' },
    { label: 'Rancagua', value: 'rancagua' },
    { label: 'Copiapó', value: 'copiapo' },
    { label: 'Chillán', value: 'chillan' },
    { label: 'Talca', value: 'talca' },
    { label: 'Punta Arenas', value: 'punta-arenas' },
  ];

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

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userDataJson = await AsyncStorage.getItem('userData');
        const userData = JSON.parse(userDataJson);
        const email = userData?.email;

        if (!email) return;

        const profileJson = await AsyncStorage.getItem(`userProfile_${email}`);
        if (profileJson) {
          const profile = JSON.parse(profileJson);
          setProfilePhoto(profile.profilePhoto || null);
          setName(profile.name || '');
          setSexo(profile.sexo || '');
          setAge(profile.age || '');
          setEstatura(profile.estatura || '');
          setSkinColor(profile.skinColor || '');
          setEyeColor(profile.eyeColor || '');
          setHairColor(profile.hairColor || '');
          setTattoos(profile.tattoos || '');
          setTattoosLocation(profile.tattoosLocation || '');
          setPiercings(profile.piercings || '');
          setPiercingsLocation(profile.piercingsLocation || '');
          setShirtSize(profile.shirtSize || '');
          setPantsSize(profile.pantsSize || '');
          setShoeSize(profile.shoeSize || '');
          setEmail(profile.email || '');
          setPhone(profile.phone || '');
          setInstagram(profile.instagram || '');
          setBookPhotos(profile.bookPhotos || []);
          setCategory(Array.isArray(profile.category) ? profile.category : []);
          setCountry(profile.country || '');
          setCiudad(profile.ciudad || '');
          setAddress(profile.address || '');
          setEthnicity(profile.ethnicity || '');
          setRegion(profile.region || '');
          setComuna(profile.comuna || '');
          if (profile.profileVideo?.startsWith('http')) {
            setProfileVideo(profile.profileVideo);
          } else if (profile.profileVideo?.startsWith('file://')) {
            const fileInfo = await FileSystem.getInfoAsync(profile.profileVideo);
            if (fileInfo.exists) {
              setProfileVideo(profile.profileVideo);
            } else {
              setProfileVideo(null);
              console.warn('⚠️ El video guardado localmente no existe.');
            }
          } else {
            setProfileVideo(null);
          }
        }
      } catch (error) {
        console.error('❌ Error al cargar perfil:', error);
      }
    };

    loadProfile();
  }, []);

useEffect(() => {
  let interval = null;
  if (validandoImagenes || validandoVideo) { // <-- AÑADE validandoVideo aquí
    interval = setInterval(() => {
      setPuntos((prev) => (prev.length < 3 ? prev + '.' : ''));
    }, 500);
  } else {
    setPuntos('');
    clearInterval(interval);
  }
  return () => clearInterval(interval);
}, [validandoImagenes, validandoVideo]); // <-- AÑADE validandoVideo al array

  const pickProfilePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      const selectedUri = result.assets[0].uri;
      setValidandoImagenes(true);
      try {
 // Subir la imagen a Firebase Storage para obtener una URL
const tempUrl = await uploadMediaToStorage(selectedUri, `temp_photos/${email.toLowerCase().trim()}_temp_profile.jpg`);
console.log('📤 Imagen subida temporalmente:', tempUrl);

// Validar con IA
const validation = await validateImageWithIA(tempUrl);
console.log('🧪 Resultado validación IA:', validation);

if (!validation.valid) {
  Alert.alert(
    'Imagen rechazada',
    'La imagen fue rechazada por contenido inadecuado. Por favor, selecciona otra diferente.'
  );

  // Eliminar del Storage si no pasa la validación
  try {
    const path = decodeURIComponent(tempUrl.split('/o/')[1].split('?')[0]);
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    console.log('🗑️ Imagen eliminada del Storage (rechazada por IA)');
  } catch (e) {
    console.warn('⚠️ No se pudo eliminar imagen rechazada del Storage:', e.message);
  }

  return; // 🔁 Detener el flujo, no seguir con imagen inválida
}

        if (!isSafe.valid) {
          Alert.alert(
            'Imagen no permitida',
            'Esta imagen ha sido bloqueada porque no cumple con nuestras políticas de contenido. Intenta con otra diferente.',
            [{ text: 'OK' }]
          );
          setValidandoImagenes(false);
          return;
        }

        setProfilePhoto(selectedUri);
      } catch (error) {
        console.error('❌ Error al procesar imagen:', error);
        Alert.alert('Error', 'No se pudo validar la imagen. Intenta nuevamente.');
      }
      setValidandoImagenes(false);
    }
  };

const pickBookPhotos = async () => {
  const total = bookPhotos.length;
  const remaining = 12 - total;

  if (remaining <= 0) {
    alert('Ya alcanzaste el máximo de 12 fotos en tu portafolio.');
    return;
  }

  Alert.alert(
    'Completa tu portafolio',
    `Ya tienes ${total} foto(s) cargada(s).\nPuedes agregar hasta ${remaining} más (máximo 12).`,
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Seleccionar fotos',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 1,
          });

          if (!result.canceled && result.assets.length > 0) {
            if (result.assets.length > remaining) {
              alert(`Seleccionaste ${result.assets.length} fotos, pero solo se aceptarán ${remaining}. Solo se tomarán las primeras.`);
            }

            const selectedAssets = result.assets.slice(0, remaining);

            setValidandoImagenes(true);
            const safeUris = [];
            setValidandoTotal(selectedAssets.length);
            setValidandoActual(0);

            for (const asset of selectedAssets) {
              try {
                const tempUrl = await uploadMediaToStorage(asset.uri, `temp_photos/${email.toLowerCase().trim()}_temp_book${Date.now()}.jpg`);
                const isSafe = await validateImageWithIA(tempUrl);

                setValidandoActual((prev) => prev + 1);

                if (!isSafe.valid) {
                  setValidandoTotal(0);
                  setValidandoActual(0);
                  setValidandoImagenes(false);
                  Alert.alert(
                    'Imagen no permitida',
                    'Una de las imágenes fue bloqueada. Intenta con otra diferente.',
                    [{ text: 'OK' }]
                  );
                  return;
                }

                safeUris.push(asset.uri);
              } catch (error) {
                console.error('❌ Error al validar imagen:', error);
                setValidandoImagenes(false);
                Alert.alert('Error', 'No se pudo validar una de las imágenes.');
                return;
              }
            }

            setBookPhotos((prev) => [...prev, ...safeUris]);
            setValidandoImagenes(false);
          }
        }
      }
    ]
  );
};

const pickProfileVideo = async () => {
  if (profileVideo) {
    alert('Ya has subido un video. Elimínalo si deseas subir otro.');
    return;
  }

  console.log('📹 Iniciando selección de video...');
  try {
    // Verificar permisos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Se requieren permisos para acceder a la galería.');
      console.warn('⚠️ Permisos de galería no concedidos');
      return;
    }

    console.log('📷 Lanzando ImagePicker para videos...');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos, // Corregido
      quality: 1,
    });
    console.log('📥 Resultado de ImagePicker:', result);

    if (!result.canceled && result.assets?.length > 0) {
      const uri = result.assets[0].uri;
      console.log('📹 URI del video:', uri);

      if (!uri.startsWith('file://')) {
        alert('El archivo no se puede acceder. Intenta seleccionar un video compatible.');
        console.warn('⚠️ URI inválida:', uri);
        return;
      }

      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log('📊 Info del archivo:', fileInfo);
      const maxFileSizeBytes = 100 * 1024 * 1024;
      if (fileInfo.size > maxFileSizeBytes) {
        alert('El video supera los 100 MB. Intenta seleccionar uno más liviano.');
        return;
      }

      const { duration } = await VideoThumbnails.getThumbnailAsync(uri, { time: 1000 });
      console.log('🕒 Duración del video:', duration);
      const durationInSeconds = duration / 1000;
      if (durationInSeconds > 120) {
        alert('El video no debe superar los 2 minutos de duración.');
        return;
      }

      setValidandoVideo(true);
      console.log('🧠 Iniciando validación IA...');
      const validation = await validateVideoWithIA(uri);
      console.log('🧪 Resultado validación IA:', validation);
      setValidandoVideo(false);

      if (!validation.valid) {
        alert('El video contiene contenido no permitido en su thumbnail. Selecciona otro.');
        return;
      }

      const fileName = uri.split('/').pop();
      const newPath = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: uri, to: newPath });
      setProfileVideo(newPath);
      console.log('✅ Video guardado:', newPath);
    } else {
      console.log('🚫 Selección de video cancelada');
    }
  } catch (error) {
    setValidandoVideo(false);
    console.error('❌ Error al procesar o validar el video:', error);
    alert('Error al procesar o validar el video. Intenta nuevamente.');
  }
};

  const handleSave = async () => {
    setIsSaving(true);

    const requiredFields = [
      name, profilePhoto, sexo, age, estatura,
      skinColor, eyeColor, hairColor,
      tattoos, piercings,
      shirtSize, pantsSize, shoeSize,
      email, phone, instagram,
      address, comuna,
      country, ciudad, ethnicity, region
    ];

    if (requiredFields.some(field => !field || field.trim() === '')) {
      alert('Por favor completa todos los campos obligatorios.');
      setIsSaving(false);
      return;
    }

    if (category.length === 0) {
      alert('Debes seleccionar al menos una categoría.');
      setIsSaving(false);
      return;
    }

    if (bookPhotos.length === 0) {
      alert('Debes subir al menos 1 foto al book.');
      setIsSaving(false);
      return;
    }

    if (!profileVideo) {
      alert('Debes subir un video de presentación.');
      setIsSaving(false);
      return;
    }

    const yesValues = ['si', 'sí', 'sí.', 'Si', 'Sí', 'Sí.', 'SI', 'SÍ', 'SÍ.'];

    const hasPiercings = yesValues.includes(piercings.trim());
    if (hasPiercings && !piercingsLocation.trim()) {
      alert('Por favor indica la ubicación de tus piercings.');
      setIsSaving(false);
      return;
    }

    const hasTattoos = yesValues.includes(tattoos.trim());
    if (hasTattoos && !tattoosLocation.trim()) {
      alert('Por favor indica la ubicación de tus tatuajes.');
      setIsSaving(false);
      return;
    }

    if (instagram && instagram.trim().length < 2) {
      alert('Por favor ingresa un usuario de Instagram válido.');
      setIsSaving(false);
      return;
    }

    if (isNaN(Number(age))) {
      alert('Por favor ingresa una edad válida en números.');
      setIsSaving(false);
      return;
    }

    if (isNaN(Number(estatura))) {
      alert('Por favor ingresa una estatura válida en centímetros.');
      setIsSaving(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Por favor ingresa un correo electrónico válido.');
      setIsSaving(false);
      return;
    }

    const allowedExtensions = ['.mp4', '.mov', '.avi', '.mkv'];
    const extension = profileVideo.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(`.${extension}`)) {
      alert('El video debe ser .mp4, .mov, .avi o .mkv');
      setIsSaving(false);
      return;
    }

    const formattedEstatura = parseInt(estatura) > 100 ? (parseInt(estatura) / 100).toFixed(2) : estatura;

    if (!profilePhoto || typeof profilePhoto !== 'string') {
      alert('La foto de perfil no es válida.');
      setIsSaving(false);
      return;
    }

    const uploadedProfilePhoto = profilePhoto?.startsWith('http')
      ? profilePhoto
      : await uploadMediaToStorage(profilePhoto, `profile_photos/${email.toLowerCase().trim()}_photo.jpg`);

    const uploadedBookPhotos = [];
    for (let i = 0; i < bookPhotos.length; i++) {
      const uri = bookPhotos[i];
      if (uri.startsWith('http')) {
        uploadedBookPhotos.push(uri);
      } else {
        const downloadUrl = await uploadMediaToStorage(uri, `book_photos/${email.toLowerCase().trim()}_book${i + 1}.jpg`);
        if (downloadUrl) uploadedBookPhotos.push(downloadUrl);
      }
    }

    let uploadedProfileVideo = profileVideo;

if (profileVideo && profileVideo.startsWith('file://')) {
  console.log('🎥 Subiendo video al storage...');
  uploadedProfileVideo = await uploadMediaToStorage(
    profileVideo,
    `profile_videos/${email.toLowerCase().trim()}_video.mp4`
  );
}

    const hasOffensiveContent = false;

    if (hasOffensiveContent) {
      Alert.alert(
        'Contenido ofensivo detectado',
        'Tu perfil ha sido marcado para revisión debido a contenido inapropiado.'
      );
    }
    const cleanEmail = email.trim().toLowerCase();

    const profileData = {
      profilePhoto: uploadedProfilePhoto,
      name,
      sexo,
      age,
      estatura: formattedEstatura,
      skinColor,
      eyeColor,
      hairColor,
      tattoos,
      tattoosLocation,
      piercings,
      piercingsLocation,
      shirtSize,
      pantsSize,
      shoeSize,
      email: cleanEmail,
      phone,
      instagram: `@${instagram.replace(/^@/, '')}`,
      bookPhotos: uploadedBookPhotos,
      profileVideo: uploadedProfileVideo,
      category,
      country,
      ciudad,
      address,
      ethnicity,
      region,
      comuna,
      flagged: hasOffensiveContent,
      visibleInExplorer: hasOffensiveContent ? false : true,
    };

    const success = await saveUserProfile(profileData, 'pro', setUserData, null, true);

    if (success) {
      await rebuildAllProfiles();

      try {
        const freeDocRef = doc(db, 'profiles', email.toLowerCase().trim());
        const freeDocSnap = await getDoc(freeDocRef);
        if (freeDocSnap.exists()) {
          await deleteDoc(freeDocRef);
          console.log('🧹 Perfil Free eliminado tras upgrade a Pro');
        } else {
          console.log('ℹ️ No se encontró perfil Free, nada que eliminar');
        }
      } catch (error) {
        console.warn('⚠️ No se pudo eliminar perfil Free:', error);
      }

      setShowSuccessBanner(true);

      Animated.sequence([
        Animated.timing(bannerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(bannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => {
        setShowSuccessBanner(false);
        if (success) {
          setModalVisible(true);
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
                            routes: [{ name: 'ProfileTab' }],
                          },
                        },
                      ],
                    },
                  },
                ],
              })
            );
          }, 300);
        }
      });
    } else {
      alert('Hubo un problema al guardar tu perfil. Intenta de nuevo.');
      setIsSaving(false);
    }
  };

  const filteredCategories = categoriesList.filter(cat =>
    cat.toLowerCase().includes(searchCategory.toLowerCase())
  );

  const toggleCategory = (cat) => {
    setCategory(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  return (
    <View style={styles.screen}>
      {showSuccessBanner && (
        <Animated.View style={[styles.bannerSuccess, { opacity: bannerOpacity }]}>
          <Text style={styles.bannerText}>✅ Perfil actualizado exitosamente</Text>
        </Animated.View>
      )}
      <ScrollView contentContainerStyle={styles.container} nestedScrollEnabled={true}>
        <TouchableOpacity onPress={pickProfilePhoto}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.placeholderText}>Agregar Foto de Perfil</Text>
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Nombre completo*"
          placeholderTextColor="#aaa"
          value={name}
          onChangeText={setName}
        />
        <TouchableOpacity
          style={[styles.categorySelector, { marginTop: 0, marginBottom: 10 }]}
          onPress={() => setShowCategoryModal(true)}
        >
          <Text style={styles.categoryText}>
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
              setZIndexSexo(val ? 2000 : 950);
            }}
            setValue={setSexo}
            placeholder="Selecciona tu sexo"
            placeholderStyle={{ color: '#888' }}
            style={[styles.dropdown, { height: 50, justifyContent: 'center', padding: 10 }]}
            dropDownContainerStyle={styles.dropdownContainer}
            textStyle={{ color: '#D8A353', fontSize: 13 }}
            labelStyle={{ color: '#D8A353' }}
            arrowIconStyle={{ tintColor: '#D8A353' }}
            listMode="SCROLLVIEW"
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Teléfono"
          placeholderTextColor="#aaa"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          autoCorrect={false}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Edad"
          placeholderTextColor="#aaa"
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          textContentType="none"
          autoComplete="off"
          importantForAutofill="no"
          autoCorrect={false}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Estatura (ej: 1.79)"
          placeholderTextColor="#aaa"
          value={estatura}
          onChangeText={(text) => {
            const cleaned = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
            setEstatura(cleaned);
          }}
          keyboardType="decimal-pad"
          textContentType="none"
          autoComplete="off"
          importantForAutofill="no"
          autoCorrect={false}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Color de piel"
          placeholderTextColor="#aaa"
          value={skinColor}
          onChangeText={setSkinColor}
        />
        <TextInput
          style={styles.input}
          placeholder="Color de ojos"
          placeholderTextColor="#aaa"
          value={eyeColor}
          onChangeText={setEyeColor}
        />
        <TextInput
          style={styles.input}
          placeholder="Color de cabello"
          placeholderTextColor="#aaa"
          value={hairColor}
          onChangeText={setHairColor}
        />
        <View style={[styles.dropdownWrapper, { zIndex: zIndexEthnicity }]}>
          <DropDownPicker
            open={openEthnicity}
            value={ethnicity}
            items={ethnicityItems}
            setOpen={(val) => {
              setOpenEthnicity(val);
              setZIndexEthnicity(val ? 2000 : 900);
            }}
            setValue={setEthnicity}
            placeholder="Selecciona tu etnia"
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
            textStyle={{ color: '#D8A353', fontSize: 13 }}
            labelStyle={{ color: '#D8A353' }}
            placeholderStyle={{ color: '#888' }}
            arrowIconStyle={{ tintColor: '#D8A353' }}
            listMode="SCROLLVIEW"
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Tatuajes visibles (Sí/No)"
          placeholderTextColor="#aaa"
          value={tattoos}
          onChangeText={setTattoos}
        />
        {['si', 'sí', 'sí.'].includes(tattoos.trim().toLowerCase()) && (
          <TextInput
            style={styles.input}
            placeholder="¿Dónde tienes tatuajes?"
            placeholderTextColor="#aaa"
            value={tattoosLocation}
            onChangeText={setTattoosLocation}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Piercings visibles (Sí/No)"
          placeholderTextColor="#aaa"
          value={piercings}
          onChangeText={setPiercings}
        />
        {['si', 'sí', 'sí.'].includes(piercings.trim().toLowerCase()) && (
          <TextInput
            style={styles.input}
            placeholder="¿Dónde tienes piercings?"
            placeholderTextColor="#aaa"
            value={piercingsLocation}
            onChangeText={setPiercingsLocation}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Talla de camisa"
          placeholderTextColor="#aaa"
          value={shirtSize}
          onChangeText={setShirtSize}
        />
        <TextInput
          style={styles.input}
          placeholder="Talla de pantalón"
          placeholderTextColor="#aaa"
          value={pantsSize}
          onChangeText={setPantsSize}
        />
        <TextInput
          style={styles.input}
          placeholder="Talla de zapatos"
          placeholderTextColor="#aaa"
          value={shoeSize}
          onChangeText={setShoeSize}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Instagram (@usuario)"
          placeholderTextColor="#aaa"
          value={instagram ? `@${instagram.replace(/^@/, '')}` : ''}
          onChangeText={(textIt) => setInstagram(textIt.replace(/^@/, ''))}
        />
        <View style={[styles.dropdownWrapper, { zIndex: zIndexCountry }]}>
          <DropDownPicker
            open={openCountry}
            value={country}
            items={countryItems}
            setOpen={(val) => {
              setOpenCountry(val);
              setZIndexCountry(val ? 2000 : 1000);
            }}
            setValue={setCountry}
            placeholder="Selecciona tu país"
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
            textStyle={{ color: '#D8A353', fontSize: 13 }}
            labelStyle={{ color: '#D8A353' }}
            placeholderStyle={{ color: '#888' }}
            arrowIconStyle={{ tintColor: '#D8A353' }}
            listMode="SCROLLVIEW"
            dropDownDirection="AUTO"
            maxHeight={700}
          />
        </View>
        <View style={[styles.dropdownWrapper, { zIndex: zIndexCiudad }]}>
          <DropDownPicker
            open={openCiudad}
            value={ciudad}
            items={ciudadItems}
            setOpen={(val) => {
              setOpenCiudad(val);
              if (val) {
                setOpenSexo(false);
                setOpenEthnicity(false);
                setOpenRegion(false);
                setOpenCountry(false);
              }
              setZIndexCiudad(val ? 3000 : 1100);
            }}
            setValue={setCiudad}
            placeholder="Selecciona tu ciudad"
            placeholderStyle={{ color: '#888' }}
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
            textStyle={{ color: '#D8A353', fontSize: 13 }}
            labelStyle={{ color: '#D8A353' }}
            arrowIconStyle={{ tintColor: '#D8A353' }}
            listMode="SCROLLVIEW"
            dropDownDirection="AUTO"
            maxHeight={550}
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Dirección"
          value={address}
          onChangeText={setAddress}
          placeholderTextColor="#aaa"
        />
        <TextInput
          style={styles.input}
          placeholder="Comuna"
          placeholderTextColor="#aaa"
          value={comuna}
          onChangeText={setComuna}
        />
        <View style={[styles.dropdownWrapper, { zIndex: zIndexRegion }]}>
          <DropDownPicker
            open={openRegion}
            value={region}
            items={regionItems}
            setOpen={(val) => {
              setOpenRegion(val);
              setZIndexRegion(val ? 3000 : 1500);
            }}
            setValue={setRegion}
            placeholder="Selecciona tu región"
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
            textStyle={{ color: '#D8A353', fontSize: 13 }}
            labelStyle={{ color: '#D8A353' }}
            placeholderStyle={{ color: '#888' }}
            arrowIconStyle={{ tintColor: '#D8A353' }}
            listMode="SCROLLVIEW"
            dropDownDirection="AUTO"
            maxHeight={700}
          />
        </View>
        {bookPhotos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bookScroll}>
            {bookPhotos.map((uri, index) => (
              <View key={index} style={styles.bookImageWrapper}>
                <TouchableOpacity onPress={() => {
                  setSelectedImage(uri);
                  setImageModalVisible(true);
                }}>
                  <Image source={{ uri }} style={styles.bookImage} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBookPhoto}
                  onPress={() => setBookPhotos(bookPhotos.filter((_, i) => i !== index))}
                >
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
        <TouchableOpacity style={styles.bookButton} onPress={pickBookPhotos}>
          <Text style={styles.bookButtonText}>Agregar fotos al Book</Text>
        </TouchableOpacity>

    {validandoImagenes && (
  <Text style={{ color: '#D8A353', fontSize: 15, marginTop: 2 }}>
    {validandoTotal > 0
      ? `Validando imágenes con IA (${validandoActual}/${validandoTotal})${puntos}`
      : `Validando imágenes con IA${puntos}`}
  </Text>
)}
  
        <Text style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
          {bookPhotos.length} / 12 fotos subidas
        </Text>
{validandoVideo && (
  <Text style={{ color: '#D8A353', fontSize: 15, marginTop: 2 }}>
    Validando video con IA{puntos}
  </Text>
)}

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
        ) : null}
        <TouchableOpacity style={styles.bookButton} onPress={pickProfileVideo}>
          <Text style={styles.bookButtonText}>Subir Video de Presentación</Text>
        </TouchableOpacity>
        <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 20, marginBottom: -10, alignSelf: 'center' }}>
          * Todos los campos deben estar completos para guardar el perfil.
        </Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <ActivityIndicator color="#000" />
              <Text style={styles.saveButtonText}>  Guardando...</Text>
            </>
          ) : (
            <Text style={styles.saveButtonText}>Guardar Perfil</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      <Modal
        visible={isImageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.fullscreenContainer} onPress={() => setImageModalVisible(false)}>
            <Image source={{ uri: selectedImage }} style={styles.fullscreenImage} />
          </TouchableOpacity>
        </View>
      </Modal>
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar categoría..."
              placeholderTextColor="#aaa"
              value={searchCategory}
              onChangeText={setSearchCategory}
            />
            <ScrollView style={{ maxHeight: '70%' }}>
              {filteredCategories.map((cat, index) => (
                <TouchableOpacity key={index} onPress={() => toggleCategory(cat)}>
                  <Text style={[styles.modalItem, category.includes(cat) && styles.selectedCategory]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalText}>✅ Perfil guardado correctamente</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setModalVisible(false);
                setTimeout(() => {
                  goToProfileTab(navigation);
                }, 300);
              }}
            >
              <Text style={styles.modalButtonText}>Ir a mi perfil</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  container: { alignItems: 'center', paddingBottom: 200, paddingTop: 40 },
  profilePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1B1B1B',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#D8A353',
    borderWidth: 0.5,
    marginBottom: 15,
  },
  placeholderText: { color: '#CCCCCC', textAlign: 'center' },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderColor: '#D8A353',
    borderWidth: 0.5,
    marginBottom: 15,
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
  bookButton: {
    backgroundColor: '#D8A353',
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
  },
  bookButtonText: { color: '#000', fontWeight: 'bold' },
  categorySelector: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 0.5,
    borderRadius: 10,
    width: '90%',
    padding: 12,
    alignItems: 'center',
    marginVertical: 10,
  },
  categoryText: { color: '#D8A353' },
  saveButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 15,
    borderRadius: 10,
    width: '90%',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#000',
    width: '90%',
    borderRadius: 10,
    padding: 20,
    borderColor: '#D8A353',
    borderWidth: 0.5,
    maxHeight: '80%',
  },
  searchInput: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 0.5,
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
  closeModalButton: {
    backgroundColor: '#D8A353',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  closeModalButtonText: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bannerSuccess: {
    position: 'absolute',
    top: 40,
    backgroundColor: '#1B1B1B',
    padding: 10,
    borderRadius: 10,
    borderColor: '#D8A353',
    borderWidth: 0.5,
    alignSelf: 'center',
    zIndex: 1000,
  },
  bannerText: {
    color: '#D8A353',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  videoPreviewContainer: {
    width: '90%',
    alignItems: 'center',
    marginVertical: 10,
    backgroundColor: '#1B1B1B',
    borderWidth: 0.5,
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
    borderWidth: 0.5,
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
  dropdownWrapper: {
    width: '90%',
    marginBottom: 10,
    alignSelf: 'center',
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
    borderRadius: 10,
  },
  bookScroll: {
    width: '90%',
    marginBottom: 10,
  },
  bookImageWrapper: {
    position: 'relative',
    marginRight: 10,
    marginTop: 30,
  },
  bookImage: {
    width: 100,
    height: 140,
    borderRadius: 8,
    borderColor: '#D8A353',
    borderWidth: 0.5,
  },
  deleteBookPhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#000',
    borderRadius: 10,
    padding: 2,
  },
  deleteIcon: {
    color: '#D8A353',
    fontSize: 14,
  },
  fullscreenContainer: {
    width: '90%',
    height: '80%',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  label: {
    color: '#aaa',
    alignSelf: 'flex-start',
    marginLeft: '10%',
    marginBottom: 4,
    fontSize: 13,
  },
  modalBox: {
    backgroundColor: '#1B1B1B',
    borderRadius: 10,
    padding: 20,
    borderWidth: 0.5,
    borderColor: '#D8A353',
    width: '80%',
    alignItems: 'center',
  },
  modalText: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: 'bold',
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
    fontSize: 14,
    textAlign: 'center',
  },
});