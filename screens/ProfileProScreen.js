import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Linking, Modal, Animated, Platform } from 'react-native';
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

// 👉 calcula un texto “quedan 2 días y 5h” o “vencido”
const remainingLabel = (iso) => {
  if (!iso) return '';
  const end = new Date(iso).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return 'vencido';
  const days = Math.floor(diff / (24*60*60*1000));
  const hours = Math.floor((diff % (24*60*60*1000)) / (60*60*1000));
  if (days > 0) return `${days} día${days===1?'':'s'}${hours>0?` y ${hours}h`:''}`;
  const mins = Math.max(1, Math.floor((diff % (60*60*1000)) / (60*1000)));
  return `${hours>0?`${hours}h `:''}${mins}m`;
};

// 🔎 Detector de categorías de recurso (coincidencias flexibles)
const RESOURCE_CATS = [
  'drone','auto','autos','vehículo','vehiculo','vestuario','maquill','maquillaje',
  'catering','herramienta','equipo','locación','locacion','recurso','resource',
  'transporte','vans','camiones','grúas','gruas','estudio fotográfico','coffee break','snacks'
];
const isResourceCategory = (cats = []) => {
  const list = (Array.isArray(cats) ? cats : [cats]).map(c => String(c || '').toLowerCase());
  return list.some(c => RESOURCE_CATS.some(k => c.includes(k)));
};

// 👉 Helper para parsear habilidades cuando vienen como string
const parseSkills = (txt = '') =>
  String(txt)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 20);

