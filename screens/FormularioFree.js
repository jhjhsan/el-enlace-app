import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DropDownPicker from 'react-native-dropdown-picker';
import { useUser } from '../contexts/UserContext';
import { saveUserProfile } from '../utils/profileStorage';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { goToDashboardTab, goToHomeAfterAuth, isFreeProfileComplete } from '../utils/navigationHelpers';
import { validateImageWithIA } from '../src/firebase/helpers/validateMediaContent';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { FlatList } from 'react-native';
import { uploadMediaToStorage } from '../src/firebase/helpers/uploadMediaToStorage'; 
import { getAuth, sendEmailVerification } from 'firebase/auth';

console.log('🧪 ImagePicker cargado:', ImagePicker);

const SCREEN_HEIGHT = Dimensions.get('window').height;

/** --- Catálogo de categorías que se consideran "resource" (stems en minúscula) --- */
const RESOURCE_CATS = [
  // Transporte
  'transporte', 'van', 'vans', 'camion', 'camión', 'camiones',
  'motorhome', 'casa rodante', 'camerino', 'auto', 'autos', 'vehiculo', 'vehículo',
  'moto', 'motos', 'bicicleta', 'bicicletas',
  // Extras transporte producción
  'chofer', 'traslado', 'traslados',

  // Locaciones / estudios
  'locacion', 'locación', 'locaciones', 'estudio', 'set', 'plato', 'plató',
  'galpon', 'galpón', 'bodega', 'bodegas',
  // Permisos / logística de rodaje
  'permiso', 'permisos', 'gestión de permisos', 'gestion de permisos',
  'corte de calle', 'corte de tránsito', 'corte de transito',

  // Arriendo / rental equipos
  'arriendo', 'arrendar', 'arrienda', 'alquiler',
  'equipo', 'equipos', 'camara', 'cámara', 'lente', 'lentes',
  'iluminacion', 'iluminación', 'grip', 'rigging', 'generador', 'generadores',
  'drone', 'dron', 'gimbal', 'steady', 'video assist', 'monitoreo', 'inalambrico', 'inalámbrico',
  'dit', 'data wrangler', 'dit cart', 'teradek',

  // Arte / vestuario / props
  'utileria', 'utilería', 'props', 'vestuario', 'sastreria', 'sastrería',
  'mobiliario', 'ambientacion', 'ambientación',

  // Efectos / seguridad
  'fx', 'efecto', 'efectos', 'lluvia', 'viento', 'nieve', 'humo', 'niebla',
  'pirotecnia', 'seguridad', 'guardias', 'paramedico', 'paramédico', 'ambulancia',

  // Servicios base
  'catering', 'coffee break', 'coffe break', 'snack', 'snacks', 'craft service',
  'baño', 'baños', 'baños químicos', 'banos quimicos',
  'carpa', 'carpas', 'toldo', 'toldos', 'valla', 'vallas', 'vallado', 'control de público', 'control de publico',
  'limpieza', 'aseo', 'seguros de producción', 'seguros de produccion',

  // Post / salas
  'postproduccion', 'postproducción', 'sala de color', 'color', 'grading',
  'sala de edicion', 'sala de edición', 'edicion', 'edición',
  'mezcla', 'estudio de sonido', 'estudio de mezcla', 'adr', 'doblaje', 'locución', 'locucion',

  // Animales / armas (escénico, con permisos)
  'animal', 'animales', 'handler', 'armeria', 'armería', 'armas de utilería', 'armas de utileria',

  // Otros
  'platform', 'plataforma', 'streaming', 'resource', 'recurso'
];
const isResourceCategory = (categories = []) => {
  const cats = categories.map(c => String(c).toLowerCase());
  return cats.some(c => RESOURCE_CATS.some(k => c.includes(k)));
};

const resizeProfilePhoto = async (uri) => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 720 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (e) {
    console.error('Error al redimensionar perfil:', e);
    return uri;
  }
};

