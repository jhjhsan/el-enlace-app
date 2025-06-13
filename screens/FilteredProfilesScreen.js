import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveUserProfile } from '../utils/profileStorage';


export default function FilteredProfilesScreen({ route, navigation }) {
  const { userData } = useUser();
  const { category } = route.params;
  const normalizedCategory = Array.isArray(category) ? category[0] : category;

  console.log('🧪 route.params:', route.params);
console.log('🧪 category recibido:', category);

  const [profiles, setProfiles] = useState([]);
  const [search, setSearch] = useState('');

 const sanitizeProfileData = (profile) => {
  const cleaned = { ...profile };

  if (!cleaned.profilePhoto?.startsWith('http') && !cleaned.profilePhoto?.startsWith('file')) {
    cleaned.profilePhoto = null;
  }

  if (!cleaned.profileVideo?.startsWith('http') && !cleaned.profileVideo?.startsWith('file')) {
    cleaned.profileVideo = null;
  }

  // 🔧 Asegura que siempre exista 'name' aunque sea una agencia
  if (!cleaned.name && cleaned.agencyName) {
    cleaned.name = cleaned.agencyName;
  }

  return cleaned;
};
const normalize = (str) => str?.toLowerCase().replace(/[^a-záéíóúüñ\s]/gi, '').trim();

useEffect(() => {
  const revisarPerfiles = async () => {
    try {
      const v1 = await AsyncStorage.getItem('allProfiles');
      const v2 = await AsyncStorage.getItem('allProfilesElite');

      const parsed1 = v1 ? JSON.parse(v1) : [];
      const parsed2 = v2 ? JSON.parse(v2) : [];

      console.log('🧪 allProfiles (Pro + Free):', parsed1.map(p => p.email));
      console.log('🧪 allProfilesElite:', parsed2.map(p => p.email));
      console.log('🧪 userProfileElite directo:');
const rawElite = await AsyncStorage.getItem('userProfileElite');
if (rawElite) {
  const parsed = JSON.parse(rawElite);
  console.log('🎯 Perfil elite encontrado:', parsed.email, parsed.category);
} else {
  console.log('❌ userProfileElite NO existe');
}

    } catch (e) {
      console.log('❌ Error leyendo perfiles:', e);
    }
  };

  const forzarGuardadoPerfil = async () => {
    try {
      const rawUser = await AsyncStorage.getItem('userData');
      const parsedUser = rawUser ? JSON.parse(rawUser) : null;
      if (!parsedUser?.email || !parsedUser?.membershipType) return;

      const { membershipType } = parsedUser;

      if (membershipType === 'pro') {
        const proProfileRaw = await AsyncStorage.getItem('userProfilePro');
        if (proProfileRaw) {
          const parsed = JSON.parse(proProfileRaw);
          await saveUserProfile(parsed, 'pro');
        }
      }

      if (membershipType === 'elite') {
        const eliteProfileRaw = await AsyncStorage.getItem('userProfileElite');
        if (eliteProfileRaw) {
          const parsed = JSON.parse(eliteProfileRaw);
          await saveUserProfile(parsed, 'elite');
        }
      }
    } catch (e) {
      console.log('⚠️ Error al forzar guardado de perfil activo:', e);
    }
  };

const fetchProfiles = async () => {
  try {
    const normalizedCategory = Array.isArray(category) ? category[0] : category;
    const categoryNormalized = normalize(normalizedCategory || '');
    console.log('🔍 categoría normalizada:', categoryNormalized);

    let storedFreePro = await AsyncStorage.getItem('allProfiles');
    let storedElite = await AsyncStorage.getItem('allProfilesElite');

    // Si no hay datos en caché, intenta recuperar los perfiles individuales
    if (!storedFreePro) {
      const pro = await AsyncStorage.getItem('userProfilePro');
      const free = await AsyncStorage.getItem('userProfileFree');
      const parsedPro = pro ? [JSON.parse(pro)] : [];
      const parsedFree = free ? [JSON.parse(free)] : [];
      storedFreePro = JSON.stringify([...parsedPro, ...parsedFree]);
    }

    if (!storedElite) {
      const elite = await AsyncStorage.getItem('userProfileElite');
      storedElite = elite ? JSON.stringify([JSON.parse(elite)]) : '[]';
    }

    const parsedFreePro = storedFreePro ? JSON.parse(storedFreePro) : [];
    const parsedElite = storedElite ? JSON.parse(storedElite) : [];

    const freeProList = Array.isArray(parsedFreePro) ? parsedFreePro : [parsedFreePro];
    const eliteList = Array.isArray(parsedElite) ? parsedElite : [parsedElite];

    // ✅ Combinamos y filtramos perfiles válidos
   const seen = new Set();
const combined = [...freeProList, ...eliteList]
  .filter(p => p && p.email && p.visibleInExplorer !== false)
  .filter(p => {
    const email = p.email.toLowerCase();
    if (seen.has(email)) return false;
    seen.add(email);
    return true;
  });

    console.log(`✅ Cargando ${combined.length} perfiles combinados`);

    // 🎯 Aplicamos el filtro por categoría normalizada
    const filtered = combined.filter((profile) => {
      const categoryField = profile.category;
      const profileCategory = Array.isArray(categoryField)
        ? categoryField.map((cat) => normalize(cat))
        : [normalize(categoryField || '')];

      return profileCategory.some(
        (cat) =>
          cat.includes(categoryNormalized) ||
          categoryNormalized.includes(cat)
      );
    });

    console.log(`✅ Mostrando ${filtered.length} perfiles filtrados por categoría:`, categoryNormalized);
    setProfiles(filtered);
  } catch (error) {
    console.error('❌ Error al cargar perfiles filtrados:', error);
  }
};


  revisarPerfiles();
  forzarGuardadoPerfil(); // se ejecuta en segundo plano
fetchProfiles();        // se carga de inmediato

}, [category, route.params?.profiles]);


  const filtered = profiles.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

{category?.includes("IA") && (
  <Text style={styles.resultCount}>
    🤖 {profiles.length} perfiles encontrados por búsqueda inteligente
  </Text>
)}
<View style={styles.searchContainer}>
  <Ionicons name="search" size={18} color="#D8A353" style={styles.searchIcon} />
  <TextInput
    style={styles.searchInput}
    placeholder="Buscar talentos o servicios"
    placeholderTextColor="#aaaaaa"
    value={search}
    onChangeText={setSearch}
  />
  <View style={styles.iaContainer}>
    <Ionicons name="sparkles" size={16} color="#00FFAA" />
    <Text style={styles.iaText}>IA</Text>
  </View>
</View>

{category?.includes("IA") && (
  <TouchableOpacity
    onPress={() => navigation.goBack()}
    style={styles.resetButton}
  >
    <Text style={styles.resetButtonText}>🔁 Nueva búsqueda IA</Text>
  </TouchableOpacity>
)}

      <FlatList
        data={filtered}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.scroll}
        ListEmptyComponent={
          <Text style={styles.noResults}>No se encontraron perfiles.</Text>
        }
        renderItem={({ item: profile }) => (
          <View style={styles.profileCard}>
            {profile.profilePhoto ? (
              <Image source={{ uri: profile.profilePhoto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: '#444', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#aaa' }}>👤</Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.name}>{profile.name || profile.agencyName || 'Usuario'}</Text>
              <Text style={styles.categoryText}>{category}</Text>
            </View>
            <TouchableOpacity
  style={styles.button}
  onPress={async () => {
  try {
    const cleaned = sanitizeProfileData(profile);
    console.log('🧠 PERFIL FINAL PASADO A PROFILE DETAIL:', cleaned);
    console.log('🧭 Navegando a ProfileDetail con:', cleaned);
  navigation.navigate('ProfileDetail', {
  profileData: cleaned,
});
  } catch (e) {
    console.log('❌ Error al navegar al perfil:', e);
    navigation.navigate('ProfileDetail', {
  profileData: profile,
});
  }
}}
>
  <Text style={styles.buttonText}>Ver perfil</Text>
</TouchableOpacity>

          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
  flex: 1,
  backgroundColor: '#000',
  paddingTop: 40, // Ajusta si sigue muy arriba
},
  backButton: {
    position: 'absolute',
    top: 50,
    left: 25,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#D8A353',
    borderWidth: 0.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    height: 50,
    backgroundColor: '#000',
  },

 searchInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 8 },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderColor: '#D8A353',
    borderWidth: 0.5,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 30,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  categoryText: {
    color: '#D8A353',
    fontSize: 12,
  },
  button: {
    backgroundColor: '#000',
    borderColor: '#D8A353',
    borderWidth: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  buttonText: {
    color: '#D8A353',
    fontSize: 12,
  },
  noResults: {
    color: '#888',
    textAlign: 'center',
    marginTop: 30,
  },
  resultCount: {
  color: '#D8A353',
  fontSize: 13,
  textAlign: 'center',
  marginBottom: 10,
},
resetButton: {
  alignSelf: 'center',
  backgroundColor: '#1a1a1a',
  borderColor: '#D8A353',
  borderWidth: 1,
  paddingVertical: 8,
  paddingHorizontal: 20,
  borderRadius: 20,
  marginBottom: 10,
},
resetButtonText: {
  color: '#D8A353',
  fontSize: 13,
},
searchIcon: {
  marginRight: 8,
  marginLeft: 30,
  fontSize: 24,
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
