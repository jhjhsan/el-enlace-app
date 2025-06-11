import { Video } from 'expo-av';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import DropDownPicker from 'react-native-dropdown-picker';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function EditProfileScreen({ navigation }) {
  const { userData, setUserData } = useUser();

  const [profilePhoto, setProfilePhoto] = useState(userData?.profilePhoto || null);
  const [name, setName] = useState(userData?.name || '');
  const [selectedCategories, setSelectedCategories] = useState(userData?.category ? userData.category.split(', ').filter(Boolean) : []);
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
  const [profileVideo, setProfileVideo] = useState(userData?.profileVideo || null);
  const [open, setOpen] = useState(false);
  const [zIndex, setZIndex] = useState(1000);
  const [country, setCountry] = useState(userData?.country || '');
  const [city, setCity] = useState(userData?.city || '');
  const [address, setAddress] = useState(userData?.address || '');
  const [commune, setCommune] = useState(userData?.commune || '');
  const [ethnicity, setEthnicity] = useState(userData?.ethnicity || '');
  const [region, setRegion] = useState(userData?.region || '');
  const [openEthnicity, setOpenEthnicity] = useState(false);
  const [openRegion, setOpenRegion] = useState(false);
  const [zIndexEthnicity, setZIndexEthnicity] = useState(900);
  const [zIndexRegion, setZIndexRegion] = useState(800);

  useEffect(() => {
    const checkStoredVideo = async () => {
      try {
        const json = await AsyncStorage.getItem('userProfileElite');
        if (json) {
          const profile = JSON.parse(json);
          const videoPath = profile.profileVideo;
          if (videoPath) {
            const fileInfo = await FileSystem.getInfoAsync(videoPath);
            if (fileInfo.exists) {
              setProfileVideo(videoPath);
            } else {
              console.log('⚠️ El video no se encuentra disponible en el sistema de archivos.');
              setProfileVideo(null);
            }
          }
        }
      } catch (err) {
        console.log('Error verificando el video:', err);
      }
    };
  
    checkStoredVideo();
  }, []);
  

  categorias = [
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

  const handleSave = async () => {
    if (selectedCategories.length === 0) {
      alert('Debes seleccionar al menos una categoría.');
      return;
    }
    console.log('REGIÓN A GUARDAR:', region);

    const updatedProfile = {
      profilePhoto,
      name,
      category: selectedCategories.join(', '),
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
      membershipType: 'pro',
      country,
      city,
      address,
      commune,
      ethnicity,
      region,
    };

    try {
      await AsyncStorage.setItem('userProfileElite', JSON.stringify(userProfilePro));

      setUserData(updatedProfile);
      navigation.navigate('MainTabs', { screen: 'ProfileTab' });
    } catch (err) {
      console.log('Error al guardar:', err);
    }
  };

  const handleDeletePhoto = (index) => {
    const updated = [...bookPhotos];
    updated.splice(index, 1);
    setBookPhotos(updated);
  };

  return (
    
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <TouchableOpacity
  onPress={() => navigation.goBack()}
  style={{
    position: 'absolute',
    top: 15,
    left: 20,
    zIndex: 2000,
  }}
>
  <Ionicons name="arrow-back" size={28} color="#fff" />
</TouchableOpacity>

      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          paddingBottom: open || openEthnicity || openRegion ? 850 : 120,
          paddingTop: 40,
        }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
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
          placeholder="Nombre completo"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#aaa"
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
        <TextInput
          style={styles.input}
          placeholder="Comuna"
          value={commune}
          onChangeText={setCommune}
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

        <TextInput style={styles.input} placeholder="Sexo" value={sex} onChangeText={setSex} placeholderTextColor="#aaa" />
        <TextInput style={styles.input} placeholder="Edad" value={age} onChangeText={setAge} placeholderTextColor="#aaa" />
        <TextInput style={styles.input} placeholder="Estatura" value={height} onChangeText={setHeight} placeholderTextColor="#aaa" />
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
            itemStyle={{ paddingVertical: 6 }}
            arrowIconStyle={{ tintColor: '#D8A353' }}
            listMode="SCROLLVIEW"
            dropDownDirection="AUTO"
          />
        </View>
        <TextInput style={styles.input} placeholder="Color de piel" value={skinColor} onChangeText={setSkinColor} placeholderTextColor="#aaa" />
        <TextInput style={styles.input} placeholder="Color de ojos" value={eyeColor} onChangeText={setEyeColor} placeholderTextColor="#aaa" />
        <TextInput style={styles.input} placeholder="Color de cabello" value={hairColor} onChangeText={setHairColor} placeholderTextColor="#aaa" />
        <TextInput style={styles.input} placeholder="Tatuajes" value={tattoos} onChangeText={setTattoos} placeholderTextColor="#aaa" />
        <TextInput style={styles.input} placeholder="Ubicación tatuajes" value={tattoosLocation} onChangeText={setTattoosLocation} placeholderTextColor="#aaa" />
        <TextInput style={styles.input} placeholder="Piercings" value={piercings} onChangeText={setPiercings} placeholderTextColor="#aaa" />
        <TextInput style={styles.input} placeholder="Ubicación piercings" value={piercingsLocation} onChangeText={setPiercingsLocation} placeholderTextColor="#aaa" />
        <TextInput style={styles.input} placeholder="Talla de camisa" value={shirtSize} onChangeText={setShirtSize} placeholderTextColor="#aaa" />
        <TextInput style={styles.input} placeholder="Talla de pantalón" value={pantsSize} onChangeText={setPantsSize} placeholderTextColor="#aaa" />
        <TextInput style={styles.input} placeholder="Talla de zapatos" value={shoeSize} onChangeText={setShoeSize} placeholderTextColor="#aaa" />
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} placeholderTextColor="#aaa" />
        <TextInput style={styles.input} placeholder="Teléfono" value={phone} onChangeText={setPhone} placeholderTextColor="#aaa" />
        <TextInput style={styles.input} placeholder="Instagram" value={instagram} onChangeText={setInstagram} placeholderTextColor="#aaa" />

        <View style={styles.galleryContainer}>
          {bookPhotos.map((uri, index) => (
            <View key={index} style={styles.photoItem}>
              <Image source={{ uri }} style={styles.galleryImage} />
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeletePhoto(index)}>
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <Text style={styles.photoCounter}>📷 {bookPhotos.length} / 12 fotos subidas</Text>

        <TouchableOpacity style={styles.bookButton} onPress={pickBookPhotos}>
          <Text style={styles.bookButtonText}>Agregar fotos al Book</Text>
        </TouchableOpacity>

        <Text style={{ color: profileVideo ? '#D8A353' : '#888', marginTop: 10 }}>
          🎥 {profileVideo ? '1 video subido' : 'Ningún video cargado aún'}
        </Text>

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

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Guardar Cambios</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderColor: '#D8A353',
    borderWidth: 2,
    marginBottom: 15,
  },
  profilePlaceholder: {
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
  placeholderText: { color: '#CCCCCC', textAlign: 'center' },
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
  galleryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 10,
  },
  photoItem: {
    position: 'relative',
    margin: 5,
  },
  galleryImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
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
    height: 170,
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
  photoCounter: {
    color: '#D8A353',
    fontSize: 14,
    marginBottom: 5,
    fontWeight: 'bold',
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
});