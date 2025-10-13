import { ref, deleteObject } from 'firebase/storage';
import { storage } from '../src/firebase/firebaseConfig';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useUser } from '../contexts/UserContext';
import { saveUserProfile } from '../utils/profileStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DropDownPicker from 'react-native-dropdown-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Ionicons } from '@expo/vector-icons';
import { goToProfileTab } from '../utils/navigationHelpers';
import { validateImageWithIA } from '../src/firebase/helpers/validateMediaContent';
import { uploadMediaToStorage } from '../src/firebase/helpers/uploadMediaToStorage';
import { rebuildAllProfiles } from '../src/firebase/helpers/rebuildAllProfiles';
import { CommonActions } from '@react-navigation/native';
import { validateVideoWithIA } from '../src/firebase/helpers/validateVideoWithIA';

/* === NUEVO: Componente BottomSheetSelect (reutilizable, mismo que en CompleteProfileScreen) === */
const BottomSheetSelect = ({
  placeholder = 'Selecciona...',
  value,
  items = [],
  onChange = () => {},
  title,
  searchable = true,
}) => {
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(600)).current;
  const [query, setQuery] = useState('');

  const open = () => {
    setVisible(true);
    Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  };
  const close = () => {
    Animated.timing(translateY, { toValue: 600, duration: 180, useNativeDriver: true }).start(() => {
      setVisible(false);
      setQuery('');
    });
  };

  const selectedLabel = items.find((it) => it.value === value)?.label ?? '';
  const filtered = !searchable || !query.trim()
    ? items
    : items.filter((it) => String(it.label).toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <>
      <TouchableOpacity onPress={open} activeOpacity={0.8} style={[styles.dropdownLikeInput]}>
        <Text style={[styles.dropdownLikeText, !selectedLabel && { color: '#888' }]}>
          {selectedLabel || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#D8A353" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={close} />
        <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{title || placeholder}</Text>
          </View>

          {searchable && (
            <TextInput
              style={styles.sheetSearch}
              placeholder="Buscar..."
              placeholderTextColor="#aaa"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
          )}

          <ScrollView style={{ maxHeight: 420 }}>
            {filtered.map((it) => {
              const selected = it.value === value;
              return (
                <TouchableOpacity
                  key={String(it.value)}
                  onPress={() => { onChange(it.value); close(); }}
                  style={[styles.sheetItem, selected && styles.sheetItemSelected]}
                  activeOpacity={0.9}
                >
                  <Text style={styles.sheetItemText}>{it.label}</Text>
                  {selected && <Ionicons name="checkmark" size={18} color="#D8A353" />}
                </TouchableOpacity>
              );
            })}
            {filtered.length === 0 && <Text style={styles.sheetEmpty}>Sin resultados</Text>}
          </ScrollView>

          <TouchableOpacity onPress={close} style={styles.sheetCloseBtn}>
            <Text style={styles.sheetCloseText}>Cerrar</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </>
  );
};

/* === NUEVO: Catálogos completos (TALENT / RESOURCE) === */
// ==== TALENTOS / PROFESIONALES (perfiles personales) ====
const CATEGORIES_TALENT = [
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

// ==== RECURSOS / SERVICIOS / INFRAESTRUCTURA (no personales) ====
const CATEGORIES_RESOURCE = [
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

/* === NUEVO: Detector de resource ampliado y robusto === */
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
  const cats = (Array.isArray(categories) ? categories : [categories]).map(c => String(c || '').toLowerCase());
  return cats.some(c => RESOURCE_CATS.some(k => c.includes(k)));
};

// 👉 parser de habilidades desde texto
const parseSkills = (txt = '') =>
  String(txt)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 30);

