import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Linking, Modal, Animated } from 'react-native';
import { useUser } from '../contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { AntDesign } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native';
import { Video } from 'expo-av'; // ✅
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../src/firebase/firebaseConfig';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { saveSubscriptionHistory } from '../src/firebase/helpers/saveSubscriptionHistory';
import { Image as CachedImage } from 'react-native-expo-image-cache';
import Constants from 'expo-constants';

const isValidUrl = (url) => {
  return typeof url === 'string' && url.trim().startsWith('http');
};

export default function ProfileProScreen({ navigation, route }) {
  const { userData, setUserData } = useUser();
  const isExternal = !!route?.params?.viewedProfile;
  const profileData = isExternal ? route.params.viewedProfile : userData;
  if (
  !profileData ||
  !isValidUrl(profileData.profilePhoto) ||
  !Array.isArray(profileData.bookPhotos) ||
  profileData.bookPhotos.some((url) => !isValidUrl(url)) ||
  (profileData.profileVideo && !isValidUrl(profileData.profileVideo))
) {
  console.log('⛔ Protección temprana: datos aún incompletos. Bloqueando render.');
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <ActivityIndicator size="large" color="#D8A353" />
      <Text style={{ color: '#fff', marginTop: 10 }}>Esperando carga del perfil...</Text>
    </View>
  );
}

  console.log('🧪 CHECK profilePhoto:', profileData?.profilePhoto);
console.log('🧪 CHECK profileVideo:', profileData?.profileVideo);
console.log('🧪 CHECK bookPhotos:', profileData?.bookPhotos);

  // 🔐 Protección extra: si userData aún no está cargado, evitar render anticipado
if (!isExternal && (!userData || !userData.profilePhoto || !userData.bookPhotos)) {
  console.log('⏳ Esperando userData completamente cargado...');
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <ActivityIndicator size="large" color="#D8A353" />
      <Text style={{ color: '#fff', marginTop: 10 }}>Cargando perfil Pro...</Text>
    </View>
  );
}
  const [selectedImage, setSelectedImage] = useState(undefined);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
const [loading, setLoading] = useState(true);
const [canRenderVideo, setCanRenderVideo] = useState(false);
const handleProfilePhotoPress = () => {
  console.log('📸 Foto de perfil tocada');
};

useEffect(() => {
  const loadProfilePro = async () => {
    if (isExternal) {
      setLoading(false);
      return;
    }

    try {
      const json = await AsyncStorage.getItem('userProfilePro');
      const parsed = json ? JSON.parse(json) : null;

      if (parsed?.membershipType === 'pro') {
        console.log("✅ userData seteado como PRO:", parsed);
         console.log("🧪 DEBUG URI profilePhoto:", parsed?.profilePhoto);
      console.log("🧪 DEBUG URI profileVideo:", parsed?.profileVideo);
      console.log("🧪 DEBUG URI bookPhotos:", parsed?.bookPhotos);
        setUserData(parsed);
        setTimeout(() => {
  setCanRenderVideo(true); // Activar renderizado del video con un leve retraso
}, 500);

console.log("✅ FOTO URL:", parsed?.profilePhoto);
console.log("✅ BOOK:", parsed?.bookPhotos);

        console.log("🧾 Enviando historial a Firestore...");
        await saveSubscriptionHistory({
          email: parsed.email,
          planType: 'pro',
          paymentMethod: 'simulado',
          durationMonths: 1,
          status: 'active',
        });
      } else {
        console.warn('⚠️ Perfil cargado no es Pro. Ignorado.');
      }
    } catch (e) {
      console.log('❌ Error al cargar perfil Pro:', e);
    } finally {
      setLoading(false);
    }
  };

  loadProfilePro();
}, []);
if (
  loading ||
  !profileData ||
  !isValidUrl(profileData.profilePhoto) ||
  !Array.isArray(profileData.bookPhotos) ||
  profileData.bookPhotos.length === 0 ||
  profileData.bookPhotos.some((url) => !isValidUrl(url)) ||
  (profileData.profileVideo && !isValidUrl(profileData.profileVideo))
) {
  console.log('⏳ Perfil incompleto o URLs inválidas. Evitando render...');
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <ActivityIndicator size="large" color="#D8A353" />
      <Text style={{ color: '#fff', marginTop: 10 }}>Cargando perfil Pro...</Text>
    </View>
  );
}


// 🔒 Asegura que solo se rendericen imágenes válidas
const safeBookPhotos = Array.isArray(profileData.bookPhotos)
  ? profileData.bookPhotos.filter((uri) => uri && uri.startsWith('http'))
  : [];
// Protección extra para evitar errores si userData aún no se ha cargado
if (!isExternal && (!userData || !userData.profilePhoto)) {
  console.log('⏳ Esperando que userData se cargue completamente...');
  return (
    <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#D8A353" />
      <Text style={{ color: '#fff', marginTop: 10 }}>Cargando perfil...</Text>
    </View>
  );
}

