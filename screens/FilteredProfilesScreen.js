import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import BottomBar from '../components/BottomBar';

export default function FilteredProfilesScreen({ route, navigation }) {
  const { category } = route.params;
  const { userData } = useUser();
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        // Obtener todos los perfiles guardados (Pro y Free si se usan claves distintas)
        const allKeys = await AsyncStorage.getAllKeys();
        const profileKeys = allKeys.filter(key => key.startsWith('userProfile_')); // clave personalizada
        const stores = await AsyncStorage.multiGet(profileKeys);
        const allProfiles = stores
          .map(([_, value]) => JSON.parse(value))
          .filter(profile => profile.category === category);
        setProfiles(allProfiles);
      } catch (error) {
        console.error('Error al cargar perfiles:', error);
      }
    };

    loadProfiles();
  }, [category]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Resultados: {category}</Text>

        <FlatList
          data={profiles}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('ProfileDetail', { profile: item })}
            >
              <Image source={{ uri: item.profilePhoto }} style={styles.photo} />
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No hay perfiles en esta categoría.</Text>
          }
        />
      </View>

      <BottomBar navigation={navigation} membershipType={userData?.membershipType} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  title: {
    color: '#D8A353',
    fontSize: 18,
    marginBottom: 10,
  },
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D8A353',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    backgroundColor: '#1E1E1E',
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 10,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  description: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 4,
  },
  empty: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },
});
