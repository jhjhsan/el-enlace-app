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
import { syncAdToFirestore } from '../src/firebase/helpers/syncAdToFirestore';
import { analyzeAdContent } from '../src/firebase/helpers/analyzeAdContent';
import { db } from '../src/firebase/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

export default function CreateAdScreen() {
  const { userData } = useUser();
  const navigation = useNavigation();
  const [imageUri, setImageUri] = useState(null);
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showWaitModal, setShowWaitModal] = useState(false);
const [pendingAdData, setPendingAdData] = useState(null);
const [showIaModal, setShowIaModal] = useState(false);
const [iaAnalysisText, setIaAnalysisText] = useState('');
const [mediaType, setMediaType] = useState(null); // 'imagen' o 'video'
const [videoUri, setVideoUri] = useState(null);
const [tipoArchivo, setTipoArchivo] = useState(null); // usado para guardar en adsList

  if (userData.membershipType !== 'pro' && userData.membershipType !== 'elite') {
    alert('Acceso restringido. Debes tener plan Pro o Elite para publicar anuncios.');
    navigation.goBack();
    return null;
  }

const handleMediaTypeSelection = (tipo) => {
  setMediaType(tipo);
  setTipoArchivo(tipo);
  setImageUri(null);
  setVideoUri(null);
};
const openGallery = async () => {
  if (!mediaType) {
    alert('Primero selecciona si deseas subir una imagen o video.');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: mediaType === 'imagen'
      ? ImagePicker.MediaTypeOptions.Images
      : ImagePicker.MediaTypeOptions.Videos,
    quality: 0.8,
    videoMaxDuration: 30,
  });

  if (!result.canceled) {
    if (mediaType === 'imagen') {
      setImageUri(result.assets[0].uri);
      setVideoUri(null);
    } else {
      setVideoUri(result.assets[0].uri);
      setImageUri(null);
    }
  }
};

  const getExpiration = () => {
    const duration = parseInt(selectedDuration);
    if (!duration || isNaN(duration)) return null;
    return Date.now() + duration * 24 * 60 * 60 * 1000;
  };

  const handlePublishAd = async () => {
    // 🚨 Antes de guardar, revisar si hay cupo
const allAdsJson = await AsyncStorage.getItem('adsList');
const allAds = allAdsJson ? JSON.parse(allAdsJson) : [];
const now = Date.now();
const activeAds = allAds.filter(ad => ad.aprobado && ad.expiresAt > now);

if (activeAds.length >= 20) {
  const pendingAd = {
  id: Date.now().toString(),
  imageUri: mediaType === 'imagen' ? imageUri : null,
  videoUri: mediaType === 'video' ? videoUri : null,
  tipo: mediaType,
  title,
  link,
  creatorEmail: userData.email,
  membershipType: userData.membershipType,
  expiresAt: getExpiration(),
  plan: selectedDuration,
  monto: mediaType === 'video'
    ? preciosVideo[selectedPlan]?.[selectedDuration]
    : precios[selectedPlan][selectedDuration],
  destacado: selectedPlan === 'destacado',
  aprobado: false,
  enEspera: true,
};
  setPendingAdData(pendingAd);
  setShowWaitModal(true);
  return;
}

    if ((!imageUri && !videoUri) || title.trim() === '' || !selectedDuration || !selectedPlan) {
      return alert('Debes subir una imagen, colocar un título y seleccionar tipo de anuncio.');
    }

    const urlRegex = /^(https?:\/\/)?([\w.-]+)\.([a-z\.]{2,6})([\/\w\.-]*)*\/?$/;
    if (link && !urlRegex.test(link.trim())) {
      return alert('Ingresa un enlace válido, como https://instagram.com/mi_perfil');
    }

    const monto = mediaType === 'video'
  ? preciosVideo[selectedPlan]?.[selectedDuration]
  : precios[selectedPlan][selectedDuration];

   try {
  const adData = { title, description: title + ' ' + link }; // usa el título + link como descripción base
  const result = await analyzeAdContent(adData);

  if (result.error) {
    return alert('Error al analizar anuncio: ' + result.error);
  }

  setIaAnalysisText(result.analysis);
  setShowIaModal(true);

  await setDoc(doc(db, 'adAnalysisLogs', Date.now().toString()), {
  email: userData.email,
  title,
  link,
  analysis: result.analysis,
  membershipType: userData.membershipType,
destacado: selectedPlan === 'destacado',
  createdAt: new Date().toISOString()
});
} catch (error) {
  console.error('❌ Error al analizar con IA:', error);
  alert('Ocurrió un error al analizar el contenido.');
}

  };
