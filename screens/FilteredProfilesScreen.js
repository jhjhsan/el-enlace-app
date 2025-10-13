// screens/FilteredProfilesScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { rebuildAllProfiles } from '../src/firebase/helpers/rebuildAllProfiles';
import { useFocusEffect } from '@react-navigation/native';
import { guardarAllProfiles } from '../src/firebase/helpers/profileHelpers';

/* -------------------------- UTIL LIMPIEZA -------------------------- */
const limpiarPerfilCorrupto = async () => {
  const all = await AsyncStorage.getItem('allProfiles');
  if (all) {
    const parsed = JSON.parse(all);
    const filtrado = parsed.filter((p) => p.email !== 'jhjhsan@gmail@com');
    if (filtrado.length !== parsed.length) {
      console.log('🧹 Eliminando perfil con email mal escrito...');
      await guardarAllProfiles(filtrado);
    }
  }
};
limpiarPerfilCorrupto();

/* -------------------------- HELPERS -------------------------- */
const norm = (s) =>
  (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

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
      'profilePhoto',
      'profileVideo',
      'bookPhotos',
      'timestamp',
      'updatedAt',
      'createdAt',
      'id',
      'flagged',
      'visibleInExplorer',
      'hasPaid',
      'debugUpload',
    ]);
    return Object.entries(val)
      .filter(([k]) => !blacklist.has(k))
      .map(([, v]) => collectStrings(v, depth + 1))
      .join(' ');
  }
  return '';
};

const buildHaystack = (p) => {
  const priority = [
    'name','agencyName','companyName','title','sexo','gender','age','estatura',
    'skinColor','eyeColor','hairColor','ethnicity','bio','about','skills','services','tags',
    'city','ciudad','region','comuna','country','resourceName','resourceType','resource',
    'details','description','resourceDescription','brand','make','vehicleBrand','model',
    'vehicleModel','category',
  ];

  const parts = [];
  priority.forEach((k) => {
    const v = p?.[k];
    if (!v) return;
    parts.push(Array.isArray(v) ? v.join(' ') : v);
  });

  parts.push(collectStrings(p?.resource));
  parts.push(collectStrings(p?.details));
  parts.push(collectStrings(p));

  return norm(parts.filter(Boolean).join(' '));
};

