import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Video } from 'expo-av'; // ✅
import { BlurView } from 'expo-blur';
import { Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import BackButton from '../components/BackButton';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import { getConversationFromFirestore } from '../src/firebase/helpers/getConversationFromFirestore';

export default function ProfileDetailScreen({ route }) {

  const { profileData: profile } = route.params || {};
  if (!profile) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <Text style={{ color: '#D8A353', textAlign: 'center' }}>
        ❌ Error: No se pudo cargar el perfil. Vuelve atrás e intenta de nuevo.
      </Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
        <Text style={{ color: '#fff', textDecorationLine: 'underline' }}>Volver</Text>
      </TouchableOpacity>
    </View>
  );
}

const navigation = useNavigation();
const { userData } = useUser();
console.log('🧠 USERDATA EN DETALLE:', userData);

  const isElite = profile?.membershipType === 'elite';
const isPro = profile?.membershipType === 'pro';
const isFree = profile?.membershipType === 'free';

const viewerType = userData?.membershipType;
const isBlocked = false; // Ya no se bloquea ningún perfil Free

  const [selectedImage, setSelectedImage] = useState(null);
  const [isGalleryImage, setIsGalleryImage] = useState(false);
  const [isZoomedProfile, setIsZoomedProfile] = useState(false);
const scaleAnim = useRef(new Animated.Value(0.5)).current;
const opacityAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  const loadRemoteConversation = async () => {
    const remote = await getConversationFromFirestore(userData.email, profile.email);
    if (remote) {
      setConversation(remote);
      const sentByMe = remote.messages?.filter(m => m.sender === userData.email) || [];
      setMyMessageCount(sentByMe.length);
    }
  };

  loadRemoteConversation();
}, []);

useEffect(() => {
  if (selectedImage) {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  } else {
    scaleAnim.setValue(0.5);
    opacityAnim.setValue(0);
  }
}, [selectedImage]);

