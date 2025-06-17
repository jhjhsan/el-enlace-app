import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import DropDownPicker from 'react-native-dropdown-picker';
import { useUser } from '../contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { syncCastingToFirestore } from '../src/firebase/helpers/syncCastingToFirestore';
import BackButton from '../components/BackButton';
import { parseDocxToCasting } from '../src/ia/parsers/parseDocxToCasting';
import { parseImageToCasting } from '../src/ia/parsers/parseImageToCasting'; 

export default function PublishCastingScreen({ navigation }) {
  const { userData } = useUser();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(null);
  const [otherDetails, setOtherDetails] = useState('');
  const [open, setOpen] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [videoUri, setVideoUri] = useState(null);
  const [payment, setPayment] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [deadline, setDeadline] = useState(null);
  const [modality, setModality] = useState('');
  const [location, setLocation] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [castingType, setCastingType] = useState(null);
  const [openCastingType, setOpenCastingType] = useState(false);

  useEffect(() => {
    if (userData?.membershipType !== 'elite') {
      Alert.alert(
        'Acceso restringido',
        'Solo los usuarios Elite pueden publicar castings.',
        [{ text: 'Ver planes', onPress: () => navigation.navigate('Subscription') }]
      );
      navigation.goBack();
    }
  }, [userData]);

  const castingCategories = [
    { label: 'Actor / Actriz', value: 'Actor / Actriz' },
    { label: 'Modelo / Extra', value: 'Modelo / Extra' },
    { label: 'Bailarín / Bailarina', value: 'Bailarín / Bailarina' },
    { label: 'Niño actor / Niña actriz', value: 'Niño actor / Niña actriz' },
    { label: 'Doble de acción', value: 'Doble de acción' },
    { label: 'Animador / Presentador', value: 'Animador / Presentador' },
    { label: 'Artista urbano / Performer', value: 'Artista urbano / Performer' },
    { label: 'Otros', value: 'Otros' },
  ];

  const castingTypeOptions = [
    { label: '🎭 Casting normal (gratis)', value: 'normal' },
    { label: '⭐ Casting destacado (CLP 1.990)', value: 'destacado' },
    { label: '🚨 Casting urgente (CLP 3.990)', value: 'urgente' },
  ];

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      setVideoUri(result.assets[0].uri);
    }
  };
const autoFillFromDocument = async () => {
  const data = await parseDocxToCasting();
  if (data) {
    setTitle(data.title || '');
    setDescription(data.description || '');
    setCategory(data.category || '');
    setPayment(data.payment || '');
    setAgencyName(data.agencyName || '');
    setDeadline(data.deadline ? new Date(data.deadline) : null);
    setModality(data.modality || '');
    setLocation(data.location || '');
  } else {
    Alert.alert('Error', 'No se pudo analizar el documento con IA.');
  }
};

