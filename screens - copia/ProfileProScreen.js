import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Modal, Dimensions, Linking } from 'react-native';
import { useUser } from '../contexts/UserContext';
import BottomBar from '../components/BottomBar';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ProfileProScreen({ navigation }) {
  const { userData } = useUser();
  const [selectedImage, setSelectedImage] = useState(null);

  if (!userData) {
    return (
      <View style={styles.screen}>
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  const {
    profileImage,
    name,
    email,
    phone,
    instagram,
    categories,
    description,
    images
  } = userData;

  const handlePhonePress = () => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmailPress = () => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleInstagramPress = () => {
    Linking.openURL(`https://www.instagram.com/${instagram}`);
  };

  const handleWhatsAppPress = () => {
    Linking.openURL(`https://wa.me/${phone.replace('+', '')}`);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Botón de editar */}
        <View style={styles.editButtonContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('CompleteProfile')}>
            <Ionicons name="create-outline" size={24} color="#D8A353" />
          </TouchableOpacity>
        </View>

        <Image
          source={profileImage ? { uri: profileImage } : require('../assets/imagen5.png')}
          style={styles.profileImage}
        />
        <Text style={styles.name}>{name}</Text>
        {categories && <Text style={styles.category}>{categories.join(', ')}</Text>}

        {/* Contacto */}
        <View style={styles.infoContainer}>
          <TouchableOpacity style={styles.infoRow} onPress={handleEmailPress}>
            <Ionicons name="mail-outline" size={20} color="#D8A353" style={{ marginRight: 10 }} />
            <Text style={styles.infoText}>{email}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.infoRow} onPress={handlePhonePress}>
            <Ionicons name="call-outline" size={20} color="#D8A353" style={{ marginRight: 10 }} />
            <Text style={styles.infoText}>{phone}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.infoRow} onPress={handleInstagramPress}>
            <Ionicons name="logo-instagram" size={20} color="#E1306C" style={{ marginRight: 10 }} />
            <Text style={styles.infoText}>@{instagram}</Text>
          </TouchableOpacity>
        </View>

        {/* Descripción */}
        <Text style={styles.sectionTitle}>DESCRIPCIÓN</Text>
        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionText}>{description || 'Agrega una descripción...'}</Text>
        </View>

        {/* Fotos y Videos */}
        <Text style={styles.sectionTitle}>FOTOS Y VIDEOS</Text>
        <View style={styles.galleryContainer}>
          {images && images.length > 0 ? (
            images.map((img, index) => (
              <TouchableOpacity key={index} onPress={() => setSelectedImage(img)}>
                <Image source={{ uri: img }} style={styles.galleryImage} />
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noPhotosText}>No has agregado fotos aún.</Text>
          )}
        </View>

        {/* Botones de acción */}
        <TouchableOpacity style={styles.viewBookButton}>
          <Text style={styles.viewBookText}>➔ Ver Book Completo (Drive)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactButton} onPress={handleWhatsAppPress}>
          <Text style={styles.contactButtonText}>Contactar al WhatsApp</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Modal para imagen expandida */}
      <Modal visible={!!selectedImage} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalContainer} onPress={() => setSelectedImage(null)}>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
          )}
        </TouchableOpacity>
      </Modal>

      <BottomBar />
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
    paddingBottom: 100,
  },
  editButtonContainer: {
    alignSelf: 'flex-end',
    marginTop: 50,
    marginRight: 30,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginTop: -10,
    borderWidth: 2,
    borderColor: '#D8A353',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
  },
  category: {
    color: '#CCCCCC',
    fontSize: 16,
    marginBottom: 20,
  },
  infoContainer: {
    width: '80%',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginVertical: 5,
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
    alignSelf: 'flex-start',
    marginLeft: '10%',
  },
  descriptionBox: {
    width: '80%',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
  },
  descriptionText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  galleryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '90%',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  galleryImage: {
    width: (width * 0.4),
    height: (width * 0.4),
    borderRadius: 10,
    margin: 5,
  },
  noPhotosText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginTop: 10,
  },
  viewBookButton: {
    marginTop: 10,
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  viewBookText: {
    color: '#D8A353',
    fontSize: 14,
  },
  contactButton: {
    backgroundColor: '#D8A353',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    width: '80%',
    marginBottom: 30,
  },
  contactButtonText: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: width * 0.9,
    height: width * 1.1,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 50,
    textAlign: 'center',
  },
});