const resizeBookPhoto = async (uri) => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1080 } }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (e) {
    console.error('Error al redimensionar book:', e);
    return uri;
  }
};

export default function FormularioFree({ navigation }) {
  const { setUserData, setIsLoggedIn, userData } = useUser();
  const [loading, setLoading] = useState(false);

  // === Campos comunes / talento (originales) ===
  const [name, setName] = useState(userData?.name || '');
  const [email, setEmail] = useState(userData?.email || '');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [bookPhotos, setBookPhotos] = useState([]);
  const [sexo, setSexo] = useState('');
  const [edad, setEdad] = useState('');
  const [openSexo, setOpenSexo] = useState(false);
  const [zIndexSexo, setZIndexSexo] = useState(500);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [category, setCategory] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [searchCategory, setSearchCategory] = useState('');
  const [hasOffensiveContent, setHasOffensiveContent] = useState(false);

  // === NUEVO: campos específicos Resource (Free limitado) ===
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceDescription, setResourceDescription] = useState('');
  const [resourceLocation, setResourceLocation] = useState('');
  const [resourceTagsInput, setResourceTagsInput] = useState(''); // coma-separado para UI simple

  // --- NUEVO: modo seleccionado por el usuario ---
  const [profileMode, setProfileMode] = useState(null); // 'talent' | 'resource' | null
  const MAX_CATS_TALENT = 3;
  const MAX_CATS_RESOURCE = 1;

  // isResource depende primero del modo; si no hay modo, cae a detección por categoría
  const isResource = useMemo(() => {
    if (profileMode === 'resource') return true;
    if (profileMode === 'talent') return false;
    return isResourceCategory(category);
  }, [profileMode, category]);

/** --- Catálogo completo (TALENTO) — mismo que Pro --- */
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

/** --- Catálogo completo (RECURSOS) — mismo que Pro --- */
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
  "Otros / No especificado"
];

/** --- Lista efectiva según el modo --- */
const categoriesList = useMemo(() => {
  if (profileMode === 'resource') return RESOURCE_CATEGORIES;
  // por defecto o 'talent'
  return TALENT_CATEGORIES;
}, [profileMode]);

