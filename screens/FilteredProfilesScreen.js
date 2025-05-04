// screens/FilteredProfilesScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomBar from '../components/BottomBar';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function FilteredProfilesScreen({ route, navigation }) {
  const { userData } = useUser();
  const { category } = route.params;

  const [profiles, setProfiles] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const pro = await AsyncStorage.getItem('userProfilePro');
        const free = await AsyncStorage.getItem('userProfileFree');
        const all = [];

        if (pro) {
          const parsed = JSON.parse(pro);
          if (parsed.category?.includes(category)) all.push(parsed);
        }

        if (free) {
          const parsed = JSON.parse(free);
          if (parsed.category?.includes(category)) all.push(parsed);
        }

        setProfiles(all);
      } catch (err) {
        console.log('Error cargando perfiles:', err);
      }
    };

    fetchProfiles();
  }, [category]);

  const filtered = profiles.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const isProUser = userData?.membershipType === 'pro';

  return (
    <View style={styles.container}>
      {/* Buscador */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#D8A353" style={styles.icon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar talentos o servicios"
          placeholderTextColor="#D8A353"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Listado de perfiles */}
      <ScrollView contentContainerStyle={styles.scroll}>
        {filtered.map((profile, index) => (
          <View key={index} style={styles.profileCard}>
            <Image
              source={{ uri: profile.profilePhoto }}
              style={styles.avatar}
            />
            <View style={styles.info}>
              <Text style={styles.name}>{profile.name || 'Usuario'}</Text>
              <Text style={styles.categoryText}>{category}</Text>
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                if (isProUser) {
                  navigation.navigate('ProfilePro');
                } else {
                    navigation.navigate('Subscription');                    // Puedes crear esta pantalla luego
                }
              }}
            >
              <Text style={styles.buttonText}>
                {isProUser ? 'Ver perfil' : '🔓 Ver perfil'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {filtered.length === 0 && (
          <Text style={styles.noResults}>No se encontraron perfiles.</Text>
        )}
      </ScrollView>

      <BottomBar navigation={navigation} membershipType={userData?.membershipType} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    height: 50,
    backgroundColor: '#121212',
  },
  icon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderColor: '#D8A353',
    borderWidth: 1,
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
    borderWidth: 1,
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
});
