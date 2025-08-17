import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { syncCastingToFirestore } from '../src/firebase/helpers/syncCastingToFirestore';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../src/firebase/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

// === MISMAS CATEGORÍAS QUE EN "CREAR SERVICIOS" ===
const SERVICE_CATEGORIES = [
  { label: 'Producción y coordinación', value: 'HEADER_PROD', disabled: true, icon: () => null, labelStyle: { color: 'green', fontWeight: 'bold' } },
  { label: 'Productor', value: 'Productor' },
  { label: 'Productor ejecutivo', value: 'Productor ejecutivo' },
  { label: 'Asistente de dirección', value: 'Asistente de dirección' },
  { label: 'Asistente de producción', value: 'Asistente de producción' },
  { label: 'Stage manager', value: 'Stage manager' },
  { label: 'Coordinador de locaciones', value: 'Coordinador de locaciones' },
  { label: 'Continuista', value: 'Continuista' },

  { label: 'Cámara e imagen', value: 'HEADER_CAM', disabled: true, icon: () => null, labelStyle: { color: 'green', fontWeight: 'bold' } },
  { label: 'Camarógrafo', value: 'Camarógrafo' },
  { label: 'Asistente de cámara', value: 'Asistente de cámara' },
  { label: 'Operador de drone', value: 'Operador de drone' },
  { label: 'Técnico de grúa', value: 'Técnico de grúa' },
  { label: 'Grúas para filmación', value: 'Grúas para filmación' },
  { label: 'Fotógrafo', value: 'Fotógrafo' },
  { label: 'Fotógrafo de backstage', value: 'Fotógrafo de backstage' },
  { label: 'Estudio fotográfico', value: 'Estudio fotográfico' },

  { label: 'Arte y vestuario', value: 'HEADER_ARTE', disabled: true, icon: () => null, labelStyle: { color: 'green', fontWeight: 'bold' } },
  { label: 'Diseñador de arte', value: 'Diseñador de arte' },
  { label: 'Decorador de set', value: 'Decorador de set' },
  { label: 'Escenógrafo', value: 'Escenógrafo' },
  { label: 'Ilustrador / storyboarder', value: 'Ilustrador / storyboarder' },
  { label: 'Vestuarista', value: 'Vestuarista' },
  { label: 'Asistente de vestuario', value: 'Asistente de vestuario' },
  { label: 'Maquillista', value: 'Maquillista' },
  { label: 'Caracterizador (maquillaje FX)', value: 'Caracterizador (maquillaje FX)' },
  { label: 'Peluquero / estilista', value: 'Peluquero / estilista' },

  { label: 'Postproducción y sonido', value: 'HEADER_POST', disabled: true, icon: () => null, labelStyle: { color: 'green', fontWeight: 'bold' } },
  { label: 'Editor de video', value: 'Editor de video' },
  { label: 'Postproductor', value: 'Postproductor' },
  { label: 'Colorista', value: 'Colorista' },
  { label: 'Sonidista', value: 'Sonidista' },
  { label: 'Microfonista', value: 'Microfonista' },
  { label: 'Técnico de efectos especiales', value: 'Técnico de efectos especiales' },

  { label: 'Transporte y logística', value: 'HEADER_TRANS', disabled: true, icon: () => null, labelStyle: { color: 'green', fontWeight: 'bold' } },
  { label: 'Transporte de talentos', value: 'Transporte de talentos' },
  { label: 'Transporte de producción', value: 'Transporte de producción' },
  { label: 'Vans de producción', value: 'Vans de producción' },
  { label: 'Autos clásicos para escenas', value: 'Autos clásicos para escenas' },
  { label: 'Autos personales', value: 'Autos personales' },
  { label: 'Motos o bicicletas para escenas', value: 'Motos o bicicletas para escenas' },
  { label: 'Camiones de arte para rodajes', value: 'Camiones de arte para rodajes' },
  { label: 'Casas rodantes para producción', value: 'Casas rodantes para producción' },

  { label: 'Catering y servicios generales', value: 'HEADER_CATERING', disabled: true, icon: () => null, labelStyle: { color: 'green', fontWeight: 'bold' } },
  { label: 'Servicios de catering', value: 'Servicios de catering' },
  { label: 'Coffee break / snacks', value: 'Coffee break / snacks' },
  { label: 'Ambientador', value: 'Ambientador' },
  { label: 'Limpieza de locaciones', value: 'Limpieza de locaciones' },
  { label: 'Seguridad / guardias', value: 'Seguridad / guardias' },

  { label: 'Comunicación y marketing', value: 'HEADER_COM', disabled: true, icon: () => null, labelStyle: { color: 'green', fontWeight: 'bold' } },
  { label: 'Community manager', value: 'Community manager' },
  { label: 'Creador de contenido digital', value: 'Creador de contenido digital' },
  { label: 'Diseñador gráfico', value: 'Diseñador gráfico' },

  { label: 'Otros', value: 'HEADER_OTRO', disabled: true, icon: () => null, labelStyle: { color: 'green', fontWeight: 'bold' } },
  { label: 'Otro (especificar)', value: 'Otro' },
];

