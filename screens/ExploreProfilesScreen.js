// screens/ExploreProfilesScreen.js
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  Platform, 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackButton from '../components/BackButton';

/* =========================================================
   Helpers de normalización / indexado / búsqueda
   ========================================================= */

// normaliza: minúsculas + sin tildes + solo letras/números/espacios
const normalizeText = (str = '') => {
  const s = (str ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return s.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
};

// recoge strings profundos evitando binarios/ids/medios
const collectStrings = (val, depth = 0) => {
  if (depth > 3 || val == null) return '';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  if (Array.isArray(val)) {
    return val.map((v) => collectStrings(v, depth + 1)).join(' ');
  }
  if (typeof val === 'object') {
    const blacklist = new Set([
      'profilePhoto','profileVideo','bookPhotos','resourcePhotos',
      'timestamp','updatedAt','createdAt','id','uid',
      'flagged','visibleInExplorer','hasPaid','debugUpload'
    ]);
    return Object.entries(val)
      .filter(([k]) => !blacklist.has(k))
      .map(([, v]) => collectStrings(v, depth + 1))
      .join(' ');
  }
  return '';
};

// sinónimos y normalización semántica básica
const applySynonyms = (q = '') => {
  let s = ` ${q} `;
  // género
  s = s.replace(/\bmujeres?\b/g, ' mujer ');
  s = s.replace(/\bhombres?\b/g, ' hombre ');
  // pelo
  s = s.replace(/\brubios?\b/g, ' rubio ');
  s = s.replace(/\brubia?s?\b/g, ' rubio ');
  s = s.replace(/\bcastaños?\b/g, ' castano ');
  s = s.replace(/\bcastaña?s?\b/g, ' castano ');
  // ojos
  s = s.replace(/\bojo[s]?\s+verdes?\b/g, ' verdes ');
  s = s.replace(/\bojo[s]?\s+azules?\b/g, ' azules ');
  s = s.replace(/\bojo[s]?\s+cafes?\b/g, ' cafes ');
  // plurales rol/categorías
  s = s.replace(/\bmodelos\b/g, ' modelo ');
  s = s.replace(/\bextras\b/g, ' extra ');
  // recursos
  s = s.replace(/\bvehiculos?\b/g, ' vehiculo ');
  s = s.replace(/\bgruas\b/g, ' grua ');
  s = s.replace(/\bmaquillajes?\b/g, ' maquillaje ');
  return normalizeText(s);
};

// stopwords ES (para no tomar conectores/artículos)
const STOPWORDS = new Set([
  'a','ante','bajo','cabe','con','contra','de','del','desde','durante',
  'en','entre','hacia','hasta','mediante','para','por','segun','sin','so','sobre','tras',
  'el','la','los','las','un','una','unos','unas','lo','al','del','y','e','o','u','or'
]);

const membershipRank = (m = '') => {
  const x = (m || '').toLowerCase();
  if (x === 'elite') return 3;
  if (x === 'pro') return 2;
  return 1;
};

const normalizeKind = (k, membershipType) => {
  const kind = (k || '').toLowerCase();
  const mt = (membershipType || '').toLowerCase();
  if (kind === 'resource') return 'resource';
  if (mt === 'elite') return 'agency';
  return 'talent';
};

// Index: texto plano + set de palabras (para fuzzy)
const buildSearchTextFromProfile = (p = {}) => {
  // alias → canonical
  const eyeColor = p.eyeColor ?? p.colorOjos;
  const hairColor = p.hairColor ?? p.colorCabello;
  const age = p.age ?? p.edad;
  const city = p.city ?? p.ciudad;
  const commune = p.commune ?? p.comuna;

  const category = Array.isArray(p.category) ? p.category.join(' ') : (p.category || '');
  const tags = Array.isArray(p.tags) ? p.tags.join(' ') : (p.tags || '');
  const skills = Array.isArray(p.skills) ? p.skills.join(' ') : (p.skills || p.skill || '');
  const services = Array.isArray(p.services) ? p.services.join(' ') : (p.services || '');
  const resourceTags = Array.isArray(p.resourceTags) ? p.resourceTags.join(' ') : (p.resourceTags || '');

  const identity = [p.name, p.agencyName, p.companyName, p.title].filter(Boolean).join(' ');

  const descCandidates = [
    p.descripcion, p.description, p.resourceDescription, p.profileDescription,
    p.about, p.bio, p.resumen, p.summary, p.tituloComercial,
    p.details?.description, p.resource?.description,
  ].filter(Boolean).join(' ');

  const rasgos = [
    p.sexo, p.gender, age, p.estatura, eyeColor, hairColor,
    p.skinColor, p.ethnicity, p.tattoos, p.tattoosLocation,
    p.piercings, p.piercingsLocation, p.shirtSize, p.pantsSize, p.shoeSize
  ].filter(Boolean).join(' ');

  const veh = [
    p.resourceTitle, p.resourceType, p.resourceLocation,
    p.resourcePriceFrom, p.resourcePriceTo, p.resourceName,
    p.brand, p.make, p.vehicleBrand, p.model, p.vehicleModel, p.year
  ].filter(Boolean).join(' ');

  const ubic = [p.country, p.region, city, commune, p.address].filter(Boolean).join(' ');

  const combined = [
    identity, category, tags, skills, services, resourceTags,
    descCandidates, rasgos, veh, ubic, (p.email || ''), (p.instagram || ''),
    collectStrings(p.resource), collectStrings(p.details), collectStrings(p) // respaldo profundo
  ].filter(Boolean).join(' ');

  const text = normalizeText(combined);
  const words = new Set(text.split(/\s+/).filter(Boolean));
  return { text, words };
};

// Fuzzy: distancia de edición ≤ 1
const editDistanceLeq1 = (a, b) => {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, diff = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    diff++;
    if (diff > 1) return false;
    if (la === lb) { i++; j++; }
    else if (la > lb) { i++; }
    else { j++; }
  }
  if (i < la || j < lb) diff++;
  return diff <= 1;
};

