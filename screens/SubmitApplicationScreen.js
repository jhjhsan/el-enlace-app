import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal, // ✅
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Video } from 'expo-av'; // ✅
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkAndIncrementPostulation } from '../utils/postulationLimiter';
import { Ionicons } from '@expo/vector-icons';
import { syncApplicationToFirestore } from '../src/firebase/helpers/syncApplicationToFirestore';
import { uploadMediaToStorage } from '../src/firebase/helpers/uploadMediaToStorage';

// 🆕 para borrar en Storage
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { storage } from '../src/firebase/firebaseConfig';

export default function SubmitApplicationScreen({ route, navigation }) {
  const { castingId, castingTitle } = route.params || {};
  const castingIdStr = String(castingId || '').trim(); // ← usa SIEMPRE este
  const [actingVideos, setActingVideos] = useState([null, null, null]);
  const [userProfile, setUserProfile] = useState(null);
  const [remainingPostulations, setRemainingPostulations] = useState(null);

  // ✅ nuevos estados UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  // 🆕 Estados para subida por acting
  const [actingUrls, setActingUrls] = useState([null, null, null]);        // URLs finales
  const [uploading, setUploading] = useState([false, false, false]);       // flags de subida
  const [progress, setProgress] = useState([0, 0, 0]);                     // 0..1 por acting
  const [actingSuccessVisible, setActingSuccessVisible] = useState(false); // modal éxito acting
  const [actingSuccessMsg, setActingSuccessMsg] = useState('');            // texto modal acting

  useEffect(() => {
    const loadProfile = async () => {
      const json = await AsyncStorage.getItem('userProfile');
      if (json) setUserProfile(JSON.parse(json));
    };

    const getRemainingPostulations = async () => {
      try {
        const data = await AsyncStorage.getItem('freePostulationLimit');
        if (data) {
          const parsed = JSON.parse(data);
          const now = new Date();
          const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;
          if (parsed.month === currentMonth) {
            setRemainingPostulations(Math.max(0, 4 - (parsed.count || 0)));
          } else {
            setRemainingPostulations(4);
          }
        } else {
          setRemainingPostulations(4);
        }
      } catch (error) {
        console.error('Error al obtener postulaciones restantes:', error);
        setRemainingPostulations(null);
      }
    };

    loadProfile();
    getRemainingPostulations();
  }, []);

  // 🆕 detección robusta de “recurso” basada en tu modelo de datos
  const isResource = React.useMemo(() => {
    const p = userProfile;
    if (!p) return false;

    const mt = String(p.membershipType || p.type || '').toLowerCase();
    if (p.isResource === true) return true;
    if (mt.includes('resource') || mt.includes('recurso')) return true;

    const flags = [p.accountType, p.profileKind, p.profileLock]
      .map(x => String(x || '').toLowerCase())
      .join(' ');
    if (flags.includes('resource') || flags.includes('recurso')) return true;

    const collect = (v) => (Array.isArray(v) ? v : v ? [v] : []);
    const listText = [
      p.resourceTitle, p.resourceType, p.services, p.offerType,
      ...collect(p.categories), ...collect(p.category),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return /recurso|resource|renta|alquiler|equipo|locaci[oó]n|veh[ií]culo|catering|motorhome|van/.test(listText);
  }, [userProfile]);

  // 🆕 helper: intentar obtener path de Storage desde la URL pública
  const pathFromDownloadURL = (url) => {
    try {
      const u = new URL(url);
      const afterO = u.pathname.split('/o/')[1] || '';
      const encodedPath = afterO.split('?')[0] || '';
      const decoded = decodeURIComponent(encodedPath);
      return decoded || null;
    } catch {
      return null;
    }
  };

  // 🆕 Subida de un acting con progreso
  const uploadSingleActing = async (index, uri) => {
    if (!userProfile?.email) {
      Alert.alert('Error', 'No hay email de usuario para la ruta de subida.');
      return;
    }
    const emailNorm = userProfile.email.trim().toLowerCase();

    // flags UI
    setUploading((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
    setProgress((prev) => {
      const next = [...prev];
      next[index] = 0;
      return next;
    });

    try {
      const path = `applications/${castingIdStr}/${emailNorm}/acting_${index + 1}.mp4`;

      // callback de progreso: onProgress(loaded, total, pct?)
      const onProgress = (loaded, total, pct) => {
        const ratio = typeof pct === 'number' ? pct : (total ? loaded / total : 0);
        setProgress((prev) => {
          const next = [...prev];
          next[index] = Math.max(0, Math.min(1, ratio));
          return next;
        });
      };

      const upRes = await uploadMediaToStorage(uri, path, { contentType: 'video/mp4' }, onProgress);
      const downloadURL = typeof upRes === 'string'
        ? upRes
        : (upRes?.downloadURL || upRes?.url);

      if (downloadURL) {
        setActingUrls((prev) => {
          const next = [...prev];
          next[index] = downloadURL;
          return next;
        });

        // asegurar progreso al 100%
        setProgress((prev) => {
          const next = [...prev];
          next[index] = 1;
          return next;
        });

        setActingSuccessMsg(`Acting ${index + 1} subido correctamente`);
        setActingSuccessVisible(true);
        setTimeout(() => setActingSuccessVisible(false), 1400);
      } else {
        Alert.alert('Error', 'No se obtuvo URL del video subido.');
      }
    } catch (e) {
      console.log('❌ Error subiendo acting', index + 1, e);
      Alert.alert('Error', `Falló la subida del Acting ${index + 1}.`);
    } finally {
      setUploading((prev) => {
        const next = [...prev];
        next[index] = false;
        return next;
      });
    }
  };

  const pickVideo = async (index) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'video/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    const pickedUri =
      result?.assets?.[0]?.uri ||
      (result?.type === 'success' ? result?.uri : null);

    if (!pickedUri) return;

    // preview local en el player
    setActingVideos((prev) => {
      const next = [...prev];
      next[index] = pickedUri;
      return next;
    });

    // dispara subida inmediata con progreso
    try {
      await uploadSingleActing(index, pickedUri);
    } catch {}
  };

  // 🆕 Eliminar acting (borra en Firebase y limpia estado)
  const handleDeleteActing = async (index) => {
    if (uploading[index]) return; // no eliminar mientras sube

    Alert.alert(
      'Eliminar acting',
      `¿Seguro que quieres eliminar el Acting ${index + 1}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const url = actingUrls[index];
              let storagePath = null;

              // 1) intenta derivar desde la URL
              if (url) storagePath = pathFromDownloadURL(url);

              // 2) si no hay URL o no se pudo, usa el path determinístico de subida
              if (!storagePath && userProfile?.email) {
                const emailNorm = userProfile.email.trim().toLowerCase();
                storagePath = `applications/${castingIdStr}/${emailNorm}/acting_${index + 1}.mp4`;
              }

              // 3) si tenemos path, borra en Firebase
              if (storagePath) {
                try {
                  const ref = storageRef(storage, storagePath);
                  await deleteObject(ref);
                } catch (err) {
                  console.log('⚠️ No se pudo borrar en Storage:', err?.message || err);
                }
              }
            } finally {
              // Limpia estado local para permitir reemplazar
              setActingVideos((prev) => {
                const next = [...prev];
                next[index] = null;
                return next;
              });
              setActingUrls((prev) => {
                const next = [...prev];
                next[index] = null;
                return next;
              });
              setProgress((prev) => {
                const next = [...prev];
                next[index] = 0;
                return next;
              });
              setUploading((prev) => {
                const next = [...prev];
                next[index] = false;
                return next;
              });
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    const filteredVideos = actingVideos.filter(Boolean);

    if (!userProfile) {
      Alert.alert('Error', 'Perfil del usuario no disponible.');
      return;
    }

    const membershipType = userProfile?.membershipType || 'free';

    // Límite para Free
    if (membershipType === 'free') {
      const { allowed, remaining, error } = await checkAndIncrementPostulation();
      if (typeof remaining === 'number') setRemainingPostulations(Math.max(0, remaining));
      if (error) {
        Alert.alert('Error', 'No se pudo verificar el límite de postulaciones.');
        return;
      }
      if (!allowed) {
        Alert.alert(
          'Límite alcanzado',
          'Solo puedes postularte a 4 castings por mes con el plan Free. Mejora a Pro para postulaciones ilimitadas.'
        );
        return;
      }
    }

    // 🆕 Asegurar que todo tenga URL (si algo no se subió aún, súbelo aquí)
    let finalActingUrls = [...actingUrls]; // las que ya subimos en pick
    for (let i = 0; i < filteredVideos.length; i++) {
      const uri = filteredVideos[i];
      if (!finalActingUrls[i] && uri) {
        try {
          const emailNorm = (userProfile?.email || '').trim().toLowerCase();
          const path = `applications/${castingIdStr}/${emailNorm}/acting_${i + 1}.mp4`;
          const upRes = await uploadMediaToStorage(uri, path, { contentType: 'video/mp4' });
          const downloadURL = typeof upRes === 'string'
            ? upRes
            : (upRes?.downloadURL || upRes?.url);
          finalActingUrls[i] = downloadURL || null;
        } catch (e) {
          console.log('⚠️ No se pudo subir acting (submit)', i + 1, e);
        }
      }
    }
    finalActingUrls = finalActingUrls.filter(Boolean);

    const applicationData = {
      castingId: String(castingId || ''),   // ← forzamos string
      castingTitle: castingTitle || 'Sin título',
      timestamp: new Date().toISOString(),

      // 🆕 Guarda actingVideos con URLs de Storage (y "videos" por compat)
      actingVideos: finalActingUrls,
      videos: finalActingUrls,

      profile: {
        // Identificación
        name: userProfile.name || userProfile.agencyName || '',
        email: userProfile.email || '',

        // Contacto
        phone: userProfile.phone || userProfile.phoneNumber || '',
        instagram: (userProfile.instagram || '').toString().replace(/^@/, ''),

        // Demografía / medidas
        age: userProfile.age || userProfile.edad || '',
        sex: userProfile.sex || userProfile.sexo || '',
        height: userProfile.height || userProfile.estatura || '',
        skinColor: userProfile.skinColor || userProfile.piel || '',
        eyeColor: userProfile.eyeColor || userProfile.ojos || '',
        hairColor: userProfile.hairColor || userProfile.cabello || '',

        // Tatuajes / piercings
        tattoos: userProfile.tattoos || '',
        tattoosLocation: userProfile.tattoosLocation || userProfile.tattoosUbicacion || '',
        piercings: userProfile.piercings || '',
        piercingsLocation: userProfile.piercingsLocation || userProfile.piercingsUbicacion || '',

        // Tallas
        shirtSize: userProfile.shirtSize || userProfile.tallaPolera || '',
        pantsSize: userProfile.pantsSize || userProfile.tallaPantalon || '',
        shoeSize: userProfile.shoeSize || userProfile.tallaZapato || '',

        // Ubicación
        country: userProfile.country || userProfile.pais || '',
        region: userProfile.region || '',
        city: userProfile.city || userProfile.ciudad || '',
        comuna: userProfile.comuna || '',
        address: userProfile.address || '',

        // Media
        profilePhoto: userProfile.profilePhoto || '',
        presentationVideo: userProfile.presentationVideo || userProfile.profileVideo || '',

        // Categorías (normalizado a array)
        categories: Array.isArray(userProfile.categories)
          ? userProfile.categories
          : Array.isArray(userProfile.category)
          ? userProfile.category
          : (userProfile.category ? [userProfile.category] : []),

        // Book
        bookPhotos: Array.isArray(userProfile.bookPhotos) ? userProfile.bookPhotos : [],
      },
    };

    try {
      setIsSubmitting(true);

      const existing = await AsyncStorage.getItem('applications');
      const parsed = existing ? JSON.parse(existing) : [];

      const normalize = (e='') => String(e).toLowerCase().trim();
      const alreadyApplied = parsed.some(
        (app) =>
          String(app.castingId) === castingIdStr &&
          normalize(app.profile?.email) === normalize(userProfile.email)
      );
      if (alreadyApplied) {
        setIsSubmitting(false);
        Alert.alert('Ya postulado', 'Ya enviaste una postulación a este casting.');
        return;
      }

      parsed.push(applicationData);
      await AsyncStorage.setItem('applications', JSON.stringify(parsed));

      // Guardar en Firestore
      await syncApplicationToFirestore(applicationData);

      // ✅ Persistimos flag local de “postulado” (por si el callback no estuviera)
      try {
        const uid = userProfile?.id || userProfile?.uid || userProfile?.email || 'user';
        if (uid && castingIdStr) {
          await AsyncStorage.setItem(`applied_${uid}_${castingIdStr}`, '1');
        }
      } catch {}

      // ✅ Avisar al detalle (esto dispara el cambio a “Postulado” en CastingDetailScreen)
      route.params?.onSubmitted?.();

      // ✅ UI de éxito
      setIsSubmitted(true);
      setIsSubmitting(false);
      setSuccessVisible(true);
      setTimeout(() => {
        setSuccessVisible(false);
        navigation.goBack(); // volver al detalle para ver el botón en “Postulado”
      }, 1600);
    } catch (error) {
      console.error('Error al guardar postulación:', error);
      setIsSubmitting(false);
      Alert.alert('Error', 'Hubo un problema al enviar la postulación.');
    }
  };

  return (
    <View style={styles.screen}>
      {/* Flecha de volver */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>
          Postulación al casting:{"\n"}
          <Text style={styles.castingTitle}>{castingTitle || 'Sin título'}</Text>
        </Text>

        {userProfile?.membershipType === 'free' && remainingPostulations !== null && (
          <Text style={styles.remaining}>
            Postulaciones restantes este mes: {remainingPostulations}
          </Text>
        )}

        {/* ⛔️ Ocultar toda la sección de Acting si es recurso.
            También esperamos a tener userProfile para evitar parpadeo. */}
        {userProfile && !isResource && (
          <>
            <Text style={styles.note}>
              * Puedes subir hasta 3 videos de actuación. Estos NO se guardarán en tu perfil. Son solo para esta postulación.
            </Text>

            {actingVideos.map((video, index) => (
              <View key={index} style={styles.videoContainer}>
                {video ? (
                  <Video
                    source={{ uri: video }}
                    useNativeControls
                    resizeMode="contain"
                    style={styles.video}
                  />
                ) : (
                  <Text style={styles.placeholder}>Acting {index + 1} no cargado</Text>
                )}

                {/* Barra de progreso */}
                {uploading[index] || progress[index] > 0 ? (
                  <View style={styles.progressWrap}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.round((progress[index] || 0) * 100)}%` }]} />
                    </View>
                    <Text style={styles.progressText}>
                      {uploading[index] ? `Subiendo… ${Math.round((progress[index] || 0) * 100)}%` :
                      actingUrls[index] ? '100%' : ''}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      uploading[index] && { opacity: 0.6 },
                      actingUrls[index] && styles.buttonUploaded, // azul si ya subido
                    ]}
                    onPress={() => pickVideo(index)}
                    disabled={uploading[index]}
                  >
                    <Text style={styles.buttonText}>
                      {uploading[index]
                        ? `Subiendo…`
                        : actingUrls[index]
                        ? `Acting ${index + 1} subido`
                        : `Subir Acting ${index + 1}`}
                    </Text>
                  </TouchableOpacity>

                  {/* Botón eliminar */}
                  <TouchableOpacity
                    style={[styles.deleteBtn, (!actingVideos[index] && !actingUrls[index]) && { opacity: 0.4 }]}
                    onPress={() => handleDeleteActing(index)}
                    disabled={!actingVideos[index] && !actingUrls[index]}
                  >
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <Text style={styles.deleteText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        <TouchableOpacity
          style={[styles.submitButton, isSubmitted && styles.submittedButton]}
          onPress={handleSubmit}
          disabled={isSubmitting || isSubmitted}
        >
          <Text style={styles.submitText}>
            {isSubmitting ? 'Enviando…' : isSubmitted ? 'Postulado' : 'Enviar postulación'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ✅ Modal de postulación exitosa */}
      <Modal
        visible={successVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <Ionicons name="checkmark-circle" size={56} color="#22c55e" />
            <Text style={styles.successTitle}>¡Postulación enviada!</Text>
            <Text style={styles.successText}>Tu postulación fue enviada con éxito.</Text>
          </View>
        </View>
      </Modal>

      {/* ✅ Modal de subida de acting exitosa */}
      <Modal
        visible={actingSuccessVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setActingSuccessVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <Ionicons name="checkmark-circle" size={56} color="#22c55e" />
            <Text style={styles.successTitle}>¡Video subido!</Text>
            <Text style={styles.successText}>{actingSuccessMsg || 'Tu acting se subió correctamente.'}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    top: 20,
    backgroundColor: '#000',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  container: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingBottom: 120,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    top: 0,
    marginBottom: 5,
  },
  castingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'normal',
  },
  remaining: {
    color: '#fff',
    fontSize: 14,
    marginTop: 5,
    marginBottom: 15,
    textAlign: 'center',
  },
  note: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  videoContainer: {
    marginBottom: 25,
    alignItems: 'center',
  },
  placeholder: {
    color: '#888',
    marginBottom: 10,
  },
  video: {
    width: 300,
    height: 200,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
    marginBottom: 10,
  },
  // Acciones por acting
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#D8A353',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  buttonUploaded: {
    backgroundColor: '#1F6FEB', // azul cuando ya está subido
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8B0000',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  deleteText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  submitButton: {
    marginTop: 30,
    backgroundColor: '#D8A353',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  // ✅ estilo para “Postulado”
  submittedButton: {
    backgroundColor: '#1F6FEB',
  },
  submitText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  // ✅ modal éxito
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successModal: {
    width: '80%',
    backgroundColor: '#0f0f0f',
    borderRadius: 14,
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  successTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  successText: {
    color: '#cfcfcf',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  // 🆕 barra de progreso
  progressWrap: {
    width: 300,
    marginBottom: 10,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: '#D8A353',
  },
  progressText: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
});