export default function ProfileProScreen({ navigation, route }) {
  const { userData, setUserData } = useUser();
  const isExternal = !!route?.params?.viewedProfile;
  const profileData = isExternal ? route.params.viewedProfile : userData;
  const [showText, setShowText] = useState(true);
  // 👇 Nuevo: computar si es recurso
  const isResource =
    (profileData?.profileKind === 'resource') ||
    isResourceCategory(profileData?.category);

  // 👇 Estado de destacado del propio PRO (solo dueño, no visitantes)
  const highlightedUntilISO = profileData?.highlightedUntil;
  const hasHighlightActive =
    !isExternal &&
    profileData?.membershipType === 'pro' &&
    profileData?.isHighlighted === true &&
    highlightedUntilISO &&
    new Date(highlightedUntilISO) > new Date();

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
    const interval = setInterval(() => {
      setShowText(prev => !prev);
    }, 1500);
    return () => clearInterval(interval);
  }, []);
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

  // 👇 Soporte para fotos de recurso (si existen), con fallback al book
  const resourcePhotos = Array.isArray(profileData.resourcePhotos)
    ? profileData.resourcePhotos.filter(isValidUrl)
    : [];
  const galleryPhotos = (isResource && resourcePhotos.length > 0)
    ? resourcePhotos
    : safeBookPhotos;

  // 👉 Reel (opcional): soporta `reelUrl` y fallback a `reelsUrl` por compatibilidad
  const reelLink = (profileData?.reelUrl || profileData?.reelsUrl || '').trim();
  const hasReel = isValidUrl(reelLink);

  // 👉 Habilidades: usa array `skills`, o parsea `skillsText`
  const skillsArray = Array.isArray(profileData?.skills) && profileData.skills.length
    ? profileData.skills
    : parseSkills(profileData?.skillsText || '');

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
  <View
    style={{
      position: 'absolute',
      top: Platform.select({ ios: 65, android: 45 }), // 👈 baja un poco en iOS
      left: 20,
      zIndex: 999,
    }}
  >
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
        {!isResource && !isExternal && (
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 150,
              right: 18,
              backgroundColor: showText ? '#4CAF50' : '#000',
              paddingVertical: 4,
              paddingHorizontal: 10,
              borderRadius: 20,
              flexDirection: 'row',
              alignItems: 'center',
              zIndex: 10,
              elevation: 6,
            }}
            onPress={() => navigation.navigate('AssistantIAProfile', { profile: profileData })}
          >
            <Ionicons
              name="sparkles-outline"
              size={14}
              color={showText ? '#fff' : '#00FF7F'}
              style={{ marginRight: 4 }}
            />
            <Text
              style={{
                color: showText ? '#fff' : '#00FF7F',
                fontWeight: 'bold',
                fontSize: 10,
              }}
            >
              {showText ? 'Analiza mi perfil' : 'IA'}
            </Text>
          </TouchableOpacity>
        )}

        {profileData.membershipType === 'pro' && (
          <Text style={styles.proBadge}>
            {isResource ? 'Recurso Pro 🧰' : 'Miembro Pro 🏆'}
          </Text>
        )}
{/* 🟡 Banner: “tu perfil está destacado” (solo dueño PRO y vigente) */}
{hasHighlightActive && (
  <View style={styles.highlightBanner}>
    <View style={{ flex: 1 }}>
      <Text style={styles.highlightTitle}>✨ Tu perfil está DESTACADO</Text>
      <Text style={styles.highlightSub}>
        Vence el {new Date(highlightedUntilISO).toLocaleDateString()} · Quedan {remainingLabel(highlightedUntilISO)}
      </Text>
    </View>

<TouchableOpacity
  onPress={() => navigation.navigate('PromoteProfile')}
  style={[styles.highlightBtn, { backgroundColor: '#D8A353' }]}
>
  <Text style={[styles.highlightBtnText, { color: '#000' }]}>Renovar</Text>
</TouchableOpacity>
  </View>
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

        {/* 🎬 Reel actoral (opcional) – mantiene compatibilidad con reelsUrl */}
        {hasReel && (
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => Linking.openURL(reelLink)}
          >
            <Ionicons name="film-outline" size={20} color="#D8A353" />
            <Text numberOfLines={1} style={styles.contactText}>
              Ver Reel actoral
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

        {/* 🔀 Bloque de información condicional por tipo */}
        <View style={styles.infoBox}>
          {isResource ? (
            <>
              {profileData.resourceTitle && <Text style={styles.infoText}>Título comercial: {profileData.resourceTitle}</Text>}
              {profileData.resourceType && <Text style={styles.infoText}>Tipo de recurso: {profileData.resourceType}</Text>}
              {profileData.resourceLocation && <Text style={styles.infoText}>Ubicación: {profileData.resourceLocation}</Text>}
              {profileData.resourcePriceFrom && <Text style={styles.infoText}>Precio desde: {profileData.resourcePriceFrom}</Text>}
              {profileData.resourcePriceTo && <Text style={styles.infoText}>Precio hasta: {profileData.resourcePriceTo}</Text>}
              {Array.isArray(profileData.resourceTags) && profileData.resourceTags.length > 0 && (
                <Text style={styles.infoText}>Tags: {profileData.resourceTags.join(', ')}</Text>
              )}
              {profileData.resourceDescription && (
                <Text style={styles.infoText}>Descripción: {profileData.resourceDescription}</Text>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </View>
          {/* 🧩 Talentos y habilidades (opcional) */}
      {skillsArray && skillsArray.length > 0 && (
  <View style={{ width: Platform.select({ ios: '95%', android: 360 }), marginTop: 8, marginBottom: 6 }}>
    <Text style={[styles.infoText, { marginBottom: 6, color: '#D8A353', fontWeight: '600' }]}>
      Talentos y habilidades
    </Text>
    <View style={styles.chips}>
      {skillsArray.map((s, i) => (
        <View key={`${s}-${i}`} style={styles.chip}>
          <Text style={styles.chipText}>{String(s)}</Text>
        </View>
      ))}
    </View>
  </View>
)}
        {/* Galería (usa resourcePhotos si es recurso y existen; si no, bookPhotos) */}
        {galleryPhotos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bookScroll}>
            {galleryPhotos.map((uri, index) => (
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
  <View style={styles.videoCard}>
    <Video
      source={{ uri: profileData.profileVideo.trim() }}
      style={styles.videoEl}
      resizeMode="cover"           // sin barras negras
      useNativeControls
      onLoadStart={() => console.log('▶️ Cargando video')}
      onError={(e) => {
        console.log('❌ Error video:', e);
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
    paddingTop: Platform.select({ ios: 60, android: 35 }),
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
    width: Platform.select({ ios: '95%', android: 360 }),
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
    marginBottom: 6,
    width: Platform.select({ ios: '95%', android: 360 }),
  },
  infoText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 5,
  },
  // 💠 Chips para habilidades (nuevo)
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#1f1f23', marginRight: 10, marginBottom: 8, },
  chipText: { color: '#fff', fontSize: 12 },

  bookScroll: {
  width: Platform.select({ ios: '96%', android: '90%' }),
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
  width: Platform.select({ ios: '96%', android: '90%' }),
  height: 200,
  borderRadius: 10,
  borderWidth: 0.5,
  borderColor: '#D8A353',
  marginVertical: 15,
},
videoCard: {
  width: Platform.select({ ios: '96%', android: '90%' }), // iOS más ancho, Android igual
  aspectRatio: 16 / 9,            // alto automático; mantiene proporción
  borderRadius: 12,
  borderWidth: 0.5,
  borderColor: '#D8A353',
  overflow: 'hidden',              // esquinas redondeadas reales
  backgroundColor: '#111',
  marginVertical: 15,
},
videoEl: {
  ...StyleSheet.absoluteFillObject, // el <Video> ocupa todo el contenedor
},

  contactButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginBottom: 8,
    borderRadius: 10,
    alignItems: 'center',
    width: Platform.select({ ios: '92%', android: 340 }),
  },
  contactButtonText: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  editButton: {
    position: 'absolute',
    top: Platform.select({ ios: 65, android: 45 }),
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
     width: Platform.select({ ios: '92%', android: 340 }),
  },
  messageButtonText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  iaButton: {
    marginTop: 0,
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    flexDirection: 'row',
    elevation: 4,
  },

highlightBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#4c330dff',   // dorado oscuro de fondo
  borderColor: '#D8A353',       // dorado principal
  borderWidth: 0.3,
  borderRadius: 10,
  marginTop: 10,
  marginBottom: 12,
  width: Platform.select({ ios: '95%', android: 360 }),
  padding: 10,
},
highlightTitle: {
  color: '#FFD700',  // dorado más claro para destacar el título
  fontWeight: '700',
  fontSize: 13,
  marginBottom: 2,
},
highlightSub: {
  color: '#fff',     // blanco suave para contraste
  fontSize: 12,
},
highlightBtn: {
  backgroundColor: '#D8A353',   // botón dorado
  borderRadius: 8,
  paddingVertical: 6,
  paddingHorizontal: 12,
  marginLeft: 10,
},
highlightBtnText: {
  color: '#000',     // texto negro sobre el botón dorado
  fontWeight: '700',
  fontSize: 12,
},
});
