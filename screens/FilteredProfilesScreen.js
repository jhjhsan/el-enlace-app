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
import { rebuildAllProfiles } from '../src/firebase/helpers/rebuildAllProfiles';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { guardarAllProfiles } from '../src/firebase/helpers/profileHelpers';



const limpiarPerfilCorrupto = async () => {
  const all = await AsyncStorage.getItem('allProfiles');
  if (all) {
    const parsed = JSON.parse(all);
    const filtrado = parsed.filter(p => p.email !== 'jhjhsan@gmail@com');
    if (filtrado.length !== parsed.length) {
      console.log('🧹 Eliminando perfil con email mal escrito...');
      await guardarAllProfiles(filtrado);

    }
  }
};

limpiarPerfilCorrupto(); // 👈 Ejecuta la limpieza automáticamente

export default function FilteredProfilesScreen({ route, navigation }) {
  const { userData } = useUser();

  const perfilesValidos = route.params?.profiles?.filter(
  (p) => p.email && !p.email.includes('@com')
);

  const { category } = route.params;
  const normalizedCategory = Array.isArray(category) ? category[0] : category;

  console.log('🧪 route.params:', route.params);
console.log('🧪 category recibido:', category);

  const [profiles, setProfiles] = useState([]);
  const [search, setSearch] = useState('');

 const sanitizeProfileData = (profile) => {
  console.log('🔍 VER PERFIL desde FILTRADO → Email original:', profile.email);
console.log('🧩 Objeto profile completo:', profile);

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

const fetchProfiles = async () => {
  try {
    const storedFree = await AsyncStorage.getItem('allProfilesFree');
    const storedPro = await AsyncStorage.getItem('allProfiles');
    const storedElite = await AsyncStorage.getItem('allProfilesElite');

    const parsedFree = storedFree ? JSON.parse(storedFree) : [];
    const parsedPro = storedPro ? JSON.parse(storedPro) : [];
    const parsedElite = storedElite ? JSON.parse(storedElite) : [];

    // 🧩 Combinar todos los perfiles
    const combined = [...parsedFree, ...parsedPro, ...parsedElite];

    // 🧼 Eliminar versiones antiguas duplicadas (Free/Pro) si ya existe Pro o Elite
    const profileMap = new Map();
    const rank = { free: 1, pro: 2, elite: 3 };

    combined.forEach((profile) => {
      const email = profile.email?.toLowerCase();
      if (!email) return;

      const existing = profileMap.get(email);
      if (!existing || rank[profile.membershipType] > rank[existing.membershipType]) {
        profileMap.set(email, profile);
      }
    });

    const uniqueProfiles = [...profileMap.values()].filter(
      (p) => p.visibleInExplorer !== false
    );

    // 🔍 Filtro por categoría
    const filtered = uniqueProfiles.filter((profile) => {
      const cat = profile.category;
      const categories = Array.isArray(cat)
        ? cat.map((c) => normalize(c))
        : typeof cat === 'string'
        ? [normalize(cat)]
        : [];

      return categories.includes(normalize(normalizedCategory));
    });

    // 🔕 Excluir el perfil propio
    const activeEmail = userData?.email?.toLowerCase();
    const filteredWithoutSelf = filtered.filter(
      (p) => p.email?.toLowerCase() !== activeEmail
    );

    console.log(
      `✅ Mostrando ${filteredWithoutSelf.length} perfiles para: ${normalize(normalizedCategory)}`
    );

    const validProfiles = filteredWithoutSelf.filter(
      (p) => p.name || p.agencyName
    );

    setProfiles(validProfiles);
  } catch (error) {
    console.error('❌ Error al cargar perfiles:', error);
  }
};

useEffect(() => {
  const init = async () => {
    // 🔍 Mostrar si los perfiles individuales existen
    const debugFree = await AsyncStorage.getItem('userProfileFree');
    const debugPro = await AsyncStorage.getItem('userProfilePro');
    const debugElite = await AsyncStorage.getItem('userProfileElite');

    console.log('📦 PERFIL FREE:', debugFree ? '✅ Existe' : '❌ No existe');
    console.log('📦 PERFIL PRO:', debugPro ? '✅ Existe' : '❌ No existe');
    console.log('📦 PERFIL ELITE:', debugElite ? '✅ Existe' : '❌ No existe');
    // 🔁 Reconstruir la lista combinada
    await rebuildAllProfiles();

    // 🧪 Verificar si category se está conservando
    const all = await AsyncStorage.getItem('allProfiles');
    console.log('🧪 Verificación después de rebuildAllProfiles:', JSON.parse(all));


    // 🎯 Cargar los perfiles filtrados por categoría
    await fetchProfiles();

    // 🧪 DEBUG: Mostrar todo lo que hay en allProfiles
    const debugRaw = await AsyncStorage.getItem('allProfiles');
    const debugParsed = debugRaw ? JSON.parse(debugRaw) : [];
    console.log('🧪 DEBUG – Perfiles guardados en allProfiles:');
    debugParsed.forEach((p) => {
      console.log('➡️ Perfil:', {
        email: p.email,
        category: p.category,
        visibleInExplorer: p.visibleInExplorer,
        membershipType: p.membershipType,
      });
    });
  };

  init();
}, [category]);
useFocusEffect(
  useCallback(() => {
    console.log('🔄 Volviendo a cargar perfiles desde useFocusEffect...');
    fetchProfiles();
  }, [])
);

 const filtered = profiles.filter(p => {
  const name = p.name || p.agencyName || '';
  const category = Array.isArray(p.category) ? p.category.join(', ') : p.category || '';
  return (
    name.toLowerCase().includes(search.toLowerCase()) ||
    category.toLowerCase().includes(search.toLowerCase())
  );
});

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
              <Text style={styles.categoryText}>
  {Array.isArray(profile.category) ? profile.category.join(', ') : profile.category}
</Text>

            </View>
<TouchableOpacity
  style={styles.button}
  onPress={async () => {
    try {
      const cleaned = sanitizeProfileData(profile);

let emailOriginal = (profile.email || '').trim().toLowerCase();

// Si contiene más de un @, elimina todos los que están antes del último
if ((emailOriginal.match(/@/g) || []).length > 1) {
  const matches = emailOriginal.match(/@[^@]+$/); // busca la última parte como @gmail.com
  const domain = matches ? matches[0].slice(1) : 'gmail.com'; // elimina el @
  const beforeAt = emailOriginal.split('@').slice(0, -1).join('.'); // une antes del último @
  emailOriginal = `${beforeAt}@${domain}`;
  console.warn(`🧽 Email corregido dinámicamente: ${profile.email} → ${emailOriginal}`);
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(emailOriginal)) {
  console.warn('⛔ Email malformado detectado antes de navegación:', emailOriginal);
  return;
}

cleaned.email = emailOriginal;

      console.log('🧠 PERFIL FINAL PASADO A PROFILE DETAIL:', cleaned);

      const tipo = cleaned?.membershipType || 'free';

      if (tipo === 'elite') {
        navigation.navigate('ProfileElite', { viewedProfile: cleaned });
      } else if (tipo === 'pro') {
        navigation.navigate('ProfilePro', { viewedProfile: cleaned });
      } else {
        navigation.navigate('Profile', { viewedProfile: cleaned });
      }

    } catch (e) {
      console.log('❌ Error al navegar al perfil:', e);
      navigation.navigate('Profile', { viewedProfile: profile });
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