// Coincidencia amplia: incluye, prefijo, fuzzy (≤1)
const textMatchesToken = (text, wordsSet, token) => {
  if (!token) return false;
  if (text.includes(token)) return true;
  if (token.length >= 3) {
    for (const w of wordsSet) { if (w.startsWith(token)) return true; }
  }
  if (token.length >= 5) {
    for (const w of wordsSet) {
      if (Math.abs(w.length - token.length) <= 1 && editDistanceLeq1(w, token)) return true;
    }
  }
  return false;
};

// Scoring
const countOccurrences = (text, token) => {
  if (!token) return 0;
  const re = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const m = text.match(re);
  return m ? m.length : 0;
};

const scoreAndSort = (items, tokens) => {
  const scored = items.map((it) => {
    const { text, words, membershipType, updatedAt } = it;
    let tokenScore = 0;
    tokens.forEach((t) => {
      let s = 0;
      if (text.includes(t)) s += 2;
      if (t.length >= 3) { for (const w of words) { if (w.startsWith(t)) { s += 1; break; } } }
      if (t.length >= 5) {
        for (const w of words) {
          if (Math.abs(w.length - t.length) <= 1 && editDistanceLeq1(w, t)) { s += 1; break; }
        }
      }
      s += countOccurrences(text, t);
      tokenScore += s;
    });
    const mBoost = membershipRank(membershipType);
    const updatedMs = updatedAt ? new Date(updatedAt).getTime() : 0;
    return { ...it, _score: tokenScore, _mBoost: mBoost, _updatedMs: updatedMs };
  });

  scored.sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score;
    if (b._mBoost !== a._mBoost) return b._mBoost - a._mBoost;
    return b._updatedMs - a._updatedMs;
  });

  return scored;
};

// util fuera del componente
function useMemoSafe(factory, deps) { return factory(); }

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
  "Director/a de fotografía", "Camarógrafo / Operador de cámara", "Asistente de cámara (1AC)",
  "Asistente de cámara (2AC)", "Data wrangler", "DIT (Técnico de imagen digital)",
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

