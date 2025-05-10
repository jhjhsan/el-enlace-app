import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, Animated } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useUser } from '../contexts/UserContext';
import BottomBar from '../components/BottomBar';
import { saveUserProfile } from '../utils/profileStorage';
import DropDownPicker from 'react-native-dropdown-picker';

export default function CompleteProfileScreen({ navigation }) {
  const { userData, setUserData } = useUser();

  const [profilePhoto, setProfilePhoto] = useState(userData?.profilePhoto || null);
  const [name, setName] = useState(userData?.name || '');
  const [sex, setSex] = useState(userData?.sex || '');
  const [age, setAge] = useState(userData?.age || '');
  const [height, setHeight] = useState(userData?.height || '');
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
  const [category, setCategory] = useState(
    Array.isArray(userData?.category) ? userData.category : []);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [searchCategory, setSearchCategory] = useState('');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const bannerOpacity = useState(new Animated.Value(0))[0];
  const [profileVideo, setProfileVideo] = useState(userData?.profileVideo || null);
  const [country, setCountry] = useState(userData?.country || '');
  const [city, setCity] = useState(userData?.city || '');
  const [address, setAddress] = useState(userData?.address || '');
  const [ethnicity, setEthnicity] = useState(userData?.ethnicity || '');
  const [region, setRegion] = useState(userData?.region || '');
  const [openEthnicity, setOpenEthnicity] = useState(false);
  const [openRegion, setOpenRegion] = useState(false);
  const [zIndexEthnicity, setZIndexEthnicity] = useState(900);
  const [zIndexRegion, setZIndexRegion] = useState(800);
  
  const ethnicityItems = [
    { label: 'Afrodescendiente', value: 'afrodescendiente' },
    { label: 'Caucásico', value: 'caucasico' },
    { label: 'Latino', value: 'latino' },
    { label: 'Asiático', value: 'asiatico' },
    { label: 'Indígena', value: 'indigena' },
    { label: 'Otro', value: 'otro' },
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
  
  
  // Lista de categorías (reemplaza con tus categorías si las tienes)
  const categoriesList = [
  "Actor",
  "Actriz",
  "Agencia de casting",
  "Agencia de modelos",
  "Ambientador",
  "Animador / presentador",
  "Artista urbano",
  "Asistente de cámara",
  "Asistente de dirección",
  "Asistente de producción",
  "Asistente de vestuario",
  "Autos clásicos para escenas",
  "Autos personales",
  "Bailarín / bailarina",
  "Camiones de arte para rodajes",
  "Camarógrafo",
  "Caracterizador (maquillaje FX)",
  "Casas rodantes para producción",
  "Coffee break / snacks",
  "Colorista",
  "Community manager",
  "Continuista",
  "Coordinador de locaciones",
  "Creador de contenido digital",
  "Decorador de set",
  "Diseñador de arte",
  "Diseñador gráfico",
  "Doble de acción",
  "Editor de video",
  "Escenógrafo",
  "Estudio fotográfico",
  "Extra",
  "Fotógrafo de backstage",
  "Grúas para filmación",
  "Iluminador",
  "Ilustrador / storyboarder",
  "Maquillista",
  "Microfonista",
  "Modelo",
  "Modelo publicitario",
  "Motos o bicicletas para escenas",
  "Niño actor",
  "Operador de drone",
  "Peluquero / estilista",
  "Postproductor",
  "Productor",
  "Promotoras",
  "Servicios de catering",
  "Sonidista",
  "Stage manager",
  "Técnico de efectos especiales",
  "Técnico de grúa",
  "Transporte de producción",
  "Transporte de talentos",
  "Vans de producción",
  "Vestuarista",
  "Otros / No especificado"
  ];

  const pickProfilePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setProfilePhoto(uri);
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
      const totalFotos = [...bookPhotos, ...uris].slice(0, 12);
      setBookPhotos(totalFotos);
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
      const videoAsset = result.assets[0];
      const uri = videoAsset.uri;

      if (!uri.startsWith('file://')) {
        alert('El archivo no se puede acceder. Intenta seleccionar un video compatible.');
        return;
      }

      const fileName = uri.split('/').pop();
      const newPath = `${FileSystem.documentDirectory}${fileName}`;

      try {
        await FileSystem.copyAsync({
          from: uri,
          to: newPath,
        });
        setProfileVideo(newPath);
      } catch (error) {
        console.log('Error al guardar el video:', error);
        alert('Error al guardar el video. Intenta nuevamente.');
      }
    }
  };

  const toggleCategory = (cat) => {
    setCategory(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSave = async () => {
    if (!name || !profilePhoto || category.length === 0) {
      alert('Completa los campos obligatorios antes de continuar.');
      return;
    }
    console.log('REGIÓN A GUARDAR:', region);
    
    const profileData = {
      profilePhoto,
      name,
      sex,
      age,
      height,
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
      city,
      address,
      ethnicity,
      region,
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

  return (
    <View style={styles.screen}>
      {showSuccessBanner && (
        <Animated.View style={[styles.bannerSuccess, { opacity: bannerOpacity }]}>
          <Text style={styles.bannerText}>✅ Perfil actualizado exitosamente</Text>
        </Animated.View>
      )}
      <ScrollView contentContainerStyle={styles.container}>
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
        <TextInput
          style={styles.input}
          placeholder="Sexo"
          placeholderTextColor="#aaa"
          value={sex}
          onChangeText={setSex}
        />
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
          value={height}
          onChangeText={setHeight}
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
        <TextInput
          style={styles.input}
          placeholder="Tatuajes visibles (Sí/No)"
          placeholderTextColor="#aaa"
          value={tattoos}
          onChangeText={setTattoos}
        />
        {tattoos.trim().toLowerCase() === 'si' && (
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
        {piercings.trim().toLowerCase() === 'si' && (
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
        <TextInput
          style={styles.input}
          placeholder="País"
          value={country}
          onChangeText={setCountry}
          placeholderTextColor="#aaa"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Ciudad"
          value={city}
          onChangeText={setCity}
          placeholderTextColor="#aaa"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Dirección"
          value={address}
          onChangeText={setAddress}
          placeholderTextColor="#aaa"
        />
        <View style={[styles.dropdownWrapper, { zIndex: zIndexRegion }]}>
          <DropDownPicker
            open={openRegion}
            value={region}
            items={regionItems}
            setOpen={(val) => {
              setOpenRegion(val);
              setZIndexRegion(val ? 2000 : 800);
            }}
            setValue={setRegion}
            placeholder="Selecciona tu región"
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
    listMode="SCROLLVIEW"
  />
</View>

        <TouchableOpacity style={styles.bookButton} onPress={pickBookPhotos}>
          <Text style={styles.bookButtonText}>Agregar fotos al Book</Text>
        </TouchableOpacity>
       
        {profileVideo && (
          <View style={styles.videoPreviewContainer}>
            <Video
              source={{ uri: profileVideo }}
              useNativeControls
              resizeMode="cover"
              style={styles.videoPreview}
            />
            <TouchableOpacity
              style={styles.deleteVideoButton}
              onPress={() => setProfileVideo(null)}
            >
              <Text style={styles.deleteVideoText}>🗑️ Eliminar Video</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.bookButton} onPress={pickProfileVideo}>
          <Text style={styles.bookButtonText}>Subir Video de Presentación</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.categorySelector}
          onPress={() => setShowCategoryModal(true)}
        >
          <Text style={styles.categoryText}>
            {category.length > 0 ? category.join(', ') : 'Seleccionar Categorías*'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Guardar Perfil</Text>
        </TouchableOpacity>
      </ScrollView>

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
                <TouchableOpacity
                  key={index}
                  onPress={() => toggleCategory(cat)}
                >
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
              style={styles.closeModalButton}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  container: { alignItems: 'center', paddingBottom: 150, paddingTop: 40 },
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
    marginTop: 30,
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
  },
  dropdownContainer: {
    backgroundColor: '#000',
    borderColor: '#D8A353',
    maxHeight: 700, // 👈 Asegúrate de que esto esté dentro del objeto
  },
});
