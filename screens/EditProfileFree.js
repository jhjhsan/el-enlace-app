import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import DropDownPicker from 'react-native-dropdown-picker';
import { saveUserProfile } from '../utils/profileStorage';
import { goToProfileTab } from '../utils/navigationHelpers';
import { uploadMediaToStorage } from '../src/firebase/helpers/uploadMediaToStorage';
import * as FileSystem from 'expo-file-system';
import { validateImageWithIA } from '../src/firebase/helpers/validateMediaContent';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '../components/BackButton';

const SCREEN_HEIGHT = Dimensions.get('window').height;

/* =======================
   Catálogos de categorías
   ======================= */

// TALENTOS
const TALENT_CATEGORIES = [
  // Interpretación / Frente a cámara
  "Actor", "Actriz", "Niño actor", "Doble de acción / Stunt", "Extra",
  "Animador / Presentador", "Host / Maestro de ceremonias", "Modelo", "Modelo publicitario",
  "Influencer / Creador de contenido", "Locutor / Voz en off",

  // Dirección / Producción
  "Director/a", "Asistente de dirección 1º AD", "Asistente de dirección 2º AD", "Script / Continuista",
  "Productor/a general", "Productor/a ejecutivo/a", "Jefe/a de producción", "Asistente de producción",
  "Coordinador/a de producción", "Location manager", "Location assistant",

  // Cámara / Imagen
  "Director/a de fotografía", "Camarógrafo / Operador de cámara", "1º Asistente de cámara (1AC)",
  "2º Asistente de cámara (2AC)", "Data wrangler", "DIT (Técnico de imagen digital)",
  "Operador de steadicam", "Operador de gimbal", "Operador de drone",

  // Iluminación / Grip
  "Gaffer / Jefe de eléctricos", "Best boy eléctricos", "Eléctrico",
  "Key grip / Jefe de grip", "Best boy grip", "Grip", "Dolly grip",

  // Sonido
  "Jefe/a de sonido directo", "Microfonista / Boom operator", "Utility de sonido",

  // Arte / Vestuario / Maquillaje
  "Director/a de arte", "Escenógrafo/a", "Ambientador/a", "Utilero/a (Props)",
  "Carpintero/a de arte", "Troquelador/a / Constructor/a de set",
  "Vestuarista / Diseñador/a de vestuario", "Asistente de vestuario", "Sastre / Modista",
  "Maquillista", "Peluquero / Estilista", "Caracterizador (FX Makeup)",

  // Foto fija
  "Fotógrafo/a de still", "Fotógrafo/a de backstage",

  // Postproducción
  "Editor/a de video", "Asistente de edición", "Colorista", "VFX Artist / Compositor",
  "Motion graphics", "Roto / Clean-up", "Doblaje / ADR (actor/actriz de voz)", "Foley artist",
  "Diseñador/a de sonido", "Mezclador/a de sonido (re-recording mixer)",

  // Guion / Coordinación creativa
  "Guionista", "Script doctor", "Story editor", "Supervisor/a de guion",
  "Ilustrador / Storyboarder", "Concept artist",

  // Dirección de casting / Coordinación de talentos
  "Director/a de casting (persona)", "Asistente de casting",

  // Coreografías / Especialidades
  "Coreógrafo/a", "Bailarín / Bailarina", "Coordinador/a de stunts",
  "Entrenador/a actoral / Coach", "Coordinador/a de intimidad",
  "Coordinador/a de animales", "Músico / Compositor/a",

  // Digital / Social
  "Community manager (freelance)", "Content strategist (freelance)",

  // Otros
  "Ilustrador/a", "Diseñador/a gráfico/a", "Fotógrafo/a", "Realizador/a",
  "Periodista / Redactor/a", "Traductor/a / Subtitulador/a",
  "Otros / No especificado",
];

