import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { Ionicons, AntDesign, Feather } from '@expo/vector-icons';
import { Video } from 'expo-av';
import BottomBar from '../components/BottomBar';

export default function ProfileEliteScreen({ navigation }) {
  const { userData, setUserData } = useUser();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      const json = await AsyncStorage.getItem('userProfile');
      if (json) {
        const loadedProfile = JSON.parse(json);
        setProfile(loadedProfile);
      } else {
        setProfile({}); // Inicializar como objeto vacío si no hay datos
      }
    };
    loadProfile();
  }, []);

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Encabezado */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Perfil de Agencia</Text>
          <Text style={styles.subtitle}>👑 Cuenta Elite</Text>
          <TouchableOpacity
  style={styles.editPill}
  onPress={() => navigation.navigate('EditProfileElite')}
>
  <AntDesign name="edit" size={16} color="#000" />
  
</TouchableOpacity>
        </View>

        {/* Sección de Perfil */}
        <View style={styles.profileSection}>
          <View style={styles.logoContainer}>
            <Image
              source={{ uri: profile.profilePhoto || 'https://via.placeholder.com/120' }} // Fallback si no hay foto
              style={styles.logo}
              onError={(e) => console.log('Error loading image:', e.nativeEvent.error)}
            />
          </View>
          {profile.companyType && (
  <View style={styles.categoryBadge}>
    <Feather name="briefcase" size={16} color="#D8A353" style={{ marginRight: 6 }} />
    <Text style={styles.categoryText}>{profile.companyType}</Text>
  </View>
)}

          <Text style={styles.agencyName}>{profile.agencyName}</Text>
          <Text style={styles.representative}>{profile.representative}</Text>
          <Text style={styles.location}>{profile.city}, {profile.region}</Text>
        </View>

        {/* Sección de Contacto Visual */}
        <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 10 }]}>Contacto</Text>
<View style={styles.contactBoxCentered}>
  {profile.email && (
    <View style={styles.contactCard}>
      <Ionicons name="mail" size={20} color="#D8A353" style={styles.cardIcon} />
      <Text style={styles.cardText}>{profile.email}</Text>
    </View>
  )}
  {profile.phone && (
    <View style={styles.contactCard}>
      <Ionicons name="call" size={20} color="#D8A353" style={styles.cardIcon} />
      <Text style={styles.cardText}>{profile.phone}</Text>
    </View>
  )}
  {profile.address && (
    <View style={styles.contactCard}>
      <Ionicons name="location" size={20} color="#D8A353" style={styles.cardIcon} />
      <Text style={styles.cardText}>{profile.address}</Text>
    </View>
  )}
  {profile.instagram && (
    <View style={styles.contactCard}>
      <Ionicons name="logo-instagram" size={20} color="#D8A353" style={styles.cardIcon} />
      <Text style={styles.cardText}>{profile.instagram}</Text>
    </View>
  )}
