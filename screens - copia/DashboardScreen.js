import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import BottomBar from '../components/BottomBar'; // ✅ Aquí se importa bien el BottomBar

const { width } = Dimensions.get('window');

const images = [
  require('../assets/imagen1.png'),
  require('../assets/imagen2.png'),
  require('../assets/imagen3.png'),
  require('../assets/imagen4.png'),
  require('../assets/imagen5.png'),
];

export default function DashboardScreen({ navigation }) {
  const scrollRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % images.length;
      setCurrentIndex(nextIndex);
      scrollRef.current?.scrollToOffset({ offset: nextIndex * width, animated: true });
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={require('../assets/logo.png')} style={styles.logo} />

        <Text style={styles.title}>EL ENLACE</Text>
        <Text style={styles.subtitle}>Conecta talentos y servicios del mundo audiovisual</Text>

        <FlatList
          ref={scrollRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <Image source={item} style={styles.carouselImage} resizeMode="cover" />
          )}
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Explorar perfiles</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Publicar un servicio</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.categoriesTitle}>Categorías destacadas</Text>

        <View style={styles.categoriesContainer}>
          <View style={styles.column}>
            <Text style={styles.categoryText}>🎭 Extras</Text>
            <Text style={styles.categoryText}>👕 Vestuaristas</Text>
            <Text style={styles.categoryText}>🚌 Transporte</Text>
            <Text style={styles.categoryText}>🚗 Autos personales</Text>
          </View>
          <View style={styles.column}>
            <Text style={styles.categoryText}>💄 Maquillista</Text>
            <Text style={styles.categoryText}>🍽️ Catering</Text>
            <Text style={styles.categoryText}>📷 Fotógrafo</Text>
            <Text style={styles.categoryText}>📍 Locaciones</Text>
          </View>
        </View>

        {/* Botón agregado para navegar a CompleteProfile */}
        <TouchableOpacity
          style={styles.publishButton}
          onPress={() => navigation.navigate('CompleteProfile')}
        >
          <Text style={styles.publishButtonText}>PUBLICAR PERFIL PROFESIONAL</Text>
        </TouchableOpacity>

      </ScrollView>

      <BottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    alignItems: 'center',
    paddingBottom: 100,
  },
  logo: {
    width: 100,
    height: 100,
    marginTop: 50,
  },
  title: {
    color: '#D8A353',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: -5,
  },
  subtitle: {
    color: '#CCCCCC',
    fontSize: 16,
    marginTop: 5,
    marginBottom: 10,
  },
  carouselImage: {
    width: width - 40,
    height: 200,
    borderRadius: 10,
    marginHorizontal: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 18,
  },
  button: {
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 10,
  },
  buttonText: {
    color: '#D8A353',
    fontSize: 14,
  },
  categoriesTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  categoriesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
    marginBottom: 5,
  },
  column: {
    alignItems: 'flex-start',
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginVertical: 5,
  },
  publishButton: {
    backgroundColor: '#D8A353',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginTop: 20,
    marginBottom: 20,
  },
  publishButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
});