export default function EditPostScreen({ route, navigation }) {
  const { post, isService } = route.params || {};
  const { userData } = useUser();

  // modo servicio/casting
  const serviceMode = isService || (post?.type === 'servicio');

  // Estado editable
  const [title, setTitle] = useState(post?.title || '');
  const [description, setDescription] = useState(post?.description || '');
  const [category, setCategory] = useState(post?.category || '');

  // Si eligen "Otro"
  const [customCategory, setCustomCategory] = useState('');

  // Estado del dropdown (MISMAS props que en crear servicios)
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(
    serviceMode
      ? SERVICE_CATEGORIES // mismas categorías (incluye headers deshabilitados)
      : [
          // categorías casting por si editas un casting con este mismo screen
          { label: 'Actor', value: 'Actor' },
          { label: 'Actriz', value: 'Actriz' },
          { label: 'Agencia de casting', value: 'Agencia de casting' },
          { label: 'Animador / presentador', value: 'Animador / presentador' },
          { label: 'Modelo', value: 'Modelo' },
          { label: 'Extra', value: 'Extra' },
        ]
  );

  // Auxiliares UI
  const [showSuccess, setShowSuccess] = useState(false);
  const [loadedPost, setLoadedPost] = useState(post || null);
  const [loading, setLoading] = useState(false);

  // Cargar desde la colección correcta si faltan campos
  useEffect(() => {
    const needsFetch =
      !post?.title || !post?.description || !post?.category || !post?.creatorEmail;

    const docId = post?.id; // id del documento

    if (needsFetch && docId) {
      (async () => {
        try {
          setLoading(true);
          const coll = serviceMode ? 'services' : 'castings';
          const snap = await getDoc(doc(db, coll, docId));
          if (snap.exists()) {
            const data = snap.data();
            setLoadedPost(data);
            setTitle(prev => prev || data.title || '');
            setDescription(prev => prev || data.description || '');
            setCategory(prev => prev || data.category || '');
          } else {
            Alert.alert('Error', `No se encontró el ${serviceMode ? 'servicio' : 'casting'} en Firestore.`);
            navigation.goBack();
          }
        } catch (e) {
          Alert.alert('Error', `No se pudo cargar el ${serviceMode ? 'servicio' : 'casting'}.`);
          navigation.goBack();
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setLoadedPost(post || null);
    }
  }, [post, navigation, serviceMode]);

  const handleSave = async () => {
    if (!title || !description || !category) {
      Alert.alert('Campos requeridos', 'Completa todos los campos antes de guardar.');
      return;
    }

    const source = loadedPost || post;
    if (!source?.creatorEmail) {
      Alert.alert('Error', 'No se pudo validar el autor.');
      return;
    }
    if (source.creatorEmail !== userData?.email) {
      Alert.alert('Acceso denegado', 'No puedes editar publicaciones de otros usuarios.');
      return;
    }
    if (source.isPromotional) {
      Alert.alert('Edición no permitida', `${serviceMode ? 'Los servicios' : 'Los castings'} promocionales no se pueden editar.`);
      return;
    }

    // Si eligieron "Otro", usamos el campo personalizado
    const effectiveCategory = category === 'Otro' && customCategory?.trim()
      ? customCategory.trim()
      : category;

    try {
      const updated = {
        ...source,
        title,
        description,
        category: effectiveCategory,
        updatedAt: Date.now(),
      };

      if (serviceMode) {
        // === GUARDAR SERVICIO ===
        const updatedService = {
          ...updated,
          type: 'servicio',
          updatedAtTS: serverTimestamp(),
        };

        const docId = String(updatedService.id);
        await setDoc(doc(db, 'services', docId), updatedService, { merge: true });

        // espejo local
        try {
          const stored = await AsyncStorage.getItem('posts');
          const posts = stored ? JSON.parse(stored) : [];
          const upd = posts.map(p =>
            String(p.id) === String(updatedService.id)
              ? { ...p, title, description, category: effectiveCategory, updatedAt: updatedService.updatedAt }
              : p
          );
          await AsyncStorage.setItem('posts', JSON.stringify(upd));
        } catch {}

        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          navigation.replace('MyServices');
        }, 900);
        return;
      }

      // === GUARDAR CASTING (flujo original) ===
      const ok = await syncCastingToFirestore(updated);
      if (!ok?.ok && ok !== true) {
        Alert.alert('Error', 'No se pudo guardar la publicación.');
        return;
      }

      // espejo local opcional
      try {
        const stored = await AsyncStorage.getItem('posts');
        const posts = stored ? JSON.parse(stored) : [];
        const exists = posts.some(p => p.id === (updated.shortId || updated.id));
        if (exists) {
          const updatedPosts = posts.map(p =>
            p.id === (updated.shortId || updated.id)
              ? { ...p, title, description, category: effectiveCategory, updatedAt: updated.updatedAt }
              : p
          );
          await AsyncStorage.setItem('posts', JSON.stringify(updatedPosts));
        }
      } catch {}

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        const castingDocId = ok?.docId || updated.docId || `${(updated.creatorEmail || '').toLowerCase()}_${updated.id}`;
        if (castingDocId) {
          navigation.replace('CastingDetail', { castingId: castingDocId });
        } else {
          navigation.goBack();
        }
      }, 900);
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar los cambios.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#D8A353' }}>
          {serviceMode ? 'Cargando servicio…' : 'Cargando casting…'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>
          ✏️ {serviceMode ? 'Editar Servicio' : 'Editar Publicación'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder={serviceMode ? 'Título del servicio' : 'Título'}
          placeholderTextColor="#888"
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={styles.textarea}
          multiline
          numberOfLines={6}
          placeholder={serviceMode ? 'Descripción del servicio' : 'Descripción'}
          placeholderTextColor="#888"
          value={description}
          onChangeText={setDescription}
        />

        {/* === MISMO DropDownPicker que usas al crear servicios === */}
        <DropDownPicker
          open={open}
          value={category}
          items={items}
          setOpen={setOpen}
          setValue={setCategory}
          setItems={setItems}
          placeholder="Selecciona una categoría"
          listMode="MODAL"
          modalTitle="Selecciona una categoría"
          modalContentContainerStyle={{ backgroundColor: '#000' }}
          listItemContainerStyle={{
            backgroundColor: '#111',
            borderBottomColor: '#333',
            borderBottomWidth: 1,
          }}
          listItemLabelStyle={{ color: '#fff' }}
          style={{ backgroundColor: '#1A1A1A', borderColor: '#D8A353' }}
          dropDownContainerStyle={{ backgroundColor: '#1A1A1A', borderColor: '#D8A353' }}
          textStyle={{ color: '#fff' }}
          ArrowDownIconComponent={({ style }) => (
            <Ionicons name="chevron-down" size={18} color="#fff" style={style} />
          )}
          ArrowUpIconComponent={({ style }) => (
            <Ionicons name="chevron-up" size={18} color="#fff" style={style} />
          )}
        />

        {/* Si selecciona "Otro", mostrar input para escribir */}
        {category === 'Otro' && (
          <TextInput
            style={{
              borderWidth: 0.5,
              borderColor: '#D8A353',
              padding: 10,
              marginTop: 10,
              borderRadius: 8,
              color: '#fff',
              backgroundColor: '#1A1A1A',
            }}
            placeholder="Especifica el servicio"
            placeholderTextColor="#888"
            value={customCategory}
            onChangeText={setCustomCategory}
          />
        )}

        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>💾 Guardar Cambios</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>⬅ Volver</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal transparent visible={showSuccess} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.successText}>✅ Cambios guardados</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  container: { padding: 15, paddingBottom: 140 },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 30,
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
    borderWidth: 0.5,
  },
  textarea: {
    backgroundColor: '#1A1A1A',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 16,
    marginBottom: 15,
    borderColor: '#D8A353',
    borderWidth: 0.5,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#D8A353',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: '#000', fontWeight: 'bold' },
  back: {
    marginTop: 30,
    color: '#aaa',
    fontSize: 16,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000aa',
  },
  modalContent: {
    backgroundColor: '#1B1B1B',
    padding: 20,
    borderRadius: 10,
    borderColor: '#D8A353',
    borderWidth: 0.5,
  },
  successText: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
