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
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { Ionicons, AntDesign, Feather } from '@expo/vector-icons';
import { Video } from 'expo-av'; // ✅
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { Alert } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../src/firebase/firebaseConfig';
import { saveSuggestionToFirestore } from '../src/firebase/helpers/saveSuggestionToFirestore';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { getProfileSuggestions } from '../src/firebase/helpers/getProfileSuggestions';
import { saveSubscriptionHistory } from '../src/firebase/helpers/saveSubscriptionHistory';
import { Image as CachedImage } from 'react-native-expo-image-cache';

export default function ProfileEliteScreen({ navigation, route }) {
  const { userData, setUserData } = useUser();
  const { viewedProfile } = route.params || {};
  const [profile, setProfile] = useState(viewedProfile || null);
  const [showModal, setShowModal] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const isExternal = !!route?.params?.viewedProfile;
  const profileData = isExternal ? route.params.viewedProfile : userData;
  const [selectedImage, setSelectedImage] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  const isOwnProfile = !viewedProfile;
const [profilePhotoUrl, setProfilePhotoUrl] = useState(null);

useEffect(() => {
  if (profile?.profilePhoto?.startsWith('http')) {
    setProfilePhotoUrl(profile.profilePhoto);
  }
}, [profile]);

  useEffect(() => {
    const checkIfShouldShowModal = async () => {
      const profileCompleted = await AsyncStorage.getItem('eliteProfileCompleted');
      if (
        userData?.membershipType === 'elite' &&
        userData?.hasPaid === false &&
        profileCompleted === 'true'
      ) {
        setShowPayModal(true);
      }
    };
    checkIfShouldShowModal();
  }, []);  

useEffect(() => {
  const loadProfile = async () => {
    if (!viewedProfile) {
      const localJson = await AsyncStorage.getItem('userProfileElite');
      const localProfile = localJson ? JSON.parse(localJson) : null;

      if (localProfile) {
        setProfile(localProfile);
      } else if (userData?.membershipType === 'elite') {
        setProfile(userData); // ← fallback si no hay perfil local pero sí userData
      } else {
        setProfile({});
      }

      const userJson = await AsyncStorage.getItem('userData');
      const user = userJson ? JSON.parse(userJson) : null;
      const paid = user?.hasPaid === true;
      setHasPaid(paid);
    }
  };
  loadProfile();
}, [userData]);
useEffect(() => {
  const checkProfilePhoto = async () => {
    const elite = await AsyncStorage.getItem('userProfileElite');
    const parsed = JSON.parse(elite);
    console.log('🖼️ Foto de perfil actual:', parsed?.profilePhoto);
  };
  checkProfilePhoto();
}, []);

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }
  const isBlocked = userData?.membershipType === 'elite' && userData?.hasPaid === false;
console.log("VIDEO EN PERFIL:", profile?.profileVideo ?? 'sin video');

  return (
    <View style={styles.container}>
      {isExternal && (
  <View style={{ position: 'absolute', top: 45, left: 20, zIndex: 999 }}>
    <TouchableOpacity onPress={() => navigation.goBack()}>
      <Ionicons name="arrow-back" size={30} color="#fff" />
    </TouchableOpacity>
  </View>
)}
      <ScrollView
  style={{ backgroundColor: '#000' }}
  contentContainerStyle={{
    paddingBottom: 150,
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingTop: 35,
    opacity: isBlocked ? 0.4 : 1,
  }}
  showsVerticalScrollIndicator={false}
>
  <View style={styles.inner}>
<View style={styles.headerTopElite}>
<View style={styles.leftHeader}>
  {profilePhotoUrl ? (
    <TouchableOpacity
      onPress={() => {
        setExpandedImage(profilePhotoUrl);
        setIsImageExpanded(true);
      }}
    >
  {profilePhotoUrl && profilePhotoUrl.startsWith('http') ? (
<CachedImage
  uri={profilePhotoUrl}
  style={styles.logo}
  onError={(e) => console.log('❌ Error al cargar la imagen:', e.nativeEvent?.error)}
/>
) : (
  <View style={[styles.logo, styles.iconFallback]}>
    <Ionicons name="image-outline" size={40} color="#D8A353" />
  </View>
)}

    </TouchableOpacity>
  ) : (
    <View style={[styles.logo, styles.iconFallback]}>
      <Ionicons name="image-outline" size={40} color="#D8A353" />
    </View>
  )}
</View>

{isOwnProfile && (
  <TouchableOpacity
    style={styles.editPillRight}
    onPress={() => navigation.navigate('EditProfileElite')}
  >
    <AntDesign name="edit" size={14} color="#000" />
  </TouchableOpacity>
)}

</View>

<Text style={styles.subtitleCentered}>👑 Cuenta Elite</Text>

{profile.companyType && (
  <View style={styles.categoryBadge}>
    <Feather name="briefcase" size={14} color="#D8A353" style={{ marginRight: 6 }} />
    <Text style={styles.categoryText}>{profile.companyType}</Text>
  </View>
)}

{profile.agencyName && <Text style={styles.agencyName}>{profile.agencyName}</Text>}

{profile.representative && profile.representative !== profile.agencyName && (
  <Text style={styles.representative}>{profile.representative}</Text>
)}

{(profile.city || profile.region || profile.comuna) && (
  <Text style={styles.location}>
    📍 {profile.city || ''}{profile.city && profile.region ? ', ' : ''}{profile.region || ''}
    {profile.comuna ? `, ${profile.comuna}` : ''}
  </Text>
)}

         <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 10, textAlign: 'left', alignSelf: 'flex-start' }]}>
  Contacto
