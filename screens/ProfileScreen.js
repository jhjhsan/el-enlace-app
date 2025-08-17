import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { AntDesign } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { goToFormularioFree } from '../utils/navigationHelpers';
import { Image as CachedImage } from 'react-native-expo-image-cache';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation, route }) {
  const { userData } = useUser();

  const isExternal = !!route?.params?.viewedProfile;
  const profileData = isExternal ? route.params.viewedProfile : userData;

  if (!profileData) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D8A353" />
      </View>
    );
  }

  const [selectedImage, setSelectedImage] = useState(null);
  const profileScaleAnim = useRef(new Animated.Value(1)).current;
  const [profileEnlarged, setProfileEnlarged] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);

  useEffect(() => {
    if (!userData || isExternal) return;

    const verificarPerfil = async () => {
      try {
        if (userData.membershipType === 'elite') {
          if (userData.hasPaid === true) {
            navigation.replace('ProfileElite');
            return;
          } else {
            navigation.replace('DashboardElite');
            return;
          }
        }

        if (userData.membershipType === 'pro') {
          navigation.replace('ProfilePro');
          return;
        }

        // 🔍 Validar perfil Free
        const profileFreeRaw = await AsyncStorage.getItem('userProfileFree');
        const hasCompletedForm = await AsyncStorage.getItem('hasCompletedFreeForm');
        let profileFree = null;
        try {
          profileFree = JSON.parse(profileFreeRaw);
        } catch (e) {
          console.warn('⚠️ Error al parsear userProfileFree:', e);
        }

        const isValid =
          profileFree &&
          typeof profileFree.name === 'string' &&
          profileFree.name.trim() !== '' &&
          Array.isArray(profileFree.bookPhotos) &&
          profileFree.bookPhotos.length >= 1 &&
          profileFree.profilePhoto &&
          profileFree.edad &&
          profileFree.sexo &&
          Array.isArray(profileFree.category) &&
          profileFree.category.length > 0;

        if (!isValid && hasCompletedForm !== 'true') {
          setShowIncompleteModal(true);
        }
      } catch (error) {
        console.log('❌ Error al verificar perfil Free:', error);
      } finally {
        setIsReady(true);
      }
    };

    verificarPerfil();
  }, [userData]);

  if (
    !isExternal &&
    (!isReady ||
      !userData ||
      userData.membershipType === 'pro' ||
      (userData.membershipType === 'elite' && userData.hasPaid))
  ) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D8A353" />
      </View>
    );
  }

  const {
    name = 'Usuario',
    email = 'Correo no definido',
    edad = 'No definida',
    sexo = 'No definido',
    profilePhoto,
    bookPhotos = [],
  } = profileData;

  const handleProfileImagePress = () => {
    Animated.timing(profileScaleAnim, {
      toValue: profileEnlarged ? 1 : 1.6,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setProfileEnlarged(!profileEnlarged);
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {isExternal && (
          <View style={{ position: 'absolute', top: 30, left: 20, zIndex: 999 }}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <AntDesign name="arrowleft" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.freeBadge}>Miembro Free 🎬</Text>

        {profilePhoto ? (
          <TouchableOpacity onPress={handleProfileImagePress}>
            <Animated.View style={{ transform: [{ scale: profileScaleAnim }] }}>
              <CachedImage uri={(profilePhoto || '').trim()} style={styles.profileImage} resizeMode="cover" />
            </Animated.View>
          </TouchableOpacity>
        ) : (
          <View style={styles.noPhoto}>
            <Text style={styles.noPhotoText}>Sin foto de perfil</Text>
          </View>
        )}

        <Text style={styles.name}>{name}</Text>
        <Text style={styles.categoryLabel}>
          Categorías:{' '}
          {Array.isArray(profileData.category) ? profileData.category.join(', ') : profileData.category}
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.label}>Correo:</Text>
          <Text style={styles.text}>{email}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.label}>Edad:</Text>
          <Text style={styles.text}>{edad}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.label}>Sexo:</Text>
          <Text style={styles.text}>{sexo}</Text>
        </View>

        {/* Contactar */}
        {isExternal && profileData?.email && (
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => {
              navigation.navigate('MessageDetail', {
                contactEmail: profileData.email,
                profileAttachment: profileData,
              });
            }}
          >
            <Text style={{ fontSize: 16, marginRight: 5 }}>💬</Text>
            <Text style={[styles.contactText, { color: '#CCCCCC' }]}>Contactar</Text>
          </TouchableOpacity>
        )}

        {bookPhotos.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Book de Fotos:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.bookScroll}
              contentContainerStyle={{
                paddingHorizontal: 20,
                justifyContent: bookPhotos.length === 1 ? 'center' : 'flex-start',
              }}
            >
              {bookPhotos.slice(0, 3).map((uri, index) => (
                <View key={index} style={styles.bookImageWrapper}>
                  <TouchableOpacity onPress={() => setSelectedImage(uri)}>
                    <CachedImage uri={(uri || '').trim()} style={styles.bookImage} resizeMode="cover" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        <Modal
          visible={selectedImage !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.fullscreenContainer} onPress={() => setSelectedImage(null)}>
              <CachedImage uri={(selectedImage || '').trim()} style={styles.fullscreenImage} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        </Modal>
      </ScrollView>

      {/* Modal de perfil incompleto */}
      <Modal
        visible={showIncompleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIncompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Perfil incompleto</Text>
            <Text style={styles.modalText}>
              Para comenzar a usar todas las funciones, completa tu perfil ahora.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowIncompleteModal(false);
                goToFormularioFree(navigation);
              }}
            >
              <Text style={styles.modalButtonText}>Completar ahora</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  container: { alignItems: 'center', paddingBottom: 100, marginTop: 20 },
  editButton: { position: 'absolute', top: 50, right: 30, zIndex: 20 },
  profileImage: {
    width: 120, height: 120, borderRadius: 60, borderWidth: 0.5, borderColor: '#D8A353', marginTop: 20,
  },
  noPhoto: {
    width: 120, height: 120, borderRadius: 60, borderWidth: 0.5, borderColor: '#D8A353', marginTop: 20,
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A1A',
  },
  noPhotoText: { color: '#888', fontSize: 12, textAlign: 'center' },
  name: { fontSize: 20, color: '#FFF', fontWeight: 'bold', marginTop: 8 },
  infoBox: { backgroundColor: '#1A1A1A', borderRadius: 10, padding: 12, marginTop: 10, width: '85%' },
  label: { color: '#D8A353', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  text: { color: '#FFFFFF', fontSize: 14 },
  sectionTitle: { alignSelf: 'flex-start', marginLeft: 40, marginTop: 40, color: '#D8A353', fontWeight: 'bold', fontSize: 14 },
  bookScroll: { width: '100%', marginTop: 10, marginBottom: 10 },
  bookImageWrapper: { marginRight: 10 },
  bookImage: { width: 110, height: 150, borderRadius: 8, borderColor: '#D8A353', borderWidth: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  fullscreenContainer: { width: '90%', height: '80%' },
  fullscreenImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  freeBadge: { color: '#D8A353', fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  categoryLabel: { color: '#D8A353', fontSize: 14, marginTop: 10 },

  modalContent: {
    backgroundColor: '#1B1B1B', padding: 20, borderRadius: 12, alignItems: 'center', marginHorizontal: 30,
    borderWidth: 0.5, borderColor: '#D8A353',
  },
  modalTitle: { color: '#D8A353', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  modalText: { color: '#FFF', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  modalButton: { backgroundColor: '#D8A353', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  modalButtonText: { color: '#000', fontWeight: 'bold', fontSize: 14 },

  contactItem: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingVertical: 10, paddingHorizontal: 15,
    backgroundColor: '#1A1A1A', borderRadius: 10, width: '85%',
  },
  contactText: { fontSize: 14, color: '#FFF' },
});
