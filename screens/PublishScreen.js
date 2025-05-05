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
import BottomBar from '../components/BottomBar';
import { getWeeklyServicePostCount, registerServicePost } from '../utils/postLimits';
import DropDownPicker from 'react-native-dropdown-picker';

export default function PublishScreen({ navigation }) {
  const { userData } = useUser();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('servicio'); // 'casting' o 'servicio'
  const [category, setCategory] = useState(null);
  const [open, setOpen] = useState(false);

  const castingCategories = [
    { label: 'Actor', value: 'Actor' },
    { label: 'Actriz', value: 'Actriz' },
    { label: 'Agencia de casting', value: 'Agencia de casting' },
    { label: 'Animador / presentador', value: 'Animador / presentador' },
    { label: 'Artista urbano', value: 'Artista urbano' },
    { label: 'Bailarín / bailarina', value: 'Bailarín / bailarina' },
    { label: 'Doble de acción', value: 'Doble de acción' },
    { label: 'Extra', value: 'Extra' },
    { label: 'Modelo', value: 'Modelo' },
    { label: 'Modelo publicitario', value: 'Modelo publicitario' },
    { label: 'Niño actor', value: 'Niño actor' },
  ];

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

    if (type === 'servicio' && userData?.membershipType === 'pro') {
      const count = await getWeeklyServicePostCount();
      if (count >= 3) {
        Alert.alert(
          'Límite alcanzado',
          'Tu plan Pro permite publicar hasta 3 servicios por semana.'
        );
        return;
      }
    }

    const newPost = {
      id: Date.now().toString(),
      title,
      description,
      category,
      type,
      date: new Date().toISOString().split('T')[0],
      isPromotional: false,
    };

    try {
      const existing = await AsyncStorage.getItem('posts');
      const posts = existing ? JSON.parse(existing) : [];
      const updatedPosts = [...posts, newPost];
      await AsyncStorage.setItem('posts', JSON.stringify(updatedPosts));

      if (type === 'servicio' && userData?.membershipType === 'pro') {
        await registerServicePost();
      }

      Alert.alert('✅ Publicado', 'Tu publicación se ha guardado exitosamente.');
      navigation.navigate('ViewPosts');
    } catch (error) {
      console.error('Error al guardar publicación:', error);
      Alert.alert('Error', 'No se pudo guardar la publicación.');
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📝 Publicar {type === 'casting' ? 'Casting' : 'Servicio'}</Text>

        <TextInput
          placeholder="Título"
          placeholderTextColor="#888"
          style={styles.input}
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          placeholder="Descripción"
          placeholderTextColor="#888"
          style={styles.textarea}
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />

<DropDownPicker
  open={open}
  value={category}
  items={type === 'casting' ? castingCategories : serviceCategories}
  setOpen={setOpen}
  setValue={setCategory}
  placeholder="Selecciona una categoría"
  listMode="SCROLLVIEW" // 👈 Esto corrige el error del ScrollView
  style={{
    backgroundColor: '#1A1A1A',
    borderColor: '#D8A353',
    zIndex: 1000,
  }}
  dropDownContainerStyle={{
    backgroundColor: '#1A1A1A',
    borderColor: '#D8A353',
    zIndex: 1000,
  }}
  textStyle={{ color: '#fff' }}
/>


        <View style={styles.switchRow}>
          <TouchableOpacity
            style={[styles.switchButton, type === 'casting' && styles.selectedSwitch]}
            onPress={() => setType('casting')}
          >
            <Text style={styles.switchText}>🎬 Casting</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.switchButton, type === 'servicio' && styles.selectedSwitch]}
            onPress={() => setType('servicio')}
          >
            <Text style={styles.switchText}>🛠️ Servicio</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.publishButton} onPress={handlePublish}>
          <Text style={styles.publishText}>📤 Publicar</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomBar />
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
    paddingVertical: 12,
    marginBottom: 15,
    borderColor: '#D8A353',
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 40,
    marginBottom: 20,
  },
  switchButton: {
    backgroundColor: '#1A1A1A',
    borderColor: '#D8A353',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
  },
  selectedSwitch: {
    backgroundColor: '#D8A353',
  },
  switchText: {
    color: '#fff',
    fontWeight: 'bold',
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
});
