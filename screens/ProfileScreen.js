import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import BottomBar from '../components/BottomBar';
import { AntDesign } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
  const userName = 'Jhon Santana';
  const category = 'Extra / Actor';
  const email = 'jhonsantana@email.com';
  const description = 'Soy un apasionado del cine y el teatro. Busco nuevas oportunidades en el mundo audiovisual.';
  const images = [
    require('../assets/imagen1.png'),
    require('../assets/imagen2.png'),
    require('../assets/imagen3.png'),
  ];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Botón Editar */}
        <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('EditProfile')}>
          <AntDesign name="edit" size={24} color="#D8A353" />
        </TouchableOpacity>

        {/* Foto de perfil */}
        <Image source={require('../assets/imagen5.png')} style={styles.profileImage} />

        {/* Nombre y categoría */}
        <Text style={styles.name}>{userName}</Text>
        <Text style={styles.category}>{category}</Text>

        {/* Email (solo texto en Free) */}
        <Text style={styles.label}>Correo:</Text>
        <Text style={styles.text}>{email}</Text>

        {/* Descripción */}
        <Text style={styles.label}>Descripción:</Text>
        <View style={styles.descriptionBox}>
          <Text style={styles.text}>{description}</Text>
        </View>

        {/* Galería simple */}
        <Text style={styles.label}>Fotos:</Text>
        <View style={styles.gallery}>
          {images.map((img, index) => (
            <Image key={index} source={img} style={styles.galleryImage} />
          ))}
        </View>
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
    paddingBottom: 100,
  },
  editButton: {
    position: 'absolute',
    top: 50,
    right: 30,
    zIndex: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#D8A353',
    marginTop: 60,
  },
  name: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: 'bold',
    marginTop: 10,
  },
  category: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 10,
  },
  label: {
    alignSelf: 'flex-start',
    marginLeft: 40,
    marginTop: 20,
    color: '#D8A353',
    fontWeight: 'bold',
    fontSize: 14,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    marginHorizontal: 40,
    marginTop: 5,
    textAlign: 'left',
  },
  descriptionBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 40,
    marginTop: 5,
  },
  gallery: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 10,
  },
  galleryImage: {
    width: (width * 0.85 - 40) / 3,
    height: 80,
    borderRadius: 10,
  },
});
