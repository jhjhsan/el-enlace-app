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
import { Video } from 'expo-av';
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

export default function ProfileEliteScreen({ navigation }) {
  const { userData, setUserData } = useUser();
  const [profile, setProfile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [iaModalVisible, setIaModalVisible] = useState(false);
const [iaSuggestions, setIaSuggestions] = useState([]);
const [loadingIA, setLoadingIA] = useState(false);
const [autoSuggestion, setAutoSuggestion] = useState(null);
const [showAutoModal, setShowAutoModal] = useState(false);

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
        const json = await AsyncStorage.getItem('userProfileElite');
      if (json) {
        const loadedProfile = JSON.parse(json);
        setProfile(loadedProfile);
       console.log("🧾 Enviando historial de suscripción Elite a Firestore...");
await saveSubscriptionHistory({
  email: loadedProfile.email,
  planType: 'elite',
  paymentMethod: 'simulado',
  durationMonths: loadedProfile.subscriptionType === 'anual' ? 12 : 1,
  status: 'active',
});
        const userJson = await AsyncStorage.getItem('userData');
        const user = userJson ? JSON.parse(userJson) : null;
        const paid = user?.hasPaid === true;

        setHasPaid(paid);
      } else {
        setProfile({});
      }
    };
    loadProfile();
  }, []);
useFocusEffect(
  React.useCallback(() => {
    const reloadProfile = async () => {
      const json = await AsyncStorage.getItem('userProfileElite');
      if (json) {
        setProfile(JSON.parse(json));
      }
    };
    reloadProfile();
  }, [])
);

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }
  const isBlocked = userData?.membershipType === 'elite' && userData?.hasPaid === false;
console.log('VIDEO EN PERFIL:', profile.profileVideo);

const getIASuggestions = async (profileData) => {
  try {
    const functions = getFunctions(getApp());
    const generateSuggestions = httpsCallable(functions, "generateSuggestions");

    const result = await generateSuggestions({ profile: profileData });
    const suggestions = result.data.suggestions;

    return suggestions;
  } catch (error) {
    console.error("Error al generar sugerencias IA:", error);
    return null;
  }
};

{loadingIA && (
  <Modal transparent animationType="fade" visible={true}>
    <View style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: 'white', marginBottom: 10 }}>Generando sugerencias IA...</Text>
      <View style={{ padding: 20, backgroundColor: '#1B1B1B', borderRadius: 10 }}>
        <ActivityIndicator size="large" color="#D8A353" />
      </View>
    </View>
  </Modal>
)}

  return (
    <View style={styles.container}>
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

          <View style={styles.headerContainer}>
            <Text style={styles.title}>Perfil de Agencia</Text>
            <Text style={styles.subtitle}>👑 Cuenta Elite</Text>
            <TouchableOpacity
              style={styles.editPill}
              onPress={() => navigation.navigate('EditProfileElite')}
            >
              <AntDesign name="edit" size={14} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileSection}>
            <View style={styles.logoContainer}>
            {profile.profilePhoto ? (
  <Image
    source={{ uri: profile.profilePhoto }}
    style={styles.logo}
    onError={(e) => {
      console.log('❌ Error al cargar la imagen:', e.nativeEvent.error);
    }}
  />
) : (
  <View style={[styles.logo, styles.iconFallback]}>
    <Ionicons name="image-outline" size={40} color="#D8A353" />
  </View>
)}

            </View>

            {profile.companyType && (
              <View style={styles.categoryBadge}>
                <Feather name="briefcase" size={14} color="#D8A353" style={{ marginRight: 6 }} />
                <Text style={styles.categoryText}>{profile.companyType}</Text>
              </View>
            )}

            {profile.agencyName ? (
              <Text style={styles.agencyName}>{profile.agencyName}</Text>
            ) : null}

            {profile.representative ? (
              <Text style={styles.representative}>{profile.representative}</Text>
            ) : null}

            {(profile.city || profile.region || profile.comuna) && (
              <Text style={styles.location}>
                {profile.city || 'Ciudad'}, {profile.region || 'Región'}
                {profile.comuna ? `, ${profile.comuna}` : ''}
              </Text>
            )}
          </View>

         <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 10, textAlign: 'left', alignSelf: 'flex-start' }]}>
  Contacto
</Text>

          <View style={styles.contactBoxCentered}>
            {profile.email && (
              <View style={styles.contactCard}>
                <Ionicons name="mail" size={18} color="#D8A353" style={styles.cardIcon} />
                <Text style={styles.cardText}>{profile.email}</Text>
              </View>
            )}
            {profile.phone && (
              <View style={styles.contactCard}>
                <Ionicons name="call" size={18} color="#D8A353" style={styles.cardIcon} />
                <Text style={styles.cardText}>{profile.phone}</Text>
              </View>
            )}
            {profile.address && (
              <View style={styles.contactCard}>
                <Ionicons name="location" size={18} color="#D8A353" style={styles.cardIcon} />
                <Text style={styles.cardText}>{profile.address}</Text>
              </View>
            )}
            {profile.instagram && (
              <View style={styles.contactCard}>
                <Ionicons name="logo-instagram" size={18} color="#D8A353" style={styles.cardIcon} />
                <Text style={styles.cardText}>{profile.instagram}</Text>
              </View>
            )}
            {profile.whatsapp && (
  <View style={styles.contactCard}>
    <Ionicons name="logo-whatsapp" size={18} color="#D8A353" style={styles.cardIcon} />
    <Text style={styles.cardText}>{profile.whatsapp}</Text>
  </View>
)}

