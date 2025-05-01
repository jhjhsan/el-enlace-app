import { Video } from 'expo-av';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomBar from '../components/BottomBar';
import * as FileSystem from 'expo-file-system';

export default function EditProfileScreen({ navigation }) {
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
  const [profileVideo, setProfileVideo] = useState(userData?.profileVideo || null);

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
      const fileName = videoAsset.uri.split('/').pop();
      const newPath = `${FileSystem.documentDirectory}${fileName}`;
  
      try {
        await FileSystem.copyAsync({
          from: videoAsset.uri,
          to: newPath,
        });
        setProfileVideo(newPath);
      } catch (error) {
        console.log('Error al guardar el video:', error);
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
    const updatedProfile = {
      profilePhoto, name, sex, age, height, skinColor, eyeColor, hairColor,
      tattoos, tattoosLocation, piercings, piercingsLocation, shirtSize,
      pantsSize, shoeSize, email, phone, instagram, bookPhotos, profileVideo,
    };
    try {
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      setUserData(updatedProfile);
      navigation.navigate('ProfilePro');
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
    <View style={styles.screen}>
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

        <TextInput style={styles.input} placeholder="Nombre completo" value={name} onChangeText={setName} placeholderTextColor="#aaa" />
        <TextInput style={styles.input} placeholder="Sexo" value={sex} onChangeText={setSex} placeholderTextColor="#aaa" />
        <TextInput style={styles.input} placeholder="Edad" value={age} onChangeText={setAge} placeholderTextColor="#aaa" />
        <TextInput style={styles.input} placeholder="Estatura" value={height} onChangeText={setHeight} placeholderTextColor="#aaa" />
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
        <Text style={styles.photoCounter}>
  📷 {bookPhotos.length} / 10 fotos subidas
</Text>

<TouchableOpacity style={styles.bookButton} onPress={pickBookPhotos}>
  <Text style={styles.bookButtonText}>Agregar fotos al Book</Text>
</TouchableOpacity>

<Text
  style={[
    styles.videoInfoText,
    { color: profileVideo ? '#D8A353' : '#888' }
  ]}
>
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
      <BottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  container: { alignItems: 'center', paddingBottom: 120, paddingTop: 40 },
  profileImage: {
    width: 100,
    height: 100,
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
  photoCounter: {
    color: '#D8A353',
    fontSize: 14,
    marginBottom: 5,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
 
});