// RECURSOS
const RESOURCE_CATEGORIES = [
  // Locaciones y espacios
  "Estudio fotográfico", "Estudio de filmación / plató", "Foro / Escenario",
  "Locaciones (catálogo/servicio)", "Casas / Departamentos para rodaje",
  "Oficinas / Comercios para rodaje", "Bodegas / Galpones", "Espacios públicos (gestión de permisos)",

  // Transporte y móviles
  "Transporte de producción", "Vans de producción", "Camiones de arte",
  "Camión de iluminación / grip", "Motorhome / Casa rodante", "Camerino móvil",
  "Transporte de talentos / chofer", "Autos personales para escena",
  "Autos de época", "Autos deportivos / especiales", "Motos / Bicicletas para escenas",

  // Equipos (renta)
  "Renta de cámaras", "Renta de lentes", "Renta de video assist / DIT",
  "Renta de iluminación", "Renta de grip / rigging", "Renta de sonido",
  "Renta de drones", "Renta de steady / gimbal", "Renta de monitoreo inalámbrico",
  "Renta de generadores", "Renta de data storage / DIT carts",

  // Arte / Construcción / Props
  "Renta de utilería (props)", "Taller de arte / maestranza", "Construcción de sets",
  "Greens / Vegetación para set", "Renta de mobiliario / ambientación",
  "Renta de vestuario / guardarropía", "Sastrería / Ajustes de vestuario",

  // Efectos y seguridad
  "Efectos especiales mecánicos", "Efectos de lluvia / viento / nieve",
  "Pirotecnia (con permisos)", "Coordinación de stunts (empresa)",
  "Seguridad para rodaje", "Paramédico / Unidad médica",

  // Servicios de producción
  "Catering para rodaje", "Coffee break / Snacks", "Craft service",
  "Baños químicos", "Carpas / Toldo / Sombras", "Vallas / Control de público",
  "Aseo / Limpieza set", "Gestión de permisos / Trámites", "Seguros de producción",

  // Post / Audio / Salas
  "Casa de postproducción", "Sala de edición", "Sala de color / grading",
  "Estudio de sonido / mezcla", "Estudio de doblaje / locución",

  // Almacenaje y logística
  "Bodega / Storage de producción", "Mensajería / Courier de producción",

  // Animales / Especiales
  "Animales para rodaje (con handler)", "Armería escénica (con permisos)",

  // Otros recursos
  "Plataformas / Casting software", "Plataformas de streaming / media",
  "Otros / No especificado",
];

// Helper “offline”: detecta si un arreglo de categorías contiene una de recursos
const isResourceCategory = (categories = []) => {
  const cats = (Array.isArray(categories) ? categories : [categories]).map(c => String(c || '').toLowerCase());
  const resourceSet = new Set(RESOURCE_CATEGORIES.map(c => c.toLowerCase()));
  return cats.some(c => resourceSet.has(c));
};