</Text>

          <View style={styles.contactBoxCentered}>
         {profile.email && (
  isOwnProfile ? (
    <View style={styles.contactCard}>
      <Ionicons name="mail" size={18} color="#D8A353" style={styles.cardIcon} />
      <Text style={styles.cardText}>{profile.email}</Text>
    </View>
  ) : (
    <TouchableOpacity
      style={styles.contactCard}
      onPress={() => Linking.openURL(`mailto:${profile.email}`)}
    >
      <Ionicons name="mail" size={18} color="#D8A353" style={styles.cardIcon} />
      <Text style={[styles.cardText, { textDecorationLine: 'underline' }]}>
        {profile.email}
      </Text>
    </TouchableOpacity>
  )
)}
       {profile.phone && (
  isOwnProfile ? (
    <View style={styles.contactCard}>
      <Ionicons name="call" size={18} color="#D8A353" style={styles.cardIcon} />
      <Text style={styles.cardText}>{profile.phone}</Text>
    </View>
  ) : (
    <TouchableOpacity
      style={styles.contactCard}
      onPress={() => Linking.openURL(`tel:${profile.phone.replace(/\D/g, '')}`)}
    >
      <Ionicons name="call" size={18} color="#D8A353" style={styles.cardIcon} />
      <Text style={[styles.cardText, { textDecorationLine: 'underline' }]}>
        {profile.phone}
      </Text>
    </TouchableOpacity>
  )
)}
            {profile.address && (
              <View style={styles.contactCard}>
                <Ionicons name="location" size={18} color="#D8A353" style={styles.cardIcon} />
                <Text style={styles.cardText}>{profile.address}</Text>
              </View>
            )}
         {profile.instagram && (
  isOwnProfile ? (
    <View style={styles.contactCard}>
      <Ionicons name="logo-instagram" size={18} color="#D8A353" style={styles.cardIcon} />
      <Text style={styles.cardText}>{profile.instagram}</Text>
    </View>
  ) : (
   <TouchableOpacity
  style={styles.contactCard}
  onPress={() => {
    const instaUsername = profile.instagram.replace(/^@/, ''); // quita el @ si existe
    const url = `https://instagram.com/${instaUsername}`;
    Linking.openURL(url);
  }}
>
  <Ionicons name="logo-instagram" size={18} color="#D8A353" style={styles.cardIcon} />
  <Text style={[styles.cardText, { textDecorationLine: 'underline' }]}>
    {profile.instagram}
  </Text>
</TouchableOpacity>
  )
)}

{profile.whatsapp && (
  isOwnProfile ? (
    <View style={styles.contactCard}>
      <Ionicons name="logo-whatsapp" size={18} color="#D8A353" style={styles.cardIcon} />
      <Text style={styles.cardText}>{profile.whatsapp}</Text>
    </View>
  ) : (
    <TouchableOpacity
      style={styles.contactCard}
      onPress={() => {
        let cleanedNumber = profile.whatsapp.replace(/\D/g, ''); // limpia todo menos números

        // Si es un número local (8 dígitos y empieza con 9), agregamos el código país
        if (cleanedNumber.length === 8 && cleanedNumber.startsWith('9')) {
          cleanedNumber = '56' + cleanedNumber;
        }

        const whatsappURL = `https://wa.me/${cleanedNumber}`;
        Linking.openURL(whatsappURL);
      }}
    >
      <Ionicons name="logo-whatsapp" size={18} color="#D8A353" style={styles.cardIcon} />
      <Text style={[styles.cardText, { textDecorationLine: 'underline' }]}>
        {profile.whatsapp}
      </Text>
    </TouchableOpacity>
  )
)}