{profile.webLink && (
  <TouchableOpacity
    style={styles.contactCard}
    onPress={() => Linking.openURL(profile.webLink)}
  >
    <Ionicons name="link-outline" size={18} color="#D8A353" style={styles.cardIcon} />
    <Text style={[styles.cardText, { textDecorationLine: 'underline' }]}>
      {profile.webLink}
    </Text>
  </TouchableOpacity>
)}

          </View>

          <Text style={[styles.sectionTitle, { textAlign: 'left', alignSelf: 'flex-start' }]}>
  Descripción
</Text>

          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>{profile.description}</Text>
          </View>

          <Text style={[styles.sectionTitle, { textAlign: 'left', alignSelf: 'flex-start' }]}>
  Galería de trabajos
</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollHorizontal}>
            {profile.logos?.map((uri, index) => (
              <TouchableOpacity key={index} style={styles.portfolioCard}>
                <Image source={{ uri }} style={styles.portfolioImage} />
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
    {showAutoModal && (
  <Modal transparent animationType="fade" visible={showAutoModal}>
    <View style={styles.modalBackdrop}>
      <View style={styles.modalBox}>
        <Text style={styles.modalTitle}>🧠 Sugerencia IA para tu perfil</Text>
        <Text style={styles.modalText}>{autoSuggestion}</Text>
        <TouchableOpacity
          style={styles.modalButton}
          onPress={() => setShowAutoModal(false)}
        >
          <Text style={styles.modalButtonText}>Entendido</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
)}

  </View>
)}
        </View>
      </ScrollView>
     <TouchableOpacity
  style={styles.iaFloatingButton}
onPress={async () => {
  try {
    setLoadingIA(true);

    const profileData = {
      category: [profile.eliteCategory],
      description: profile.description,
      membershipType: userData.membershipType,
      name: profile.agencyName,
      profilePhoto: profile.profilePhoto,
      profileVideo: profile.profileVideo,
    };

    const result = await getProfileSuggestions(profileData, userData);

 if (result?.error) {
  Alert.alert('Error', result.error);
  return;
}

if (result?.reused) {
  Alert.alert(
    'IA ya utilizada',
    `Estas sugerencias fueron generadas el ${result.lastUsed}. Puedes volver a usar la IA en unos días.`
  );
}

    const lines = Array.isArray(result.suggestions)
      ? result.suggestions
      : result.suggestions?.split(/\n+/).map(line => line.trim()).filter(line => line.length > 0) || [];

    if (!userData.hasPaid) {
      lines.push('');
      lines.push('💡 Si deseas acceder a más herramientas avanzadas de IA y beneficios exclusivos de agencias elite, activa tu plan Elite desde la sección de Suscripción.');
      lines.push('👉 ¡Haz crecer tu agencia con El Enlace Pro!');
    }

    setIaSuggestions(lines);
    setIaModalVisible(true);

  } catch (err) {
    console.log("Error IA:", err);
    Alert.alert("Error", "No se pudieron obtener sugerencias en este momento.");
  } finally {
    setLoadingIA(false);
  }
}}
>
  <Ionicons name="sparkles-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
  <Text style={{ color: '#fff', fontWeight: 'bold' }}>IA</Text>
</TouchableOpacity>

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
      <Modal
  visible={iaModalVisible}
  transparent
  animationType="slide"
  onRequestClose={() => setIaModalVisible(false)}
>
  <View style={styles.iaModalOverlay}>
    <View style={styles.iaModalContent}>
      <Text style={styles.iaModalTitle}>Sugerencias IA</Text>
      <ScrollView style={{ maxHeight: 300 }}>
        {iaSuggestions.map((item, index) => (
          <View key={index} style={styles.iaSuggestionItem}>
            <Ionicons name="bulb-outline" size={18} color="#D8A353" />
            <Text style={styles.iaSuggestionText}>{item}</Text>
          </View>
        ))}
      </ScrollView>
      <TouchableOpacity style={styles.iaCloseButton} onPress={() => setIaModalVisible(false)}>
        <Text style={styles.iaCloseButtonText}>Cerrar</Text>
      </TouchableOpacity>
    </View>
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
  editPill: {
  position: 'absolute',
  top: 5,
  left: 230,
  paddingVertical: 5,
  paddingHorizontal: 12,
  borderRadius: 30,
  backgroundColor: '#D8A353',
},

  profileSection: {
    alignItems: 'center',
    marginVertical: 0,
  },
  logoContainer: {
    backgroundColor: '#1B1B1B',
    borderRadius: 75,
    padding: 1,
    borderWidth: 0.5,
    borderColor: '#D8A353',
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 60,
    borderWidth: 0.5,
    borderColor: '#D8A353',
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
  iconFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1B1B1B',
  },
  inner: {
  width: '100%',
  alignItems: 'center',
},

iaModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.85)',
  justifyContent: 'center',
  alignItems: 'center',
},
iaModalContent: {
  backgroundColor: '#1B1B1B',
  padding: 15,
  borderRadius: 12,
  width: '90%',
  maxHeight: '85%',
},
iaModalTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#D8A353',
  marginBottom: 10,
  textAlign: 'center',
},
iaSuggestionItem: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: 10,
},
iaSuggestionText: {
  color: '#FFFFFF',
  marginLeft: 10,
  fontSize: 14,
  flex: 1,
},
iaCloseButton: {
  backgroundColor: '#D8A353',
  paddingVertical: 10,
  borderRadius: 8,
  marginTop: 15,
  alignItems: 'center',
},
iaCloseButtonText: {
  color: '#000',
  fontWeight: 'bold',
  fontSize: 14,
},
iaFloatingButton: {
  position: 'absolute',
  top: 110,
  right: 20,
  backgroundColor: '#D8A353', // dorado como el resto del perfil Elite
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 30,
  flexDirection: 'row',
  alignItems: 'center',
  zIndex: 10,
  elevation: 6,
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

});