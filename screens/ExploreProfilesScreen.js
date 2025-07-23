import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  RefreshControl,
  Modal,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { interpretSearchPhrase } from '../src/firebase/helpers/interpretSearchPhrase';
import { SafeAreaView } from 'react-native';
import { saveSearchIA } from '../src/firebase/helpers/saveSearchIA'; // asegúrate que la ruta sea correcta
import BackButton from '../components/BackButton';

const categories = [
  "Actor", "Actriz", "Animador / presentador", "Artista urbano", "Bailarín / bailarina",
  "Camarógrafo", "Caracterizador (maquillaje FX)", "Colorista", "Community manager",
  "Continuista", "Creador de contenido digital", "Decorador de set", "Diseñador de arte",
  "Diseñador gráfico", "Doble de acción", "Editor de video", "Escenógrafo",
  "Extra", "Fotógrafo de backstage", "Iluminador", "Ilustrador / storyboarder",
  "Maquillista", "Microfonista", "Modelo", "Modelo publicitario", "Niño actor",
  "Operador de drone", "Peluquero / estilista", "Postproductor", "Productor",
  "Promotoras", "Servicios de catering", "Sonidista", "Stage manager",
  "Técnico de efectos especiales", "Técnico de grúa", "Vestuarista",
  "Ambientador", "Asistente de cámara", "Asistente de dirección",
  "Asistente de producción", "Asistente de vestuario",
  "Transporte de talentos", "Autos personales", "Motos o bicicletas para escenas",
  "Grúas para filmación", "Camiones de arte para rodajes", "Casas rodantes para producción",
  "Estudio fotográfico", "Transporte de producción", "Vans de producción",
  "Coffee break / snacks", "Otros / No especificado",
  "Agencia de casting", "Agencia de modelos", "Agencia de talentos", "Agencia de publicidad",
  "Agencia de eventos", "Productora audiovisual", "Productora cinematográfica",
  "Productora de televisión", "Productora de contenido digital", "Productora de comerciales",
  "Coordinadora de producción", "Empresa de producción técnica", "Casa productora de videoclips",
  "Estudio de producción fotográfica", "Estudio de grabación", "Estudio de doblaje",
  "Casa de postproducción", "Plataforma de casting o booking", "Empresa de alquiler de equipos",
  "Empresa de transporte de producción", "Empresa de catering para rodajes",
  "Proveedor de casas rodantes", "Proveedor de coffee break / snacks",
  "Proveedor de autos o vans para filmación", "Agencia de contenido digital",
  "Plataforma de medios / streaming", "Otros / Empresa no especificada"
];

const talentCategories = [
  "Actor", "Actriz", "Animador / presentador", "Artista urbano", "Bailarín / bailarina",
  "Camarógrafo", "Caracterizador (maquillaje FX)", "Colorista", "Community manager",
  "Continuista", "Creador de contenido digital", "Decorador de set", "Diseñador de arte",
  "Diseñador gráfico", "Doble de acción", "Editor de video", "Escenógrafo",
  "Extra", "Fotógrafo de backstage", "Iluminador", "Ilustrador / storyboarder",
  "Maquillista", "Microfonista", "Modelo", "Modelo publicitario", "Niño actor",
  "Operador de drone", "Peluquero / estilista", "Postproductor", "Productor",
  "Promotoras", "Servicios de catering", "Sonidista", "Stage manager",
  "Técnico de efectos especiales", "Técnico de grúa", "Vestuarista",
  "Ambientador", "Asistente de cámara", "Asistente de dirección",
  "Asistente de producción", "Asistente de vestuario",
  "Transporte de talentos", "Autos personales", "Motos o bicicletas para escenas",
  "Grúas para filmación", "Camiones de arte para rodajes", "Casas rodantes para producción",
  "Estudio fotográfico", "Transporte de producción", "Vans de producción",
  "Coffee break / snacks", "Otros / No especificado"
];

const eliteCategories = [
  "Agencia de casting", "Agencia de modelos", "Agencia de talentos", "Agencia de publicidad",
  "Agencia de eventos", "Productora audiovisual", "Productora cinematográfica",
  "Productora de televisión", "Productora de contenido digital", "Productora de comerciales",
  "Coordinadora de producción", "Empresa de producción técnica", "Casa productora de videoclips",
  "Estudio de producción fotográfica", "Estudio de grabación", "Estudio de doblaje",
  "Casa de postproducción", "Plataforma de casting o booking", "Empresa de alquiler de equipos",
  "Empresa de transporte de producción", "Empresa de catering para rodajes",
  "Proveedor de casas rodantes", "Proveedor de coffee break / snacks",
  "Proveedor de autos o vans para filmación", "Agencia de contenido digital",
  "Plataforma de medios / streaming", "Otros / Empresa no especificada"
];