</View>
        {/* Sección de Descripción */}
        <Text style={styles.sectionTitle}>Descripción</Text>
        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionText}>{profile.description}</Text>
        </View>

        {/* Sección de Portafolio */}
        <Text style={styles.sectionTitle}>Portafolio</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollHorizontal}>
          {profile.logos?.map((uri, index) => (
            <TouchableOpacity key={index} style={styles.portfolioCard}>
              <Image source={{ uri }} style={styles.portfolioImage} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sección de Video */}
        {profile.profileVideo && (
          <View style={styles.videoSection}>
            <Text style={styles.sectionTitle}>Video Institucional</Text>
            <View style={styles.videoContainer}>
              <Video
                source={{ uri: profile.profileVideo }}
                useNativeControls
                resizeMode="contain"
                style={styles.video}
              />
            </View>
          </View>
        )}
      </ScrollView>
      <View style={styles.bottomBarWrapper}>
  <BottomBar />
</View>

    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000', 
        paddingHorizontal: 20,
      },      
  loadingText: {
    color: '#F5F5F5',
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
  },
  headerContainer: {
    marginTop: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#D8A353',
    fontSize: 24,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: 'rgba(216, 163, 83, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginTop: -25,
  },
  subtitle: {
    color: '#B0B0B0',
    fontSize: 16,
    marginTop: 6,
    fontStyle: 'italic',
  },
  editButton: {
    position: 'absolute',
    top: 0,
    right: 10,
    backgroundColor: '#1B1B1B',
    borderRadius: 50,
    padding: 6,
    borderWidth: 1,
    borderColor: '#D8A353',
    elevation: 4,
    shadowColor: '#D8A353',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },  
  profileSection: {
    alignItems: 'center',
    marginVertical: 0,
  },
  logoContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 75,
    padding: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    borderStyle: 'solid',
    backgroundImage: 'linear-gradient(#1E1E1E, #1E1E1E), linear-gradient(45deg, #D8A353, #E8C07A)',
    backgroundOrigin: 'border-box',
    backgroundClip: 'content-box, border-box',
    elevation: 5,
    shadowColor: '#D8A353',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#D8A353',
  },
  agencyName: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    letterSpacing: 0.5,
  },
  representative: {
    color: '#B0B0B0',
    fontSize: 16,
    marginTop: 4,
  },
  location: {
    color: '#888888',
    fontSize: 14,
    marginTop: 0,
    marginBottom:10,
    fontStyle: 'italic',
  },
  contactBox: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 0,
    elevation: 4,
    shadowColor: '#D8A353',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(216, 163, 83, 0.2)',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconWrapper: {
    backgroundColor: 'rgba(216, 163, 83, 0.1)',
    borderRadius: 20,
    padding: 8,
    marginRight: 10,
  },
  contactText: {
    color: '#F5F5F5',
    fontSize: 15,
    flex: 1,
  },
  sectionTitle: {
    color: '#D8A353',
    fontSize: 20,
    fontWeight: '600',
    marginVertical: 15,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(216, 163, 83, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  descriptionBox: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    elevation: 4,
    shadowColor: '#D8A353',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(216, 163, 83, 0.2)',
  },
  descriptionText: {
    color: '#F5F5F5',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'justify',
  },
  scrollHorizontal: {
    marginVertical: 10,
  },
  portfolioCard: {
    marginRight: 12,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
    elevation: 3,
    shadowColor: '#D8A353',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  portfolioImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(216, 163, 83, 0.3)',
  },
  videoSection: {
    marginVertical: 20,
  },
  videoContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    borderStyle: 'solid',
    backgroundImage: 'linear-gradient(#1E1E1E, #1E1E1E), linear-gradient(45deg, #D8A353, #E8C07A)',
    backgroundOrigin: 'border-box',
    backgroundClip: 'content-box, border-box',
    elevation: 5,
    shadowColor: '#D8A353',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    padding: 4,
  },
  video: {
    width: '100%',
    height: 220,
    borderRadius: 8,
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D8A353',
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 30,
    marginTop: -40,
    marginRight: 0,
    elevation: 4,
    shadowColor: '#D8A353',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  editText: {
    marginLeft: 6,
    fontWeight: 'bold',
    color: '#000',
    fontSize: 14,
  },  
  contactBoxCentered: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 0,
    gap: 5,
  },
  
  contactCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(216, 163, 83, 0.3)',
    paddingVertical: 12,
    paddingHorizontal: 22,
    minWidth: '99%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'left',
    shadowColor: '#D8A353',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  
  cardIcon: {
    marginRight: 10,
  },
  
  cardText: {
    color: '#CCCCCC',
    fontSize: 15,
    textAlign: 'center',
  },  
  bottomBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: '#121212',
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 5,
    zIndex: 10,
  },  
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#1E1E1E',
    borderColor: 'rgba(216, 163, 83, 0.4)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 15,
    shadowColor: '#D8A353',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  categoryText: {
    color: '#F5F5F5',
    fontSize: 14,
    fontWeight: '500',
  },  
});