/** --- Búsqueda sobre la lista efectiva --- */
const filteredCategories = categoriesList.filter(cat =>
  cat.toLowerCase().includes(searchCategory.toLowerCase())
);

  // === Carga inicial ===
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const json = await AsyncStorage.getItem('userProfileFree');
        if (json) {
          const profile = JSON.parse(json);
          setName(profile.name || '');
          setEmail(profile.email || '');
          setSexo(profile.sexo || '');
          setEdad(profile.edad || '');
          setProfilePhoto(profile.profilePhoto || null);
          setBookPhotos(profile.bookPhotos || []);
          setCategory(Array.isArray(profile.category) ? profile.category : []);

          // NUEVO: carga de campos resource si existieran
          setResourceTitle(profile.resourceTitle || '');
          setResourceDescription(profile.resourceDescription || '');
          setResourceLocation(profile.resourceLocation || '');
          if (Array.isArray(profile.resourceTags)) {
            setResourceTagsInput(profile.resourceTags.join(', '));
          }

          // Preseleccionar modo segun flags previos
          if (profile.profileLock === 'resource' || profile.profileKind === 'resource') {
            setProfileMode('resource');
          } else if (profile.profileKind === 'talent') {
            setProfileMode('talent');
          }
        }
      } catch (error) {
        console.log('❌ Error al cargar perfil Free:', error);
      }
    };
    loadProfile();
  }, []);

  // === Selección de categorías con límites por modo ===
  const toggleCategory = (cat) => {
    const max = profileMode === 'resource' ? MAX_CATS_RESOURCE : MAX_CATS_TALENT;

    setCategory(prev => {
      if (prev.includes(cat)) {
        return prev.filter(c => c !== cat);
      }
      if (profileMode === 'resource') {
        return [cat]; // solo una
      }
      if (prev.length < max) {
        return [...prev, cat];
      } else {
        Alert.alert('Límite alcanzado', `Solo puedes seleccionar hasta ${max} categoría(s).`);
        return prev;
      }
    });
  };

  const sexoItems = [
    { label: 'Hombre', value: 'Hombre' },
    { label: 'Mujer', value: 'Mujer' },
  ];

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
        return;
      }

      const emailKey = (email || userData?.email || '')
        .toLowerCase()
        .replace(/\s/g, '')
        .replace(/[@.]/g, '_');

      setLoading(true);
      const resizedUri = await resizeProfilePhoto(uriToUpload);
      const firebaseUrl = await uploadMediaToStorage(
        resizedUri,
        `profile_photos/${emailKey}_photo.jpg`
      );
      setLoading(false);

      if (!firebaseUrl || !firebaseUrl.startsWith('https://')) {
        setModalMessage('No se pudo subir la imagen.');
        setModalVisible(true);
        return;
      }

      setProfilePhoto(firebaseUrl);

      setTimeout(async () => {
        const validation = await validateImageWithIA(firebaseUrl);
        if (!validation.valid) {
          setProfilePhoto(null);
          setHasOffensiveContent(true);
          setModalMessage('La imagen contiene contenido ofensivo. Por favor selecciona otra.');
          setModalVisible(true);
        }
      }, 500);
    } catch (error) {
      console.error('❌ Error al seleccionar imagen de perfil:', error);
      setModalMessage('Ocurrió un error al subir la imagen.');
      setModalVisible(true);
      setLoading(false);
    }
  };

  const pickBookPhotos = async () => {
    if (bookPhotos.length >= 3) {
      Alert.alert(
        'Límite alcanzado',
        'Solo puedes subir hasta 3 fotos. Si quieres cambiar una, elimina primero una foto existente.'
      );
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Debes permitir acceso a la galería para subir imágenes.');
        return;
      }

      const maxSelectable = 3 - bookPhotos.length;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (result.canceled) return;

      const selectedAssets = result.assets || [];

      if (selectedAssets.length > maxSelectable) {
        Alert.alert(
          'Demasiadas fotos seleccionadas',
          `Solo puedes seleccionar ${maxSelectable} foto${maxSelectable === 1 ? '' : 's'} más.`
        );
        return;
      }

      const emailKey = (email || userData?.email || '')
        .toLowerCase()
        .replace(/\s/g, '')
        .replace(/[@.]/g, '_');

      setLoading(true);

      const uploadPromises = selectedAssets.map(async (asset, index) => {
        const uriToUpload = asset.uri;

        const fileInfo = await FileSystem.getInfoAsync(uriToUpload);
        if (!fileInfo.exists) {
          throw new Error('Archivo no válido.');
        }

        const resizedUri = await resizeBookPhoto(uriToUpload);
        const filename = `book_${Date.now()}_${index}.jpg`;

        const firebaseUrl = await uploadMediaToStorage(
          resizedUri,
          `book_photos/${emailKey}_${filename}`
        );

        if (!firebaseUrl || !firebaseUrl.startsWith('https://')) {
          throw new Error('No se pudo subir una de las imágenes.');
        }

        setTimeout(async () => {
          const validation = await validateImageWithIA(firebaseUrl);
          if (!validation.valid) {
            setBookPhotos(prev => prev.filter(uri => uri !== firebaseUrl));
            setHasOffensiveContent(true);
            setModalMessage('Una de las fotos contiene contenido ofensivo. Debes cambiarla.');
            setModalVisible(true);
          }
        }, 500);

        return firebaseUrl;
      });

      const urls = await Promise.all(uploadPromises);
      setBookPhotos(prev => [...prev, ...urls]);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error al subir fotos del book:', error);
      setLoading(false);
      setModalMessage(error.message || 'Ocurrió un error al subir las fotos.');
      setModalVisible(true);
    }
  };

  const handleDeletePhoto = (index) => {
    const updated = [...bookPhotos];
    updated.splice(index, 1);
    setBookPhotos(updated);
  };

  const handleSave = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // ===== VALIDACIÓN BÁSICA =====
    if (!emailRegex.test(email || '')) {
      setModalMessage('Ingresa un correo válido.');
      setModalVisible(true);
      return;
    }
    if (!profilePhoto?.startsWith('https://')) {
      setModalMessage('La foto de perfil/logo no es válida. Por favor, selecciona una nueva.');
      setModalVisible(true);
      return;
    }
    if (bookPhotos.length < 1 || bookPhotos.some(uri => !uri?.startsWith('https://'))) {
      setModalMessage('Debes subir al menos una foto válida.');
      setModalVisible(true);
      return;
    }
    if (!profileMode) {
      setModalMessage('Elige si tu perfil es de Talentos o de Recursos.');
      setModalVisible(true);
      return;
    }

    const maxCats = profileMode === 'resource' ? MAX_CATS_RESOURCE : MAX_CATS_TALENT;
    if (!Array.isArray(category) || category.length === 0) {
      setModalMessage('Selecciona al menos una categoría.');
      setModalVisible(true);
      return;
    }
    if (category.length > maxCats) {
      setModalMessage(`Límite de categorías excedido (máx ${maxCats}).`);
      setModalVisible(true);
      return;
    }

    // ===== VALIDACIÓN ESPECÍFICA =====
    if (isResource) {
      // Resource Free (limitado)
      if (!name?.trim()) {
        setModalMessage('El nombre/razón social es obligatorio.');
        setModalVisible(true);
        return;
      }
      if (!resourceTitle?.trim()) {
        setModalMessage('Ingresa el título comercial del servicio.');
        setModalVisible(true);
        return;
      }
      const desc = (resourceDescription || '').trim();
      if (!desc) {
        setModalMessage('La descripción del servicio es obligatoria.');
        setModalVisible(true);
        return;
      }
      if (desc.length > 300) {
        setModalMessage('La descripción no puede superar 300 caracteres.');
        setModalVisible(true);
        return;
      }
      if (!resourceLocation?.trim()) {
        setModalMessage('La ubicación es obligatoria (ciudad/área).');
        setModalVisible(true);
        return;
      }
      const tagsArr = (resourceTagsInput || '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
      if (tagsArr.length > 5) {
        setModalMessage('Máximo 5 tags (separados por coma).');
        setModalVisible(true);
        return;
      }
    } else {
      // Talento Free (tu flujo actual)
      if (!name || !email || !sexo || !edad) {
        setModalMessage('Completa todos los campos obligatorios.');
        setModalVisible(true);
        return;
      }
      if (isNaN(Number(edad))) {
        setModalMessage('Ingresa una edad válida en números.');
        setModalVisible(true);
        return;
      }
      if (name && edad && name.trim() === String(edad).trim()) {
        setModalMessage('Nombre y edad no deben coincidir. Verifica los datos.');
        setModalVisible(true);
        return;
      }
    }

    try {
      setLoading(true);
      console.log('👤 Firebase user activo en este momento:', getAuth().currentUser);

      const cleanEmail = (email || '').trim().toLowerCase();

      // ===== PAYLOAD DINÁMICO =====
      const base = {
        id: cleanEmail,
        name,
        email: cleanEmail,
        membershipType: 'free',
        profilePhoto,
        bookPhotos, // book o fotos del recurso (reuso)
        category,
        visibleInExplorer: !hasOffensiveContent,
        flagged: hasOffensiveContent,
        timestamp: Date.now(),
      };

      let fullProfile;

      if (isResource) {
        const tagsArr = (resourceTagsInput || '')
          .split(',')
          .map(t => t.trim())
          .filter(Boolean)
          .slice(0, 5);

        fullProfile = {
          ...base,
          accountType: 'talent', // se mantiene para no romper flujos existentes
          profileKind: 'resource',
          profileLock: 'resource', // ← clave para bloquear en Pro
          resourceType: category?.[0] || 'resource',
          resourceTitle: resourceTitle?.trim(),
          resourceDescription: (resourceDescription || '').trim(),
          resourceLocation: resourceLocation?.trim(),
          resourceTags: tagsArr,
        };
      } else {
        fullProfile = {
          ...base,
          accountType: 'talent',
          profileKind: 'talent',
          profileLock: null,
          sexo,
          edad,
        };
      }

      const fromRegister = await AsyncStorage.getItem('fromRegister');

      if (fromRegister === 'true') {
        await saveUserProfile(fullProfile, 'free', setUserData, setIsLoggedIn, true);
        await AsyncStorage.setItem('sessionActive', 'true');
        await AsyncStorage.removeItem('fromRegister');
        await AsyncStorage.setItem('hasCompletedFreeForm', 'true');
        await AsyncStorage.setItem('userData', JSON.stringify(fullProfile));
        console.log('🔐 Marcado hasCompletedFreeForm como true');
        console.log('💾 userData guardado para uso global (Pro incluido)');

        try {
          const auth = getAuth();
          if (auth.currentUser && !auth.currentUser.emailVerified) {
            await sendEmailVerification(auth.currentUser);
            Alert.alert(
              'Verificación enviada',
              'Te hemos enviado un correo para verificar tu cuenta. Puedes revisarlo cuando gustes.'
            );
          }
        } catch (err) {
          console.warn('❌ Error al enviar correo de verificación:', err);
        }

        // ✅ Navegación robusta según completitud real (talento/recurso)
        try {
          const canonicalJson = await AsyncStorage.getItem('userProfile'); // espejo creado en saveUserProfile
          const canonical = canonicalJson ? JSON.parse(canonicalJson) : null;
          const profileForCheck = canonical || fullProfile;

          // Usa la misma lógica que el guard de RootNavigator
          if (isFreeProfileComplete(profileForCheck)) {
            goToDashboardTab(navigation);
          } else {
            // Esto no debería ocurrir si pasó validación, pero lo mantenemos defensivo
            Alert.alert('Faltan datos', 'Aún quedan campos obligatorios por completar.');
          }
        } catch (e) {
          console.log('⚠️ Error al redirigir:', e);
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'DashboardScreen' }],
            })
          );
        }
      } else {
        await saveUserProfile(fullProfile, 'free', setUserData, setIsLoggedIn);

        // ✅ Incluso si no viene de register, decide navegación con el espejo
        const canonicalJson = await AsyncStorage.getItem('userProfile');
        const canonical = canonicalJson ? JSON.parse(canonicalJson) : null;
        goToHomeAfterAuth(navigation, canonical || fullProfile);
      }
      setLoading(false);
    } catch (e) {
      console.log('Error al guardar perfil:', e);
      setLoading(false);
      setModalMessage('No se pudo guardar el perfil.');
      setModalVisible(true);
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

  const photosLabel = isResource ? 'Fotos del servicio (máx 3):' : 'Fotos del Book (máx 3):';
  const maxCats = profileMode === 'resource' ? MAX_CATS_RESOURCE : MAX_CATS_TALENT;

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.inner}>
            <Text style={styles.title}>Formulario Free ✅</Text>

            {/* PASO 1: Elegir tipo de perfil */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
              <TouchableOpacity
                onPress={() => {
                  setProfileMode('talent');
                  if (category.length > MAX_CATS_TALENT) {
                    setCategory(category.slice(0, MAX_CATS_TALENT));
                  }
                }}
                style={[
                  styles.modeButton,
                  profileMode === 'talent' && styles.modeButtonActive,
                ]}
              >
                <Text style={styles.modeButtonText}>Talentos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setProfileMode('resource');
                  if (category.length > 1) setCategory(category.slice(0, 1));
                }}
                style={[
                  styles.modeButton,
                  profileMode === 'resource' && styles.modeButtonActive,
                ]}
              >
                <Text style={styles.modeButtonText}>Recursos</Text>
              </TouchableOpacity>
            </View>

            {/* Banner de modo */}
            {isResource && (
              <View style={styles.banner}>
                <Ionicons name="construct-outline" size={18} color="#000" />
                <Text style={styles.bannerText}>Modo Resource – versión limitada</Text>
              </View>
            )}

            {/* Foto de perfil / logo */}
            <TouchableOpacity onPress={pickProfilePhoto}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
              ) : (
                <View style={styles.placeholder}>
                  <Text style={styles.placeholderText}>
                    {isResource ? 'Subir logo o imagen del servicio' : 'Subir foto de perfil'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Nombre / correo */}
            <TextInput
              placeholder={isResource ? 'Nombre o Razón social' : 'Nombre completo'}
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholderTextColor="#999"
            />
            <TextInput
              placeholder="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholderTextColor="#999"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {/* Selector de Categoría (arriba) */}
            <TouchableOpacity
              style={[
                styles.input,
                {
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                },
              ]}
              onPress={() => {
                if (!profileMode) {
                  Alert.alert('Primero elige', 'Selecciona si eres Talentos o Recursos.');
                  return;
                }
                if (category.length >= maxCats) {
                  Alert.alert('Límite alcanzado', `Solo puedes seleccionar hasta ${maxCats} categoría(s).`);
                  return;
                }
                setShowCategoryModal(true);
              }}
            >
              <Text
                style={{ color: category.length ? '#fff' : '#888', flex: 1 }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {category.length === 0
                  ? `Seleccionar Categorías* (máx ${maxCats})`
                  : `${category.length} categoría${category.length > 1 ? 's' : ''} seleccionada${category.length > 1 ? 's' : ''}`}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#D8A353" />
            </TouchableOpacity>

            {/* === Sección condicional === */}
            {isResource ? (
              <>
                <TextInput
                  placeholder="Título comercial del servicio*"
                  value={resourceTitle}
                  onChangeText={setResourceTitle}
                  style={styles.input}
                  placeholderTextColor="#999"
                />

                <TextInput
                  placeholder="Descripción del servicio (máx 300)*"
                  value={resourceDescription}
                  onChangeText={setResourceDescription}
                  style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
                  placeholderTextColor="#999"
                  multiline
                  maxLength={300}
                />
                <Text style={styles.counter}>{(resourceDescription || '').length}/300</Text>

                <TextInput
                  placeholder="Ubicación (ciudad/área)*"
                  value={resourceLocation}
                  onChangeText={setResourceLocation}
                  style={styles.input}
                  placeholderTextColor="#999"
                />

                <TextInput
                  placeholder="Tags (separados por coma, máx 5)"
                  value={resourceTagsInput}
                  onChangeText={setResourceTagsInput}
                  style={styles.input}
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
              </>
            ) : (
              <>
                {/* Talento: edad/sexo como ya tenías */}
                <TextInput
                  placeholder="Edad"
                  value={edad}
                  onChangeText={setEdad}
                  style={styles.input}
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  autoComplete="off"
                  textContentType="none"
                />

                <View style={{ width: '100%', marginBottom: 15 }}>
                  <Text style={styles.label}>Sexo:</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                    <TouchableOpacity
                      style={[
                        styles.optionButton,
                        sexo === 'Hombre' && styles.optionSelected,
                      ]}
                      onPress={() => setSexo('Hombre')}
                    >
                      <Text style={styles.optionText}>Hombre</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.optionButton,
                        sexo === 'Mujer' && styles.optionSelected,
                      ]}
                      onPress={() => setSexo('Mujer')}
                    >
                      <Text style={styles.optionText}>Mujer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            {/* Fotos */}
            <Text style={styles.label}>{photosLabel}</Text>
            <View style={styles.gallery}>
              {bookPhotos.map((uri, index) => (
                <View key={index} style={styles.photoItem}>
                  <Image source={{ uri }} style={styles.bookImage} />
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeletePhoto(index)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <Text style={styles.photoCount}>
              Has subido {bookPhotos.length} de 3 fotos permitidas
            </Text>

            <TouchableOpacity style={styles.button} onPress={pickBookPhotos}>
              <Text style={styles.buttonText}>Agregar fotos</Text>
            </TouchableOpacity>

            <Text style={styles.notice}>
              * Todos los campos deben estar completos para guardar el perfil
            </Text>

            <TouchableOpacity
              style={[
                styles.saveButton,
                loading && { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
              ]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading && <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />}
              <Text style={styles.saveButtonText}>
                {loading ? 'Guardando perfil...' : 'Guardar perfil'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal genérico de mensajes */}
      {modalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>{modalMessage}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal de categorías mejorado */}
      {showCategoryModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 520, width: '90%' }]}>
            <Text style={[styles.modalText, { marginBottom: 10 }]}>Selecciona categorías</Text>

            {/* Chips de seleccionadas */}
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

            {/* Lista */}
            <FlatList
              style={{ maxHeight: 300, alignSelf: 'stretch' }}
              data={filteredCategories}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => {
                const isSelected = category.includes(item);
                const atLimit = category.length >= maxCats && !isSelected;
                return (
                  <TouchableOpacity
                    onPress={() => toggleCategory(item)}
                    disabled={atLimit}
                    style={[
                      styles.categoryItem,
                      isSelected && styles.categoryItemSelected,
                      atLimit && styles.categoryItemDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryItemText,
                        isSelected && styles.categoryItemTextSelected,
                        atLimit && styles.categoryItemTextDisabled,
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#000" />}
                  </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator
            />

            {/* Acciones */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
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
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    marginTop: 30,
  },
  inner: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 50,
  },
  title: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  banner: {
    backgroundColor: '#D8A353',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
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
  input: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    borderColor: '#D8A353',
    borderWidth: 0.5,
    marginBottom: 15,
  },
  counter: {
    color: '#aaa',
    alignSelf: 'flex-end',
    marginTop: -10,
    marginBottom: 10,
    fontSize: 12,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
    borderColor: '#D8A353',
    borderWidth: 0.5,
  },
  placeholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1B1B1B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderColor: '#D8A353',
    borderWidth: 0.5,
  },
  placeholderText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  dropdownWrapper: {
    width: '100%',
    marginBottom: 10,
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
    borderWidth: 0.5,
    maxHeight: 700,
  },
  label: {
    color: '#D8A353',
    alignSelf: 'flex-start',
    marginBottom: 10,
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
  photoItem: {
    position: 'relative',
    marginHorizontal: 5,
    marginVertical: 5,
  },
  deleteButton: {
    position: 'absolute',
    top: -6,
    right: -6,
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
  saveButton: {
    backgroundColor: '#D8A353',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  notice: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    paddingHorizontal: 10,
  },
  modalContent: {
    backgroundColor: '#1B1B1B',
    padding: 16,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#D8A353',
    width: '80%',
    alignItems: 'stretch',
  },
  modalText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
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
  searchInput: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 0.5,
    borderRadius: 10,
    padding: 10,
    color: '#fff',
  },
  selectedCategory: {
    fontWeight: 'bold',
    color: '#D8A353',
    textDecorationLine: 'underline',
  },
  scrollContent: {
    paddingBottom: 50,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
    backgroundColor: '#1A1A1A',
  },
  optionSelected: {
    backgroundColor: '#D8A353',
  },
  optionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  photoCount: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 10,
    alignSelf: 'center',
  },
  /* --- Modal categorías mejorado --- */
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
});