const guardarYPublicarAnuncio = async () => {
  const newAd = {
  id: Date.now().toString(),
  imageUri: mediaType === 'imagen' ? imageUri : null,
  videoUri: mediaType === 'video' ? videoUri : null,
  tipo: mediaType,
  title,
  link,
  creatorEmail: userData.email,
  membershipType: userData.membershipType,
  expiresAt: getExpiration(),
  plan: selectedDuration,
  monto: mediaType === 'video'
    ? preciosVideo[selectedPlan]?.[selectedDuration]
    : precios[selectedPlan][selectedDuration],
  destacado: selectedPlan === 'destacado',
  aprobado: true,
};

  try {
    const existing = await AsyncStorage.getItem('adsList');
    const ads = existing ? JSON.parse(existing) : [];
    const updatedAds = [...ads, newAd];
    await AsyncStorage.setItem('adsList', JSON.stringify(updatedAds));
    await syncAdToFirestore(newAd);
    setShowSuccessModal(true);
  } catch (error) {
    console.log('Error al guardar anuncio:', error);
  }
};
   const precios = {
      normal: { '3': 990, '7': 1490, '15': 2490 },
      destacado: { '3': 4990, '7': 8900, '15': 14990 },
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
const preciosVideo = {
  destacado: {
    '7': 14990,
    '15': 24990,
  }
};
const opcionesVideo = {
  destacado: [
    { duracion: '7', texto: '🎬 7 días – $14.990' },
    { duracion: '15', texto: '🎬 15 días – $24.990' },
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
          style={{ position: 'absolute', top: 3, left:-2, zIndex: 10 }}
        >
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>

<Text style={styles.label}>Tipo de contenido publicitario</Text>
<View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
  <TouchableOpacity
    onPress={() => handleMediaTypeSelection('imagen')}
    style={[
      styles.optionButton,
      mediaType === 'imagen' && styles.selectedOption,
      { flex: 1, marginRight: 5 },
    ]}
  >
    <Text style={styles.optionText}>🖼️ Imagen publicitaria</Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() => handleMediaTypeSelection('video')}
    style={[
      styles.optionButton,
      mediaType === 'video' && styles.selectedOption,
      { flex: 1, marginLeft: 5 },
    ]}
  >
    <Text style={styles.optionText}>🎬 Video publicitario</Text>
  </TouchableOpacity>
</View>

<View style={styles.imagePicker}>
  {mediaType === 'imagen' && imageUri && (
    <Image source={{ uri: imageUri }} style={styles.image} />
  )}
  {mediaType === 'video' && videoUri && (
    <Text style={{ color: '#D8A353', fontSize: 12 }}>
      🎬 Video listo para publicar (máx. 30 segundos)
    </Text>
  )}
  {!mediaType && (
    <Text style={styles.imageText}>Selecciona una opción arriba</Text>
  )}
</View>
{mediaType && (
  <TouchableOpacity onPress={openGallery} style={styles.button}>
    <Text style={styles.buttonText}>
      📤 {mediaType === 'imagen' ? 'Sube tu imagen publicitaria' : 'Sube tu video publicitario'}
    </Text>
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
  {mediaType === 'video' ? (
    <View style={styles.column}>
      <Text style={styles.columnTitle}>🎬 Video destacado</Text>
      {opcionesVideo.destacado.map((op, index) => {
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
  ) : (
    <>
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
    </>
  )}
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
        <Modal
  visible={showWaitModal}
  transparent
  animationType="fade"
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalText}>🚦 Cupo lleno</Text>
      <Text style={styles.modalSubtext}>
        En este momento hay 20 anuncios activos. Tu anuncio ha sido puesto en espera y se activará automáticamente cuando haya espacio.
      </Text>
      <TouchableOpacity
  style={styles.modalButton}
  onPress={async () => {
    const existing = await AsyncStorage.getItem('adsList');
    const ads = existing ? JSON.parse(existing) : [];
    const updatedAds = [...ads, pendingAdData];
    await AsyncStorage.setItem('adsList', JSON.stringify(updatedAds));
    await syncAdToFirestore(pendingAdData);
    setShowWaitModal(false);
    navigation.goBack();
  }}
>
  <Text style={styles.modalButtonText}>Aceptar</Text>
</TouchableOpacity>
<TouchableOpacity
  style={[styles.modalButton, { marginTop: 10, backgroundColor: '#444' }]}
  onPress={() => {
    setShowWaitModal(false);
    setPendingAdData(null);
  }}
>
  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Cancelar</Text>
</TouchableOpacity>
    </View>
  </View>
</Modal>
<Modal visible={showIaModal} transparent animationType="fade">
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalText}>🧠 Análisis del anuncio</Text>
      <ScrollView>
        <Text style={styles.modalSubtext}>{iaAnalysisText}</Text>
      </ScrollView>
      <TouchableOpacity
        style={styles.modalButton}
        onPress={async () => {
          setShowIaModal(false);
          await guardarYPublicarAnuncio(); // función nueva que llamará a tu lógica de guardado
        }}
      >
        <Text style={styles.modalButtonText}>✅ Publicar de todos modos</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.modalButton, { marginTop: 10, backgroundColor: '#444' }]}
        onPress={() => setShowIaModal(false)}
      >
        <Text style={[styles.modalButtonText, { color: '#fff' }]}>Cancelar</Text>
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
    marginTop: 15,
    padding: 22,
  },
  label: {
    color: '#CCCCCC',
    marginBottom: 5,
    marginTop: 35,
    fontSize: 12,
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