{profile.webLink && (
  isOwnProfile ? (
    <View style={styles.contactCard}>
      <Ionicons name="link-outline" size={18} color="#D8A353" style={styles.cardIcon} />
      <Text style={styles.cardText}>{profile.webLink}</Text>
    </View>
  ) : (
    <TouchableOpacity
      style={styles.contactCard}
      onPress={() => {
        let url = profile.webLink.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        Linking.openURL(url);
      }}
    >
      <Ionicons name="link-outline" size={18} color="#D8A353" style={styles.cardIcon} />
      <Text style={[styles.cardText, { textDecorationLine: 'underline' }]}>
        {profile.webLink}
      </Text>
    </TouchableOpacity>
  )
)}

{isExternal && profile.email && (
  <TouchableOpacity
    style={styles.contactCard}
    onPress={async () => {
      const json = await AsyncStorage.getItem('professionalMessages');
      const all = json ? JSON.parse(json) : [];

      const existing = all.find(
        (msg) =>
          (msg.from === userData.email && msg.to === profile.email) ||
          (msg.from === profile.email && msg.to === userData.email)
      );

    if (existing) {
  // Ya existe conversación → navegar directamente al detalle
  navigation.navigate('MessageDetail', {
    recipientEmail: profile.email,
    profileAttachment: profile,
  });
}else {
        // Crear nueva conversación con perfil adjunto
const newConversation = {
  id: Date.now().toString(),
  from: userData.email,
  to: profileData.email,
  messages: [], // <-- sin mensaje automático
  archived: false,
  profileAttachment: {
    name: profileData.name || profileData.agencyName || '',
    email: profileData.email || '',
    category: Array.isArray(profileData.category)
      ? profileData.category.join(', ')
      : profileData.category || '',
    membershipType: profileData.membershipType || '',
    profilePhoto: profileData.profilePhoto || null,
  },
};

        all.push(newConversation);
        const safe = (all || []).map((conv) => ({
  ...conv,
  messages: (conv.messages || []).slice(-50),
}));
await AsyncStorage.setItem('professionalMessages', JSON.stringify(safe));

    navigation.navigate('MessageDetail', {
 contactEmail: profileData.email,
  profileAttachment: profileData,
});
      }
    }}
  >
    <Text style={{ fontSize: 16, marginRight: 8 }}>💬</Text>
    <Text style={[styles.cardText, { color: '#CCCCCC' }]}>Mensaje interno</Text>
  </TouchableOpacity>
)}
          </View>
         <Text style={[styles.sectionTitle, { textAlign: 'left', alignSelf: 'flex-start', marginTop: 10 }]}>
  Descripción
</Text>

{profile.description ? (
  <View style={styles.contactCard}>
    <Text style={[styles.cardText, { flex: 1, flexWrap: 'wrap' }]}>
      {profile.description}
    </Text>
  </View>
) : null}

          <Text style={[styles.sectionTitle, { textAlign: 'left', alignSelf: 'flex-start' }]}>
  Galería de trabajos
