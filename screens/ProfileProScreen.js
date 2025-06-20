import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Linking, Modal, Animated } from 'react-native';
import { useUser } from '../contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { AntDesign } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native';
import { Video } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../src/firebase/firebaseConfig';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { saveSubscriptionHistory } from '../src/firebase/helpers/saveSubscriptionHistory';

export default function ProfileProScreen({ navigation }) {
  const { userData, setUserData } = useUser();
  const [selectedImage, setSelectedImage] = useState(null);

useEffect(() => {
  const loadProfilePro = async () => {
    try {
      const json = await AsyncStorage.getItem('userProfilePro');
      const parsed = json ? JSON.parse(json) : null;

      if (parsed?.membershipType === 'pro') {
        await new Promise(resolve => setTimeout(resolve, 0)); 
        setUserData(prev => ({ ...prev, ...parsed }));
        console.log("✅ userData seteado como PRO:", parsed);

        console.log("🧾 Enviando historial a Firestore...");
        await saveSubscriptionHistory({
          email: parsed.email,
          planType: 'pro',
          paymentMethod: 'simulado',
          durationMonths: 1,
          status: 'active',
        });

      } else if (parsed) {
        console.warn('⚠️ Perfil cargado no es Pro. Ignorado.');
      }
    } catch (e) {
      console.log('❌ Error al cargar perfil Pro:', e);
    }
  };

  loadProfilePro();
}, []);

  
  if (!userData || userData.membershipType !== 'pro') {
      console.warn("🛑 Fallback activado: userData no es válido o no es PRO", userData);
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D8A353" />
      </View>
    );
  }
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isEnlarged, setIsEnlarged] = useState(false);

  const handleProfilePhotoPress = () => {
    Animated.timing(scaleAnim, {
      toValue: isEnlarged ? 1 : 1.6,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsEnlarged(!isEnlarged);
    });
  };
  const handleWhatsApp = () => {
    if (userData.phone) {
      const phoneNumber = userData.phone.replace(/\D/g, '');
      Linking.openURL(`https://wa.me/${phoneNumber}`);
    }
  };

return (
  <View style={styles.screen}>
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* Botón editar */}
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => navigation.navigate('CompleteProfile')}
      >
        <AntDesign name="edit" size={24} color="#D8A353" />
      </TouchableOpacity>


      {userData.membershipType === 'pro' && (
        <Text style={styles.proBadge}>Miembro Pro 🏆</Text>
      )}

        <TouchableOpacity onPress={handleProfilePhotoPress}>
          <Animated.Image
            source={{ uri: userData.profilePhoto }}
            style={[styles.profileImage, { transform: [{ scale: scaleAnim }] }]}
          />
        </TouchableOpacity>

        <Text style={styles.name}>{userData.name}</Text>
        
        {userData.category && (
          <Text style={styles.category}>
            {Array.isArray(userData.category) ? userData.category.join(', ') : userData.category}
          </Text>
        )}

        <View style={styles.contactItem}>
          <Ionicons name="mail" size={20} color="#D8A353" />
          <Text numberOfLines={1} style={styles.contactText}>
            {userData.email || 'No disponible'}
          </Text>
        </View>

        <View style={styles.contactItem}>
          <Ionicons name="call" size={20} color="#D8A353" />
          <Text numberOfLines={1} style={styles.contactText}>
            {userData.phone || 'No disponible'}
          </Text>
        </View>

        <View style={styles.contactItem}>
          <MaterialCommunityIcons name="instagram" size={20} color="#E4405F" />
          <Text numberOfLines={1} style={styles.contactText}>
            {userData.instagram || 'No disponible'}
          </Text>
        </View>

        <View style={styles.infoBox}>
          {userData.sexo && <Text style={styles.infoText}>Sexo: {userData.sexo}</Text>}
          {userData.age && <Text style={styles.infoText}>Edad: {userData.age}</Text>}
          {userData.estatura && <Text style={styles.infoText}>Estatura: {userData.estatura} cm</Text>}
          {userData.skinColor && <Text style={styles.infoText}>Color de piel: {userData.skinColor}</Text>}
          {userData.eyeColor && <Text style={styles.infoText}>Color de ojos: {userData.eyeColor}</Text>}
          {userData.hairColor && <Text style={styles.infoText}>Color de cabello: {userData.hairColor}</Text>}
          {userData.ethnicity && <Text style={styles.infoText}>Etnia: {userData.ethnicity}</Text>}
          {userData.tattoos && <Text style={styles.infoText}>Tatuajes: {userData.tattoos}</Text>}
          {userData.tattoosLocation && <Text style={styles.infoText}>Ubicación tatuajes: {userData.tattoosLocation}</Text>}
          {userData.piercings && <Text style={styles.infoText}>Piercings: {userData.piercings}</Text>}
          {userData.piercingsLocation && <Text style={styles.infoText}>Ubicación piercings: {userData.piercingsLocation}</Text>}
          {userData.shirtSize && <Text style={styles.infoText}>Talla de camisa: {userData.shirtSize}</Text>}
          {userData.pantsSize && <Text style={styles.infoText}>Talla de pantalón: {userData.pantsSize}</Text>}
          {userData.shoeSize && <Text style={styles.infoText}>Talla de zapatos: {userData.shoeSize}</Text>}
          {userData.country && <Text style={styles.infoText}>País: {userData.country}</Text>}
          {userData.ciudad && <Text style={styles.infoText}>Ciudad: {userData.ciudad}</Text>}
          {userData.address && <Text style={styles.infoText}>Dirección: {userData.address}</Text>}
          {userData.comuna && <Text style={styles.infoText}>Comuna: {userData.comuna}</Text>}
          {userData.region && <Text style={styles.infoText}>Región: {userData.region}</Text>}
        </View>

        {userData.bookPhotos && userData.bookPhotos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bookScroll}>
            {userData.bookPhotos.map((uri, index) => (
              <View key={index} style={styles.bookImageWrapper}>
                <TouchableOpacity onPress={() => setSelectedImage(uri)}>
                  <Image source={{ uri }} style={styles.bookImage} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <Modal
          visible={selectedImage !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.fullscreenContainer} onPress={() => setSelectedImage(null)}>
              <Image source={{ uri: selectedImage }} style={styles.fullscreenImage} />
            </TouchableOpacity>
          </View>
        </Modal>

        {userData.profileVideo && (
  <Video
    source={{ uri: userData.profileVideo }}
    useNativeControls
    resizeMode="contain"quiero borrar el boton de ia en 
    style={styles.video}
    onError={(e) => {
      console.log('❌ Error al cargar el video:', e);
      alert('No se pudo cargar el video de presentación. Intenta editar tu perfil nuevamente.');
    }}
  />
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

});