// (Deja tus categorías élite igual)
const eliteCategories = [
  "Agencia de casting","Agencia de modelos","Agencia de talentos","Agencia de publicidad",
  "Agencia de eventos","Productora audiovisual","Productora cinematográfica",
  "Productora de televisión","Productora de contenido digital","Productora de comerciales",
  "Coordinadora de producción","Empresa de producción técnica","Casa productora de videoclips",
  "Estudio de producción fotográfica","Estudio de grabación","Estudio de doblaje",
  "Casa de postproducción","Plataforma de casting o booking","Empresa de alquiler de equipos",
  "Empresa de transporte de producción","Empresa de catering para rodajes",
  "Proveedor de casas rodantes","Proveedor de coffee break / snacks",
  "Proveedor de autos o vans para filmación","Agencia de contenido digital",
  "Plataforma de medios / streaming","Otros / Empresa no especificada"
];

const ALL_CATEGORIES_STATIC = useMemoSafe(() => {
  const combined = [...TALENT_CATEGORIES, ...RESOURCE_CATEGORIES, ...eliteCategories];
  return Array.from(new Set(combined)).sort((a, b) => a.localeCompare(b));
}, []);

/* =========================================================
   Componente principal
   ========================================================= */
export default function ExploreProfilesScreen({ navigation }) {
  const { userData } = useUser();
  const [search, setSearch] = useState('');
  const [filteredCategories, setFilteredCategories] = useState(ALL_CATEGORIES_STATIC);
  const [allProfiles, setAllProfiles] = useState([]);
  const [indexedProfiles, setIndexedProfiles] = useState([]); // {profile, text, words, ...}
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('todos'); // 'todos'|'talentos'|'agencias'|'recursos'

  // NUEVO: resultados en vivo
  const [liveResults, setLiveResults] = useState([]);
  const [liveCount, setLiveCount] = useState(0);
  const [isLiveSearching, setIsLiveSearching] = useState(false);
  const typingTimer = useRef(null);

  const fetchAllProfiles = async () => {
    try {
      const freeJson  = await AsyncStorage.getItem('allProfilesFree');
      const proJson   = await AsyncStorage.getItem('allProfiles');
      const eliteJson = await AsyncStorage.getItem('allProfilesElite');

      const free  = freeJson  ? JSON.parse(freeJson)  : [];
      const pro   = proJson   ? JSON.parse(proJson)   : [];
      const elite = eliteJson ? JSON.parse(eliteJson) : [];

      const filtrados = [...free, ...pro, ...elite]
        .filter((p) => p && p.visibleInExplorer !== false)
        .filter((p, i, self) => i === self.findIndex(x => (x.email || '').toLowerCase() === (p.email || '').toLowerCase()));

      setAllProfiles(filtrados);
    } catch (error) {
      console.error('❌ Error cargando perfiles universales:', error);
    }
  };

  useEffect(() => {
    fetchAllProfiles();
    setFilteredCategories(ALL_CATEGORIES_STATIC);
  }, []);

  useEffect(() => {
    if (!allProfiles || allProfiles.length === 0) {
      setIndexedProfiles([]);
      return;
    }
    const idx = allProfiles.map((p) => {
      const { text, words } = buildSearchTextFromProfile(p);
      return {
        profile: p,
        text,
        words,
        membershipType: p.membershipType || 'free',
        updatedAt: p.updatedAt || p.updated_at || p.lastUpdated || null,
        kind: normalizeKind(p.profileKind, p.membershipType),
      };
    });
    setIndexedProfiles(idx);
  }, [allProfiles]);

  const categoriesFromProfiles = useMemo(() => {
    const sets = { talentos: new Set(), agencias: new Set(), recursos: new Set() };
    allProfiles.forEach((p) => {
      const cats = Array.isArray(p.category) ? p.category : (p.category ? [p.category] : []);
      if (cats.length === 0) return;
      const membership = (p.membershipType || '').toLowerCase();
      const kind = (p.profileKind || '').toLowerCase();
      if (membership === 'elite') cats.forEach((c) => sets.agencias.add(c));
      if (kind === 'resource') cats.forEach((c) => sets.recursos.add(c));
      if (kind !== 'resource') cats.forEach((c) => sets.talentos.add(c));
    });
    return {
      talentos: Array.from(sets.talentos).sort((a, b) => a.localeCompare(b)),
      agencias: Array.from(sets.agencias).sort((a, b) => a.localeCompare(b)),
      recursos: Array.from(sets.recursos).sort((a, b) => a.localeCompare(b)),
    };
  }, [allProfiles]);

  const filtrarPorTipo = (tipo) => {
    setActiveFilter(tipo);
    setSearch('');
    setLiveResults([]); setLiveCount(0);
    if (tipo === 'todos') setFilteredCategories(ALL_CATEGORIES_STATIC);
    else if (tipo === 'talentos') setFilteredCategories(categoriesFromProfiles.talentos);
    else if (tipo === 'agencias') setFilteredCategories(categoriesFromProfiles.agencias);
    else if (tipo === 'recursos') setFilteredCategories(categoriesFromProfiles.recursos);
  };

  /* =================== Tokenización avanzada ===================
     - OR por defecto (cualquier palabra)
     - Frases "entre comillas" → obligatorias
     - +token → obligatorio (AND)
     - -token → excluir
     - Stopwords fuera
  */
  const parseQuery = (rawQuery) => {
    const q = normalizeText(applySynonyms(rawQuery));
    if (!q) return { optional: [], required: [], excluded: [], phrases: [] };

    const phraseRegex = /"([^"]+)"/g;
    const phrases = [];
    let m;
    let clean = rawQuery;
    while ((m = phraseRegex.exec(rawQuery)) !== null) {
      const ph = normalizeText(m[1]);
      if (ph) phrases.push(ph);
      clean = clean.replace(m[0], ' ');
    }
    clean = normalizeText(applySynonyms(clean));

    const parts = clean.split(/\s+/).filter(Boolean);
    const required = [];
    const excluded = [];
    const optional = [];

    parts.forEach((p) => {
      if (!p) return;
      if (STOPWORDS.has(p)) return;
      if (p.startsWith('+') && p.length > 1) {
        const t = p.slice(1); if (!STOPWORDS.has(t)) required.push(t);
      } else if (p.startsWith('-') && p.length > 1) {
        const t = p.slice(1); if (!STOPWORDS.has(t)) excluded.push(t);
      } else {
        optional.push(p);
      }
    });

    return { optional, required, excluded, phrases };
  };

  // Coincidencia amplia (usa helpers arriba)
  const textMatchesToken = (text, wordsSet, token) => {
    if (!token) return false;
    if (text.includes(token)) return true;
    if (token.length >= 3) {
      for (const w of wordsSet) { if (w.startsWith(token)) return true; }
    }
    if (token.length >= 5) {
      for (const w of wordsSet) {
        if (Math.abs(w.length - token.length) <= 1 && editDistanceLeq1(w, token)) return true;
      }
    }
    return false;
  };

  // Búsqueda MUY general: OR por defecto + reglas
  const runLocalSearch = (rawQuery) => {
    const { optional, required, excluded, phrases } = parseQuery(rawQuery);
    const hasAny = optional.length + required.length + phrases.length > 0;
    if (!hasAny && excluded.length === 0) return [];

    const kindMatch = (k, mt) => {
      if (activeFilter === 'recursos') return k === 'resource';
      if (activeFilter === 'agencias') return (mt || '').toLowerCase() === 'elite';
      if (activeFilter === 'talentos') return k === 'talent';
      return true;
    };

    const prelim = indexedProfiles.filter((it) => {
      if (!kindMatch(it.kind, it.membershipType)) return false;
      const { text, words } = it;

      for (const ph of phrases) { if (!text.includes(ph)) return false; }
      for (const ex of excluded) { if (textMatchesToken(text, words, ex)) return false; }
      for (const req of required) { if (!textMatchesToken(text, words, req)) return false; }

      if (optional.length > 0) {
        const ok = optional.some((tok) => textMatchesToken(text, words, tok));
        if (!ok) return false;
      }
      return true;
    });

    const tokensForScore = [...phrases, ...required, ...optional];
    const ranked = scoreAndSort(prelim, tokensForScore);

    return ranked.map((r) => r.profile);
  };

  // Sugerencias de categorías y resultados en vivo (debounce)
  const onChangeSearch = (text) => {
    setSearch(text);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      // categorías (sugerencias) como antes
      const base =
        activeFilter === 'todos'
          ? ALL_CATEGORIES_STATIC
          : activeFilter === 'talentos'
          ? categoriesFromProfiles.talentos
          : activeFilter === 'agencias'
          ? categoriesFromProfiles.agencias
          : categoriesFromProfiles.recursos;

      const filtered = base.filter((c) =>
        c.toLowerCase().includes(text.trim().toLowerCase())
      );
      setFilteredCategories(filtered);

      // NUEVO: resultados en vivo
      const q = text.trim();
      if (q.length >= 2) {
        setIsLiveSearching(true);
        // pequeño respiro al UI
        requestAnimationFrame(() => {
          const matches = runLocalSearch(q);
          setLiveResults(matches.slice(0, 5));
          setLiveCount(matches.length);
          setIsLiveSearching(false);
        });
      } else {
        setLiveResults([]);
        setLiveCount(0);
      }
    }, 280);
  };

  const onSubmitSearch = () => {
    const q = search.trim();
    if (!q) return;

    const matches = runLocalSearch(q);

    navigation.navigate('FilteredProfiles', {
      category: `🔎 Resultados "${q}"`,
      profiles: matches,
      useRaw: true,
    });
  };

  const openCategory = (category) => {
    const emailValido = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
    const perfiles = allProfiles.filter((p) => {
      const cats = Array.isArray(p.category) ? p.category : (p.category ? [p.category] : []);
      const matchCat = cats.includes(category);
      const membership = (p.membershipType || '').toLowerCase();
      const kind = (p.profileKind || '').toLowerCase();

      const matchKind =
        activeFilter === 'recursos' ? kind === 'resource'
        : activeFilter === 'agencias' ? membership === 'elite'
        : activeFilter === 'talentos' ? kind !== 'resource'
        : true;

      return matchCat && matchKind && emailValido(p.email) && p.visibleInExplorer !== false;
    });

    navigation.navigate('FilteredProfiles', {
      category,
      profiles: perfiles,
      useRaw: true,
    });
  };

  const goToFullResults = () => {
    const q = search.trim();
    if (!q) return;
    const matches = runLocalSearch(q);
    navigation.navigate('FilteredProfiles', {
      category: `🔎 Resultados "${q}"`,
      profiles: matches,
      useRaw: true,
    });
  };

  return (
<SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
  {/* ANDROID: back flotante como siempre / iOS: NO */}
  {Platform.OS !== 'ios' && (
    <BackButton color="#fff" size={28} top={50} left={25} />
  )}

  <View style={styles.container}>
    {/* Buscador */}
    <View style={styles.searchContainer}>
      {/* iOS: flecha dentro del campo */}
      {Platform.OS === 'ios' && (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtnInField}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
      )}

      <Ionicons name="search" size={18} color="#D8A353" style={styles.searchIcon} />

      <TextInput
        style={styles.searchInput}
        placeholder='Buscar por cualquier palabra o frase · Tips: "toca guitarra", +mujer, -agencia'
        placeholderTextColor="#aaaaaa"
        value={search}
        onChangeText={onChangeSearch}
        onSubmitEditing={onSubmitSearch}
        returnKeyType="search"
        autoCapitalize="none"
      />

      <View style={styles.iaContainer}>
        <Ionicons name="sparkles" size={16} color="#00FFAA" />
        <Text style={styles.iaText}>IA</Text>
      </View>
    </View>

        {/* Panel de resultados en vivo */}
        {search.trim().length >= 2 && (
          <View style={styles.livePanel}>
            <View style={styles.liveHeader}>
              <Text style={styles.liveTitle}>
                {isLiveSearching ? 'Buscando…' : `${liveCount} resultados`}
              </Text>
              {liveCount > 0 && (
                <TouchableOpacity onPress={goToFullResults}>
                  <Text style={styles.liveSeeAll}>Ver todos</Text>
                </TouchableOpacity>
              )}
            </View>

            {isLiveSearching ? (
              <ActivityIndicator size="small" color="#D8A353" />
            ) : liveCount === 0 ? (
              <Text style={styles.liveHint}>
                No hay coincidencias por ahora. Prueba con: “modelo”, “productora”, “casa”, “galpón”, “bodega”…
              </Text>
            ) : (
              liveResults.map((p, idx) => (
                <TouchableOpacity
                  key={(p.email || '') + idx}
                  style={styles.liveItem}
                  onPress={() => {
                    // abrir vista de resultados con solo este perfil arriba
                    navigation.navigate('FilteredProfiles', {
                      category: `🔎 Resultados "${search.trim()}"`,
                      profiles: [p, ...liveResults.filter(x => x !== p)],
                      useRaw: true,
                    });
                  }}
                >
                  <Text style={styles.liveItemName}>{p.name || p.agencyName || 'Usuario'}</Text>
                  <Text style={styles.liveItemMeta}>
                    {Array.isArray(p.category) ? p.category.join(', ') : (p.category || '—')}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Filtros */}
        <View style={styles.filterRow}>
          <TouchableOpacity onPress={() => filtrarPorTipo('todos')} style={[styles.filterButton, activeFilter === 'todos' && styles.activeFilter]}>
            <Text style={styles.filterText}>Todos</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => filtrarPorTipo('talentos')} style={[styles.filterButton, activeFilter === 'talentos' && styles.activeFilter]}>
            <Text style={styles.filterText}>🎭 Talentos</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => filtrarPorTipo('agencias')} style={[styles.filterButton, activeFilter === 'agencias' && styles.activeFilter]}>
            <Text style={styles.filterText}>🏢 Agencias</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => filtrarPorTipo('recursos')} style={[styles.filterButton, activeFilter === 'recursos' && styles.activeFilter]}>
            <Text style={styles.filterText}>🛠️ Recursos</Text>
          </TouchableOpacity>
        </View>

        {/* Lista de categorías (sugerencias / fallback) */}
        <FlatList
          data={filteredCategories}
          keyExtractor={(item, index) => `${item}-${index}`}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await fetchAllProfiles();
                filtrarPorTipo(activeFilter);
                setRefreshing(false);
              }}
              colors={['#D8A353']}
              tintColor="#D8A353"
            />
          }
          // IMPORTANTE: si hay texto en el buscador, no mostrar "No se encontraron"
          ListEmptyComponent={
            search.trim().length >= 2
              ? <View />
              : <Text style={styles.noResultsText}>No se encontraron resultados.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.categoryButton} onPress={() => openCategory(item)}>
              <Text style={styles.categoryText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

/* =========================================================
   Estilos
   ========================================================= */
const styles = StyleSheet.create({
    container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'ios' ? 15 : 40,
  },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#D8A353',
    borderWidth: 0.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#000',
    height: 50,
  },
searchIcon: {
  marginRight: 8,
  marginLeft: Platform.select({ ios: 8, android: 30 }), // 👈 iOS 8, Android 30 (como antes)
  fontSize: 24,
},
searchInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 8 },