if (profile.membershipType === 'elite' && profile.webLink) {
  console.log('👉 LINK EN PERFIL:', profile.webLink);
}
console.log('📦 Categorías cargadas:', profile.category);

  return (
    <View style={styles.container}>
      <BackButton color="#fff" top={45} left={20} />
<ScrollView
  style={{ backgroundColor: '#000' }}
  contentContainerStyle={{
    paddingBottom: 150,
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingTop: 35,
  }}
  showsVerticalScrollIndicator={false}
>
  {isElite ? (
    <View testID="elite-profile" style={styles.inner}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Perfil de Agencia</Text>
        <Text style={styles.subtitle}>👑 Cuenta Elite</Text>
      </View>

      <View style={styles.logoContainer}>
       <TouchableOpacity onPress={() => {
  setIsGalleryImage(false); // ✅ esto hace que se vea redonda
  setSelectedImage(profile.profilePhoto);
}}>
          {profile.profilePhoto ? (
            <Image source={{ uri: profile.profilePhoto }} style={styles.logo} />
          ) : (
            <View style={[styles.logo, styles.iconFallback]}>
              <Ionicons name="image-outline" size={40} color="#D8A353" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {profile.companyType && (
        <View style={styles.categoryBadge}>
          <Feather name="briefcase" size={14} color="#D8A353" style={{ marginRight: 6 }} />
          <Text style={styles.categoryText}>{profile.companyType}</Text>
        </View>
      )}

      {profile.agencyName && <Text style={styles.agencyName}>{profile.agencyName}</Text>}
      {profile.representative && <Text style={styles.representative}>{profile.representative}</Text>}

      {(profile.city || profile.region || profile.comuna) && (
        <Text style={styles.location}>
          {profile.city || 'Ciudad'}, {profile.region || 'Región'}
          {profile.comuna ? `, ${profile.comuna}` : ''}
        </Text>
      )}

      <Text style={styles.sectionTitle}>Contacto</Text>
      <View style={styles.contactBoxCentered}>
        {profile.email && (
          <TouchableOpacity style={styles.contactCard} onPress={() => Linking.openURL(`mailto:${profile.email}`)}>
            <Ionicons name="mail" size={18} color="#D8A353" style={styles.cardIcon} />
            <Text style={styles.cardText}>{profile.email}</Text>
          </TouchableOpacity>
        )}
        {profile.phone && (
          <TouchableOpacity style={styles.contactCard} onPress={() => Linking.openURL(`tel:${profile.phone}`)}>
            <Ionicons name="call" size={18} color="#D8A353" style={styles.cardIcon} />
            <Text style={styles.cardText}>{profile.phone}</Text>
          </TouchableOpacity>
        )}
        {profile.address && (
          <View style={styles.contactCard}>
            <Ionicons name="location" size={18} color="#D8A353" style={styles.cardIcon} />
            <Text style={styles.cardText}>{profile.address}</Text>
          </View>
        )}
        {profile.instagram && (
          <TouchableOpacity
            style={styles.contactCard}
            onPress={() => Linking.openURL(`https://instagram.com/${profile.instagram.replace('@', '')}`)}
          >
            <Ionicons name="logo-instagram" size={18} color="#D8A353" style={styles.cardIcon} />
            <Text style={styles.cardText}>{profile.instagram}</Text>
          </TouchableOpacity>
        )}
        {profile.whatsapp && (
          <TouchableOpacity
            style={styles.contactCard}
            onPress={() => Linking.openURL(`https://wa.me/${profile.whatsapp.replace(/\D/g, '')}`)}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#D8A353" style={styles.cardIcon} />
            <Text style={styles.cardText}>{profile.whatsapp}</Text>
          </TouchableOpacity>
        )}
        {profile.webLink?.trim() !== '' && (
          <TouchableOpacity
            style={styles.contactCard}
            onPress={() => {
              const url = profile.webLink.startsWith('http') ? profile.webLink : `https://${profile.webLink}`;
              Linking.openURL(url);
            }}
          >
            <Ionicons name="link-outline" size={18} color="#D8A353" style={styles.cardIcon} />
            <Text style={[styles.cardText, { textDecorationLine: 'underline' }]} numberOfLines={1}>
              {profile.webLink}
            </Text>
          </TouchableOpacity>
        )}
      {(() => {
  const tipo = userData?.membershipType;
  console.warn('💡 Tipo de usuario activo:', tipo); // Verifica en consola

  if (tipo === 'free' || tipo === 'pro') {
    return (
      <TouchableOpacity
        style={[styles.contactCard, { marginTop: 5, backgroundColor: '#D8A353' }]}
        onPress={() =>
          navigation.navigate('Messages', {
            recipient: profile.agencyName || profile.name,
            email: profile.email,
          })
        }
      >
        <Ionicons name="chatbox-ellipses-outline" size={18} color="#000" style={styles.cardIcon} />
        <Text style={[styles.cardText, { color: '#000', fontWeight: 'bold' }]}> Contactar Agencia</Text>
      </TouchableOpacity>
    );
  }

  return null;
})()}

      </View>

      <Text style={styles.sectionTitle}>Descripción</Text>
      <View style={styles.descriptionBox}>
        <Text style={styles.descriptionText}>{profile.description}</Text>
      </View>

      <Text style={styles.sectionTitle}>Galería de trabajos</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollHorizontal}>
        {profile.logos?.map((uri, index) => (
          <TouchableOpacity
  key={index}
  style={styles.portfolioCard}
  onPress={() => {
    setIsGalleryImage(true); // ✅ ESTO ES CLAVE
    setSelectedImage(uri);
  }}
>
            <Image source={{ uri }} style={styles.portfolioImage} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {profile.profileVideo && (
        <View style={styles.videoSection}>
          <Text style={styles.sectionTitle}>🎥Presentación audiovisual</Text>
          <View style={styles.videoPreviewContainer}>
            <Video
              source={{ uri: profile.profileVideo }}
              useNativeControls
              resizeMode="contain"
              style={styles.videoPreview}
              onError={(e) => {
                console.log('❌ Error al cargar el video:', e);
                alert('No se pudo cargar el video institucional.');
              }}
            />
          </View>
        </View>
      )}
    
    </View>
  ) : isPro ? (
  <View testID="pro-profile" style={styles.inner}>
  <View style={styles.headerContainer}>
    <Text style={styles.title}>Perfil Profesional</Text>
    <Text style={styles.subtitle}>🏆 Cuenta Pro</Text>
  </View>

 {profile.profilePhoto && (
 <TouchableOpacity onPress={() => {
  setIsGalleryImage(false);
  setSelectedImage(profile.profilePhoto);
}} style={{ marginTop: 10 }}>
    <Image
      source={{ uri: profile.profilePhoto }}
      style={[styles.logo, { width: 120, height: 120, borderRadius: 65 }]}
    />
  </TouchableOpacity>
)}


  {profile.name && <Text style={styles.agencyName}>{profile.name}</Text>}

  {profile.category && (
   <Text style={[styles.categoryText, { marginBottom: 12 }]}>

      {Array.isArray(profile.category) ? profile.category.join(', ') : profile.category}
    </Text>
  )}

  <View style={styles.contactBoxCentered}>
    {profile.email && (
      <TouchableOpacity
        style={styles.contactCard}
        onPress={() => Linking.openURL(`mailto:${profile.email}`)}
      >
        <Ionicons name="mail" size={18} color="#D8A353" style={styles.cardIcon} />
        <Text style={styles.cardText}>{profile.email}</Text>
      </TouchableOpacity>
    )}

    {profile.instagram && (
      <TouchableOpacity
        style={styles.contactCard}
        onPress={() =>
          Linking.openURL(`https://instagram.com/${profile.instagram.replace('@', '')}`)
        }
      >
        <Ionicons name="logo-instagram" size={18} color="#E4405F" style={styles.cardIcon} />
        <Text style={styles.cardText}>{profile.instagram}</Text>
      </TouchableOpacity>
    )}

   {/* 🔒 Botón de mensajería interna */}
<TouchableOpacity
  style={[styles.contactCard, { backgroundColor: '#D8A353', marginTop: 12 }]}
  onPress={() =>
    navigation.navigate('Messages', {
      recipient: profile.name,
      email: profile.email,
    })
  }
>
  <Ionicons name="chatbox-ellipses-outline" size={18} color="#FFF" style={styles.cardIcon} />
  <Text style={[styles.cardText, { color: '#000', fontWeight: 'bold' }]}>Mensaje interno</Text>
</TouchableOpacity>


  </View>

 <View style={[styles.descriptionBox, { marginTop: 15, minWidth: '99%' }]}>
    {profile.sexo && <Text style={styles.descriptionText}>Sexo: {profile.sexo}</Text>}
    {profile.age && <Text style={styles.descriptionText}>Edad: {profile.age}</Text>}
    {profile.estatura && <Text style={styles.descriptionText}>Estatura: {profile.estatura} cm</Text>}
    {profile.skinColor && <Text style={styles.descriptionText}>Color de piel: {profile.skinColor}</Text>}
    {profile.eyeColor && <Text style={styles.descriptionText}>Color de ojos: {profile.eyeColor}</Text>}
    {profile.hairColor && <Text style={styles.descriptionText}>Color de cabello: {profile.hairColor}</Text>}
    {profile.ethnicity && <Text style={styles.descriptionText}>Etnia: {profile.ethnicity}</Text>}
    {profile.tattoos && <Text style={styles.descriptionText}>Tatuajes: {profile.tattoos}</Text>}
    {profile.tattoosLocation && <Text style={styles.descriptionText}>Ubicación tatuajes: {profile.tattoosLocation}</Text>}
    {profile.piercings && <Text style={styles.descriptionText}>Piercings: {profile.piercings}</Text>}
    {profile.piercingsLocation && <Text style={styles.descriptionText}>Ubicación piercings: {profile.piercingsLocation}</Text>}
    {profile.shirtSize && <Text style={styles.descriptionText}>Talla de camisa: {profile.shirtSize}</Text>}
    {profile.pantsSize && <Text style={styles.descriptionText}>Talla de pantalón: {profile.pantsSize}</Text>}
    {profile.shoeSize && <Text style={styles.descriptionText}>Talla de zapatos: {profile.shoeSize}</Text>}
    {profile.ciudad && <Text style={styles.descriptionText}>Ciudad: {profile.ciudad}</Text>}
    {profile.comuna && <Text style={styles.descriptionText}>Comuna: {profile.comuna}</Text>}
    {profile.region && <Text style={styles.descriptionText}>Región: {profile.region}</Text>}
  </View>

  {profile.bookPhotos && profile.bookPhotos.length > 0 && (
    <>
      <Text style={styles.sectionTitle}>Galería</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollHorizontal}>
{profile.bookPhotos.map((uri, index) => (
  <TouchableOpacity
    key={index}
    style={styles.portfolioCard}
    onPress={() => {
  if (uri) {
    setIsGalleryImage(true);
    setSelectedImage(uri);
  }
}}
  >
    <Image source={{ uri }} style={styles.portfolioImage} />
  </TouchableOpacity>
))}

      </ScrollView>
    </>
  )}

  {profile.profileVideo && (
    <View style={styles.videoSection}>
      <Text style={styles.sectionTitle}>🎥 Video de presentación</Text>
      <View style={styles.videoPreviewContainer}>
        <Video
          source={{ uri: profile.profileVideo }}
          useNativeControls
          resizeMode="contain"
          style={styles.videoPreview}
          onError={(e) => {
            console.log('❌ Error al cargar el video:', e);
            alert('No se pudo cargar el video de presentación.');
          }}
        />
      </View>
    </View>
  )}
</View>

            ) : isFree ? (

          <View style={styles.inner}>
            <Text style={[styles.title, { marginTop: 20 }]}>Perfil Free 🎬</Text>

            {profile.profilePhoto ? (
              <TouchableOpacity
                onPress={() => {
                  setIsGalleryImage(false);
                  setSelectedImage(profile.profilePhoto);
                }}
                 style={{ marginTop: 30 }} 
              >
                <Image source={{ uri: profile.profilePhoto }} style={styles.logo} />
              </TouchableOpacity>
            ) : (
              <View style={styles.noPhoto}>
                <Text style={styles.noPhotoText}>Sin foto de perfil</Text>
              </View>
            )}

            <Text style={[styles.agencyName, { marginTop: 20 }]}>{profile.name}</Text>

      {profile.category && (
  <Text style={{ color: '#D8A353', fontSize: 18, marginTop: 10, fontWeight: 'bold' }}>
    Categorías: {Array.isArray(profile.category) ? profile.category.join(', ') : profile.category}
  </Text>
)}
    {profile.edad && (
      <View style={styles.infoBox}>
        <Text style={styles.label}>Edad:</Text>
        <Text style={styles.text}>{profile.edad}</Text>
      </View>
    )}

    {profile.sexo && (
      <View style={styles.infoBox}>
        <Text style={styles.label}>Sexo:</Text>
        <Text style={styles.text}>{profile.sexo}</Text>
      </View>
    )}

{/* 🔒 Botón de mensajería interna */}
<TouchableOpacity
  style={[styles.contactCard, { backgroundColor: '#D8A353', marginTop: 12 }]}
  onPress={() =>
    navigation.navigate('Messages', {
      recipient: profile.name,
      email: profile.email,
    })
  }
>
  <Ionicons name="chatbox-ellipses-outline" size={18} color="#FFF" style={styles.cardIcon} />
  <Text style={[styles.cardText, { color: '#000', fontWeight: 'bold' }]}>Mensaje interno</Text>
</TouchableOpacity>

            {profile.bookPhotos?.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Galería</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollHorizontal}>
                  {profile.bookPhotos.slice(0, 3).map((uri, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.portfolioCard}
                      onPress={() => {
                        setIsGalleryImage(true);
                        setSelectedImage(uri);
                      }}
                    >
                      <Image source={{ uri }} style={styles.portfolioImage} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        ) : null}
      </ScrollView>
      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseArea}
            activeOpacity={1}
            onPressOut={() => setSelectedImage(null)}
          />
          <BlurView intensity={100} tint="dark" style={styles.modalBlur}>
            <Animated.Image
              source={{ uri: selectedImage }}
              resizeMode="contain"
              style={[
                isGalleryImage ? styles.expandedProfileImage : styles.expandedProfileImageRounded,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                },
              ]}
            />
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  inner: {
    width: '100%',
    alignItems: 'center',
  },
  headerContainer: {
    marginTop: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#D8A353',
    fontSize: 20,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  subtitle: {
    color: '#D8A353',
    fontSize: 16,
    marginTop: 0,
    marginBottom: -15,
    fontWeight: '600',
  },
  profileSection: {
    alignItems: 'center',
    marginVertical: 0,
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  logoZoom: {
    width: 165,
    height: 165,
    borderRadius: 82.5,
  },
  iconFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1B1B1B',
  },
  agencyName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 0,
  },
  representative: {
    color: '#CCCCCC',
    fontSize: 14,
    marginTop: 0,
  },
  location: {
    color: '#888888',
    fontSize: 13,
    marginTop: 0,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#1B1B1B',
    borderWidth: 0.5,
    borderColor: '#D8A353',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
  },
  categoryText: {
    color: '#D8A353',
    fontSize: 14,
  },
  sectionTitle: {
    color: '#D8A353',
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 14,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  contactBoxCentered: {
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  contactCard: {
    backgroundColor: '#1B1B1B',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    minWidth: '99%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    marginRight: 10,
  },
  cardText: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  descriptionBox: {
    backgroundColor: '#1B1B1B',
    borderRadius: 10,
    padding: 16,
  },
  descriptionText: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'justify',
  },
  scrollHorizontal: {
    marginVertical: 10,
    marginLeft: -10, // MÁS A LA IZQUIERDA
    width: '100%',
  },
  portfolioCard: {
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1B1B1B',
    borderWidth: 0.5,
    borderColor: '#D8A353',
  },
  portfolioImage: {
    width: 110, // MÁS GRANDE
    height: 150,
    borderRadius: 8,
  },
  videoSection: {
    marginVertical: 20,
    width: '100%',
    alignItems: 'center',
  },
  videoPreviewContainer: {
    width: '100%',
    backgroundColor: '#1B1B1B',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#D8A353',
    padding: 0,
    alignItems: 'center',
  },
  videoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: '#000',
  },
 logoContainer: {
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'transparent', // sin fondo
},
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  justifyContent: 'center',
  alignItems: 'center',
},

modalBlur: {
  width: '100%',
  height: '100%',
  justifyContent: 'center',
  alignItems: 'center',
},

expandedProfileImage: {
  width: '100%',
  height: '100%',
  borderRadius: 0,
  resizeMode: 'contain',
  backgroundColor: '#000',
},
modalCloseArea: {
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 1,
},
expandedProfileImageRounded: {
  width: 250,
  height: 250,
  borderRadius: 125,
  resizeMode: 'contain',
  backgroundColor: '#000',
},
infoBox: {
  backgroundColor: '#1A1A1A',
  borderRadius: 10,
  padding: 10,
  marginTop: 12,
  width: '100%',
  alignSelf: 'center',
},
label: {
  color: '#D8A353',
  fontWeight: 'bold',
  fontSize: 12,
  marginBottom: 4,
},
text: {
  color: '#FFFFFF',
  fontSize: 16,
},
contactCard: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#1A1A1A',
  padding: 10,
  borderRadius: 10,
  marginTop: 10,
  alignSelf: 'center',
  width: '100%',
},
cardIcon: {
  marginRight: 12,
},

});