export default function EditProfileScreen({ navigation }) {
  const { userData, setUserData } = useUser();

  const [isSaving, setIsSaving] = useState(false);
  const [validandoImagenes, setValidandoImagenes] = useState(false);
  const [validandoTotal, setValidandoTotal] = useState(0);
  const [validandoActual, setValidandoActual] = useState(0);
  const [validandoVideo, setValidandoVideo] = useState(false);
  const [puntos, setPuntos] = useState('');

  // comunes
  const [profilePhoto, setProfilePhoto] = useState(userData?.profilePhoto || null);
  const [name, setName] = useState(userData?.name || '');
  const [email, setEmail] = useState(userData?.email || '');
  const [phone, setPhone] = useState(userData?.phone || '');
  const [instagram, setInstagram] = useState(userData?.instagram?.replace(/^@/, '') || '');
  const [bookPhotos, setBookPhotos] = useState(userData?.bookPhotos || []);
  const [profileVideo, setProfileVideo] = useState(userData?.profileVideo || null);

  // 👉 nuevos (opcionales)
  const [reelUrl, setReelUrl] = useState(userData?.reelUrl || userData?.reelsUrl || '');
  const [skillsText, setSkillsText] = useState(
    Array.isArray(userData?.skills) ? userData.skills.join(', ') : (userData?.skillsText || '')
  );

  const [category, setCategory] = useState(
    Array.isArray(userData?.category)
      ? userData.category
      : userData?.category?.split(', ').filter(Boolean) || []
  );
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [searchCategory, setSearchCategory] = useState('');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  // talento
  const [sexo, setSexo] = useState(userData?.sexo || '');
  const [age, setAge] = useState(userData?.age || '');
  const [estatura, setEstatura] = useState(userData?.estatura || '');
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

  const [country, setCountry] = useState(userData?.country || '');
  const [ciudad, setCiudad] = useState(userData?.ciudad || '');
  const [address, setAddress] = useState(userData?.address || '');
  const [ethnicity, setEthnicity] = useState(userData?.ethnicity || '');
  const [region, setRegion] = useState(userData?.region || '');
  const [comuna, setComuna] = useState(userData?.comuna || '');

  // dropdowns (se conservan los estados originales)
  const [openSexo, setOpenSexo] = useState(false);
  const [zIndexSexo, setZIndexSexo] = useState(950);
  const [openCiudad, setOpenCiudad] = useState(false);
  const [zIndexCiudad, setZIndexCiudad] = useState(850);
  const [openEthnicity, setOpenEthnicity] = useState(false);
  const [zIndexEthnicity, setZIndexEthnicity] = useState(900);
  const [openRegion, setOpenRegion] = useState(false);
  const [zIndexRegion, setZIndexRegion] = useState(800);
  const [openCountry, setOpenCountry] = useState(false);
  const [zIndexCountry, setZIndexCountry] = useState(1000);

  // perfil kind/lock + recurso
  const [profileKind, setProfileKind] = useState(userData?.profileKind ?? null); // 'talent'|'resource'|null
  const [profileLock, setProfileLock] = useState(userData?.profileLock ?? null); // 'resource' o null
  const isResourceForced = profileLock === 'resource';
  // robustez: si kind === 'talent', no forzar resource por keywords
  const computedIsResource = isResourceForced || profileKind === 'resource' || (profileKind !== 'talent' && isResourceCategory(category));
  const [isResource, setIsResource] = useState(computedIsResource);

  const [resourceTitle, setResourceTitle] = useState(userData?.resourceTitle || '');
  const [resourceDescription, setResourceDescription] = useState(userData?.resourceDescription || '');
  const [resourceLocation, setResourceLocation] = useState(userData?.resourceLocation || '');
  const [resourcePriceFrom, setResourcePriceFrom] = useState(
    userData?.resourcePriceFrom !== undefined && userData?.resourcePriceFrom !== null
      ? String(userData.resourcePriceFrom) : ''
  );
  const [resourcePriceTo, setResourcePriceTo] = useState(
    userData?.resourcePriceTo !== undefined && userData?.resourcePriceTo !== null
      ? String(userData.resourcePriceTo) : ''
  );
  const [resourceAvailability, setResourceAvailability] = useState(userData?.resourceAvailability || '');
  const [resourceTags, setResourceTags] = useState(
    Array.isArray(userData?.resourceTags) ? userData.resourceTags.join(', ') : (userData?.resourceTags || '')
  );

  const ethnicityItems = [
    { label: 'Afrodescendiente', value: 'afrodescendiente' },
    { label: 'Caucásico', value: 'caucasico' },
    { label: 'Latino', value: 'latino' },
    { label: 'Asiático', value: 'asiatico' },
    { label: 'Indígena', value: 'indigena' },
    { label: 'Otro', value: 'otro' },
  ];
  const countryItems = [{ label: 'Chile', value: 'Chile' }];
  const regionItems = [
    { label: 'Arica y Parinacota', value: 'arica-y-parinacota' },
    { label: 'Tarapacá', value: 'tarapaca' },
    { label: 'Antofagasta', value: 'antofagasta' },
    { label: 'Atacama', value: 'atacama' },
    { label: 'Coquimbo', value: 'coquimbo' },
    { label: 'Valparaíso', value: 'valparaiso' },
    { label: 'Región Metropolitana', value: 'región metropolitana' },
    { label: "Libertador General Bernardo O'Higgins", value: 'libertador-general-bernardo-ohiggins' },
    { label: 'Maule', value: 'maule' },
    { label: 'Ñuble', value: 'nuble' },
    { label: 'Biobío', value: 'biobio' },
    { label: 'La Araucanía', value: 'la-araucania' },
    { label: 'Los Ríos', value: 'los-rios' },
    { label: 'Los Lagos', value: 'los-lagos' },
    { label: 'Aysén del General Carlos Ibáñez del Campo', value: 'aysen-del-general-carlos-ibanez-del-campo' },
    { label: 'Magallanes y de la Antártida Chilena', value: 'magallanes-y-de-la-antartida-chilena' },
  ];
  const ciudadItems = [
    { label: 'Santiago', value: 'santiago' },
    { label: 'Valparaíso', value: 'valparaiso' },
    { label: 'Concepción', value: 'concepcion' },
    { label: 'La Serena', value: 'la-serena' },
    { label: 'Antofagasta', value: 'antofagasta' },
    { label: 'Temuco', value: 'temuco' },
    { label: 'Puerto Montt', value: 'puerto-montt' },
    { label: 'Iquique', value: 'iquique' },
    { label: 'Rancagua', value: 'rancagua' },
    { label: 'Copiapó', value: 'copiapo' },
    { label: 'Chillán', value: 'chillan' },
    { label: 'Talca', value: 'talca' },
    { label: 'Punta Arenas', value: 'punta-arenas' },
  ];

  /* === NUEVO: Lista efectiva según lock / estado resource === */
  const categoriesList = useMemo(() => {
    const isRes = profileLock === 'resource' || isResource;
    return isRes ? CATEGORIES_RESOURCE : CATEGORIES_TALENT;
  }, [profileLock, isResource]);

  // cargar
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userDataJson = await AsyncStorage.getItem('userData');
        const ud = JSON.parse(userDataJson || '{}');
        const emailKey = ud?.email ? `userProfile_${ud.email.replace(/[@.]/g, '_')}` : null;
        setProfileKind(ud?.profileKind ?? profileKind ?? null);
        setProfileLock(ud?.profileLock ?? profileLock ?? null);

        if (!emailKey) return;
        const profileJson = await AsyncStorage.getItem(emailKey);
        if (profileJson) {
          const profile = JSON.parse(profileJson);

          setProfilePhoto(profile.profilePhoto || profilePhoto);
          setName(profile.name || name);
          setSexo(profile.sexo || sexo);
          setAge(profile.age || age);
          setEstatura(profile.estatura || estatura);
          setSkinColor(profile.skinColor || skinColor);
          setEyeColor(profile.eyeColor || eyeColor);
          setHairColor(profile.hairColor || hairColor);
          setTattoos(profile.tattoos || tattoos);
          setTattoosLocation(profile.tattoosLocation || tattoosLocation);
          setPiercings(profile.piercings || piercings);
          setPiercingsLocation(profile.piercingsLocation || piercingsLocation);
          setShirtSize(profile.shirtSize || shirtSize);
          setPantsSize(profile.pantsSize || pantsSize);
          setShoeSize(profile.shoeSize || shoeSize);
          setEmail(profile.email || email);
          setPhone(profile.phone || phone);
          setInstagram(profile.instagram?.replace(/^@/, '') || instagram);
          setBookPhotos(Array.isArray(profile.bookPhotos) ? profile.bookPhotos : bookPhotos);
          setCategory(
            Array.isArray(profile.category) ? profile.category :
            profile.category?.split(', ').filter(Boolean) || category
          );
          setCountry(profile.country || country);
          setCiudad(profile.ciudad || ciudad);
          setAddress(profile.address || address);
          setEthnicity(profile.ethnicity || ethnicity);
          setRegion(profile.region || region);
          setComuna(profile.comuna || comuna);

          // video
          if (typeof profile.profileVideo === 'string') {
            if (profile.profileVideo.startsWith('http') || profile.profileVideo.startsWith('file://')) {
              setProfileVideo(profile.profileVideo);
            } else {
              setProfileVideo(null);
            }
          }

          // recurso
          setResourceTitle(profile.resourceTitle || resourceTitle);
          setResourceDescription(profile.resourceDescription || resourceDescription);
          setResourceLocation(profile.resourceLocation || resourceLocation);
          setResourcePriceFrom(
            profile.resourcePriceFrom !== undefined && profile.resourcePriceFrom !== null
              ? String(profile.resourcePriceFrom) : resourcePriceFrom
          );
          setResourcePriceTo(
            profile.resourcePriceTo !== undefined && profile.resourcePriceTo !== null
              ? String(profile.resourcePriceTo) : resourcePriceTo
          );
          setResourceAvailability(profile.resourceAvailability || resourceAvailability);
          setResourceTags(
            Array.isArray(profile.resourceTags) ? profile.resourceTags.join(', ') : (profile.resourceTags || resourceTags)
          );

          // 👉 nuevos: reel + habilidades
          setReelUrl((profile.reelUrl || profile.reelsUrl || reelUrl) || '');
          const loadedSkillsText =
            Array.isArray(profile.skills) ? profile.skills.join(', ') :
            (profile.skillsText || skillsText);
          setSkillsText(loadedSkillsText || '');
        }
      } catch (error) {
        console.log('❌ Error al cargar perfil:', error);
      } finally {
        setIsResource(isResourceForced || profileKind === 'resource' || (profileKind !== 'talent' && isResourceCategory(category)));
      }
    };

    loadProfile();
  }, []);

  // puntitos
  useEffect(() => {
    let interval = null;
    if (validandoImagenes || validandoVideo) {
      interval = setInterval(() => setPuntos((prev) => (prev.length < 3 ? prev + '.' : '')), 500);
    } else {
      setPuntos('');
    }
    return () => clearInterval(interval);
  }, [validandoImagenes, validandoVideo]);

  // recalc resource al cambiar categorías si no está bloqueado
  useEffect(() => {
    if (!isResourceForced) {
      const next = profileKind === 'resource' || (profileKind !== 'talent' && isResourceCategory(category));
      setIsResource(next);
    }
  }, [category, profileKind, isResourceForced]);

  // pickers
  const pickProfilePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      const selectedUri = result.assets[0].uri;
      setValidandoImagenes(true);
      try {
        const emailSafe = (userData?.email || email || '').toLowerCase().trim();
        const tempUrl = await uploadMediaToStorage(selectedUri, `temp_photos/${emailSafe}_temp_profile.jpg`);
        const validation = await validateImageWithIA(tempUrl);

        if (!validation.valid) {
          Alert.alert('Imagen rechazada', 'La imagen fue rechazada por contenido inadecuado.');
          try {
            const path = decodeURIComponent(tempUrl.split('/o/')[1].split('?')[0]);
            const storageRef = ref(storage, path);
            await deleteObject(storageRef);
          } catch { /* noop */ }
          setValidandoImagenes(false);
          return;
        }
        setProfilePhoto(selectedUri);
      } catch (error) {
        Alert.alert('Error', 'No se pudo validar la imagen.');
      }
      setValidandoImagenes(false);
    }
  };

  const pickBookPhotos = async () => {
    if (bookPhotos.length >= 12) {
      Alert.alert('Límite alcanzado', 'Solo puedes subir hasta 12 fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      setValidandoImagenes(true);
      setValidandoTotal(result.assets.length);
      setValidandoActual(0);
      const safeUris = [];
      const emailSafe = (userData?.email || email || '').toLowerCase().trim();

      for (const asset of result.assets) {
        try {
          const tempUrl = await uploadMediaToStorage(asset.uri, `temp_photos/${emailSafe}_temp_book${Date.now()}.jpg`);
          const isSafe = await validateImageWithIA(tempUrl);
          setValidandoActual((prev) => prev + 1);

          if (!isSafe.valid) {
            Alert.alert('Imagen no permitida', 'Una de las imágenes fue bloqueada.');
            try {
              const path = decodeURIComponent(tempUrl.split('/o/')[1].split('?')[0]);
              const storageRef = ref(storage, path);
              await deleteObject(storageRef);
            } catch { /* noop */ }
            setValidandoTotal(0);
            setValidandoActual(0);
            setValidandoImagenes(false);
            return;
          }

          safeUris.push(asset.uri);
        } catch (error) {
          Alert.alert('Error', 'No se pudo validar una de las imágenes.');
          setValidandoImagenes(false);
          return;
        }
      }

      setBookPhotos((prev) => [...prev, ...safeUris].slice(0, 12));
      setValidandoImagenes(false);
    }
  };

  const pickProfileVideo = async () => {
    if (profileVideo) {
      Alert.alert('Video ya cargado', 'Ya has subido un video. ¿Deseas reemplazarlo?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Reemplazar', onPress: () => setProfileVideo(null) }
      ]);
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se requieren permisos para acceder a la galería.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 1,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const uri = result.assets[0].uri;
        if (!uri.startsWith('file://')) {
          Alert.alert('Error', 'El archivo no se puede acceder.');
          return;
        }

        const fileInfo = await FileSystem.getInfoAsync(uri);
        const maxFileSizeBytes = 100 * 1024 * 1024;
        if (fileInfo.size > maxFileSizeBytes) {
          Alert.alert('Error', 'El video supera los 100 MB.');
          return;
        }

        const extension = uri.split('.').pop().toLowerCase();
        const allowedExtensions = ['.mp4', '.mov', '.avi', '.mkv'];
        if (!allowedExtensions.includes(`.${extension}`)) {
          Alert.alert('Error', 'El video debe ser .mp4, .mov, .avi o .mkv');
          return;
        }

        const { duration } = await VideoThumbnails.getThumbnailAsync(uri, { time: 1000 });
        const durationInSeconds = duration / 1000;
        if (durationInSeconds > 120) {
          Alert.alert('Error', 'El video no debe superar los 2 minutos.');
          return;
        }

        setValidandoVideo(true);
        const validation = await validateVideoWithIA(uri);
        setValidandoVideo(false);

        if (!validation.valid) {
          Alert.alert('Video no permitido', 'El video fue rechazado por el analizador de contenido.');
          return;
        }

        const fileName = uri.split('/').pop();
        const newPath = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.copyAsync({ from: uri, to: newPath });
        setProfileVideo(newPath);
      }
    } catch (error) {
      setValidandoVideo(false);
      Alert.alert('Error', 'Error al procesar o validar el video.');
    }
  };

  // guardar
  const handleSave = async () => {
    setIsSaving(true);

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!name || !email || !emailRegex.test(email)) {
        Alert.alert('Error', 'Nombre y correo válido son obligatorios.');
        setIsSaving(false);
        return;
      }
      if (!profilePhoto) {
        Alert.alert('Error', 'Debes subir una foto de perfil.');
        setIsSaving(false);
        return;
      }
      if (bookPhotos.length === 0) {
        Alert.alert('Error', 'Debes subir al menos 1 foto al book.');
        setIsSaving(false);
        return;
      }
      if (category.length === 0) {
        Alert.alert('Error', 'Debes seleccionar al menos una categoría.');
        setIsSaving(false);
        return;
      }

      const locked = profileLock === 'resource';
      const nowIsResource = locked || profileKind === 'resource' || (profileKind !== 'talent' && isResourceCategory(category));

      if (nowIsResource) {
        // Recurso: mínimos
        if (!resourceTitle?.trim() || !resourceDescription?.trim() || !resourceLocation?.trim()) {
          Alert.alert('Error', 'Para recursos, Título, Descripción y Ubicación son obligatorios.');
          setIsSaving(false);
          return;
        }
        // Video opcional en recurso
      } else {
        // Talento: reglas existentes
        const requiredFields = [
          sexo, age, estatura, skinColor, eyeColor, hairColor, tattoos, piercings,
          shirtSize, pantsSize, shoeSize, phone, address, comuna, country, ciudad, ethnicity, region
        ];
        if (requiredFields.some((f) => !f || String(f).trim() === '')) {
          Alert.alert('Error', 'Completa todos los campos del perfil de talento.');
          setIsSaving(false);
          return;
        }
        const yesValues = ['si','sí','sí.','Si','Sí','Sí.','SI','SÍ','SÍ.'];
        if (yesValues.includes((piercings || '').trim()) && !piercingsLocation.trim()) {
          Alert.alert('Error', 'Indica la ubicación de tus piercings.');
          setIsSaving(false);
          return;
        }
        if (yesValues.includes((tattoos || '').trim()) && !tattoosLocation.trim()) {
          Alert.alert('Error', 'Indica la ubicación de tus tatuajes.');
          setIsSaving(false);
          return;
        }
        if (!instagram || instagram.trim() === '') {
          Alert.alert('Error', 'Ingresa tu usuario de Instagram.');
          setIsSaving(false);
          return;
        }
        if (!profileVideo) {
          Alert.alert('Error', 'Debes subir un video de presentación.');
          setIsSaving(false);
          return;
        }
        if (isNaN(Number(age))) {
          Alert.alert('Error', 'Edad inválida.');
          setIsSaving(false);
          return;
        }
        if (isNaN(Number(estatura))) {
          Alert.alert('Error', 'Estatura inválida.');
          setIsSaving(false);
          return;
        }
      }

      // uploads
      const cleanEmail = email.trim().toLowerCase();

      // profile photo
      let uploadedProfilePhoto = profilePhoto;
      if (profilePhoto && profilePhoto.startsWith('file://')) {
        uploadedProfilePhoto = await uploadMediaToStorage(profilePhoto, `profile_photos/${cleanEmail}_photo.jpg`);
      }

      // book
      const uploadedBookPhotos = [];
      setValidandoImagenes(true);
      setValidandoTotal(bookPhotos.filter((p) => p.startsWith('file://')).length);
      setValidandoActual(0);
      for (let i = 0; i < bookPhotos.length; i++) {
        const uri = bookPhotos[i];
        if (uri.startsWith('http')) {
          uploadedBookPhotos.push(uri);
        } else {
          const url = await uploadMediaToStorage(uri, `book_photos/${cleanEmail}_book${i + 1}.jpg`);
          uploadedBookPhotos.push(url);
        }
        setValidandoActual((prev) => prev + 1);
      }
      setValidandoImagenes(false);

      // video
      let uploadedProfileVideo = profileVideo;
      if (profileVideo && profileVideo.startsWith('file://')) {
        uploadedProfileVideo = await uploadMediaToStorage(profileVideo, `profile_videos/${cleanEmail}_video.mp4`);
      }

      // payload base
      const base = {
        profilePhoto: uploadedProfilePhoto,
        name,
        email: cleanEmail,
        phone,
        instagram: instagram ? `@${instagram.replace(/^@/, '')}` : '',
        bookPhotos: uploadedBookPhotos,
        profileVideo: uploadedProfileVideo || null,
        category,
        country,
        ciudad,
        address,
        ethnicity,
        region,
        comuna,
        visibleInExplorer: true,

        // 👉 nuevos opcionales
        reelUrl: (reelUrl || '').trim() || null,
        skills: parseSkills(skillsText),
        skillsText: (skillsText || '').trim(),
      };

      let profileData = {};
      if (nowIsResource) {
        profileData = {
          ...base,
          resourceTitle: resourceTitle.trim(),
          resourceDescription: resourceDescription.trim(),
          resourceLocation: resourceLocation.trim(),
          resourcePriceFrom: resourcePriceFrom ? Number(resourcePriceFrom) : null,
          resourcePriceTo: resourcePriceTo ? Number(resourcePriceTo) : null,
          resourceAvailability: resourceAvailability || '',
          resourceTags: resourceTags
            ? resourceTags.split(',').map((t) => t.trim()).filter(Boolean)
            : [],
          profileKind: 'resource',
          profileLock: profileLock === 'resource' ? 'resource' : (profileLock ?? null),
        };
      } else {
        const formattedEstatura =
          parseInt(estatura) > 100 ? (parseInt(estatura) / 100).toFixed(2) : estatura;

        profileData = {
          ...base,
          sexo,
          age,
          estatura: formattedEstatura,
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
          profileKind: 'talent',
          profileLock: profileLock ?? null,
        };
      }

      const success = await saveUserProfile(profileData, 'pro', setUserData, null, true);

      if (success) {
        await rebuildAllProfiles();
        setShowSuccessBanner(true);
        Animated.sequence([
          Animated.timing(bannerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.delay(1500),
          Animated.timing(bannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start(() => {
          setShowSuccessBanner(false);
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [
                {
                  name: 'MainAppContainer',
                  state: {
                    routes: [
                      {
                        name: 'MainTabs',
                        state: {
                          routes: [{ name: 'ProfileTab' }],
                        },
                      },
                    ],
                  },
                },
              ],
            })
          );
        });
      } else {
        Alert.alert('Error', 'Hubo un problema al guardar tu perfil. Intenta de nuevo.');
      }
    } catch (error) {
      Alert.alert('Error', 'Hubo un error inesperado.');
    } finally {
      setIsSaving(false);
    }
  };

  /* === NUEVO: búsqueda sobre la lista efectiva === */
  const filteredCategories = categoriesList.filter(cat =>
    cat.toLowerCase().includes((searchCategory || '').toLowerCase())
  );

  const toggleCategory = (cat) => {
    setCategory(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginTop: 45, marginLeft: 20 }}
        >
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {showSuccessBanner && (
        <Animated.View style={[styles.bannerSuccess, { opacity: bannerOpacity }]}>
          <Text style={styles.bannerText}>✅ Perfil actualizado exitosamente</Text>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={styles.container} nestedScrollEnabled>
        <TouchableOpacity onPress={pickProfilePhoto}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.placeholderText}>Agregar Foto de Perfil</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Ocultar selector de categorías si hay lock a resource */}
        {!isResourceForced && (
          <TouchableOpacity
            style={[styles.categorySelector, { marginTop: 0, marginBottom: 10 }]}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={styles.categoryText}>
              {category.length > 0 ? category.join(', ') : 'Seleccionar Categorías*'}
            </Text>
          </TouchableOpacity>
        )}

        <TextInput
          style={styles.input}
          placeholder="Nombre completo*"
          placeholderTextColor="#aaa"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email*"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Teléfono"
          placeholderTextColor="#aaa"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          placeholder={isResource ? 'Instagram (opcional, @usuario)' : 'Instagram (@usuario)'}
          placeholderTextColor="#aaa"
          value={instagram ? `@${instagram.replace(/^@/, '')}` : ''}
          onChangeText={(text) => setInstagram(text.replace(/^@/, ''))}
        />

        {/* ✅ Nuevos campos opcionales visibles para ambos tipos */}
        <TextInput
          style={styles.input}
          placeholder="Reel actoral (URL – opcional)"
          placeholderTextColor="#aaa"
          value={reelUrl}
          onChangeText={setReelUrl}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
          placeholder="Talentos y habilidades (opcional, separadas por coma. Ej: deportista, karateka, cantante, guitarra...)"
          placeholderTextColor="#aaa"
          value={skillsText}
          onChangeText={setSkillsText}
          multiline
        />

        {/* Sección condicional */}
        {isResource ? (
          <>
            <Text style={styles.sectionTitle}>🧰 Recurso</Text>

            <TextInput
              style={styles.input}
              placeholder="Título comercial*"
              placeholderTextColor="#aaa"
              value={resourceTitle}
              onChangeText={setResourceTitle}
            />
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Descripción*"
              placeholderTextColor="#aaa"
              multiline
              value={resourceDescription}
              onChangeText={setResourceDescription}
            />
            <TextInput
              style={styles.input}
              placeholder="Ubicación*"
              placeholderTextColor="#aaa"
              value={resourceLocation}
              onChangeText={setResourceLocation}
            />

            <View style={{ flexDirection: 'row', gap: 10, width: '90%' }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Precio desde (opcional)"
                placeholderTextColor="#aaa"
                keyboardType="numeric"
                value={resourcePriceFrom}
                onChangeText={(t) => setResourcePriceFrom(t.replace(/[^\d]/g, ''))}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Precio hasta (opcional)"
                placeholderTextColor="#aaa"
                keyboardType="numeric"
                value={resourcePriceTo}
                onChangeText={(t) => setResourcePriceTo(t.replace(/[^\d]/g, ''))}
              />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Disponibilidad (opcional)"
              placeholderTextColor="#aaa"
              value={resourceAvailability}
              onChangeText={setResourceAvailability}
            />
            <TextInput
              style={styles.input}
              placeholder="Tags (opcional, separados por coma)"
              placeholderTextColor="#aaa"
              value={resourceTags}
              onChangeText={setResourceTags}
            />
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>🎭 Talento</Text>

            {/* Sexo */}
            <View style={[styles.dropdownWrapper, { zIndex: zIndexSexo }]}>
              <BottomSheetSelect
                title="Sexo"
                placeholder="Selecciona tu sexo"
                value={sexo}
                items={[
                  { label: 'Hombre', value: 'Hombre' },
                  { label: 'Mujer', value: 'Mujer' },
                ]}
                onChange={setSexo}
                searchable={false}
              />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Edad"
              placeholderTextColor="#aaa"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Estatura (ej: 1.79)"
              placeholderTextColor="#aaa"
              value={estatura}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                setEstatura(cleaned);
              }}
              keyboardType="decimal-pad"
              autoComplete="off"
            />
            <TextInput style={styles.input} placeholder="Color de piel" placeholderTextColor="#aaa" value={skinColor} onChangeText={setSkinColor} />
            <TextInput style={styles.input} placeholder="Color de ojos" placeholderTextColor="#aaa" value={eyeColor} onChangeText={setEyeColor} />
            <TextInput style={styles.input} placeholder="Color de cabello" placeholderTextColor="#aaa" value={hairColor} onChangeText={setHairColor} />

            {/* Etnia */}
            <View style={[styles.dropdownWrapper, { zIndex: zIndexEthnicity }]}>
              <BottomSheetSelect
                title="Etnia"
                placeholder="Selecciona tu etnia"
                value={ethnicity}
                items={ethnicityItems}
                onChange={setEthnicity}
              />
            </View>

            <TextInput style={styles.input} placeholder="Tatuajes visibles (Sí/No)" placeholderTextColor="#aaa" value={tattoos} onChangeText={setTattoos} />
            {['si', 'sí', 'sí.'].includes((tattoos || '').trim().toLowerCase()) && (
              <TextInput style={styles.input} placeholder="¿Dónde tienes tatuajes?" placeholderTextColor="#aaa" value={tattoosLocation} onChangeText={setTattoosLocation} />
            )}
            <TextInput style={styles.input} placeholder="Piercings visibles (Sí/No)" placeholderTextColor="#aaa" value={piercings} onChangeText={setPiercings} />
            {['si', 'sí', 'sí.'].includes((piercings || '').trim().toLowerCase()) && (
              <TextInput style={styles.input} placeholder="¿Dónde tienes piercings?" placeholderTextColor="#aaa" value={piercingsLocation} onChangeText={setPiercingsLocation} />
            )}
            <TextInput style={styles.input} placeholder="Talla de camisa" placeholderTextColor="#aaa" value={shirtSize} onChangeText={setShirtSize} />
            <TextInput style={styles.input} placeholder="Talla de pantalón" placeholderTextColor="#aaa" value={pantsSize} onChangeText={setPantsSize} />
            <TextInput style={styles.input} placeholder="Talla de zapatos" placeholderTextColor="#aaa" value={shoeSize} onChangeText={setShoeSize} />

            {/* País */}
            <View style={[styles.dropdownWrapper, { zIndex: zIndexCountry }]}>
              <BottomSheetSelect
                title="País"
                placeholder="Selecciona tu país"
                value={country}
                items={countryItems}
                onChange={setCountry}
                searchable={false}
              />
            </View>

            {/* Ciudad */}
            <View style={[styles.dropdownWrapper, { zIndex: zIndexCiudad }]}>
              <BottomSheetSelect
                title="Ciudad"
                placeholder="Selecciona tu ciudad"
                value={ciudad}
                items={ciudadItems}
                onChange={setCiudad}
              />
            </View>

            <TextInput style={styles.input} placeholder="Dirección" value={address} onChangeText={setAddress} placeholderTextColor="#aaa" />
            <TextInput style={styles.input} placeholder="Comuna" placeholderTextColor="#aaa" value={comuna} onChangeText={setComuna} />

            {/* Región */}
            <View style={[styles.dropdownWrapper, { zIndex: zIndexRegion }]}>
              <BottomSheetSelect
                title="Región"
                placeholder="Selecciona tu región"
                value={region}
                items={regionItems}
                onChange={setRegion}
              />
            </View>
          </>
        )}

        {bookPhotos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bookScroll}>
            {bookPhotos.map((uri, index) => (
              <View key={index} style={styles.bookImageWrapper}>
                <TouchableOpacity onPress={() => {}}>
                  <Image source={{ uri }} style={styles.bookImage} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBookPhoto}
                  onPress={() => setBookPhotos(bookPhotos.filter((_, i) => i !== index))}
                >
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
        <TouchableOpacity style={styles.bookButton} onPress={pickBookPhotos}>
          <Text style={styles.bookButtonText}>Agregar fotos al Book</Text>
        </TouchableOpacity>

        {validandoImagenes && (
          <Text style={{ color: '#D8A353', fontSize: 15, marginTop: 2 }}>
            {validandoTotal > 0
              ? `Validando imágenes con IA (${validandoActual}/${validandoTotal})${puntos}`
              : `Validando imágenes con IA${puntos}`}
          </Text>
        )}
        <Text style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
          {bookPhotos.length} / 12 fotos subidas
        </Text>

        {profileVideo ? (
          <View style={styles.videoPreviewContainer}>
            <Video
              source={{ uri: profileVideo }}
              useNativeControls
              resizeMode="cover"
              style={styles.videoPreview}
              onError={() => Alert.alert('Error', 'No se pudo cargar el video.')}
            />
            <TouchableOpacity style={styles.deleteVideoButton} onPress={() => setProfileVideo(null)}>
              <Text style={styles.deleteVideoText}>🗑️ Eliminar Video</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <TouchableOpacity style={styles.bookButton} onPress={pickProfileVideo}>
          <Text style={styles.bookButtonText}>
            {isResource ? 'Subir 📹 Video de demostración (opcional)' : 'Subir 🎬 Video de presentación'}
          </Text>
        </TouchableOpacity>
        {validandoVideo && (
          <Text style={{ color: '#D8A353', fontSize: 15, marginTop: 2 }}>
            Validando video con IA{puntos}
          </Text>
        )}

        <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 20, marginBottom: -10, alignSelf: 'center' }}>
          * Completa los campos obligatorios para guardar el perfil.
        </Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <ActivityIndicator color="#000" />
              <Text style={styles.saveButtonText}>  Cargando...</Text>
            </>
          ) : (
            <Text style={styles.saveButtonText}>Guardar perfil</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal categorías */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar categoría..."
              placeholderTextColor="#aaa"
              value={searchCategory}
              onChangeText={setSearchCategory}
            />
            <ScrollView style={{ maxHeight: '70%' }}>
              {filteredCategories.map((cat, index) => (
                <TouchableOpacity key={index} onPress={() => toggleCategory(cat)}>
                  <Text style={[styles.modalItem, category.includes(cat) && styles.selectedCategory]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showSuccessBanner && (
        <Animated.View style={[styles.bannerSuccess, { opacity: bannerOpacity }]}>
          <Text style={styles.bannerText}>✅ Perfil actualizado exitosamente</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  container: { alignItems: 'center', paddingBottom: 200, paddingTop: 0 },
  header: { height: 80 },
  profilePlaceholder: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: '#1B1B1B',
    justifyContent: 'center', alignItems: 'center', borderColor: '#D8A353', borderWidth: 0.5, marginBottom: 15,
  },
  placeholderText: { color: '#CCCCCC', textAlign: 'center' },
  profileImage: {
    width: 120, height: 120, borderRadius: 60, borderColor: '#D8A353', borderWidth: 0.5, marginBottom: 15,
  },
  input: {
    width: '90%', backgroundColor: '#1B1B1B', color: '#fff', borderRadius: 10,
    padding: 10, marginBottom: 10, borderWidth: 0.5, borderColor: '#D8A353',
  },
  sectionTitle: {
    color: '#D8A353', fontWeight: 'bold', alignSelf: 'flex-start',
    marginLeft: '5%', marginTop: 10, marginBottom: 5,
  },
  bookButton: {
    backgroundColor: '#D8A353', borderRadius: 10, padding: 10, marginVertical: 10,
  },
  bookButtonText: { color: '#000', fontWeight: 'bold' },
  categorySelector: {
    backgroundColor: '#1B1B1B', borderColor: '#D8A353', borderWidth: 0.5, borderRadius: 10,
    width: '90%', padding: 12, alignItems: 'center', marginVertical: 10,
  },
  categoryText: { color: '#D8A353' },
  saveButton: {
    backgroundColor: '#D8A353', paddingVertical: 15, borderRadius: 10, width: '90%', marginTop: 20,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#000', fontWeight: 'bold', textAlign: 'center', fontSize: 16,
  },
  modalOverlay: { flex: 1, backgroundColor: '#000000CC', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    backgroundColor: '#000', width: '90%', borderRadius: 10, padding: 20,
    borderColor: '#D8A353', borderWidth: 0.5, maxHeight: '80%',
  },
  searchInput: {
    backgroundColor: '#1B1B1B', borderColor: '#D8A353', borderWidth: 0.5, borderRadius: 10,
    padding: 8, marginBottom: 10, color: '#fff',
  },
  modalItem: { color: '#D8A353', fontSize: 16, paddingVertical: 8, textAlign: 'center' },
  selectedCategory: { fontWeight: 'bold', color: '#D8A353', textDecorationLine: 'underline' },
  closeModalButton: { backgroundColor: '#D8A353', padding: 10, borderRadius: 10, marginTop: 10 },
  closeModalButtonText: { color: '#000', fontWeight: 'bold', textAlign: 'center' },
  bannerSuccess: {
    position: 'absolute', top: 40, backgroundColor: '#1B1B1B', padding: 10, borderRadius: 10,
    borderColor: '#D8A353', borderWidth: 0.5, alignSelf: 'center', zIndex: 1000,
  },
  bannerText: { color: '#D8A353', fontWeight: 'bold', textAlign: 'center' },
  videoPreviewContainer: {
    width: '90%', alignItems: 'center', marginVertical: 10, backgroundColor: '#1B1B1B',
    borderWidth: 0.5, borderColor: '#D8A353', borderRadius: 10, padding: 10,
  },
  videoPreview: { width: '100%', height: 180, borderRadius: 8 },
  deleteVideoButton: {
    marginTop: 10, backgroundColor: '#000', borderWidth: 0.5, borderColor: '#D8A353',
    borderRadius: 5, paddingVertical: 5, paddingHorizontal: 10,
  },
  deleteVideoText: { color: '#D8A353', fontSize: 14, textAlign: 'center' },

  dropdownWrapper: { width: '90%', marginBottom: 10, alignSelf: 'center' },
  dropdown: { backgroundColor: '#1B1B1B', borderColor: '#D8A353', borderWidth: 0.5, borderRadius: 10 },
  dropdownContainer: { backgroundColor: '#000', borderColor: '#D8A353', borderWidth: 0.5, borderRadius: 10 },

  bookScroll: { width: '90%', marginBottom: 10 },
  bookImageWrapper: { position: 'relative', marginRight: 10, marginTop: 30 },
  bookImage: { width: 100, height: 140, borderRadius: 8, borderColor: '#D8A353', borderWidth: 0.5 },
  deleteBookPhoto: { position: 'absolute', top: 4, right: 4, backgroundColor: '#000', borderRadius: 10, padding: 2 },
  deleteIcon: { color: '#D8A353', fontSize: 14 },

  /* === NUEVO: Estilos BottomSheetSelect === */
  dropdownLikeInput: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 0.5,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  dropdownLikeText: {
    color: '#D8A353',
    fontSize: 13,
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000AA',
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderColor: '#D8A353',
    borderWidth: 0.5,
    paddingBottom: 16,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomColor: '#1B1B1B',
    borderBottomWidth: 1,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1B1B1B',
    marginBottom: 6,
  },
  sheetTitle: { color: '#D8A353', fontWeight: 'bold', fontSize: 14 },
  sheetSearch: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 0.5,
    borderRadius: 10,
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    margin: 12,
  },
  sheetItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomColor: '#1B1B1B',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetItemSelected: {
    backgroundColor: '#0b0b0b',
  },
  sheetItemText: {
    color: '#D8A353',
    fontSize: 14,
  },
  sheetEmpty: {
    color: '#aaa',
    textAlign: 'center',
    paddingVertical: 18,
  },
  sheetCloseBtn: {
    backgroundColor: '#D8A353',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 10,
  },
  sheetCloseText: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
