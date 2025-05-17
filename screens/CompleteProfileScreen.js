import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Image, Animated, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useUser } from '../contexts/UserContext';
import BottomBar from '../components/BottomBar';
import { saveUserProfile } from '../utils/profileStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DropDownPicker from 'react-native-dropdown-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Ionicons } from '@expo/vector-icons';

export default function CompleteProfileScreen({ navigation }) {
  const { userData, setUserData } = useUser();

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
  const [instagram, setInstagram] = useState(userData?.instagram || '');
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
    { label: 'Argentina', value: 'Argentina' },
    { label: 'Perú', value: 'Perú' },
    { label: 'Colombia', value: 'Colombia' },
    { label: 'México', value: 'México' },
    { label: 'Venezuela', value: 'Venezuela' },
    { label: 'Brasil', value: 'Brasil' },
    { label: 'Uruguay', value: 'Uruguay' },
    { label: 'Ecuador', value: 'Ecuador' },
    { label: 'Bolivia', value: 'Bolivia' },
    { label: 'Paraguay', value: 'Paraguay' },
    { label: 'Costa Rica', value: 'Costa Rica' },
    { label: 'República Dominicana', value: 'República Dominicana' },
    { label: 'Puerto Rico', value: 'Puerto Rico' },
    { label: 'España', value: 'España' },
    { label: 'Otro', value: 'Otro' },
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
    "Actor", "Actriz", "Agencia de casting", "Agencia de modelos", "Ambientador",
    "Animador / presentador", "Artista urbano", "Asistente de cámara", "Asistente de dirección",
    "Asistente de producción", "Asistente de vestuario", "Autos clásicos para escenas",
    "Autos personales", "Bailarín / bailarina", "Camiones de arte para rodajes", "Camarógrafo",
    "Caracterizador (maquillaje FX)", "Casas rodantes para producción", "Coffee break / snacks",
    "Colorista", "Community manager", "Continuista", "Coordinador de locaciones",
    "Creador de contenido digital", "Decorador de set", "Diseñador de arte", "Diseñador gráfico",
    "Doble de acción", "Editor de video", "Escenógrafo", "Estudio fotográfico", "Extra",
    "Fotógrafo de backstage", "Grúas para filmación", "Iluminador", "Ilustrador / storyboarder",
    "Maquillista", "Microfonista", "Modelo", "Modelo publicitario", "Motos o bicicletas para escenas",
    "Niño actor", "Operador de drone", "Peluquero / estilista", "Postproductor", "Productor",
    "Promotoras", "Servicios de catering", "Sonidista", "Stage manager", "Técnico de efectos especiales",
    "Técnico de grúa", "Transporte de producción", "Transporte de talentos", "Vans de producción",
    "Vestuarista", "Otros / No especificado"
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
          // Validación del video
          if (profile.profileVideo) {
            const fileInfo = await FileSystem.getInfoAsync(profile.profileVideo);
            if (fileInfo.exists) {
              setProfileVideo(profile.profileVideo);
            } else {
              setProfileVideo(null);
              console.warn('⚠️ El video guardado no existe en el sistema de archivos.');
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

  const pickProfilePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (!result.canceled && result.assets.length > 0) {
        setProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error al seleccionar la foto de perfil:', error);
      alert('Error al seleccionar la foto. Intenta nuevamente.');
    }
  };

  const pickBookPhotos = async () => {
    if (bookPhotos.length >= 12) {
      alert('Solo puedes subir hasta 12 fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map(asset => asset.uri);
      setBookPhotos([...bookPhotos, ...uris].slice(0, 12));
    }
  };

  const pickProfileVideo = async () => {
    if (profileVideo) {
      alert('Ya has subido un video. Elimínalo si deseas subir otro.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri;

      if (!uri.startsWith('file://')) {
        alert('El archivo no se puede acceder. Intenta seleccionar un video compatible.');
        return;
      }

      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        const maxFileSizeBytes = 100 * 1024 * 1024;
        if (fileInfo.size > maxFileSizeBytes) {
          alert('El video supera los 100 MB. Intenta seleccionar uno más liviano.');
          return;
        }

        const fileName = uri.split('/').pop();
        const newPath = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.copyAsync({ from: uri, to: newPath });

        const { duration } = await VideoThumbnails.getThumbnailAsync(newPath, { time: 1000 });
        const durationInSeconds = duration / 1000;

        if (durationInSeconds > 120) {
          alert('El video no debe superar los 2 minutos de duración.');
          await FileSystem.deleteAsync(newPath);
          return;
        }

        setProfileVideo(newPath);
        console.log('✅ Video guardado:', newPath);
      } catch (error) {
        console.log('❌ Error al procesar el video:', error);
        alert('Error al guardar o procesar el video. Intenta nuevamente.');
      }
    }
  };

  const handleSave = async () => {
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
      return;
    }
  
    if (category.length === 0) {
      alert('Debes seleccionar al menos una categoría.');
      return;
    }
  
    if (bookPhotos.length === 0) {
      alert('Debes subir al menos 1 foto al book.');
      return;
    }
  
    if (!profileVideo) {
      alert('Debes subir un video de presentación.');
      return;
    }
  
    const yesValues = ['si', 'sí', 'sí.', 'Si', 'Sí', 'Sí.', 'SI', 'SÍ', 'SÍ.'];
  
    const hasPiercings = yesValues.includes(piercings.trim());
    if (hasPiercings && !piercingsLocation.trim()) {
      alert('Por favor indica la ubicación de tus piercings.');
      return;
    }
  
    const hasTattoos = yesValues.includes(tattoos.trim());
    if (hasTattoos && !tattoosLocation.trim()) {
      alert('Por favor indica la ubicación de tus tatuajes.');
      return;
    }
  
    if (instagram && !instagram.trim().startsWith('@')) {
      alert('Tu usuario de Instagram debe comenzar con @');
      return;
    }
  
    if (isNaN(Number(age))) {
      alert('Por favor ingresa una edad válida en números.');
      return;
    }
  
    if (isNaN(Number(estatura))) {
      alert('Por favor ingresa una estatura válida en centímetros.');
      return;
    }
  
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Por favor ingresa un correo electrónico válido.');
      return;
    }
  
    const allowedExtensions = ['.mp4', '.mov', '.avi', '.mkv'];
    const extension = profileVideo.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(`.${extension}`)) {
      alert('El video debe ser .mp4, .mov, .avi o .mkv');
      return;
    }
  
    const profileData = {
      profilePhoto,
      name,
      sexo,
      age,
      estatura,
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
      email,
      phone,
      instagram,
      bookPhotos,
      profileVideo,
      category,
      country,
      ciudad,
      address,
      ethnicity,
      region,
      comuna,
    };
  
    const success = await saveUserProfile(profileData, 'pro', setUserData);
  
    if (success) {
      setShowSuccessBanner(true);
      Animated.sequence([
        Animated.timing(bannerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(bannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => {
        setShowSuccessBanner(false);
        navigation.navigate('ProfilePro');
      });
    } else {
      alert('Hubo un problema al guardar tu perfil. Intenta de nuevo.');
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
          placeholder="Edad"
          placeholderTextColor="#aaa"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
        />
       <TextInput
  style={styles.input}
  placeholder="Estatura (cm)"
  placeholderTextColor="#aaa"
  value={estatura}
  onChangeText={setEstatura}
  keyboardType="numeric"
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
  placeholder="Teléfono"
  placeholderTextColor="#aaa"
  value={phone}
  onChangeText={setPhone}
  keyboardType="phone-pad"
/>
        <TextInput
          style={styles.input}
          placeholder="Instagram (@usuario)"
          placeholderTextColor="#aaa"
          value={instagram}
          onChangeText={setInstagram}
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
    listMode="SCROLLVIEW" // 👈 vuelve al modo menú interno
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
              setZIndexRegion(val ? 3000 :1500);
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
        <Text style={{ color: '#aaa', fontSize: 12, marginTop: -4 }}>
          {bookPhotos.length} / 12 fotos subidas
        </Text>
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
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Guardar Perfil</Text>
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
    borderWidth: 2,
    marginBottom: 15,
  },
  placeholderText: { color: '#CCCCCC', textAlign: 'center' },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderColor: '#D8A353',
    borderWidth: 2,
    marginBottom: 15,
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
    borderWidth: 1,
    borderRadius: 10,
    width: '80%',
    padding: 12,
    alignItems: 'center',
    marginVertical: 10,
  },
  categoryText: { color: '#D8A353' },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#000',
    width: '80%',
    borderRadius: 10,
    padding: 20,
    borderColor: '#D8A353',
    borderWidth: 2,
    maxHeight: '80%',
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
    borderWidth: 1,
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
  dropdownWrapper: {
    width: '80%',
    marginBottom: 10,
    alignSelf: 'center',
  },
  dropdown: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
  },
  dropdownContainer: {
    backgroundColor: '#000',
    borderColor: '#D8A353',
    borderWidth: 1,
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
    borderWidth: 1,
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
  
});