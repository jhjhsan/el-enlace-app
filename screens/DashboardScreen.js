import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import BottomBar from '../components/BottomBar';
import { useUser } from '../contexts/UserContext';

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

  const { userData } = useUser();
  const userName = userData?.name || 'Usuario';
  const membershipType = userData?.membershipType || 'free';

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
        <Text style={styles.userName}>{userName}</Text>

        {membershipType === 'pro' ? (
          <Text style={styles.proBadge}> Miembro Pro 🏆</Text>
        ) : membershipType === 'elite' ? (
          <TouchableOpacity onPress={() => navigation.navigate('Subscription')}>
            <Text style={styles.proBadge}> Miembro Elite 👑</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.freeBadge}> Miembro Free 🎬</Text>
        )}

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
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('ExploreProfiles')}
          >
            <Text style={styles.buttonText}>Explorar perfiles</Text>
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

        {membershipType === 'free' ? (
          <TouchableOpacity
            style={styles.disabledButton}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.disabledButtonText}>🔓 Ver planes de membresía</Text>
          </TouchableOpacity>
        ) : membershipType === 'pro' ? (
          <TouchableOpacity
            style={styles.disabledButton}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.disabledButtonText}>🔒 Membresía Elite</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.eliteTextContainer}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.eliteText}>👑 Miembro Elite</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <BottomBar membershipType={membershipType} />
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
  userName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: -5,
    marginBottom: 5,
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
  disabledButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginTop: 30,
    marginBottom: 40,
    alignSelf: 'center',
    width: '80%',
    opacity: 0.5,
  },
  disabledButtonText: {
    color: '#888',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  proBadge: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  freeBadge: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  eliteTextContainer: {
    backgroundColor: '#1A1A1A',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginTop: 30,
    marginBottom: 40,
    alignSelf: 'center',
    opacity: 0.7,
  },
  eliteText: {
    color: '#D8A353',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
});