</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollHorizontal}>
{profile.logos?.map((uri, index) => (
<TouchableOpacity
  key={index}
  style={styles.portfolioCard}
  onPress={() => {
    if (expandedImage === uri && isImageExpanded) {
      setExpandedImage(null);
      setIsImageExpanded(false);
    } else {
      setExpandedImage(uri);
      setIsImageExpanded(true);
    }
  }}
>
  {uri && uri.startsWith('http') ? (
    <CachedImage
      uri={uri}
      style={styles.portfolioImage}
    />
  ) : null}
</TouchableOpacity>
))}

          </ScrollView>
{profile.profileVideo && (
  <View style={styles.videoSection}>
    <Text style={styles.sectionTitle}>🎥Presentación audiovisual </Text>

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
      </ScrollView>

      {showPayModal && (
        <Modal
          transparent
          animationType="fade"
          visible={showPayModal}
          onRequestClose={() => setShowPayModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
            <View style={{ backgroundColor: '#1B1B1B', padding: 25, borderRadius: 12, borderWidth: 1, borderColor: '#D8A353', width: '100%', maxWidth: 360, alignItems: 'center' }}>
              <Text style={{ color: '#D8A353', fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
                👑 Activa tu cuenta Elite
              </Text>
              <Text style={{ color: '#CCCCCC', fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
                Esta función es exclusiva para cuentas Elite con plan activo. Puedes revisar los planes disponibles y activar tu cuenta ahora.
              </Text>
              <TouchableOpacity
  onPress={() => {
    setShowPayModal(false);
    navigation.navigate('Subscription'); // 👈 Esto mostrará primero los beneficios
  }}
                style={{ backgroundColor: '#D8A353', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, width: '100%', alignItems: 'center' }}
              >
                <Text style={{ color: '#000', fontWeight: 'bold' }}>💳 Ver Planes Elite</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowPayModal(false)} style={{ marginTop: 10 }}>
                <Text style={{ color: '#888', fontSize: 12 }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      {isImageExpanded && expandedImage && (
  <TouchableOpacity
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.95)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
    }}
    activeOpacity={1}
    onPress={() => {
      setIsImageExpanded(false);
      setExpandedImage(null);
    }}
  >
{expandedImage && expandedImage.startsWith('http') ? (
  <CachedImage
    uri={expandedImage}
    style={{
      width: '90%',
      height: '80%',
    }}
    resizeMode="contain"
  />
) : null}
  </TouchableOpacity>
)}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#F5F5F5',
    textAlign: 'center',
    marginTop: 100,
    fontSize: 14,
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

  logoContainer: {
    backgroundColor: '#1B1B1B',
    borderRadius: 75,
    padding: 1,
    borderWidth: 0.5,
    borderColor: '#D8A353',
  },
  logo: {
    width: 95,
    height: 95,
    borderRadius: 60,
    borderWidth: 0.5,
    borderColor: '#D8A353', 
    top: 30, 
  },
  agencyName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 0,
     marginLeft: 30,
  },
  representative: {
    color: '#CCCCCC',
    fontSize: 14,
    marginTop: 0,
    marginLeft:30, 
  },
  location: {
    color: '#888888',
    fontSize: 13,
    marginTop: 0,
    marginBottom: 10,
    fontStyle: 'italic',
     marginLeft: 30, 
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
  sectionTitle: {
    color: '#D8A353',
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 14,
  },
descriptionBox: {
  backgroundColor: '#1B1B1B',
  borderRadius: 10,
  paddingVertical: 16,
  paddingHorizontal: 20,
  width: '100%', // <-- esto hace que se expanda
  marginTop: 0,  // <-- reduce espacio hacia arriba
  marginBottom: 10,
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
    width: 120,
    height: 160,
    borderRadius: 8,
  },
 videoSection: {
  marginVertical: 20,
  width: '100%',
  alignItems: 'center', // ✅ para centrar todo el contenido dentro
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
categoryBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#1B1B1B',
  borderWidth: 0.5,
  borderColor: '#D8A353',
  borderRadius: 20,
  paddingHorizontal: 10,
  paddingVertical: 4,
  marginTop: 10,
  marginLeft: 30, // 👈 Aquí ajustas tú la posición exacta
},
  categoryText: {
    color: '#D8A353',
    fontSize: 12,
  },
  iconFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1B1B1B',
  },
  inner: {
  width: '100%',
  alignItems: 'center',
},
modalBackdrop: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.85)',
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 30,
},
modalBox: {
  backgroundColor: '#1B1B1B',
  padding: 25,
  borderRadius: 12,
  borderWidth: 0.5,
  borderColor: '#D8A353',
  width: '100%',
  maxWidth: 360,
  alignItems: 'center',
},
modalTitle: {
  fontSize: 20,
  color: '#D8A353',
  fontWeight: 'bold',
  marginBottom: 10,
  textAlign: 'center',
},
modalText: {
  color: '#CCCCCC',
  fontSize: 15,
  textAlign: 'center',
  marginBottom: 20,
},
modalButton: {
  backgroundColor: '#D8A353',
  paddingVertical: 10,
  paddingHorizontal: 30,
  borderRadius: 8,
},
modalButtonText: {
  color: '#000',
  fontWeight: 'bold',
  fontSize: 14,
},
profileSectionRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  width: '100%',
  marginBottom: 10,
},
logoContainerLeft: {
  marginLeft: 5,
  marginTop: 20,
  backgroundColor: '#1B1B1B',
  borderRadius: 75,
  padding: 1,
  borderWidth: 0.5,
  borderColor: '#D8A353',
},
profileInfoRight: {
  marginLeft: 15,
  justifyContent: 'center',
  flexShrink: 1,
},
headerRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  width: '100%',
  marginTop: 10,
  marginBottom: 5,
},
headerTop: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  marginBottom: 5,
  paddingHorizontal: 5,
},
leftHeader: {
  flexDirection: 'row',
  alignItems: 'center',
},
rightHeader: {
  alignItems: 'flex-end',
},
headerTopElite: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  width: '100%',
  marginBottom: 5,
  marginTop: -5,
  paddingHorizontal: 5,
},
editPillRight: {
  backgroundColor: '#D8A353',
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 20,
  marginTop: 15,
  marginRight: 0,
},
subtitleCentered: {
  color: '#D8A353',
  fontSize: 16,
  fontWeight: '600',
  textAlign: 'left',       // 👈 cambia de 'center' a 'left' para que funcione con marginLeft
  marginTop: -80,
  marginBottom: -5,
  marginLeft: 20,          // 👈 mueve el texto hacia la derecha manualmente
},

});