import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { Video } from 'expo-av'; // ✅
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { exportApplicationsToPDF } from '../utils/exportUtils';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import { syncApplicationToFirestore } from '../src/firebase/helpers/syncApplicationToFirestore';
import * as MailComposer from 'expo-mail-composer';

export default function ViewApplicationsScreen({ route }) {
  const { castingId } = route.params || {};
  const [applications, setApplications] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [emailToSend, setEmailToSend] = useState('');
  const navigation = useNavigation();
  const { userData } = useUser();

  useEffect(() => {
    if (userData?.membershipType !== 'elite') {
      navigation.goBack();
    }
  }, [userData]);

  useEffect(() => {
    const loadApplications = async () => {
      try {
        const data = await AsyncStorage.getItem('applications');
        const parsed = data ? JSON.parse(data) : [];
        const filtered = parsed.filter(app => app.castingId === castingId);
        setApplications(filtered);

        for (const app of filtered) {
          await syncApplicationToFirestore(app);
        }
      } catch (error) {
        console.error('Error al cargar postulaciones:', error);
      }
    };

    const unsubscribe = navigation.addListener('focus', loadApplications);
    return unsubscribe;
  }, [navigation]);

  const sanitizeProfileData = (profile) => {
    const cleaned = { ...profile };
    if (!cleaned.profilePhoto?.startsWith('http') && !cleaned.profilePhoto?.startsWith('file')) {
      cleaned.profilePhoto = null;
    }
    return cleaned;
  };

  const handleSendEmail = async () => {
    if (!emailToSend.includes('@')) {
      alert('Por favor, ingresa un correo válido.');
      return;
    }

    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
      alert('Tu dispositivo no soporta envío de correos.');
      return;
    }

    try {
      await MailComposer.composeAsync({
        recipients: [emailToSend],
        subject: 'Postulaciones exportadas - El Enlace',
        body: 'Adjunto encontrarás el PDF generado con las postulaciones.',
      });

      alert('📨 Correo preparado correctamente.');
      setEmailToSend('');
      setShowExportModal(false);
    } catch (error) {
      console.error('Error al enviar correo:', error);
      alert('No se pudo preparar el correo.');
    }
  };
const [insightModalVisible, setInsightModalVisible] = useState(false);
const [insightResult, setInsightResult] = useState('');
const [loadingInsight, setLoadingInsight] = useState(false);

