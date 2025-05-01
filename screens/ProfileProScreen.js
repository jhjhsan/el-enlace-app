import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Modal, Linking } from 'react-native';
import { useUser } from '../contexts/UserContext';
import BottomBar from '../components/BottomBar';
import { Ionicons } from '@expo/vector-icons';
import { AntDesign } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Video } from 'expo-av';

export default function ProfileProScreen({ navigation }) {
  const { userData } = useUser();
  const [selectedImage, setSelectedImage] = useState(null);

  if (!userData) {
    return (
      <View style={styles.screen}>
        <Text style={{ color: '#fff' }}>Cargando perfil...</Text>
      </View>
    );
  }

  const handleContact = (type) => {
    if (type === 'email' && userData.email) {
      Linking.openURL(`mailto:${userData.email}`);
    } else if (type === 'phone' && userData.phone) {
      Linking.openURL(`tel:${userData.phone}`);
    } else if (type === 'instagram' && userData.instagram) {
      const instagramUsername = userData.instagram.replace('@', '');
      Linking.openURL(`https://instagram.com/${instagramUsername}`);
    }
  };

  const handleWhatsApp = () => {
    if (userData.phone) {
      const phoneNumber = userData.phone.replace(/\D/g, '');
      Linking.openURL(`https://wa.me/${phoneNumber}`);
    }
  };

  const handleToggleImage = (uri) => {
    if (selectedImage === uri) {
      setSelectedImage(null);
    } else {
      setSelectedImage(uri);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Botón Editar */}
        <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('EditProfile')}>
          <AntDesign name="edit" size={24} color="#D8A353" />
        </TouchableOpacity>

        {/* Foto de perfil */}
        <Image source={{ uri: userData.profilePhoto }} style={styles.profileImage} />

        {/* Nombre y Categoría */}
        <Text style={styles.name}>{userData.name}</Text>
<Text style={styles.category}>
  {(userData.category && Array.isArray(userData.category)) ? userData.category.join(', ') : ''}
</Text>

        {/* Contacto */}
        <View style={styles.contactContainer}>
          <TouchableOpacity style={styles.contactItem} onPress={() => handleContact('email')}>
            <Ionicons name="mail" size={20} color="#D8A353" />
            <Text style={styles.contactText}>{userData.email}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactItem} onPress={() => handleContact('phone')}>
            <Ionicons name="call" size={20} color="#D8A353" />
            <Text style={styles.contactText}>{userData.phone}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactItem} onPress={() => handleContact('instagram')}>
            <MaterialCommunityIcons name="instagram" size={20} color="#E4405F" />
            <Text style={styles.contactText}>{userData.instagram}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.infoBox}>
  {userData.sex && <Text style={styles.infoText}>Sexo: {userData.sex}</Text>}
  {userData.age && <Text style={styles.infoText}>Edad: {userData.age}</Text>}
  {userData.height && <Text style={styles.infoText}>Estatura: {userData.height} cm</Text>}
  {userData.skinColor && <Text style={styles.infoText}>Color de piel: {userData.skinColor}</Text>}
  {userData.eyeColor && <Text style={styles.infoText}>Color de ojos: {userData.eyeColor}</Text>}
  {userData.hairColor && <Text style={styles.infoText}>Color de cabello: {userData.hairColor}</Text>}
  {userData.tattoos && <Text style={styles.infoText}>Tatuajes: {userData.tattoos}</Text>}
  {userData.tattoosLocation && <Text style={styles.infoText}>Ubicación tatuajes: {userData.tattoosLocation}</Text>}
  {userData.piercings && <Text style={styles.infoText}>Piercings: {userData.piercings}</Text>}
  {userData.piercingsLocation && <Text style={styles.infoText}>Ubicación piercings: {userData.piercingsLocation}</Text>}
  {userData.shirtSize && <Text style={styles.infoText}>Talla de camisa: {userData.shirtSize}</Text>}
  {userData.pantsSize && <Text style={styles.infoText}>Talla de pantalón: {userData.pantsSize}</Text>}
  {userData.shoeSize && <Text style={styles.infoText}>Talla de zapatos: {userData.shoeSize}</Text>}
</View>


        {/* Descripción */}
        {userData.description ? (
          <Text style={styles.description}>{userData.description}</Text>
        ) : null}

        {/* Fotos y Videos */}
        <View style={styles.galleryContainer}>
          {userData.bookPhotos && userData.bookPhotos.map((uri, index) => (
            <TouchableOpacity key={index} onPress={() => handleToggleImage(uri)}>
              <Image
                source={{ uri }}
                style={selectedImage === uri ? styles.largeImage : styles.galleryImage}
              />
            </TouchableOpacity>
          ))}
        </View>
        {userData.profileVideo && (
  <Video
    source={{ uri: userData.profileVideo }}
    useNativeControls
    resizeMode="contain"
    style={styles.video}
  />
)}

        {/* Botón Contactaral Whatsapp */}
        <TouchableOpacity style={styles.contactButton} onPress={handleWhatsApp}>
          <Text style={styles.contactButtonText}>Contactar al Whatsapp</Text>
        </TouchableOpacity>

      </ScrollView>

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
    paddingBottom: 120,
    paddingTop: 40,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderColor: '#D8A353',
    borderWidth: 2,
    marginBottom: 10,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  category: {
    fontSize: 14,
    color: '#D8A353',
    marginBottom: 20,
  },
  contactContainer: {
    width: '80%',
    marginBottom: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B1B1B',
    padding: 10,
    borderRadius: 8,
    borderColor: '#D8A353',
    borderWidth: 1,
    marginVertical: 5,
  },
  contactText: {
    color: '#CCCCCC',
    marginLeft: 10,
  },
  description: {
    width: '80%',
    color: '#CCCCCC',
    backgroundColor: '#1B1B1B',
    padding: 10,
    borderRadius: 10,
    borderColor: '#D8A353',
    borderWidth: 1,
    marginVertical: 15,
  },
  galleryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 15,
  },
  galleryImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    margin: 5,
  },
  largeImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    margin: 5,
  },
  contactButton: {
    backgroundColor: '#D8A353',
    borderRadius: 10,
    paddingVertical: 15,
    width: '80%',
    marginTop: 20,
  },
  contactButtonText: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  viewBookButton: {
    marginTop: 15,
  },
  viewBookText: {
    color: '#CCCCCC',
    textDecorationLine: 'underline',
  },
  editButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  infoBox: {
    width: '80%',
    backgroundColor: '#1B1B1B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
    padding: 10,
    marginBottom: 20,
  },
  infoText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 5,
  },
  video: {
    width: '90%',
    height: 200,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
    marginVertical: 15,
  }
  
});
