import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomBar from '../components/BottomBar';
import { useUser } from '../contexts/UserContext';

const categories = [
  "Actor",
    "Actriz",
    "Agencia de casting",
    "Ambientador",
    "Animador / presentador",
    "Artista urbano",
    "Asistente de cámara",
    "Asistente de dirección",
    "Asistente de producción",
    "Asistente de vestuario",
    "Autos clásicos para escenas",
    "Autos personales",
    "Bailarín / bailarina",
    "Camiones de arte para rodajes",
    "Camarógrafo",
    "Caracterizador (maquillaje FX)",
    "Casas rodantes para producción",
    "Coffee break / snacks",
    "Colorista",
    "Community manager",
    "Continuista",
    "Coordinador de locaciones",
    "Creador de contenido digital",
    "Decorador de set",
    "Diseñador de arte",
    "Diseñador gráfico",
    "Doble de acción",
    "Editor de video",
    "Escenógrafo",
    "Estudio fotográfico",
    "Extra",
    "Fotógrafo de backstage",
    "Grúas para filmación",
    "Iluminador",
    "Ilustrador / storyboarder",
    "Maquillista",
    "Microfonista",
    "Modelo",
    "Modelo publicitario",
    "Motos o bicicletas para escenas",
    "Niño actor",
    "Operador de drone",
    "Peluquero / estilista",
    "Postproductor",
    "Productor",
    "Servicios de catering",
    "Sonidista",
    "Stage manager",
    "Técnico de efectos especiales",
    "Técnico de grúa",
    "Transporte de producción",
    "Transporte de talentos",
    "Vans de producción",
    "Vestuarista",
    "Otros / No especificado"
];

export default function ExploreProfilesScreen({ navigation }) {
  const { userData } = useUser();
  const [search, setSearch] = useState('');
  const [filteredCategories, setFilteredCategories] = useState(categories);

  const handleSearch = (text) => {
    setSearch(text);
    const filtered = categories.filter(cat =>
      cat.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredCategories(filtered);
  };

  return (
    <View style={styles.container}>
      {/* Barra de búsqueda fija */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#D8A353" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar talentos o servicios"
          placeholderTextColor="#D8A353"
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      {/* Contenido scrollable: categorías filtradas */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.categoryList}>
          {filteredCategories.map((cat, index) => (
            <TouchableOpacity
            key={index}
            style={styles.categoryButton}
            onPress={() => navigation.navigate('FilteredProfiles', { category: cat })}
          >
            <Text style={styles.categoryText}>{cat}</Text>
          </TouchableOpacity>
          
          ))}
          {filteredCategories.length === 0 && (
            <Text style={styles.noResultsText}>No se encontraron resultados.</Text>
          )}
        </View>
      </ScrollView>

      {/* Barra inferior fija */}
      <BottomBar navigation={navigation} membershipType={userData?.membershipType} />
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 40, // espacio para no quedar pegado arriba
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
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
    backgroundColor: '#000',
    height: 55,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 8,
  },
  categoryList: {
    paddingBottom: 30,
  },
  categoryButton: {
    borderWidth: 1,
    borderColor: '#D8A353',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: '#121212',
  },
  categoryText: {
    color: '#D8A353',
    textAlign: 'center',
    fontSize: 14,
  },
  noResultsText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  
});