const generateApplicationInsights = async () => {
  if (!applications.length) return;

  setLoadingInsight(true);
  try {
    const resumenPostulantes = applications
      .map((app, index) => {
        const p = app.profile;
        return `${index + 1}. Nombre: ${p.name || 'Sin nombre'}, Edad: ${p.age || 'N/A'}, Categoría: ${p.category || 'N/A'}, Descripción: ${p.description?.slice(0, 60) || 'Sin descripción'}...`;
      })
      .join('\n');

    const prompt = `
Eres un experto en selección de talentos para castings audiovisuales. Basado en esta lista de postulantes, genera un resumen con insights clave para una agencia elite.

Postulantes:
${resumenPostulantes}

El resumen debe indicar coincidencias, fortalezas notables y posibles candidatos ideales. Usa tono profesional pero claro.
    `.trim();

    const functions = getFunctions(getApp());
    const getInsight = httpsCallable(functions, 'generateInsightsForCasting');
    const result = await getInsight({ prompt });

    if (result.data?.text) {
      setInsightResult(result.data.text.trim());
      setInsightModalVisible(true);
    } else {
      alert("No se pudo generar análisis.");
    }
  } catch (err) {
    console.warn("❌ Error al generar análisis IA:", err);
    alert("Error al generar análisis con IA.");
  } finally {
    setLoadingInsight(false);
  }
};

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📥 Postulaciones Recibidas</Text>
        <Text style={styles.counter}>Total: {applications.length}</Text>

        {applications.length === 0 ? (
          <Text style={styles.empty}>No hay postulaciones aún para este casting.</Text>
        ) : (
          applications.map((app, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.label}>🕒 Enviado:</Text>
              <Text style={styles.value}>{new Date(app.timestamp).toLocaleString()}</Text>

              <TouchableOpacity
                style={styles.profilePreview}
                onPress={() => {
                  const cleaned = sanitizeProfileData(app.profile);
                  navigation.navigate('ProfileDetail', {
                    profileData: cleaned,
                    returnTo: 'ViewApplications',
                  });
                }}
              >
                {app.profile.profilePhoto ? (
                  <Image source={{ uri: app.profile.profilePhoto }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}><Text>👤</Text></View>
                )}
                <Text style={styles.name}>{app.profile.name || 'Sin nombre'}</Text>
                <Text style={styles.link}>Ver perfil</Text>
              </TouchableOpacity>

              {app.videos?.map((uri, i) => (
                <Video
                  key={i}
                  source={{ uri }}
                  useNativeControls
                  resizeMode="contain"
                  style={styles.video}
                />
              ))}
            </View>
          ))
        )}

  <View style={{ marginTop: 10 }}>
  <TouchableOpacity
    style={[
      styles.exportPdfButton,
      { backgroundColor: '#8B0000' }, // color original PDF
      applications.length === 0 && { opacity: 0.5 },
    ]}
    onPress={() => {
      if (applications.length === 0) {
        alert('Aún no hay postulaciones para exportar.');
        return;
      }
      exportApplicationsToPDF(castingId, 'Casting sin título', () => setShowExportModal(true));
    }}
  >
    <Text style={styles.exportPdfText}>🧾 Exportar a PDF</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[
      styles.exportPdfButton,
      { backgroundColor: '#D8A353', marginTop: 10 }, // color dorado IA
      applications.length === 0 && { opacity: 0.5 },
    ]}
    onPress={() => {
      if (applications.length === 0) {
        alert('Aún no hay postulaciones para analizar.');
        return;
      }
      generateApplicationInsights();
    }}
  >
    <Text style={[styles.exportPdfText, { color: '#000' }]}>🧠 Análisis Inteligente</Text>
  </TouchableOpacity>
</View>
      </ScrollView>

      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✅ Exportación completada</Text>
            <Text style={styles.modalText}>¿Qué deseas hacer con el archivo?</Text>

            <TextInput
              placeholder="Ingresar correo"
              placeholderTextColor="#aaa"
              value={emailToSend}
              onChangeText={setEmailToSend}
              style={styles.input}
              keyboardType="email-address"
            />

            <TouchableOpacity style={styles.modalButton} onPress={() => setShowExportModal(false)}>
              <Text style={styles.modalButtonText}>📁 Guardar en dispositivo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#444', marginTop: 10 }]}
              onPress={handleSendEmail}
            >
              <Text style={[styles.modalButtonText, { color: '#fff' }]}>📧 Enviar por correo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
  visible={insightModalVisible}
  transparent
  animationType="slide"
  onRequestClose={() => setInsightModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={[styles.modalContent, { maxHeight: '80%' }]}>
      <Text style={styles.modalTitle}>🧠 Resultado del análisis</Text>
      <ScrollView style={{ maxHeight: 300 }}>
        <Text style={{ color: '#ccc', fontSize: 14, lineHeight: 20 }}>{insightResult}</Text>
      </ScrollView>
      <TouchableOpacity style={[styles.modalButton, { marginTop: 20 }]} onPress={() => setInsightModalVisible(false)}>
        <Text style={styles.modalButtonText}>Cerrar</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  container: {
    padding: 20,
    top: 30,
    paddingBottom: 100,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  counter: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  empty: {
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  label: {
    color: '#D8A353',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  value: {
    color: '#ccc',
    marginBottom: 10,
  },
  profilePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  name: {
    color: '#fff',
    fontWeight: 'bold',
    flex: 1,
  },
  link: {
    color: '#D8A353',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  video: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
    marginBottom: 10,
  },
  exportPdfButton: {
    backgroundColor: '#8B0000',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 25,
  },
  exportPdfText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  modalContent: {
    backgroundColor: '#1B1B1B',
    padding: 20,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
    borderColor: '#D8A353',
    borderWidth: 1,
  },
  modalTitle: {
    color: '#D8A353',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#D8A353',
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D8A353',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#fff',
    width: '100%',
    marginBottom: 15,
  },
});