export default function ExploreProfilesScreen({ navigation }) {
  const { userData } = useUser();
  const [search, setSearch] = useState('');
  const [filteredCategories, setFilteredCategories] = useState(categories);
  const [allProfiles, setAllProfiles] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('todos');

  
  const fetchAllProfiles = async () => {
  try {
    const freeJson = await AsyncStorage.getItem('allProfilesFree');
    const proJson = await AsyncStorage.getItem('allProfiles');
    const eliteJson = await AsyncStorage.getItem('allProfilesElite');

    const free = freeJson ? JSON.parse(freeJson) : [];
    const pro = proJson ? JSON.parse(proJson) : [];
    const elite = eliteJson ? JSON.parse(eliteJson) : [];

    const filtradosFree = free.filter((p) => p.visibleInExplorer !== false && p.membershipType === 'free');
    const filtradosPro = pro.filter((p) => p.visibleInExplorer !== false && p.membershipType === 'pro');
    const filtradosElite = elite.filter((p) => p.visibleInExplorer !== false && p.membershipType === 'elite');

    const combinados = [...filtradosFree, ...filtradosPro, ...filtradosElite];
    const unicos = combinados.filter(
      (profile, index, self) =>
        index === self.findIndex((p) => p.email === profile.email)
    );

    setAllProfiles(unicos);
  } catch (error) {
    console.error('❌ Error cargando perfiles universales:', error);
  }
};

 useEffect(() => {
  fetchAllProfiles();

  // Inicializa categorías combinadas ordenadas
  const combined = [...talentCategories, ...eliteCategories];
  const uniqueSorted = Array.from(new Set(combined)).sort((a, b) =>
    a.localeCompare(b)
  );
  setFilteredCategories(uniqueSorted);
}, []);

const handleSearch = (text) => {
  setSearch(text);

  let baseCategories =
    activeFilter === 'talentos'
      ? talentCategories
      : activeFilter === 'agencias'
      ? eliteCategories
      : categories;

  const filtered = baseCategories.filter(cat =>
    cat.toLowerCase().includes(text.toLowerCase())
  );

  setFilteredCategories(filtered);
};

const handleAISearch = async (text) => {
  if (text.trim().split(" ").length < 3) return; // Evita usar IA si la frase es muy corta

  setAiSearchLoading(true);
  const { data, error } = await interpretSearchPhrase(text);

  if (error || !data) {
    console.log("❌ Error IA:", error);
    setAiSearchLoading(false);
    return;
  }

  // Filtra los perfiles por IA
  const resultados = allProfiles.filter((p) => {
    const matchCategoria = data.category
      ? (p.category || '').toLowerCase().includes(data.category.toLowerCase())
      : true;

    const matchRegion = data.region
      ? (p.region || '').toLowerCase().includes(data.region.toLowerCase())
      : true;

    const matchEdad = data.age
      ? (parseInt(p.age) === parseInt(data.age))
      : true;

    const matchGenero = data.gender
      ? (p.gender || '').toLowerCase().includes(data.gender.toLowerCase())
      : true;

    return matchCategoria && matchRegion && matchEdad && matchGenero;
  });

  navigation.navigate("FilteredProfiles", {
    category: `🔎 Resultados IA`,
    profiles: resultados,
  });
  await saveSearchIA(text, data.category, userData?.email, userData?.membershipType);

  setAiSearchLoading(false);
};

const filtrarPorTipo = (tipo) => {
  setActiveFilter(tipo);
  setSearch(''); // limpiar la búsqueda

  let baseCategories;

  if (tipo === 'talentos') {
    baseCategories = talentCategories;
  } else if (tipo === 'agencias') {
    baseCategories = eliteCategories;
  } else {
    // 🔁 "todos" = combinación sin duplicados
    const combined = [...talentCategories, ...eliteCategories];
    baseCategories = Array.from(new Set(combined)).sort((a, b) =>
      a.localeCompare(b)
    );
  }

  setFilteredCategories(baseCategories);
};

 return (
  <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
     <BackButton color="#fff" size={28} top={50} left={25} />
    <View style={styles.container}>
     <View>
<View style={styles.searchContainer}>
  <Ionicons name="search" size={18} color="#D8A353" style={styles.searchIcon} />
  <TextInput
    style={styles.searchInput}
    placeholder="Buscar talentos o servicios"
    placeholderTextColor="#aaaaaa"
    value={search}
    onChangeText={handleSearch}
  />
  <View style={styles.iaContainer}>
    <Ionicons name="sparkles" size={16} color="#00FFAA" />
    <Text style={styles.iaText}>IA</Text>
  </View>
</View>

</View>
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
      </View>

<FlatList
  data={filteredCategories}
  keyExtractor={(item, index) => index.toString()}
  contentContainerStyle={styles.scrollContent}
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await fetchAllProfiles();
        setRefreshing(false);
      }}
      colors={['#D8A353']}
      tintColor="#D8A353"
    />
  }
  ListEmptyComponent={
    <Text style={styles.noResultsText}>No se encontraron resultados.</Text>
  }
  renderItem={({ item }) => (
    <TouchableOpacity
      style={styles.categoryButton}
      onPress={() => {
  const emailValido = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const perfilesFiltrados = allProfiles.filter(
    (p) =>
      p.category?.includes(item) &&
      p.email &&
      emailValido(p.email)
  );

  navigation.navigate('FilteredProfiles', {
    category: item,
    profiles: perfilesFiltrados,
  });
}}

    >
      <Text style={styles.categoryText}>{item}</Text>
    </TouchableOpacity>
  )}
/>
    </View>
  </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 40, },
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
  
  searchIcon: { marginRight: 8, marginLeft: 30, fontSize:24  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 8 },
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
  activeFilter: {
    borderColor: '#D8A353',
    borderWidth: 0.5,
  },
  filterText: { color: '#D8A353', fontSize: 12 },
  categoryList: { paddingBottom: 30 },
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
iaIcon: {
  marginLeft: 6,
},
iaContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginLeft: 8,
  backgroundColor: '#1a1a1a',
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 12,
},
iaText: {
  color: '#00FFAA',
  fontSize: 10,
  fontWeight: 'bold',
  marginLeft: 4,
},
});