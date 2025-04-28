import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '../contexts/UserContext';
import BottomBar from '../components/BottomBar';

export default function CompleteProfileScreen({ navigation }) {
  const { setUserData } = useUser();

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [name, setName] = useState('');
  const [sex, setSex] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [skinColor, setSkinColor] = useState('');
  const [eyeColor, setEyeColor] = useState('');
  const [hairColor, setHairColor] = useState('');
  const [tattoos, setTattoos] = useState('');
  const [shirtSize, setShirtSize] = useState('');
  const [pantsSize, setPantsSize] = useState('');
  const [shoeSize, setShoeSize] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [bookPhotos, setBookPhotos] = useState([]);
  const [category, setCategory] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [searchCategory, setSearchCategory] = useState('');

  const categoriesList = [
    'Actor', 'Actriz', 'Agencias de casting', 'Ambientador', 'Animador / Presentador', 'Artista urbano',
    'Asistente de cámara', 'Asistente de dirección', 'Asistente de producción', 'Asistente de vestuario',
    'Autos clásicos para escenas', 'Autos personales', 'Bailarín', 'Camarógrafo', 'Casas rodante',
    'Coffee break / Snacks', 'Community manager', 'Continuista', 'Coordinador de locaciones',
    'Creadores de contenido digital', 'Decorador de set', 'Diseñador de arte', 'Diseñador gráfico',
    'Doble de acción', 'Editor de video', 'Escenógrafo', 'Extra', 'Fotógrafo', 'Fotógrafo de backstage',
    'Grúa para filmación', 'Iluminador', 'Ilustrador / Storyboarder', 'Maquillador', 'Microfonista',
    'Modelo', 'Modelo publicitario', 'Motos y bicicletas para escenas', 'Niños actores', 'Operador de drone',
    'Peluquero / Estilista', 'Postproductor', 'Productor', 'Servicios de catering', 'Sonidista', 'Stage manager',
    'Técnico de efectos especiales', 'Técnico de grúa', 'Transporte de talentos', 'Transporte de producción',
    'Vans de producción', 'Dueños de locaciones', 'Estudios fotográficos', 'Otros / No especificado'
  ];

  const pickProfilePhoto = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const pickBookPhotos = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (!result.canceled) {
      const uris = result.assets.map(asset => asset.uri);
      setBookPhotos([...bookPhotos, ...uris]);
    }
  };

  const toggleCategory = (cat) => {
    if (category.includes(cat)) {
      setCategory(category.filter(c => c !== cat));
    } else {
      setCategory([...category, cat]);
    }
  };

  const handleSave = () => {
    if (!name || !profilePhoto || category.length === 0) {
      Alert.alert('Completa todos los campos obligatorios');
      return;
    }

    setUserData({
      profilePhoto,
      name,
      sex,
      age,
      height,
      skinColor,
      eyeColor,
      hairColor,
      tattoos,
      shirtSize,
      pantsSize,
      shoeSize,
      email,
      phone,
      instagram,
      bookPhotos,
      category,
    });

    Alert.alert('✅ Perfil guardado exitosamente');
    navigation.navigate('ProfilePro');
  };

  const filteredCategories = categoriesList.filter(cat =>
    cat.toLowerCase().includes(searchCategory.toLowerCase())
  );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Foto de perfil */}
        <TouchableOpacity onPress={pickProfilePhoto}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.placeholderText}>Agregar Foto de Perfil</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Inputs */}
        <TextInput style={styles.input} placeholder="Nombre completo*" placeholderTextColor="#aaa" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Sexo" placeholderTextColor="#aaa" value={sex} onChangeText={setSex} />
        <TextInput style={styles.input} placeholder="Edad" placeholderTextColor="#aaa" value={age} onChangeText={setAge} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="Estatura (cm)" placeholderTextColor="#aaa" value={height} onChangeText={setHeight} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="Color de piel" placeholderTextColor="#aaa" value={skinColor} onChangeText={setSkinColor} />
        <TextInput style={styles.input} placeholder="Color de ojos" placeholderTextColor="#aaa" value={eyeColor} onChangeText={setEyeColor} />
        <TextInput style={styles.input} placeholder="Color de cabello" placeholderTextColor="#aaa" value={hairColor} onChangeText={setHairColor} />
        <TextInput style={styles.input} placeholder="Tatuajes visibles (¿Dónde?)" placeholderTextColor="#aaa" value={tattoos} onChangeText={setTattoos} />
        <TextInput style={styles.input} placeholder="Talla de camisa" placeholderTextColor="#aaa" value={shirtSize} onChangeText={setShirtSize} />
        <TextInput style={styles.input} placeholder="Talla de pantalón" placeholderTextColor="#aaa" value={pantsSize} onChangeText={setPantsSize} />
        <TextInput style={styles.input} placeholder="Talla de zapatos" placeholderTextColor="#aaa" value={shoeSize} onChangeText={setShoeSize} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#aaa" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Teléfono" placeholderTextColor="#aaa" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholder="Instagram (@usuario)" placeholderTextColor="#aaa" value={instagram} onChangeText={setInstagram} />

        {/* Book */}
        <TouchableOpacity style={styles.bookButton} onPress={pickBookPhotos}>
          <Text style={styles.bookButtonText}>Agregar fotos al Book</Text>
        </TouchableOpacity>

        {/* Categorías */}
        <TouchableOpacity style={styles.categorySelector} onPress={() => setShowCategoryModal(true)}>
          <Text style={styles.categoryText}>
            {category.length > 0 ? category.join(', ') : 'Seleccionar Categorías*'}
          </Text>
        </TouchableOpacity>

        {/* Botón Guardar Perfil */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Guardar Perfil</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de Categorías */}
      <Modal visible={showCategoryModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar categoría..."
              placeholderTextColor="#aaa"
              value={searchCategory}
              onChangeText={setSearchCategory}
            />
            <ScrollView style={{ marginTop: 10 }}>
              {filteredCategories.map((cat, index) => (
                <TouchableOpacity key={index} onPress={() => toggleCategory(cat)}>
                  <Text style={[
                    styles.modalItem,
                    category.includes(cat) && styles.selectedCategory
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setShowCategoryModal(false)}>
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
});
