import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Linking,
  Modal,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Video } from 'expo-av';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function ProfileDetailScreen() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [membershipType, setMembershipType] = useState('free');
  const navigation = useNavigation();
  const route = useRoute();
  const { profileData, returnTo } = route.params || {};
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const handleBlockedPress = () => {
    setShowUpgradeModal(true);
  };
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isEnlarged, setIsEnlarged] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleProfilePhotoPress = () => {
    Animated.timing(scaleAnim, {
      toValue: isEnlarged ? 1 : 1.6,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsEnlarged(!isEnlarged);
    });
  };

  useEffect(() => {
    const checkAccess = async () => {
        if (profileData) {
            setProfile(profileData);
            try {
              const json = await AsyncStorage.getItem('userProfile');
              if (json) {
                const user = JSON.parse(json);
                const type = user.membershipType || 'free';
                setMembershipType(type);
              } else {
                setMembershipType('free');
              }
            } catch (error) {
              console.error('Error cargando tipo de cuenta:', error);
              setMembershipType('free');
            }
            setLoading(false);
            return;
          }          

      const json = await AsyncStorage.getItem('userProfile');
      if (json) {
        const user = JSON.parse(json);
        const type = user.membershipType || 'free';
        setMembershipType(type);
      }

      const loadProfile = async () => {
        try {
          const json =
            (await AsyncStorage.getItem('userProfilePro')) ||
            (await AsyncStorage.getItem('userProfileFree'));

          if (json) {
            const parsed = JSON.parse(json);
            setProfile(parsed);
          }
        } catch (error) {
          console.error('Error cargando el perfil:', error);
        } finally {
          setLoading(false);
        }
      };

      loadProfile();
    };

    checkAccess();
  }, [profileData]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#D8A353" size="large" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Cargando perfil...</Text>
      </View>
    );
  }
  
  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={{ color: '#fff' }}>No se encontró ningún perfil.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {profile.profilePhoto && (
        <TouchableOpacity onPress={handleProfilePhotoPress}>
          <Animated.Image
            source={{ uri: profile.profilePhoto }}
            style={[styles.profileImage, { transform: [{ scale: scaleAnim }] }]}
          />
        </TouchableOpacity>
      )}
      <Text style={styles.name}>{profile.name}</Text>

      {profile.category && (
        <Text style={styles.category}>
          {Array.isArray(profile.category) ? profile.category.join(', ') : profile.category}
        </Text>
      )}

      <View style={styles.infoBox}>
        {profile.sexo && <Text style={styles.infoText}>Sexo: {profile.sexo}</Text>}
        {profile.age && <Text style={styles.infoText}>Edad: {profile.age}</Text>}
        {profile.height && <Text style={styles.infoText}>Estatura: {profile.height} cm</Text>}
        {profile.skinColor && <Text style={styles.infoText}>Color de piel: {profile.skinColor}</Text>}
        {profile.eyeColor && <Text style={styles.infoText}>Color de ojos: {profile.eyeColor}</Text>}
        {profile.hairColor && <Text style={styles.infoText}>Color de cabello: {profile.hairColor}</Text>}
        {profile.ethnicity && <Text style={styles.infoText}>Etnia: {profile.ethnicity}</Text>}
        {profile.tattoos && <Text style={styles.infoText}>Tatuajes: {profile.tattoos}</Text>}
        {profile.tattoosLocation && <Text style={styles.infoText}>Ubicación tatuajes: {profile.tattoosLocation}</Text>}
        {profile.piercings && <Text style={styles.infoText}>Piercings: {profile.piercings}</Text>}
        {profile.piercingsLocation && <Text style={styles.infoText}>Ubicación piercings: {profile.piercingsLocation}</Text>}
        {profile.shirtSize && <Text style={styles.infoText}>Talla de camisa: {profile.shirtSize}</Text>}
        {profile.pantsSize && <Text style={styles.infoText}>Talla de pantalón: {profile.pantsSize}</Text>}
        {profile.shoeSize && <Text style={styles.infoText}>Talla de zapatos: {profile.shoeSize}</Text>}
        {profile.country && <Text style={styles.infoText}>País: {profile.country}</Text>}
        {profile.city && <Text style={styles.infoText}>Ciudad: {profile.city}</Text>}
        {profile.region && <Text style={styles.infoText}>Región: {profile.region}</Text>}
      </View>

      {membershipType === 'free' ? (
  <Text style={{ color: '#ccc', textAlign: 'center', marginVertical: 20 }}>
    🔒 Hazte Pro para ver las fotos y el video de este perfil.
  </Text>
) : (
  <>
    {membershipType !== 'free' && profile.bookPhotos && profile.bookPhotos.length > 0 && (
  <View style={{ width: '110%', paddingHorizontal: 20, marginTop: 10, marginBottom: 20 }}>
    <Text style={styles.label}>📸 Book de fotos ({profile.bookPhotos.length})</Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingVertical: 10,
        paddingRight: 10,
      }}
      style={{ flexGrow: 0 }}
    >
      {profile.bookPhotos.map((uri, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => setSelectedImage(uri)}
          style={{ marginRight: index === profile.bookPhotos.length - 1 ? 0 : 10 }}
        >
          <Image source={{ uri }} style={styles.bookImage} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
)}

{membershipType !== 'free' && profile.profileVideo && (
  <View style={{ width: '90%', marginTop: 10, marginBottom: 20 }}>
    <Text style={styles.label}>🎥 Video de presentación</Text>
    <Video
      source={{ uri: profile.profileVideo }}
      useNativeControls
      resizeMode="contain"
      style={styles.video}
    />
  </View>
)}
  </>
)}