return (
  <View style={styles.screen}>
   {isExternal && (
  <View style={{ position: 'absolute', top: 45, left: 20, zIndex: 999 }}>
    <TouchableOpacity onPress={() => navigation.goBack()}>
      <Ionicons name="arrow-back" size={30} color="#fff" />
    </TouchableOpacity>
  </View>
)}

    <ScrollView contentContainerStyle={styles.container} removeClippedSubviews={true}>

      {/* Botón editar */}
      {!isExternal && (
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <AntDesign name="edit" size={24} color="#D8A353" />
        </TouchableOpacity>
      )}

      {profileData.membershipType === 'pro' && (
        <Text style={styles.proBadge}>Miembro Pro 🏆</Text>
      )}

{isValidUrl(profileData?.profilePhoto) ? (
  <TouchableOpacity onPress={handleProfilePhotoPress}>
<CachedImage
  uri={profileData.profilePhoto.trim()}
  style={styles.profileImage}
  resizeMode="cover"
/>
  </TouchableOpacity>
) : (
  <View
    style={[
      styles.profileImage,
      {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#222',
      },
    ]}
  >
    <Ionicons name="person-circle-outline" size={80} color="#D8A353" />
  </View>
)}
      <Text style={styles.name}>{profileData.name}</Text>

      {profileData.category && (
        <Text style={styles.category}>
          {Array.isArray(profileData.category)
            ? profileData.category.join(', ')
            : profileData.category}
        </Text>
      )}

   {profileData.email && (
  <TouchableOpacity
    style={styles.contactItem}
    onPress={() => Linking.openURL(`mailto:${profileData.email}`)}
  >
    <Ionicons name="mail" size={20} color="#D8A353" />
    <Text numberOfLines={1} style={styles.contactText}>
      {profileData.email}
    </Text>
  </TouchableOpacity>
)}

      {!isExternal && (
  <View style={styles.contactItem}>
    <Ionicons name="call" size={20} color="#D8A353" />
    <Text numberOfLines={1} style={styles.contactText}>
      {profileData.phone || 'No disponible'}
    </Text>
  </View>
)}
{profileData.instagram && (
  <TouchableOpacity
    style={styles.contactItem}
    onPress={() => {
      const username = profileData.instagram.replace('@', '').trim();
      Linking.openURL(`https://instagram.com/${username}`);
    }}
  >
    <MaterialCommunityIcons name="instagram" size={20} color="#E4405F" />
    <Text numberOfLines={1} style={styles.contactText}>
      {profileData.instagram}
    </Text>
  </TouchableOpacity>
)}
{isExternal && (
  <TouchableOpacity
    style={styles.contactItem}
    onPress={() => {
      setTimeout(async () => {
        try {
          const json = await AsyncStorage.getItem('professionalMessages');
          const all = json ? JSON.parse(json) : [];

          const existing = all.find(
            (msg) =>
              (msg.from === userData.email && msg.to === profileData.email) ||
              (msg.from === profileData.email && msg.to === userData.email)
          );

          if (existing) {
            navigation.navigate('MessageDetail', {
              contactEmail: profileData.email,
              profileAttachment: profileData,
            });
          } else {
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
        } catch (e) {
          console.warn('❌ Error al crear o abrir conversación interna:', e);
        }
      }, 0);
    }}
  >
    <Text style={{ fontSize: 16, marginRight: 5 }}>💬</Text>
    <Text style={[styles.contactText, { color: '#CCCCCC' }]}>
      Mensaje interno
    </Text>
  </TouchableOpacity>
)}

      <View style={styles.infoBox}>
        {profileData.sexo && <Text style={styles.infoText}>Sexo: {profileData.sexo}</Text>}
        {profileData.age && <Text style={styles.infoText}>Edad: {profileData.age}</Text>}
        {profileData.estatura && <Text style={styles.infoText}>Estatura: {profileData.estatura} cm</Text>}
        {profileData.skinColor && <Text style={styles.infoText}>Color de piel: {profileData.skinColor}</Text>}
        {profileData.eyeColor && <Text style={styles.infoText}>Color de ojos: {profileData.eyeColor}</Text>}
        {profileData.hairColor && <Text style={styles.infoText}>Color de cabello: {profileData.hairColor}</Text>}
        {profileData.ethnicity && <Text style={styles.infoText}>Etnia: {profileData.ethnicity}</Text>}
        {profileData.tattoos && <Text style={styles.infoText}>Tatuajes: {profileData.tattoos}</Text>}
        {profileData.tattoosLocation && <Text style={styles.infoText}>Ubicación tatuajes: {profileData.tattoosLocation}</Text>}
        {profileData.piercings && <Text style={styles.infoText}>Piercings: {profileData.piercings}</Text>}
        {profileData.piercingsLocation && <Text style={styles.infoText}>Ubicación piercings: {profileData.piercingsLocation}</Text>}
        {profileData.shirtSize && <Text style={styles.infoText}>Talla de camisa: {profileData.shirtSize}</Text>}
        {profileData.pantsSize && <Text style={styles.infoText}>Talla de pantalón: {profileData.pantsSize}</Text>}
        {profileData.shoeSize && <Text style={styles.infoText}>Talla de zapatos: {profileData.shoeSize}</Text>}
        {profileData.country && <Text style={styles.infoText}>País: {profileData.country}</Text>}
        {profileData.ciudad && <Text style={styles.infoText}>Ciudad: {profileData.ciudad}</Text>}
        {profileData.address && <Text style={styles.infoText}>Dirección: {profileData.address}</Text>}
        {profileData.comuna && <Text style={styles.infoText}>Comuna: {profileData.comuna}</Text>}
        {profileData.region && <Text style={styles.infoText}>Región: {profileData.region}</Text>}
      </View>
{safeBookPhotos.length > 0 && (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bookScroll}>
{profileData?.bookPhotos?.filter(isValidUrl).map((uri, index) => (
  <View key={index} style={styles.bookImageWrapper}>
    <TouchableOpacity onPress={() => setSelectedImage(uri)}>
 {isValidUrl(uri) ? (
<CachedImage
  uri={uri.trim()}
  style={styles.bookImage}
  resizeMode="cover"
/>
) : (
  <View style={[styles.bookImage, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }]}>
    <Ionicons name="image-outline" size={24} color="#555" />
  </View>
)}
    </TouchableOpacity>
  </View>
))}
  </ScrollView>
)}

