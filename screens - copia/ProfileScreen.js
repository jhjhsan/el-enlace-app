import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import BottomBar from '../components/BottomBar';

const { width } = Dimensions.get('window');

export default function ProfileProScreen({ navigation }) {
  // ⚡ Aquí irían los datos que el usuario llenó (en el futuro se conectarán desde el Context)
  const profileData = {
    nombre: 'Jhon Santana',
    categorias: ['Actor', 'Modelo'],
    descripcion: 'Apasionado del mundo audiovisual. Amante del cine y de los nuevos desafíos.',
    medidas: {
      sexo: 'Masculino',
      edad: '35 años',
      estatura: '1.80 m',
      colorPiel: 'Blanca',
      colorOjos: 'Marrón claro',
      colorCabello: 'Castaño',
      tatuajes: 'Brazo derecho',
      piercings: 'Ninguno',
      cicatrices: 'Ninguna visible',
      tallas: {
        pantalon: '32',
        camisa: 'M',
        zapatos: '42',
      }
    },
    fotos: [
      require('../assets/imagen1.png'),
      require('../assets/imagen2.png'),
      require('../assets/imagen3.png'),
    ],
    contacto: {
      email: 'jhjhsan@mail.com',
      instagram: '@jhonsantana.s',
      telefono: '+56998765760'
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Imagen Principal */}
        <Image
          source={require('../assets/imagen5.png')}
          style={styles.profileImage}
        />

        {/* Nombre */}
        <Text style={styles.name}>{profileData.nombre}</Text>

        {/* Categorías */}
        <Text style={styles.category}>
          {profileData.categorias.join(', ')}
        </Text>

        {/* Descripción */}
        <Text style={styles.sectionTitle}>Descripción</Text>
        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionText}>{profileData.descripcion}</Text>
        </View>

        {/* Medidas físicas */}
        <Text style={styles.sectionTitle}>Medidas y Características</Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Sexo: {profileData.medidas.sexo}</Text>
          <Text style={styles.infoText}>Edad: {profileData.medidas.edad}</Text>
          <Text style={styles.infoText}>Estatura: {profileData.medidas.estatura}</Text>
          <Text style={styles.infoText}>Color de Piel: {profileData.medidas.colorPiel}</Text>
          <Text style={styles.infoText}>Color de Ojos: {profileData.medidas.colorOjos}</Text>
          <Text style={styles.infoText}>Color de Cabello: {profileData.medidas.colorCabello}</Text>
          <Text style={styles.infoText}>Tatuajes: {profileData.medidas.tatuajes}</Text>
          <Text style={styles.infoText}>Piercings: {profileData.medidas.piercings}</Text>
          <Text style={styles.infoText}>Cicatrices: {profileData.medidas.cicatrices}</Text>
          <Text style={styles.infoText}>Talla Pantalón: {profileData.medidas.tallas.pantalon}</Text>
          <Text style={styles.infoText}>Talla Camisa: {profileData.medidas.tallas.camisa}</Text>
          <Text style={styles.infoText}>Talla Zapatos: {profileData.medidas.tallas.zapatos}</Text>
        </View>

        {/* Galería de fotos */}
        <Text style={styles.sectionTitle}>Fotos</Text>
        <View style={styles.galleryContainer}>
          {profileData.fotos.map((img, index) => (
            <Image key={index} source={img} style={styles.galleryImage} />
          ))}
        </View>

        {/* Botones de contacto */}
        <TouchableOpacity style={styles.contactButton}>
          <Text style={styles.contactButtonText}>Contactar por WhatsApp</Text>
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
    paddingBottom: 100,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginTop: 30,
    borderWidth: 2,
    borderColor: '#D8A353',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  category: {
    color: '#CCCCCC',
    fontSize: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
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
  infoBox: {
    width: '80%',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 5,
  },
  galleryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '85%',
    marginBottom: 20,
  },
  galleryImage: {
    width: (width * 0.85 - 20) / 3,
    height: 80,
    borderRadius: 10,
  },
  contactButton: {
    backgroundColor: '#D8A353',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginTop: 20,
    marginBottom: 30,
    width: '80%',
  },
  contactButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
});
