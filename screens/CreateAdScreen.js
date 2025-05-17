import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function CreateAdScreen() {
  const { userData } = useUser();
  const navigation = useNavigation();
  const [imageUri, setImageUri] = useState(null);
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  if (userData.membershipType !== 'pro' && userData.membershipType !== 'elite') {
    alert('Acceso restringido. Debes tener plan Pro o Elite para publicar anuncios.');
    navigation.goBack();
    return null;
  }

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const getExpiration = () => {
    const duration = parseInt(selectedDuration);
    if (!duration || isNaN(duration)) return null;
    return Date.now() + duration * 24 * 60 * 60 * 1000;
  };

  const handlePublishAd = async () => {
    if (!imageUri || title.trim() === '' || !selectedDuration || !selectedPlan) {
      return alert('Debes subir una imagen, colocar un título y seleccionar tipo de anuncio.');
    }

    const urlRegex = /^(https?:\/\/)?([\w.-]+)\.([a-z\.]{2,6})([\/\w\.-]*)*\/?$/;
    if (link && !urlRegex.test(link.trim())) {
      return alert('Ingresa un enlace válido, como https://instagram.com/mi_perfil');
    }

    const precios = {
      normal: { '3': 990, '7': 1490, '15': 2490 },
      destacado: { '3': 4990, '7': 8900, '15': 14990 },
    };
    const monto = precios[selectedPlan][selectedDuration];

    const newAd = {
      id: Date.now().toString(),
      imageUri,
      title,
      link,
      userEmail: userData.email,
      membershipType: userData.membershipType,
      expiresAt: getExpiration(),
      plan: selectedDuration,
      monto,
      destacado: selectedPlan === 'destacado',
      aprobado: true, // ✅ ahora se publica directamente
    };

    try {
      const existing = await AsyncStorage.getItem('adsList');
      const ads = existing ? JSON.parse(existing) : [];
      const updatedAds = [...ads, newAd];
      await AsyncStorage.setItem('adsList', JSON.stringify(updatedAds));
      setShowSuccessModal(true);
    } catch (error) {
      console.log('Error al guardar anuncio:', error);
    }
  };

  const opciones = {
    normal: [
      { duracion: '3', texto: '📄 3 días – $990' },
      { duracion: '7', texto: '📄 7 días – $1.490' },
      { duracion: '15', texto: '📄 15 días – $2.490' },
    ],
    destacado: [
      { duracion: '3', texto: '⭐ 3 días – $4.990' },
      { duracion: '7', texto: '⭐ 7 días – $8.900' },
      { duracion: '15', texto: '⭐ 15 días – $14.990' },
    ],
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}
        >
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.label}>Sube una imagen para tu anuncio</Text>
        <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <Text style={styles.imageText}>📷 Seleccionar imagen</Text>
          )}
        </TouchableOpacity>
        {imageUri && (
          <TouchableOpacity onPress={() => setImageUri(null)}>
            <Text style={{ color: '#ff4d4d', marginTop: 8 }}>🗑️ Eliminar imagen</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.subtleIntro}>
          📝 Publica un anuncio visual para promocionar tu perfil, tus servicios o proyectos.
        </Text>

        <Text style={styles.label}>Título del anuncio *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Clases de actuación"
          placeholderTextColor="#888"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>
          Enlace externo (opcional){'\n'}
          <Text style={{ color: '#888', fontSize: 12 }}>
            Si colocas un link, los usuarios serán redirigidos al tocar tu anuncio.
          </Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="https://tupagina.com"
          placeholderTextColor="#888"
          value={link}
          onChangeText={setLink}
        />

        <Text style={{ color: '#888', fontSize: 12, marginBottom: 10 }}>
          Recomendamos usar imágenes horizontales (formato 16:9) para mejor visualización en el Dashboard.
        </Text>

        <Text style={styles.label}>Selecciona tipo y duración del anuncio:</Text>
        <View style={styles.optionColumns}>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>📄 Normal</Text>
            {opciones.normal.map((op, index) => {
              const isSelected = selectedPlan === 'normal' && selectedDuration === op.duracion;
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.optionButton, isSelected && styles.selectedOption]}
                  onPress={() => {
                    setSelectedPlan('normal');
                    setSelectedDuration(op.duracion);
                  }}
                >
                  <Text style={styles.optionText}>{op.texto}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.column}>
            <Text style={styles.columnTitle}>⭐ Destacado</Text>
            {opciones.destacado.map((op, index) => {
              const isSelected = selectedPlan === 'destacado' && selectedDuration === op.duracion;
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.optionButton, isSelected && styles.selectedOption]}
                  onPress={() => {
                    setSelectedPlan('destacado');
                    setSelectedDuration(op.duracion);
                  }}
                >
                  <Text style={styles.optionText}>{op.texto}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handlePublishAd}>
          <Text style={styles.buttonText}>📢 Publicar anuncio</Text>
        </TouchableOpacity>

        {/* Modal visual al publicar */}
        <Modal
          visible={showSuccessModal}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>✅ Tu anuncio fue publicado.</Text>
              <Text style={styles.modalSubtext}>Ya aparece en la sección de promociones.</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowSuccessModal(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.modalButtonText}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    flex: 1,
    padding: 22,
  },
  label: {
    color: '#CCCCCC',
    marginBottom: 5,
    marginTop: 25,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 10,
    borderRadius: 10,
  },
  imagePicker: {
    backgroundColor: '#1a1a1a',
    height: 220,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  imageText: {
    color: '#888',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  optionColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 0,
    marginBottom: -10,
  },
  column: {
    width: '48%',
  },
  columnTitle: {
    color: '#D8A353',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 8,
  },
  optionButton: {
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  selectedOption: {
    backgroundColor: '#D8A353',
  },
  optionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#D8A353',
    marginTop: 30,
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  subtleIntro: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    padding: 25,
    borderRadius: 10,
    borderColor: '#D8A353',
    borderWidth: 1,
    alignItems: 'center',
    width: '85%',
  },
  modalText: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtext: {
    color: '#ccc',
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  modalButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
});