{selectedImage &&
  typeof selectedImage === 'string' &&
  selectedImage.trim().startsWith('http') ? (
  <Modal
    visible={true}
    transparent={true}
    animationType="fade"
    onRequestClose={() => setSelectedImage(undefined)}
  >
    <View style={styles.modalOverlay}>
      <TouchableOpacity
        style={styles.fullscreenContainer}
        onPress={() => setSelectedImage(undefined)}
      >
        {selectedImage &&
        typeof selectedImage === 'string' &&
        selectedImage.trim().startsWith('http') ? (
          <>
          
       <CachedImage
  uri={selectedImage.trim()}
  style={styles.fullscreenImage}
  resizeMode="contain"
/>
          </>
        ) : null}
      </TouchableOpacity>
    </View>
  </Modal>
) : null}

{Constants.appOwnership !== 'expo' && isValidUrl(profileData?.profileVideo) ? (
  <View
    style={{
      width: '90%',
      height: 200,
      backgroundColor: '#111',
      borderRadius: 10,
      borderWidth: 0.5,
      borderColor: '#D8A353',
      marginVertical: 15,
      overflow: 'hidden',
    }}
  >
    <Video
      source={{ uri: profileData.profileVideo.trim() }}
      useNativeControls
      resizeMode="contain"
      style={{ width: '100%', height: '100%' }}
      onLoadStart={() => console.log('▶️ Cargando video:', profileData.profileVideo)}
      onError={(e) => {
        console.log('❌ Error al cargar el video:', e);
        alert('No se pudo cargar el video. Intenta editar tu perfil.');
      }}
    />
  </View>
) : (
  <Text style={{ color: '#aaa', textAlign: 'center' }}>
    {Constants.appOwnership === 'expo'
      ? 'El video no se muestra en Expo Go.'
      : 'No hay video de presentación disponible.'}
  </Text>
)}

    </ScrollView>
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
    paddingBottom: 150,
    paddingTop: 35,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderColor: '#D8A353',
    borderWidth: 0.5, // Reducido a 0.5
    marginBottom: 0,
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
    marginTop: 0,
  },
  contactContainer: {
    width: '90%',
    marginBottom: 20,
    marginTop: 5,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B1B1B',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    // Sin borderColor ni borderWidth
    marginVertical: 5,
    width: 360,
  },
  contactText: {
    color: '#CCCCCC',
    marginLeft: 10,
    fontSize: 14,
    flexShrink: 1,
  },
  infoBox: {
    backgroundColor: '#1B1B1B',
    borderRadius: 10,
    // Sin borderWidth ni borderColor
    padding: 10,
    marginTop: 7,
    marginBottom: 20,
    width: 360,
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
  bookImageWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  bookImage: {
    width: 100,
    height: 140,
    borderRadius: 8,
    borderColor: '#D8A353',
    borderWidth: 0.5, // Reducido a 0.5
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenContainer: {
    width: '90%',
    height: '80%',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  video: {
    width: '90%',
    height: 200,
    borderRadius: 10,
    borderWidth: 0.5, // Reducido a 0.5
    borderColor: '#D8A353',
    marginVertical: 15,
  },
  contactButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginBottom: 8,
    borderRadius: 10,
    alignItems: 'center',
    width: 340,
  },
  contactButtonText: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  editButton: {
    position: 'absolute',
    top: 45,
    right: 30,
    zIndex: 10,
  },
  proBadge: {
    color: '#D8A353',
    fontSize: 16,
    marginTop: 0,
    marginBottom: 5,
    fontWeight: '600',
    textAlign: 'center',
  },
messageButton: {
  backgroundColor: '#1B1B1B',
  borderWidth: 1,
  borderRadius: 10,
  paddingVertical: 10,
  paddingHorizontal: 25,
  marginTop: 5,
  marginBottom: 10,
  alignItems: 'center',
  alignSelf: 'center',
  width: 340,
},
messageButtonText: {
  color: '#CCCCCC',
  fontSize: 14,
  fontWeight: 'bold',
},

});