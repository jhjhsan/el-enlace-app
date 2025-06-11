import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { getWeeklyServicePostCount, registerServicePost } from '../utils/postLimits';
import DropDownPicker from 'react-native-dropdown-picker';
import { Ionicons } from '@expo/vector-icons';

export default function PublishScreen({ navigation }) {
  const { userData } = useUser();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(null);
  const [open, setOpen] = useState(false);

  const serviceCategories = [
    { label: 'Ambientador', value: 'Ambientador' },
    { label: 'Asistente de cámara', value: 'Asistente de cámara' },
    { label: 'Asistente de dirección', value: 'Asistente de dirección' },
    { label: 'Asistente de producción', value: 'Asistente de producción' },
    { label: 'Asistente de vestuario', value: 'Asistente de vestuario' },
    { label: 'Autos clásicos para escenas', value: 'Autos clásicos para escenas' },
    { label: 'Autos personales', value: 'Autos personales' },
    { label: 'Camiones de arte para rodajes', value: 'Camiones de arte para rodajes' },
    { label: 'Camarógrafo', value: 'Camarógrafo' },
    { label: 'Caracterizador (maquillaje FX)', value: 'Caracterizador (maquillaje FX)' },
    { label: 'Casas rodantes para producción', value: 'Casas rodantes para producción' },
    { label: 'Coffee break / snacks', value: 'Coffee break / snacks' },
    { label: 'Colorista', value: 'Colorista' },
    { label: 'Community manager', value: 'Community manager' },
    { label: 'Continuista', value: 'Continuista' },
    { label: 'Coordinador de locaciones', value: 'Coordinador de locaciones' },
    { label: 'Creador de contenido digital', value: 'Creador de contenido digital' },
    { label: 'Decorador de set', value: 'Decorador de set' },
    { label: 'Diseñador de arte', value: 'Diseñador de arte' },
    { label: 'Diseñador gráfico', value: 'Diseñador gráfico' },
    { label: 'Editor de video', value: 'Editor de video' },
    { label: 'Escenógrafo', value: 'Escenógrafo' },
    { label: 'Estudio fotográfico', value: 'Estudio fotográfico' },
    { label: 'Fotógrafo de backstage', value: 'Fotógrafo de backstage' },
    { label: 'Grúas para filmación', value: 'Grúas para filmación' },
    { label: 'Iluminador', value: 'Iluminador' },
    { label: 'Ilustrador / storyboarder', value: 'Ilustrador / storyboarder' },
    { label: 'Maquillista', value: 'Maquillista' },
    { label: 'Microfonista', value: 'Microfonista' },
    { label: 'Motos o bicicletas para escenas', value: 'Motos o bicicletas para escenas' },
    { label: 'Operador de drone', value: 'Operador de drone' },
    { label: 'Peluquero / estilista', value: 'Peluquero / estilista' },
    { label: 'Postproductor', value: 'Postproductor' },
    { label: 'Productor', value: 'Productor' },
    { label: 'Servicios de catering', value: 'Servicios de catering' },
    { label: 'Sonidista', value: 'Sonidista' },
    { label: 'Stage manager', value: 'Stage manager' },
    { label: 'Técnico de efectos especiales', value: 'Técnico de efectos especiales' },
    { label: 'Técnico de grúa', value: 'Técnico de grúa' },
    { label: 'Transporte de producción', value: 'Transporte de producción' },
    { label: 'Transporte de talentos', value: 'Transporte de talentos' },
    { label: 'Vans de producción', value: 'Vans de producción' },
    { label: 'Vestuarista', value: 'Vestuarista' },
  ];

  const handlePublish = async () => {
    if (!title || !description || !category) {
      Alert.alert('Campos obligatorios', 'Completa todos los campos antes de publicar.');
      return;
    }

    if (title.trim().length < 10) {
      Alert.alert('Título muy corto', 'El título debe tener al menos 10 caracteres.');
      return;
    }

    if (description.trim().length < 30) {
      Alert.alert('Descripción muy corta', 'La descripción debe tener al menos 30 caracteres.');
      return;
    }

    if (description.trim().split('\n').length > 100) {
      Alert.alert('Límite de líneas', 'La descripción no puede superar las 100 líneas.');
      return;
    }

    const count = await getWeeklyServicePostCount();
    if (
      (userData?.membershipType === 'pro' && count >= 3) ||
      (userData?.membershipType === 'free' && count >= 1)
    ) {
      Alert.alert(
        'Límite alcanzado',
        userData?.membershipType === 'pro'
          ? 'Tu plan Pro permite publicar hasta 3 servicios por semana.'
          : 'Tu plan Free permite publicar solo 1 servicio por semana.'
      );
      return;
    }

    const newPost = {
      id: Date.now().toString(),
      title,
      description,
      category,
      type: 'servicio',
      date: new Date().toISOString().split('T')[0],
      isPromotional: false,
      creatorId: userData?.id || '',
      creatorEmail: userData?.email || '',
    };

    try {
      const existing = await AsyncStorage.getItem('posts');
      const posts = existing ? JSON.parse(existing) : [];
      const updatedPosts = [...posts, newPost];
      await AsyncStorage.setItem('posts', JSON.stringify(updatedPosts));

      await registerServicePost(); // ✅ aplica para todos

      Alert.alert('✅ Servicio publicado', 'Tu publicación se ha guardado exitosamente.');
      navigation.navigate('ViewPosts');
    } catch (error) {
      console.error('Error al guardar publicación:', error);
      Alert.alert('Error', 'No se pudo guardar la publicación.');
    }
  };

  return (
    <View style={styles.screen}>
      {/* Flecha profesional arriba a la izquierda */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>
  
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📝 Publicar Servicio</Text>
  
        <TextInput
          placeholder="Ej: Servicio de maquillaje para rodaje"
          placeholderTextColor="#888"
          style={styles.input}
          value={title}
          onChangeText={setTitle}
        />
  
        <TextInput
          placeholder="Ej: Ofrezco servicio de maquillaje profesional para grabaciones..."
          placeholderTextColor="#888"
          style={styles.textarea}
          multiline
          numberOfLines={8}
          value={description}
          onChangeText={setDescription}
        />
  
        <DropDownPicker
          open={open}
          value={category}
          items={serviceCategories}
          setOpen={setOpen}
          setValue={setCategory}
          placeholder="Selecciona una categoría"
          listMode="SCROLLVIEW"
          style={{
            backgroundColor: '#1A1A1A',
            borderColor: '#D8A353',
          }}
          dropDownContainerStyle={{
            backgroundColor: '#1A1A1A',
            borderColor: '#D8A353',
          }}
          textStyle={{ color: '#fff' }}
        />
  
        <TouchableOpacity style={styles.publishButton} onPress={handlePublish}>
          <Text style={styles.publishText}>📤 Publicar</Text>
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
   paddingTop: 60,
    paddingBottom: 140,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
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
    paddingVertical: 16,
    marginBottom: 15,
    borderColor: '#D8A353',
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  publishButton: {
    backgroundColor: '#D8A353',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  publishText: {
    color: '#000',
    fontWeight: 'bold',
  },
  back: {
    marginTop: 40,
    color: '#aaa',
    fontSize: 16,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    backgroundColor: 'transparent',
  },  
});