export default function EditProfileFree({ navigation }) {
  const { setUserData } = useUser();

  // Estados comunes
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasOffensiveContent, setHasOffensiveContent] = useState(false);

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [edad, setEdad] = useState('');
  const [sexo, setSexo] = useState('');
  const [bookPhotos, setBookPhotos] = useState([]);
  const [category, setCategory] = useState([]);

  // Modal categorías
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [searchCategory, setSearchCategory] = useState('');

  // DropDownPicker sexo
  const [openSexo, setOpenSexo] = useState(false);
  const [zIndexSexo, setZIndexSexo] = useState(1000);

  // Modo y lock
  const [profileKind, setProfileKind] = useState(null); // 'talent' | 'resource' | null
  const [profileLock, setProfileLock] = useState(null); // 'resource' | 'talent' | null (solo usamos 'resource')
  const [profileMode, setProfileMode] = useState(null); // UI: 'talent' | 'resource' | null

  // Campos específicos Resource
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceDescription, setResourceDescription] = useState('');
  const [resourceLocation, setResourceLocation] = useState('');
  const [resourceTagsInput, setResourceTagsInput] = useState(''); // coma-separado

  const MAX_CATS_TALENT = 3;
  const MAX_CATS_RESOURCE = 1;

  // ¿Es Resource este perfil? (derivado)
  const isResource = useMemo(() => {
    if (profileMode === 'resource') return true;
    if (profileMode === 'talent') return false;
    if (profileKind === 'resource') return true;
    if (profileKind === 'talent') return false;
    return isResourceCategory(category);
  }, [profileMode, profileKind, category]);

  // Lista efectiva según modo/lock/kind (DENTRO del componente)
  const categoriesList = useMemo(() => {
    return (profileLock === 'resource' || profileMode === 'resource' || profileKind === 'resource')
      ? RESOURCE_CATEGORIES
      : TALENT_CATEGORIES;
  }, [profileLock, profileMode, profileKind]);

  // Filtro para el modal (DENTRO del componente)
  const filteredCategories = useMemo(() => {
    const q = (searchCategory || '').toLowerCase();
    return categoriesList.filter(cat => cat.toLowerCase().includes(q));
  }, [categoriesList, searchCategory]);

  // Cargar datos guardados y determinar modo automáticamente
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const json = await AsyncStorage.getItem('userProfileFree');
        if (json) {
          const savedData = JSON.parse(json);

          setProfilePhoto(savedData.profilePhoto || null);
          setName(savedData.name || '');
          setEmail(savedData.email || '');
          setEdad(savedData.edad || '');
          setSexo(savedData.sexo || '');
          setBookPhotos(savedData.bookPhotos || []);
          setCategory(Array.isArray(savedData.category) ? savedData.category : []);

          // metadata
          setProfileKind(savedData.profileKind ?? null);
          setProfileLock(savedData.profileLock ?? null);

          // resource fields
          setResourceTitle(savedData.resourceTitle || '');
          setResourceDescription(savedData.resourceDescription || '');
          setResourceLocation(savedData.resourceLocation || '');
          if (Array.isArray(savedData.resourceTags)) {
            setResourceTagsInput(savedData.resourceTags.join(', '));
          }

          // Determinar modo UI (lock > kind > inferencia por categoría > talento)
          if (savedData.profileLock === 'resource' || savedData.profileKind === 'resource') {
            setProfileMode('resource');
          } else if (savedData.profileKind === 'talent') {
            setProfileMode('talent');
          } else if (Array.isArray(savedData.category) && isResourceCategory(savedData.category)) {
            setProfileMode('resource');
          } else {
            setProfileMode('talent');
          }
        } else {
          // Sin datos previos: default a talento
          setProfileMode('talent');
        }
      } catch (error) {
        console.log('Error al cargar los datos:', error);
        if (!profileMode) setProfileMode('talent');
      }
    };

    loadUserData();
  }, []);

  // Lógica categorías (límite dinámico)
  const toggleCategory = (cat) => {
    const max = (profileLock === 'resource' || profileMode === 'resource') ? MAX_CATS_RESOURCE : MAX_CATS_TALENT;

    setCategory(prev => {
      if (prev.includes(cat)) return prev.filter(c => c !== cat);
      if (profileLock === 'resource' || profileMode === 'resource') {
        return [cat]; // solo una
      }
      if (prev.length < max) return [...prev, cat];
      Alert.alert('Límite alcanzado', `Solo puedes seleccionar hasta ${max} categoría(s).`);
      return prev;
    });
  };

  // Media pickers
  const pickProfilePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Debes permitir acceso a la galería.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      const uriToUpload = asset.uri;
      const fileInfo = await FileSystem.getInfoAsync(uriToUpload);
      if (!fileInfo.exists) {
        Alert.alert('Error', 'El archivo seleccionado no es válido.');
        return;
      }

      const emailKey = (email || '').toLowerCase().trim();

      setLoading(true);

      const firebaseUrl = await uploadMediaToStorage(
        uriToUpload,
        `profile_photos/${emailKey}_photo.jpg`
      );

      setLoading(false);

      if (!firebaseUrl || !firebaseUrl.startsWith('https://')) {
        Alert.alert('Error', 'No se pudo subir la imagen.');
        return;
      }

      const validation = await validateImageWithIA(firebaseUrl);
      if (!validation.valid) {
        setHasOffensiveContent(true);
        Alert.alert('Imagen rechazada', 'La imagen contiene contenido ofensivo. Selecciona otra.');
        return;
      }

      setProfilePhoto(firebaseUrl);
    } catch (error) {
      console.error('❌ Error al seleccionar imagen de perfil:', error);
      setLoading(false);
      Alert.alert('Error', 'Ocurrió un error al subir la imagen.');
    }
  };

  const pickBookPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Debes permitir acceso a la galería para subir imágenes.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 3 - bookPhotos.length,
        quality: 1,
      });

      if (result.canceled) return;

      const selectedAssets = result.assets || [];
      if (bookPhotos.length + selectedAssets.length > 3) {
        Alert.alert('Límite de fotos', 'Solo puedes subir hasta 3 fotos.');
        return;
      }

      const emailKey = (email || '').toLowerCase().trim();
      setLoading(true);

      const validUrls = [];

      for (let index = 0; index < selectedAssets.length; index++) {
        const asset = selectedAssets[index];
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        if (!fileInfo.exists) continue;

        const filename = `book_${Date.now()}_${index}.jpg`;
        const firebaseUrl = await uploadMediaToStorage(
          asset.uri,
          `book_photos/${emailKey}_${filename}`
        );

        if (!firebaseUrl || !firebaseUrl.startsWith('https://')) continue;

        const validation = await validateImageWithIA(firebaseUrl);
        if (!validation.valid) {
          setHasOffensiveContent(true);
          Alert.alert('Imagen rechazada', 'Una de las fotos contiene contenido ofensivo.');
          continue;
        }

        validUrls.push(firebaseUrl);
      }

      setBookPhotos(prev => [...prev, ...validUrls]);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error al subir fotos del book:', error);
      setLoading(false);
      Alert.alert('Error', error.message || 'Ocurrió un error al subir las fotos.');
    }
  };

  const handleDeletePhoto = (index) => {
    const updated = [...bookPhotos];
    updated.splice(index, 1);
    setBookPhotos(updated);
  };

  // Guardar con validaciones
  const handleSave = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Validaciones comunes
    if (!emailRegex.test(email || '')) {
      Alert.alert('Correo inválido', 'Ingresa un correo electrónico válido.');
      return;
    }
    if (!profilePhoto?.startsWith('https://')) {
      Alert.alert('Foto inválida', 'La foto de perfil/logo no es válida.');
      return;
    }
    if (bookPhotos.length < 1 || bookPhotos.some(uri => !uri?.startsWith('https://'))) {
      Alert.alert('Fotos inválidas', 'Debes subir al menos una foto válida.');
      return;
    }

    // Modo/lock y categorías
    const maxCats = (profileLock === 'resource' || profileMode === 'resource') ? MAX_CATS_RESOURCE : MAX_CATS_TALENT;
    if (!Array.isArray(category) || category.length === 0) {
      Alert.alert('Categoría requerida', 'Selecciona al menos una categoría.');
      return;
    }
    if (category.length > maxCats) {
      Alert.alert('Límite de categorías', `Máximo ${maxCats} categoría(s).`);
      return;
    }

    // Validaciones específicas
    if (isResource) {
      if (!name?.trim()) {
        Alert.alert('Campo requerido', 'El nombre/razón social es obligatorio.');
        return;
      }
      if (!resourceTitle?.trim()) {
        Alert.alert('Campo requerido', 'Ingresa el título comercial del servicio.');
        return;
      }
      const desc = (resourceDescription || '').trim();
      if (!desc) {
        Alert.alert('Campo requerido', 'La descripción del servicio es obligatoria.');
        return;
      }
      if (desc.length > 300) {
        Alert.alert('Límite excedido', 'La descripción no puede superar 300 caracteres.');
        return;
      }
      if (!resourceLocation?.trim()) {
        Alert.alert('Campo requerido', 'La ubicación es obligatoria (ciudad/área).');
        return;
      }
    } else {
      if (!name || !email || !sexo || !edad) {
        Alert.alert('Campos requeridos', 'Completa todos los campos obligatorios.');
        return;
      }
      if (isNaN(Number(edad))) {
        Alert.alert('Edad inválida', 'Ingresa una edad válida en números.');
        return;
      }
      if (name && edad && name.trim() === String(edad).trim()) {
        Alert.alert('Datos inválidos', 'Nombre y edad no deben coincidir.');
        return;
      }
    }

    setSaving(true);

    try {
      const cleanEmail = (email || '').trim().toLowerCase();

      const base = {
        id: cleanEmail,
        profilePhoto,
        name,
        email: cleanEmail,
        bookPhotos,
        category,
        membershipType: 'free',
        flagged: hasOffensiveContent,
        timestamp: Date.now(),
      };

      let profile;

      if (isResource) {
        const tagsArr = (resourceTagsInput || '')
          .split(',')
          .map(t => t.trim())
          .filter(Boolean)
          .slice(0, 5);

        profile = {
          ...base,
          accountType: 'talent', // mantenemos para no romper flujos existentes
          profileKind: 'resource',
          profileLock: profileLock === 'resource' ? 'resource' : 'resource',
          resourceType: category?.[0] || 'resource',
          resourceTitle: resourceTitle?.trim(),
          resourceDescription: (resourceDescription || '').trim(),
          resourceLocation: resourceLocation?.trim(),
          resourceTags: tagsArr,
        };
      } else {
        profile = {
          ...base,
          accountType: 'talent',
          profileKind: 'talent',
          profileLock: profileLock === 'resource' ? 'resource' : null,
          edad,
          sexo,
        };
      }

      await saveUserProfile(profile, 'free', setUserData);
      await AsyncStorage.setItem('userProfileFree', JSON.stringify(profile));
      await AsyncStorage.setItem('userData', JSON.stringify(profile));

      setUserData(profile);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error al guardar perfil:', error);
      Alert.alert('Error', 'No se pudo guardar el perfil. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D8A353" />
        <Text style={{ color: '#D8A353', marginTop: 10 }}>Subiendo imagen...</Text>
      </View>
    );
  }

  const maxCats = (profileLock === 'resource' || profileMode === 'resource') ? MAX_CATS_RESOURCE : MAX_CATS_TALENT;
  const photosLabel = isResource ? 'Fotos del servicio (máx 3)*:' : 'Fotos del Book (máx 3)*:';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#000' }}
    >
      <BackButton color="#fff" size={28} top={50} left={15} />

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.requiredNote}>* Campos requeridos</Text>

        {/* Banner informativo del modo actual (sin botones) */}
        {profileLock === 'resource' ? (
          <View style={styles.banner}>
            <Ionicons name="construct-outline" size={18} color="#000" />
            <Text style={styles.bannerText}>Perfil bloqueado como Resource (edición limitada)</Text>
          </View>
        ) : (
          <View style={styles.banner}>
            <Ionicons name={isResource ? 'construct-outline' : 'person-outline'} size={18} color="#000" />
            <Text style={styles.bannerText}>
              {isResource ? 'Editando perfil de Recursos' : 'Editando perfil de Talento'}
            </Text>
          </View>
        )}

        {/* Foto de perfil / logo */}
        <TouchableOpacity onPress={pickProfilePhoto}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>
                {isResource ? 'Agregar logo o imagen del servicio' : 'Agregar foto de perfil'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Selector de categorías */}
        <TouchableOpacity onPress={() => setShowCategoryModal(true)} style={styles.button}>
          <Text style={styles.buttonText}>
            {category.length > 0
              ? `${category.length} categoría${category.length > 1 ? 's' : ''} seleccionada${category.length > 1 ? 's' : ''}`
              : `Seleccionar categorías (máx ${maxCats})`}
          </Text>
        </TouchableOpacity>

        {/* Campos comunes */}
        <TextInput
          style={styles.input}
          placeholder={isResource ? 'Nombre o Razón social*' : 'Nombre completo*'}
          value={name}
          onChangeText={setName}
          placeholderTextColor="#aaa"
        />

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico*"
          value={email}
          onChangeText={setEmail}
          placeholderTextColor="#aaa"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Sección condicional */}
        {isResource ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Título comercial del servicio*"
              value={resourceTitle}
              onChangeText={setResourceTitle}
              placeholderTextColor="#aaa"
            />
            <TextInput
              style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
              placeholder="Descripción del servicio (máx 300)*"
              value={resourceDescription}
              onChangeText={setResourceDescription}
              placeholderTextColor="#aaa"
              multiline
              maxLength={300}
            />
            <Text style={styles.counter}>{(resourceDescription || '').length}/300</Text>

            <TextInput
              style={styles.input}
              placeholder="Ubicación (ciudad/área)*"
              value={resourceLocation}
              onChangeText={setResourceLocation}
              placeholderTextColor="#aaa"
            />

            <TextInput
              style={styles.input}
              placeholder="Tags (separados por coma, máx 5)"
              value={resourceTagsInput}
              onChangeText={setResourceTagsInput}
              placeholderTextColor="#aaa"
              autoCapitalize="none"
            />
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Edad"
              value={edad}
              onChangeText={setEdad}
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              autoComplete="off"
              textContentType="none"
            />

            <View style={{ zIndex: zIndexSexo, width: '90%', marginBottom: 10 }}>
              <DropDownPicker
                open={openSexo}
                value={sexo}
                items={[
                  { label: 'Hombre', value: 'Hombre' },
                  { label: 'Mujer', value: 'Mujer' },
                ]}
                setOpen={(val) => {
                  setOpenSexo(val);
                  setZIndexSexo(val ? 2000 : 1000);
                }}
                setValue={setSexo}
                placeholder="Selecciona tu sexo"
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
                textStyle={{ color: '#D8A353', fontSize: 13 }}
                labelStyle={{ color: '#D8A353' }}
                placeholderStyle={{ color: '#888' }}
                listMode="SCROLLVIEW"
                ArrowDownIconComponent={({ style }) => (
                  <Ionicons name="chevron-down" size={18} color="#fff" style={style} />
                )}
                ArrowUpIconComponent={({ style }) => (
                  <Ionicons name="chevron-up" size={18} color="#fff" style={style} />
                )}
              />
            </View>
          </>
        )}

        {/* Galería */}
        <Text style={styles.label}>{photosLabel}</Text>
        <View style={styles.gallery}>
          {bookPhotos.map((uri, index) => (
            <View key={index} style={styles.photoItem}>
              <Image source={{ uri }} style={styles.bookImage} />
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeletePhoto(index)}>
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={pickBookPhotos}>
          <Text style={styles.buttonText}>Agregar fotos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.saveButton,
            saving && { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving && <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />}
          <Text style={styles.saveButtonText}>
            {saving ? 'Guardando perfil...' : 'Guardar Perfil'}
          </Text>
        </TouchableOpacity>

        {/* Modal categorías */}
        <Modal
          visible={showCategoryModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCategoryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxWidth: 520, width: '90%' }]}>
              <Text style={[styles.modalText, { marginBottom: 10 }]}>Selecciona categorías</Text>

              {/* Chips seleccionadas */}
              <View style={styles.selectedChips}>
                {category.length === 0 ? (
                  <Text style={{ color: '#888', fontSize: 12 }}>Sin categorías seleccionadas</Text>
                ) : (
                  category.map((c, idx) => (
                    <View key={`${c}-${idx}`} style={styles.chip}>
                      <Text style={styles.chipText}>{c}</Text>
                      <TouchableOpacity onPress={() => toggleCategory(c)} style={styles.chipClose}>
                        <Text style={styles.chipCloseText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              {/* Buscador + contador */}
              <View style={styles.searchRow}>
                <TextInput
                  style={[styles.searchInput, { flex: 1 }]}
                  placeholder="Buscar categoría..."
                  placeholderTextColor="#aaa"
                  value={searchCategory}
                  onChangeText={setSearchCategory}
                />
                <Text style={styles.counterSmall}>
                  {category.length}/{maxCats}
                </Text>
              </View>

              {/* Lista con scroll real */}
              <FlatList
                data={filteredCategories}
                keyExtractor={(item) => item}
                style={{ maxHeight: 320, alignSelf: 'stretch' }}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const isSelected = category.includes(item);
                  const atLimit = category.length >= maxCats && !isSelected;
                  return (
                    <TouchableOpacity
                      onPress={() => toggleCategory(item)}
                      disabled={atLimit || profileLock === 'resource'}
                      style={[
                        styles.categoryItem,
                        isSelected && styles.categoryItemSelected,
                        (atLimit || profileLock === 'resource') && styles.categoryItemDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryItemText,
                          isSelected && styles.categoryItemTextSelected,
                          (atLimit || profileLock === 'resource') && styles.categoryItemTextDisabled,
                        ]}
                      >
                        {item}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={16} color="#000" />}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={{ color: '#888', textAlign: 'center', paddingVertical: 12 }}>
                    Sin resultados
                  </Text>
                }
                contentContainerStyle={{ paddingBottom: 8 }}
              />

              {/* Acciones */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => {
                    if (profileLock === 'resource') return;
                    setCategory([]);
                    setSearchCategory('');
                  }}
                  style={[styles.modalButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#D8A353' }]}
                >
                  <Text style={[styles.modalButtonText, { color: '#D8A353' }]}>Limpiar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowCategoryModal(false)}
                  style={[styles.modalButton, { backgroundColor: '#333' }]}
                >
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Cerrar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowCategoryModal(false)}
                  style={styles.modalButton}
                >
                  <Text style={styles.modalButtonText}>Listo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal de éxito */}
        {showSuccessModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>✅ Tu perfil ha sido actualizado con éxito.</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowSuccessModal(false);
                  goToProfileTab(navigation);
                }}
              >
                <Text style={styles.modalButtonText}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#000',
  },
  requiredNote: {
    color: '#D8A353',
    marginBottom: 10,
    fontSize: 12,
  },
  banner: {
    backgroundColor: '#D8A353',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  bannerText: {
    color: '#000',
    fontWeight: 'bold',
  },
  modeButton: {
    backgroundColor: '#1A1A1A',
    borderColor: '#D8A353',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  modeButtonActive: {
    backgroundColor: '#D8A353',
  },
  modeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 60,
    borderWidth: 0.5,
    borderColor: '#D8A353',
    marginBottom: 15,
  },
  placeholder: {
    width: 100,
    height: 100,
    borderRadius: 60,
    backgroundColor: '#1B1B1B',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#D8A353',
    borderWidth: 0.5,
    marginBottom: 15,
  },
  placeholderText: {
    color: '#CCCCCC',
    textAlign: 'center',
    fontSize: 12,
  },
  input: {
    width: '90%',
    backgroundColor: '#1B1B1B',
    color: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: '#D8A353',
  },
  counter: {
    color: '#aaa',
    alignSelf: 'flex-end',
    marginTop: -10,
    marginBottom: 10,
    fontSize: 12,
  },
  label: {
    color: '#D8A353',
    marginBottom: 5,
    fontSize: 14,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginLeft: '10%',
    marginTop: 15,
  },
  gallery: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  bookImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  button: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  photoItem: {
    position: 'relative',
    marginHorizontal: 5,
    marginVertical: 5,
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#000',
    borderColor: '#D8A353',
    borderWidth: 0.5,
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
    marginTop: 20,
  },
  saveButtonText: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  dropdown: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 0.5,
    borderRadius: 10,
  },
  dropdownContainer: {
    backgroundColor: '#000',
    borderColor: '#D8A353',
    maxHeight: 300,
  },

  /* --- Modal categorías --- */
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    paddingHorizontal: 10,
  },
  modalContent: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 12,
    width: '90%',
    borderColor: '#D8A353',
    borderWidth: 0.5,
  },
  modalText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  searchInput: {
    backgroundColor: '#222',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderColor: '#D8A353',
    borderWidth: 0.5,
  },
  selectedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D8A353',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    color: '#000',
    fontWeight: 'bold',
    marginRight: 6,
  },
  chipClose: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCloseText: {
    color: '#D8A353',
    fontSize: 12,
    marginTop: -1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  counterSmall: {
    color: '#D8A353',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
    backgroundColor: '#111',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryItemSelected: {
    backgroundColor: '#D8A353',
    borderColor: '#D8A353',
  },
  categoryItemDisabled: {
    opacity: 0.5,
  },
  categoryItemText: {
    color: '#fff',
    fontSize: 14,
  },
  categoryItemTextSelected: {
    color: '#000',
    fontWeight: 'bold',
  },
  categoryItemTextDisabled: {
    color: '#777',
  },
  modalActions: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
});
