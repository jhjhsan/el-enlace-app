import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native';
import BottomBar from '../components/BottomBar';

const initialCategories = [
  'Actor', 'Actriz', 'Ambientador', 'Animador / Presentador', 'Asistente de Cámara', 'Asistente de Dirección',
  'Asistente de Producción', 'Asistente de Vestuario', 'Auto Clásico para Escena', 'Auto Personal',
  'Bailarín', 'Camarógrafo', 'Casa Rodante', 'Catering', 'Community Manager', 'Continuista',
  'Creador de Contenido', 'Decorador de Set', 'Diseñador de Arte', 'Diseñador Gráfico', 'Doble de Acción',
  'Editor de Video', 'Escenógrafo', 'Estudio Fotográfico', 'Extra', 'Fotógrafo', 'Fotógrafo de Backstage',
  'Grúa para Filmación', 'Iluminador', 'Ilustrador / Storyboarder', 'Maquillista', 'Microfonista', 'Modelo',
  'Modelo Publicitario', 'Moto / Bicicleta para Escena', 'Niño Actor', 'Operador de Drone',
  'Otros / No especificado', 'Peluquero / Estilista', 'Postproductor', 'Productor', 'Servicio de Coffee Break',
  'Servicio de Transporte de Producción', 'Servicio de Transporte de Talento', 'Stage Manager',
  'Sonidista', 'Técnico de Efectos Especiales', 'Técnico de Grúa', 'Van de Producción', 'Dueño de Locación'
].sort(); // ✅ Ordenado alfabéticamente

export default function EditProfileScreen({ navigation }) {
  const [email, setEmail] = useState('jhjhsan@mail.com');
  const [phone, setPhone] = useState('+56998765760');
  const [instagram, setInstagram] = useState('jhonsantana.s');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [search, setSearch] = useState('');

  const toggleCategory = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const filteredCategories = (initialCategories || []).filter(category =>
    category.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    alert('Perfil guardado exitosamente');
    navigation.navigate('Profile');
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategories.includes(item) && styles.selectedCategory
      ]}
      onPress={() => toggleCategory(item)}
    >
      <Text style={[
        styles.categoryText,
        selectedCategories.includes(item) && styles.selectedCategoryText
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        ListHeaderComponent={
          <>
            <View style={styles.headerContainer}>
              <TouchableOpacity>
                <Image
                  source={require('../assets/imagen5.png')}
                  style={styles.profileImage}
                />
              </TouchableOpacity>
              <Text style={styles.editPhotoText}>Editar foto</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Correo</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Correo electrónico"
                  placeholderTextColor="#aaa"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Teléfono</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Número de teléfono"
                  placeholderTextColor="#aaa"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Instagram</Text>
                <TextInput
                  style={styles.input}
                  value={instagram}
                  onChangeText={setInstagram}
                  placeholder="@usuario"
                  placeholderTextColor="#aaa"
                />
              </View>

              <Text style={styles.sectionTitle}>Categorías</Text>

              <TextInput
                style={styles.searchInput}
                placeholder="Buscar categoría..."
                placeholderTextColor="#aaa"
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </>
        }
        data={filteredCategories}
        keyExtractor={(item) => item}
        renderItem={renderCategory}
        contentContainerStyle={styles.contentContainer}
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Guardar Cambios</Text>
      </TouchableOpacity>

      <BottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentContainer: {
    paddingBottom: 120,
    paddingHorizontal: 25,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginTop: 50,
    borderColor: '#D8A353',
    borderWidth: 2,
  },
  editPhotoText: {
    color: '#D8A353',
    marginTop: 8,
    marginBottom: 20,
    fontSize: 14,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 10,
  },
  label: {
    color: '#fff',
    marginBottom: 5,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    color: '#fff',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  searchInput: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    marginBottom: 15,
    marginHorizontal: 5,
    color: '#fff',
  },
  categoryItem: {
    padding: 10,
    backgroundColor: '#1B1B1B',
    borderRadius: 10,
    marginBottom: 8,
  },
  categoryText: {
    color: '#fff',
    fontSize: 14,
  },
  selectedCategory: {
    backgroundColor: '#D8A353',
  },
  selectedCategoryText: {
    color: '#000',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 15,
    borderRadius: 10,
    position: 'absolute',
    bottom: 70,
    left: 20,
    right: 20,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
