// DashboardScreen.js original modificado con carrusel dinámico y anuncios vigentes

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
  Animated,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomBar from '../components/BottomBar';
import { useUser } from '../contexts/UserContext';
import { useSimulatedNotification } from '../utils/useSimulatedNotification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const scrollRef = useRef(null);
  const currentIndexRef = useRef(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [appliedCastings, setAppliedCastings] = useState([]);
  const [showProWelcome, setShowProWelcome] = useState(false);
  const [carouselImages, setCarouselImages] = useState([]);
  const bannerAnim = useRef(new Animated.Value(0)).current;

  const { userData } = useUser();
  const userName = userData?.name || 'Usuario';
  const membershipType = userData?.membershipType || 'free';

  useSimulatedNotification(userData);

  useEffect(() => {
    const checkProWelcome = async () => {
      if (membershipType === 'pro') {
        const flag = await AsyncStorage.getItem('hasSeenProWelcome');
        if (flag !== 'true') {
          setShowProWelcome(true);
          Animated.timing(bannerAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();

          setTimeout(() => {
            Animated.timing(bannerAnim, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }).start(() => setShowProWelcome(false));
          }, 4000);

          await AsyncStorage.setItem('hasSeenProWelcome', 'true');
        }
      }
    };
    checkProWelcome();
  }, [membershipType]);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const data = await AsyncStorage.getItem('applications');
        const all = data ? JSON.parse(data) : [];
        const mine = all.filter(app => app.userEmail === userData?.email);
        setAppliedCastings(mine.reverse());
      } catch (error) {
        console.error('Error cargando postulaciones:', error);
      }
    };
    fetchApplications();
  }, []);

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const json = await AsyncStorage.getItem('adsList');
        const parsed = json ? JSON.parse(json) : [];
  
        const now = Date.now();
        const dynamicImages = parsed
          .filter(ad => ad.aprobado === true && ad.expiresAt > now && ad.destacado === true)
          .map(ad => ({
            uri: ad.imageUri,
            link: ad.link,
          }));
  
        setCarouselImages(dynamicImages);
      } catch (error) {
        console.log('❌ Error cargando anuncios:', error);
      }
    };
  
    fetchAds();
  }, []);  
  
  useEffect(() => {
    if (!isPlaying || carouselImages.length === 0) return;

    const interval = setInterval(() => {
      const nextIndex = (currentIndexRef.current + 1) % carouselImages.length;
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);

      scrollRef.current?.scrollToOffset({
        offset: nextIndex * width,
        animated: nextIndex !== 0,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, carouselImages]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.container, { flexGrow: 1 }]}>
        <Image source={require('../assets/logo.png')} style={styles.logo} />
        <Text style={styles.greeting}>Hola, {userName} 👋</Text>
        <Text style={styles.subtitle}>¿Listo para tu próxima oportunidad?</Text>

        <View style={styles.carouselWrapper}>
          <FlatList
            ref={scrollRef}
            data={carouselImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => item.link && Linking.openURL(item.link)}>
                <Image
                  source={item.uri ? { uri: item.uri } : item}
                  style={styles.carouselImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}            
          />
          <TouchableOpacity
            style={styles.playPauseOverlay}
            onPress={() => setIsPlaying(!isPlaying)}
          >
            <Text style={styles.playPauseText}>{isPlaying ? '⏸️' : '▶️'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
  onPress={() => navigation.navigate('AllAdsScreen')}
  style={{
    backgroundColor: '#D8A353',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 15,
  }}
>
  <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 14 }}>
    📢 Ver anuncios promocionados
  </Text>
</TouchableOpacity>

        {/* Todo el contenido original desde aquí se mantiene igual... */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('ExploreProfiles')}
          >
            <Text style={styles.buttonText}>Explorar perfiles</Text>
          </TouchableOpacity>
        </View>

        {appliedCastings.length > 0 && (
          <>
            <Text style={styles.appliedTitle}>🎯 Castings postulados</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.appliedScroll}>
              {appliedCastings.slice(0, 10).map((app, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.appliedCard}
                  onPress={() => navigation.navigate('CastingDetail', { casting: app })}
                >
                  <Text style={styles.appliedText}>{app.title}</Text>
                  <Text style={styles.appliedSub}>{app.agencyName}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={styles.categoriesTitle}>Categorías destacadas</Text>
        <View style={styles.categoriesContainer}>
          <View style={styles.column}>
            <TouchableOpacity onPress={() => navigation.navigate('FilteredProfiles', { category: 'Extra' })}>
              <Text style={styles.categoryButton}>🎭 Extras</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('FilteredProfiles', { category: 'Vestuarista' })}>
              <Text style={styles.categoryButton}>👕 Vestuaristas</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('FilteredProfiles', { category: 'Transporte de producción' })}>
              <Text style={styles.categoryButton}>🚌 Transporte</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('FilteredProfiles', { category: 'Autos personales' })}>
              <Text style={styles.categoryButton}>🚗 Autos personales</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.column}>
            <TouchableOpacity onPress={() => navigation.navigate('FilteredProfiles', { category: 'Maquillista' })}>
              <Text style={styles.categoryButton}>💄 Maquillista</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('FilteredProfiles', { category: 'Servicios de catering' })}>
              <Text style={styles.categoryButton}>🍽️ Catering</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('FilteredProfiles', { category: 'Fotógrafo de backstage' })}>
              <Text style={styles.categoryButton}>📷 Fotógrafo</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('FilteredProfiles', { category: 'Locaciones' })}>
              <Text style={styles.categoryButton}>📍 Locaciones</Text>
            </TouchableOpacity>
          </View>
        </View>

        {membershipType === 'elite' && (
          <View style={styles.membershipCard}>
            <Text style={styles.membershipText}>👑 Miembro Elite – Gestión de castings activada</Text>
          </View>
        )}

        {membershipType === 'pro' && (
          <View style={styles.membershipCard}>
            <Text style={styles.membershipText}>🏆 Miembro Pro – Máximo nivel para talentos</Text>
          </View>
        )}

        {membershipType === 'free' && (
          <TouchableOpacity
            style={{
              backgroundColor: '#D8A353',
              borderRadius: 10,
              paddingVertical: 12,
              paddingHorizontal: 20,
              marginTop: 50,
              borderColor: '#FFD700',
              borderWidth: 1,
              alignSelf: 'center',
            }}
            onPress={() => navigation.navigate('UpgradeToPro')}
          >
            <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 14 }}>
              📈 Subir a Pro por $2.990 CLP
            </Text>
          </TouchableOpacity>
        )}

        {showProWelcome && (
          <Animated.View style={[styles.proBanner, { opacity: bannerAnim }]}>
            <Text style={styles.proBannerText}>🏆 ¡Bienvenido al plan Pro! Disfruta tus nuevos beneficios.</Text>
          </Animated.View>
        )}

      </ScrollView>
      <BottomBar membershipType={membershipType} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  container: { alignItems: 'center', paddingBottom: 0 },
  logo: { width: 100, height: 100, marginTop: 10 },
  greeting: { color: '#D8A353', fontSize: 20, fontWeight: 'bold', marginTop: 0, marginBottom: 4, textAlign: 'center' },
  subtitle: { color: '#ccc', fontSize: 14, marginBottom: 15, textAlign: 'center' },
  carouselWrapper: { position: 'relative', width: '100%', alignItems: 'center', marginBottom: 10 },
  carouselImage: {
    width: width - 40,
    height: (width - 40) * 9 / 16,
    borderRadius: 10,
    marginHorizontal: 20,
  }, 
  playPauseOverlay: { position: 'absolute', top: 10, right: 25, backgroundColor: 'rgba(0, 0, 0, 0.5)', paddingHorizontal: 5, paddingVertical: 4, borderRadius: 20 },
  playPauseText: { color: '#D8A353', fontWeight: 'bold', fontSize: 12 },
  buttonContainer: { flexDirection: 'row', marginBottom: 18 },
  button: { borderColor: '#D8A353', borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, marginHorizontal: 10 },
  buttonText: { color: '#D8A353', fontSize: 14 },
  appliedTitle: { color: '#D8A353', fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 10, alignSelf: 'center' },
  appliedScroll: { paddingLeft: 20, marginBottom: 20 },
  appliedCard: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#D8A353', borderRadius: 10, padding: 12, marginRight: 15, width: 200 },
  appliedText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  appliedSub: { color: '#aaa', fontSize: 12, marginTop: 5 },
  categoriesTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  categoriesContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '90%', marginBottom: 0 },
  column: { alignItems: 'flex-start' },
  categoryButton: { color: '#D8A353', fontSize: 14, fontWeight: 'bold', marginVertical: 6, textDecorationLine: 'underline' },
  membershipCard: {
    backgroundColor: '#1B1B1B',
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 0,
    borderColor: '#D8A353',
    borderWidth: 1,
    alignItems: 'center',
    width: '85%',
    shadowColor: '#D8A353',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  membershipText: {
    color: '#D8A353',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 10,
  },
  proBanner: {
    position: 'absolute',
    top: 40,
    backgroundColor: '#1A1A1A',
    padding: 10,
    borderRadius: 8,
    borderColor: '#D8A353',
    borderWidth: 1,
    alignSelf: 'center',
    zIndex: 1000,
    maxWidth: '90%',
  },
  proBannerText: {
    color: '#D8A353',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
  },
});