<View style={styles.contactContainer}>
  <View style={styles.rowButtons}>
    <TouchableOpacity
      style={[
        styles.smallButton,
        membershipType === 'free' && styles.disabledButton,
      ]}
      onPress={() => {
        if (membershipType === 'free') {
            setShowUpgradeModal(true);

        } else if (profile.email) {
          Linking.openURL(`mailto:${profile.email}`);
        }
      }}
    >
      <Text style={styles.buttonText}>
        {membershipType === 'free' ? '🔒 Correo' : '📩 Correo'}
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
  style={[
    styles.smallButton,
    membershipType === 'free' && styles.disabledButton,
  ]}
  onPress={() => {
    if (membershipType === 'free') {
      setShowUpgradeModal(true);
    } else if (profile.instagram) {
      Linking.openURL(`https://instagram.com/${profile.instagram.replace('@', '')}`);
    }
  }}
>
  <Text style={styles.buttonText}>
    {membershipType === 'free' ? '🔒 Instagram' : '📸 Instagram'}
  </Text>
</TouchableOpacity>
  </View>

  <TouchableOpacity
    style={[
      styles.fullButton,
      membershipType === 'free' && styles.disabledButton,
    ]}
    onPress={() => {
        if (membershipType === 'free') {
          setShowUpgradeModal(true);
        } else {
          navigation.navigate('Messages', {
            recipient: profile.name,
            email: profile.email,
          });
        }
      }}      
  >
    <Text style={styles.buttonText}>
      {membershipType === 'free' ? '🔒 Enviar mensaje' : '💬 Enviar mensaje'}
    </Text>
  </TouchableOpacity>
</View>

      {selectedImage && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.fullscreenContainer} onPress={() => setSelectedImage(null)}>
              <Image source={{ uri: selectedImage }} style={styles.fullscreenImage} />
            </TouchableOpacity>
          </View>
        </Modal>
      )}
      <TouchableOpacity
  onPress={() => navigation.goBack()}
  style={{
    position: 'absolute',
    top: 15,
    left: 20,
    zIndex: 10,
  }}
>
  <Ionicons name="arrow-back" size={28} color="#fff" />
</TouchableOpacity>
<Modal
  visible={showUpgradeModal}
  transparent
  animationType="slide"
  onRequestClose={() => setShowUpgradeModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.upgradeModal}>
      <Text style={styles.upgradeTitle}>🔒 Función exclusiva para usuarios Pro</Text>
      <Text style={styles.upgradeText}>Mejora tu membresía para contactar talentos por correo, Instagram o mensaje directo.</Text>
      <TouchableOpacity
        style={styles.upgradeButton}
        onPress={() => {
          setShowUpgradeModal(false);
          navigation.navigate('Subscription');
        }}
      >
        <Text style={styles.upgradeButtonText}>💳 Subir a Pro</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setShowUpgradeModal(false)}>
        <Text style={{ color: '#aaa', marginTop: 10 }}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#000',
    paddingBottom: 100,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderColor: '#D8A353',
    borderWidth: 2,
    marginTop:15,
    marginBottom:   0,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 0,
  },
  category: {
    color: '#D8A353',
    fontSize: 18,
    textAlign: 'center',
    marginTop:0,
  },
  infoBox: {
    width: '90%',
    backgroundColor: '#1B1B1B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
    padding: 10,
    marginBottom: 20,
    marginTop: 5,
  },
  infoText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 5,
  },
  bookScroll: {
    width: '90%',
    marginBottom: 10,
  },
  bookImage: {
    width: 100,
    height: 140,
    borderRadius: 8,
    borderColor: '#D8A353',
    borderWidth: 1,
    marginRight: 10,
    marginBottom: -5,
  },
  video: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
    marginTop: 10,
  },
  
  contactButton: {
    color: '#D8A353',
    fontSize: 14,
    textDecorationLine: 'underline',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenContainer: {
    width: '90%',
    height: '90%',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  label: {
    fontWeight: 'bold',
    color: '#D8A353',
    marginBottom: 5,
    marginTop:-15,
    fontSize: 16,
    textAlign: 'center',
  },
  contactContainer: {
    width: '90%',
    marginTop: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  
  rowButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
  },
  smallButton: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  
  fullButton: {
    backgroundColor: '#D8A353',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
  },
  
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  }, 
  disabledButton: {
    opacity: 0.4,
  },  
  upgradeModal: {
    backgroundColor: '#1B1B1B',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderColor: '#D8A353',
    borderWidth: 1,
    marginHorizontal: 30,
    zIndex: 1000,
    elevation: 20,
  },  
upgradeTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#D8A353',
  marginBottom: 10,
  textAlign: 'center',
},
upgradeText: {
  color: '#ccc',
  fontSize: 14,
  textAlign: 'center',
  marginBottom: 20,
},
upgradeButton: {
  backgroundColor: '#D8A353',
  paddingVertical: 10,
  paddingHorizontal: 25,
  borderRadius: 10,
},
upgradeButtonText: {
  color: '#000',
  fontWeight: 'bold',
},
});