// nuevo estilo para el botón interno (solo se usa en iOS)
backBtnInField: {
  marginRight: 8,
  padding: 6,
  borderRadius: 16,
  justifyContent: 'center',
  alignItems: 'center',
},

  // Panel live
  livePanel: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
    padding: 10,
  },
  liveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveTitle: { color: '#D8A353', fontSize: 13, fontWeight: '600' },
  liveSeeAll: { color: '#D8A353', fontSize: 12, textDecorationLine: 'underline' },
  liveHint: { color: '#888', fontSize: 12 },
  liveItem: {
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#222',
  },
  liveItemName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  liveItemMeta: { color: '#bbb', fontSize: 12, marginTop: 2 },

  // Filtros
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  filterButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  activeFilter: { borderColor: '#D8A353', borderWidth: 0.5 },
  filterText: { color: '#D8A353', fontSize: 12 },

  // Categorías
  categoryButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginBottom: 8,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  categoryText: { color: '#D8A353', fontSize: 16, fontWeight: '500', textAlign: 'center' },
  noResultsText: { color: '#888', textAlign: 'center', marginTop: 20, fontStyle: 'italic' },

  iaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  iaText: { color: '#00FFAA', fontSize: 10, fontWeight: 'bold', marginLeft: 4 },

  // Contenedor general
  containerInner: { paddingHorizontal: 16 },
});
