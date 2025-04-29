import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, Animated } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '../contexts/UserContext';
import BottomBar from '../components/BottomBar';

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
  const [category, setCategory] = useState(userData?.category || []);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [searchCategory, setSearchCategory] = useState('');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const bannerOpacity = useState(new Animated.Value(0))[0];

  const categoriesList = [ /* tus categorías aquí */ ];

  const pickProfilePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
    if (!result.canceled) setProfilePhoto(result.assets[0].uri);
  };

  const pickBookPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 1 });
    if (!result.canceled) {
      const uris = result.assets.map(asset => asset.uri);
      setBookPhotos([...bookPhotos, ...uris]);
    }
  };

  const toggleCategory = (cat) => {
    setCategory(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const handleSave = () => {
    if (!name || !profilePhoto || category.length === 0) return;

    setUserData({
      profilePhoto, name, sex, age, height, skinColor, eyeColor, hairColor,
      tattoos, tattoosLocation, piercings, piercingsLocation,
      shirtSize, pantsSize, shoeSize, email, phone, instagram, bookPhotos, category
    });

    setShowSuccessBanner(true);
    Animated.sequence([
      Animated.timing(bannerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(bannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      setShowSuccessBanner(false);
      navigation.navigate('ProfilePro');
    });
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

        <TextInput style={styles.input} placeholder="Nombre completo*" placeholderTextColor="#aaa" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Sexo" placeholderTextColor="#aaa" value={sex} onChangeText={setSex} />
        <TextInput style={styles.input} placeholder="Edad" placeholderTextColor="#aaa" value={age} onChangeText={setAge} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="Estatura (cm)" placeholderTextColor="#aaa" value={height} onChangeText={setHeight} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="Color de piel" placeholderTextColor="#aaa" value={skinColor} onChangeText={setSkinColor} />
        <TextInput style={styles.input} placeholder="Color de ojos" placeholderTextColor="#aaa" value={eyeColor} onChangeText={setEyeColor} />
        <TextInput style={styles.input} placeholder="Color de cabello" placeholderTextColor="#aaa" value={hairColor} onChangeText={setHairColor} />
        
        {/* Campo Tatuajes visibles */}
        <TextInput style={styles.input} placeholder="Tatuajes visibles (Sí/No)" placeholderTextColor="#aaa" value={tattoos} onChangeText={setTattoos} />
        {tattoos.trim().toLowerCase() === 'si' && (
          <TextInput style={styles.input} placeholder="¿Dónde tienes tatuajes?" placeholderTextColor="#aaa" value={tattoosLocation} onChangeText={setTattoosLocation} />
        )}

        {/* Campo Piercings visibles */}
        <TextInput style={styles.input} placeholder="Piercings visibles (Sí/No)" placeholderTextColor="#aaa" value={piercings} onChangeText={setPiercings} />
        {piercings.trim().toLowerCase() === 'si' && (
          <TextInput style={styles.input} placeholder="¿Dónde tienes piercings?" placeholderTextColor="#aaa" value={piercingsLocation} onChangeText={setPiercingsLocation} />
        )}

        <TextInput style={styles.input} placeholder="Talla de camisa" placeholderTextColor="#aaa" value={shirtSize} onChangeText={setShirtSize} />
        <TextInput style={styles.input} placeholder="Talla de pantalón" placeholderTextColor="#aaa" value={pantsSize} onChangeText={setPantsSize} />
        <TextInput style={styles.input} placeholder="Talla de zapatos" placeholderTextColor="#aaa" value={shoeSize} onChangeText={setShoeSize} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#aaa" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Teléfono" placeholderTextColor="#aaa" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholder="Instagram (@usuario)" placeholderTextColor="#aaa" value={instagram} onChangeText={setInstagram} />

        <TouchableOpacity style={styles.bookButton} onPress={pickBookPhotos}>
          <Text style={styles.bookButtonText}>Agregar fotos al Book</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.categorySelector} onPress={() => setShowCategoryModal(true)}>
          <Text style={styles.categoryText}>
            {category.length > 0 ? category.join(', ') : 'Seleccionar Categorías*'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Guardar Perfil</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de categorías y BottomBar se mantienen igual */}
      {/* Aquí sigue igual tu modal de categorías */}
      <BottomBar />
    </View>
  );
}

// Styles igual que tenías, + agregamos solo lo del banner arriba (top:40)
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  container: { alignItems: 'center', paddingBottom: 120, paddingTop: 40 },
  profilePlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#1B1B1B', justifyContent: 'center', alignItems: 'center', borderColor: '#D8A353', borderWidth: 2, marginBottom: 15 },
  placeholderText: { color: '#CCCCCC', textAlign: 'center' },
  profileImage: { width: 120, height: 120, borderRadius: 60, borderColor: '#D8A353', borderWidth: 2, marginBottom: 15 },
  input: { width: '80%', backgroundColor: '#1B1B1B', color: '#fff', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#D8A353' },
  bookButton: { backgroundColor: '#D8A353', borderRadius: 10, padding: 10, marginVertical: 10 },
  bookButtonText: { color: '#000', fontWeight: 'bold' },
  categorySelector: { backgroundColor: '#1B1B1B', borderColor: '#D8A353', borderWidth: 1, borderRadius: 10, width: '80%', padding: 12, alignItems: 'center', marginVertical: 10 },
  categoryText: { color: '#D8A353' },
  saveButton: { backgroundColor: '#D8A353', paddingVertical: 15, borderRadius: 10, width: '80%', marginTop: 30 },
  saveButtonText: { color: '#000', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: '#000000CC', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#000', width: '80%', borderRadius: 10, padding: 20, borderColor: '#D8A353', borderWidth: 2, maxHeight: '80%' },
  searchInput: { backgroundColor: '#1B1B1B', borderColor: '#D8A353', borderWidth: 1, borderRadius: 10, padding: 8, marginBottom: 10, color: '#fff' },
  modalItem: { color: '#D8A353', fontSize: 16, paddingVertical: 8, textAlign: 'center' },
  selectedCategory: { fontWeight: 'bold', color: '#D8A353', textDecorationLine: 'underline' },
  closeModalButton: { backgroundColor: '#D8A353', padding: 10, borderRadius: 10, marginTop: 10 },
  closeModalButtonText: { color: '#000', fontWeight: 'bold', textAlign: 'center' },
  bannerSuccess: { position: 'absolute', top: 40, backgroundColor: '#1B1B1B', padding: 10, borderRadius: 10, borderColor: '#D8A353', borderWidth: 1, alignSelf: 'center', zIndex: 1000 },
  bannerText: { color: '#D8A353', fontWeight: 'bold', textAlign: 'center' },
});