const autoFillFromImage = async () => {
  const data = await parseImageToCasting();
  if (data) {
    setTitle(data.title || '');
    setDescription(data.description || '');
    setCategory(data.category || '');
    setPayment(data.payment || '');
    setAgencyName(data.agencyName || '');
    setDeadline(data.deadline ? new Date(data.deadline) : null);
    setModality(data.modality || '');
    setLocation(data.location || '');
  } else {
    Alert.alert('Error', 'No se pudo analizar la imagen con IA.');
  }
};

  const handlePublish = async () => {
    if (!userData?.hasPaid) {
  Alert.alert('Pago requerido', 'Debes completar el pago para publicar un casting.');
  return;
}

    if (!title || !description || !category || !payment || !agencyName || !deadline || !modality || !location) {
        Alert.alert('Campos obligatorios', 'Completa todos los campos antes de publicar.');
        return;
      }
      
      const today = new Date();
if (!deadline || deadline <= today) {
  Alert.alert('Fecha inválida', 'Debes seleccionar una fecha futura.');
  return;
}

      
    if (category === 'Otros' && !otherDetails.trim()) {
      Alert.alert('Información requerida', 'Por favor especifica qué buscas en "Otros".');
      return;
    }

    const newPost = {
      id: Date.now().toString(),
      title,
      description,
      category,
      otherDetails: category === 'Otros' ? otherDetails : '',
      image: imageUri,
      video: videoUri,
      payment,
      agencyName,
      deadline: deadline.toISOString().split('T')[0],
      modality,
      location,
      castingType,
      type: 'casting',
      date: new Date().toISOString().split('T')[0],
      isPromotional: false,
      creatorId: userData?.id || '',
      creatorEmail: userData?.email || '',
    };

    try {
      const existing = await AsyncStorage.getItem('posts');
      const posts = existing ? JSON.parse(existing) : [];
      posts.push(newPost);
      await AsyncStorage.setItem('posts', JSON.stringify(posts));
      await syncCastingToFirestore(newPost);

      Alert.alert('Casting publicado', 'Tu casting ha sido enviado a los usuarios. Redirigiendo...');
setTimeout(() => {
  navigation.navigate('ViewPosts');
}, 1000);
     // Buscar perfiles compatibles y notificar
try {
    const allProfiles = await AsyncStorage.getItem('userProfiles');
    const parsedProfiles = allProfiles ? JSON.parse(allProfiles) : [];
  
    const compatibles = parsedProfiles.filter((perfil) => {
      return (
        perfil.category === category &&
        perfil.location?.toLowerCase().includes(location.toLowerCase())
      );
    });
  
    for (const perfil of compatibles) {
        const existingNotifications = await AsyncStorage.getItem(`notifications_${perfil.id}`);
        const notifications = existingNotifications ? JSON.parse(existingNotifications) : [];
      
        const yaNotificado = notifications.some(
          (n) => n.castingId === newPost.id
        );
      
        if (!yaNotificado) {
          notifications.push({
            id: Date.now().toString(),
            message: `🎬 Nuevo casting para ${category} en tu zona: ${location}`,
            date: new Date().toISOString(),
            castingId: newPost.id,
          });
      
          await AsyncStorage.setItem(`notifications_${perfil.id}`, JSON.stringify(notifications));
        }
      }
      
      console.log(`✅ Notificaciones enviadas a perfiles compatibles`);      
  } catch (error) {
    console.error('Error al enviar notificaciones:', error);
  }
  
    } catch (error) {
      console.error('Error al guardar casting:', error);
      Alert.alert('Error', 'No se pudo guardar la publicación.');
    }
  };

  return (
    
    <View style={styles.screen}>
      <BackButton color="#fff" size={28} top={40} left={20} />
<Text style={styles.title}>Publicar Casting</Text>

      <ScrollView contentContainerStyle={[styles.container, { flexGrow: 1 }]}>

       <TouchableOpacity style={styles.aiButton} onPress={autoFillFromDocument}>
  <Text style={styles.aiButtonText}>📄 Subir documento (.docx)</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.aiButton} onPress={autoFillFromImage}>
  <Text style={styles.aiButtonText}>🧠 Usar imagen para completar formulario (IA)</Text>
</TouchableOpacity>

        {/* Subida de imagen */}
        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
          <Text style={styles.imageButtonText}>📷 Subir imagen del casting</Text>
        </TouchableOpacity>

        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.preview} />
        )}

        {/* Subida de video explicativo */}
        <TouchableOpacity style={styles.imageButton} onPress={pickVideo}>
          <Text style={styles.imageButtonText}>🎥 Subir video explicativo del casting</Text>
        </TouchableOpacity>

        {videoUri && (
          <Text style={{ color: '#0f0', marginBottom: 10 }}>
            ✅ Video cargado correctamente
          </Text>
        )}

        {/* Campos del formulario */}
        <TextInput
          placeholder="Título del casting"
          placeholderTextColor="#888"
          style={styles.input}
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          placeholder="Describe el casting, requisitos, fechas, habilidades, etc."
          placeholderTextColor="#888"
          style={styles.textarea}
          multiline
          numberOfLines={12}
          value={description}
          onChangeText={setDescription}
        />

        {category === 'Otros' && (
          <TextInput
            style={styles.input}
            placeholder="Especifica lo que buscas (ej: perros, autos, deportistas...)"
            placeholderTextColor="#888"
            value={otherDetails}
            onChangeText={setOtherDetails}
          />
        )}

        <TextInput
          placeholder="Remuneración ofrecida (ej: 80.000 CLP)"
          placeholderTextColor="#888"
          style={styles.input}
          value={payment}
          onChangeText={setPayment}
        />

        <TextInput
          placeholder="Nombre de la agencia"
          placeholderTextColor="#888"
          style={styles.input}
          value={agencyName}
          onChangeText={setAgencyName}
        />