/* -------------------------- COMPONENTE -------------------------- */
export default function FilteredProfilesScreen({ route, navigation }) {
  const { userData } = useUser();
  const { category } = route.params || {};
  const normalizedCategory = Array.isArray(category) ? category[0] : category;

  const [profiles, setProfiles] = useState([]);

  const sanitizeProfileData = (profile) => {
    const cleaned = { ...profile };
    if (!cleaned.profilePhoto?.startsWith('http') && !cleaned.profilePhoto?.startsWith('file')) {
      cleaned.profilePhoto = null;
    }
    if (!cleaned.profileVideo?.startsWith('http') && !cleaned.profileVideo?.startsWith('file')) {
      cleaned.profileVideo = null;
    }
    if (!cleaned.name && cleaned.agencyName) {
      cleaned.name = cleaned.agencyName;
    }
    return cleaned;
  };

  const normalize = (str) =>
    str?.toLowerCase().replace(/[^a-záéíóúüñ0-9\s]/gi, '').trim();

  const fetchProfiles = async () => {
    try {
      const storedFree = await AsyncStorage.getItem('allProfilesFree');
      const storedPro = await AsyncStorage.getItem('allProfiles');
      const storedElite = await AsyncStorage.getItem('allProfilesElite');

      const parsedFree = storedFree ? JSON.parse(storedFree) : [];
      const parsedPro = storedPro ? JSON.parse(storedPro) : [];
      const parsedElite = storedElite ? JSON.parse(storedElite) : [];

      const combined = [...parsedFree, ...parsedPro, ...parsedElite];

      const profileMap = new Map();
      const rank = { free: 1, pro: 2, elite: 3 };

      combined.forEach((profile) => {
        const email = profile.email?.toLowerCase();
        if (!email) return;
        const existing = profileMap.get(email);
        if (!existing || (rank[profile.membershipType] || 0) > (rank[existing.membershipType] || 0)) {
          profileMap.set(email, profile);
        }
      });

      const uniqueProfiles = [...profileMap.values()].filter(
        (p) => p.visibleInExplorer !== false
      );

      let filtered = uniqueProfiles;
      if (normalizedCategory && !String(normalizedCategory).includes('Resultados')) {
        filtered = uniqueProfiles.filter((profile) => {
          const cat = profile.category;
          const categories = Array.isArray(cat)
            ? cat.map((c) => normalize(c))
            : typeof cat === 'string'
            ? [normalize(cat)]
            : [];
          return categories.includes(normalize(normalizedCategory));
        });
      } else if (Array.isArray(route.params?.profiles)) {
        filtered = route.params.profiles;
      }

      const activeEmail = userData?.email?.toLowerCase();
      const filteredWithoutSelf = filtered.filter(
        (p) => p.email?.toLowerCase() !== activeEmail
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
      await rebuildAllProfiles();
      await fetchProfiles();
    };
    init();
  }, [category]);

  useFocusEffect(
    useCallback(() => {
      fetchProfiles();
    }, [])
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      {category?.includes('IA') && (
        <Text style={styles.resultCount}>
          🤖 {profiles.length} perfiles encontrados por búsqueda inteligente
        </Text>
      )}

      {category?.includes('IA') && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.resetButton}>
          <Text style={styles.resetButtonText}>🔁 Nueva búsqueda IA</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={profiles}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={styles.scroll}
        ListEmptyComponent={
          <Text style={styles.noResults}>
            No se encontraron perfiles.
          </Text>
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
              <Text style={styles.metaText}>
                {[
                  profile.sexo && `Género: ${profile.sexo}`,
                  profile.age && `Edad: ${profile.age}`,
                  profile.estatura && `Estatura: ${profile.estatura}`,
                  profile.eyeColor && `Ojos: ${profile.eyeColor}`,
                  profile.hairColor && `Cabello: ${profile.hairColor}`,
                  profile.skinColor && `Piel: ${profile.skinColor}`,
                  profile.city && `Ciudad: ${profile.city}`,
                  profile.ciudad && `Ciudad: ${profile.ciudad}`,
                ].filter(Boolean).join('  ·  ')}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={async () => {
                try {
                  const cleaned = sanitizeProfileData(profile);
                  let emailOriginal = (profile.email || '').trim().toLowerCase();
                  if ((emailOriginal.match(/@/g) || []).length > 1) {
                    const matches = emailOriginal.match(/@[^@]+$/);
                    const domain = matches ? matches[0].slice(1) : 'gmail.com';
                    const beforeAt = emailOriginal.split('@').slice(0, -1).join('.');
                    emailOriginal = `${beforeAt}@${domain}`;
                  }
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(emailOriginal)) return;
                  cleaned.email = emailOriginal;
                  const tipo = cleaned?.membershipType || 'free';
                  if (tipo === 'elite') {
                    navigation.navigate('ProfileElite', { viewedProfile: cleaned });
                  } else if (tipo === 'pro') {
                    navigation.navigate('ProfilePro', { viewedProfile: cleaned });
                  } else {
                    navigation.navigate('Profile', { viewedProfile: cleaned });
                  }
                } catch (e) {
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

/* -------------------------- STYLES -------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 40 },
  backButton: { position: 'absolute', top: 50, left: 25, zIndex: 10 },
  scroll: { paddingHorizontal: 8, paddingBottom: 80 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderColor: '#D8A353',
    borderRadius: 0,
    padding: 10,
    top: 45,
    marginBottom: 5, 
    width: '100%',
    alignSelf: 'stretch',
    marginHorizontal: 0,
  },
  avatar: { width: 48, height: 48, borderRadius: 30, marginLeft: 5, marginRight: 15 },
  info: { flex: 1 },
  name: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  categoryText: { color: '#D8A353', fontSize: 12 },
  metaText: { color: '#bbb', fontSize: 11, marginTop: 4 },
  button: {
    backgroundColor: '#000',
    borderColor: '#D8A353',
    borderWidth: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  buttonText: { color: '#D8A353', fontSize: 12 },
  noResults: { color: '#888', textAlign: 'center', marginTop: 30 },
  resultCount: { color: '#D8A353', fontSize: 13, textAlign: 'center', marginBottom: 10 },
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
  resetButtonText: { color: '#D8A353', fontSize: 13 },
});