<TouchableOpacity
  onPress={() => setShowDatePicker(true)}
  style={[styles.input, { justifyContent: 'center' }]}
>
  <Text style={{ color: deadline ? '#fff' : '#888' }}>
    {deadline ? deadline.toLocaleDateString('es-CL') : 'Selecciona la fecha límite'}
  </Text>
</TouchableOpacity>

{showDatePicker && (
  <DateTimePicker
    value={deadline || new Date()}
    mode="date"
    display="default"
    onChange={(event, selectedDate) => {
      setShowDatePicker(false);
      if (selectedDate) setDeadline(selectedDate);
    }}
  />
)}

        <TextInput
          placeholder="Modalidad del casting (presencial / online / selftape)"
          placeholderTextColor="#888"
          style={styles.input}
          value={modality}
          onChangeText={setModality}
        />

        <TextInput
          placeholder="Ciudad o lugar del casting"
          placeholderTextColor="#888"
          style={styles.input}
          value={location}
          onChangeText={setLocation}
        />

<DropDownPicker
  open={openCastingType}
  value={castingType}
  items={castingTypeOptions}
  setOpen={setOpenCastingType}
  setValue={setCastingType}
  placeholder="Selecciona el tipo de casting"
  listMode="SCROLLVIEW"
  style={styles.dropdown}
  dropDownContainerStyle={styles.dropdownContainer}
  textStyle={{ color: '#D8A353' }}
  labelStyle={{ color: '#D8A353' }}
  placeholderStyle={{ color: '#888' }}
  arrowIconStyle={{ tintColor: '#D8A353' }}
/>

{/* 👇 Aquí agregas las notas explicativas según el tipo */}
{castingType === 'normal' && (
  <Text style={styles.note}>
    ✅ Gratis. Se mostrará solo en la página de castings durante 5 días.
  </Text>
)}
{castingType === 'destacado' && (
  <Text style={styles.note}>
    ⭐ Visible en el Dashboard principal (Pro/Free) por 3 días y en la página de castings por 5 días.
  </Text>
)}
{castingType === 'urgente' && (
  <Text style={styles.note}>
    🚨 Siempre en primer lugar del Dashboard (Pro/Free) por 24 horas y en la página de castings por 2 días.
  </Text>
)}
        {/* Publicar */}
        <TouchableOpacity style={styles.publishButton} onPress={handlePublish}>
          <Text style={styles.publishText}>📤 Publicar Casting</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  
  },
  container: {
    padding: 20, 
    top: 30,
    paddingBottom: 140,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    top: 50,
    marginBottom: 20,
  },
  aiButton: {
    backgroundColor: '#222',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
    alignItems: 'center',
  },
  aiButtonText: {
    color: '#D8A353',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#1A1A1A',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    borderColor: '#D8A353',
    borderWidth: 1,
  },
  textarea: {
    backgroundColor: '#1A1A1A',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 20,
    marginBottom: 15,
    borderColor: '#D8A353',
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  dropdown: {
    backgroundColor: '#1A1A1A',
    borderColor: '#D8A353',
    marginBottom: 20,
  },
  dropdownContainer: {
    backgroundColor: '#000',
    borderColor: '#D8A353',
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 15,
  },
  imageButton: {
    backgroundColor: '#444',
    borderColor: '#D8A353',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 10,
  },  
  imageButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  publishButton: {
    backgroundColor: '#D8A353',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  publishText: {
    color: '#000',
    fontWeight: 'bold',
  },
  note: {
    color: '#ccc',
    fontSize: 13,
    marginTop: -10,
    marginBottom: 15,
    textAlign: 'center',
  },  

});
