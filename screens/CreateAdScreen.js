// screens/CreateAdScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
  Alert,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { syncAdToFirestore } from '../src/firebase/helpers/syncAdToFirestore';
import { analyzeAdContent } from '../src/firebase/helpers/analyzeAdContent';
import { db } from '../src/firebase/firebaseConfig';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import * as FileSystem from 'expo-file-system';
import { uploadMediaToStorage } from '../src/firebase/helpers/uploadMediaToStorage';

// ----------------------
// PRECIOS / OPCIONES
// ----------------------
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
  destacado: { '7': 14990, '15': 24990 },
};
const opcionesVideo = {
  destacado: [
    { duracion: '7', texto: '🎬 7 días – $14.990' },
    { duracion: '15', texto: '🎬 15 días – $24.990' },
  ],
};

const DASH_BG = '#000';
const ACCENT = '#D8A353';

export default function CreateAdScreen() {
  const { userData } = useUser();
  const navigation = useNavigation();
  const route = useRoute();

  // MODO: planes vs subir (post-pago)
  const enableUpload = !!route?.params?.enableUpload;
  const orderIdFromParams = route?.params?.adId || route?.params?.orderId || null;

  // Estado general
  const [imageUri, setImageUri] = useState(null);
  const [videoUri, setVideoUri] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'imagen' | 'video'
  const [tipoArchivo, setTipoArchivo] = useState(null);

  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');

  const [selectedDuration, setSelectedDuration] = useState(null); // '3' | '7' | '15'
  const [selectedPlan, setSelectedPlan] = useState(null); // 'normal' | 'destacado' (o 'video/destacado' implícito)

  // UI / modales
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showWaitModal, setShowWaitModal] = useState(false);
  const [pendingAdData, setPendingAdData] = useState(null);
  const [showIaModal, setShowIaModal] = useState(false);
  const [iaAnalysisText, setIaAnalysisText] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishBtnText, setPublishBtnText] = useState('📢 Publicar anuncio');

  // Pago / Orden
  const [orderDoc, setOrderDoc] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(!!enableUpload);

  // Seguridad: acceso
  useEffect(() => {
    if (userData?.membershipType !== 'pro' && userData?.membershipType !== 'elite') {
      Alert.alert('Acceso restringido', 'Debes tener plan Pro o Elite para publicar anuncios.');
      navigation.goBack();
    }
  }, [userData, navigation]);

  // Al entrar con deep link, verificamos la orden pagada
  useEffect(() => {
    const checkOrder = async () => {
      if (!enableUpload || !orderIdFromParams) return;
      try {
        const ref = doc(db, 'adOrders', String(orderIdFromParams));
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setLoadingOrder(false);
          Alert.alert('Orden no encontrada', 'Vuelve a la web de pago e inténtalo otra vez.');
          return;
        }
        const data = snap.data();
        setOrderDoc(data);
        setSelectedDuration(String(data?.durationDays || '7')); // duración heredada
        // Para video vs imagen usamos el campo mediaKind; si es 'video', solo opciones video
        if (data?.mediaKind === 'video') {
          setMediaType('video');
          setTipoArchivo('video');
          setSelectedPlan('destacado');
        }
      } catch (e) {
        console.log('Error reading order:', e);
        Alert.alert('Error', 'No se pudo validar la orden.');
      } finally {
        setLoadingOrder(false);
      }
    };
    checkOrder();
  }, [enableUpload, orderIdFromParams]);

  // Helpers
  const getExpiration = useCallback((days) => {
    const d = parseInt(days);
    if (!d || isNaN(d)) return null;
    return Date.now() + d * 24 * 60 * 60 * 1000;
  }, []);

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
    const hasNewApi = !!ImagePicker?.MediaType;
    const mediaTypes =
      mediaType === 'imagen'
        ? (hasNewApi ? [ImagePicker.MediaType.image] : ImagePicker.MediaTypeOptions.Images)
        : (hasNewApi ? [ImagePicker.MediaType.video] : ImagePicker.MediaTypeOptions.Videos);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permiso de galería denegado.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        quality: 0.8,
        videoMaxDuration: 30,
      });
      if (result.canceled) return;

      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      if (mediaType === 'imagen') {
        const isValid = await validateImageBeforeUpload(uri);
        if (!isValid) return;
        setImageUri(uri);
        setVideoUri(null);
      } else {
        setVideoUri(uri);
        setImageUri(null);
      }
    } catch (e) {
      console.log('❌ Error al abrir la galería:', e);
      alert('No se pudo abrir la galería. Intenta nuevamente.');
    }
  };

  // ----------------------
  // PRE-PAGO: crear orden y abrir la web
  // ----------------------
  const priceCLP = useMemo(() => {
    if (mediaType === 'video') {
      if (selectedPlan !== 'destacado') return null;
      return preciosVideo.destacado?.[selectedDuration || ''];
    }
    if (!selectedPlan || !selectedDuration) return null;
    return precios[selectedPlan]?.[selectedDuration || ''] ?? null;
  }, [mediaType, selectedPlan, selectedDuration]);

  const createOrderAndOpenWeb = async () => {
    if (!mediaType) return Alert.alert('Falta info', 'Selecciona imagen o video.');
    if (!selectedDuration) return Alert.alert('Falta info', 'Selecciona duración.');
    if (mediaType !== 'video' && !selectedPlan) return Alert.alert('Falta info', 'Selecciona tipo: Normal o Destacado.');

    const orderId = `ord_${Date.now()}`;
    const payload = {
      id: orderId,
      userEmail: String(userData?.email || '').trim().toLowerCase(),
      mediaKind: mediaType, // 'imagen' | 'video'
      planType: mediaType === 'video' ? 'video_destacado' : selectedPlan, // normal | destacado | video_destacado
      durationDays: Number(selectedDuration),
      priceCLP: Number(priceCLP || 0),
      status: 'pendingPayment',
      createdAt: serverTimestamp(),
      // opcional: device info, return/deeplink, etc.
    };

    try {
      await setDoc(doc(db, 'adOrders', orderId), payload);
    } catch (e) {
      console.log('❌ No se pudo crear la orden:', e);
      return Alert.alert('Error', 'No se pudo crear la orden. Intenta de nuevo.');
    }

    // Abre la web de pago con parámetros seguros
    const params = new URLSearchParams({
      orderId,
      plan: payload.planType,
      duration: String(payload.durationDays),
      email: payload.userEmail,
      // opcional: returnUrl para abrir el deep link
    }).toString();

    const payUrl = `https://elenlace.cl/publicidad/pagar?${params}`;
    try {
      await Linking.openURL(payUrl);
    } catch (e) {
      Alert.alert('No se pudo abrir el pago', 'Copia y pega esta URL en tu navegador:\n' + payUrl);
    }
  };

  // ----------------------
  // POST-PAGO: subir y publicar (verifica status=paid)
  // ----------------------
  const handlePublishAd = async () => {
    if (!enableUpload) {
      // En modo Pre-pago, nunca publicamos en la app
      return Alert.alert('Paga en la web', 'Primero finaliza el pago en la web para continuar.');
    }

    if (loadingOrder) return;
    if (!orderDoc || orderDoc?.status !== 'paid') {
      return Alert.alert('Pago no confirmado', 'Aún no tenemos confirmación de pago. Si ya pagaste, vuelve a abrir desde el enlace o espera unos segundos.');
    }

    // Validación mínima
    if ((!imageUri && !videoUri) || title.trim() === '') {
      return alert('Debes subir una imagen o video y colocar un título.');
    }

    setIsSubmitting(true);
    setPublishBtnText('⏳ Subiendo archivo…');

    // Cupo actual
    const allAdsJson = await AsyncStorage.getItem('adsList');
    const allAds = allAdsJson ? JSON.parse(allAdsJson) : [];
    const now = Date.now();
    const activeAds = allAds.filter((ad) => ad.aprobado && ad.expiresAt > now);

    // Subir media
    let tempUrl;
    try {
      tempUrl =
        orderDoc.mediaKind === 'imagen'
          ? await uploadMediaToStorage(imageUri, `ads/${userData.email}_img_${Date.now()}.jpg`)
          : await uploadMediaToStorage(videoUri, `ads/${userData.email}_vid_${Date.now()}.mp4`);

      console.log('✅ URL subida lista:', tempUrl);
    } catch (error) {
      console.error('❌ Error al subir media:', error);
      alert('Error al subir el archivo. Intenta nuevamente.');
      setIsSubmitting(false);
      setPublishBtnText('📢 Publicar anuncio');
      return;
    }

    // Cupo lleno -> en espera
    if (activeAds.length >= 20) {
      const pendingAd = buildAdObject({
        urlFromStorage: tempUrl,
        mediaKind: orderDoc.mediaKind,
        userData,
        title,
        link,
        destacado: orderDoc.planType?.includes('destacado'),
        durationDays: Number(orderDoc.durationDays || 7),
        approved: false,
        waiting: true,
        orderId: orderDoc.id || orderIdFromParams,
      });

      setPendingAdData(pendingAd);
      setIsSubmitting(false);
      setPublishBtnText('📢 Publicar anuncio');
      setShowWaitModal(true);
      return;
    }

    // Analizar con IA (texto)
    try {
      setPublishBtnText('🤖 Analizando con IA…');
      const adData = { title, description: title + ' ' + (link || '') };
      const result = await analyzeAdContent(adData);
      if (result?.error) {
        alert('Error al analizar anuncio: ' + result.error);
        setIsSubmitting(false);
        setPublishBtnText('📢 Publicar anuncio');
        return;
      }
      setIaAnalysisText(result.analysis || 'Sin observaciones.');
      setShowIaModal(true);
    } catch (error) {
      console.error('❌ Error al analizar con IA:', error);
      alert('Ocurrió un error al analizar el contenido.');
    } finally {
      setIsSubmitting(false);
      setPublishBtnText('📢 Publicar anuncio');
    }
  };

  const guardarYPublicarAnuncio = async (urlFromStorage) => {
    if (!urlFromStorage) {
      alert('No se encontró el archivo subido. Vuelve a intentar publicar.');
      return;
    }
    if (!orderDoc || orderDoc?.status !== 'paid') {
      return Alert.alert('Pago no confirmado', 'Aún no tenemos confirmación de pago.');
    }

    const newAd = buildAdObject({
      urlFromStorage,
      mediaKind: orderDoc.mediaKind,
      userData,
      title,
      link,
      destacado: orderDoc.planType?.includes('destacado'),
      durationDays: Number(orderDoc.durationDays || 7),
      approved: true,
      waiting: false,
      orderId: orderDoc.id || orderIdFromParams,
    });

    try {
      // Local
      const existing = await AsyncStorage.getItem('adsList');
      const ads = existing ? JSON.parse(existing) : [];
      const updatedAds = [...ads.filter((a) => a.id !== newAd.id), newAd];
      await AsyncStorage.setItem('adsList', JSON.stringify(updatedAds));

      // Remoto
      await syncAdToFirestore(newAd);

      setShowSuccessModal(true);
    } catch (error) {
      console.log('Error al guardar anuncio:', error);
      alert('Hubo un problema al guardar el anuncio.');
    }
  };

  // ----------------------
  // Validación IA de imágenes (pre-subida)
  // ----------------------
  const validateImageBeforeUpload = async (uri) => {
    const base64Image = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const functions = getFunctions(getApp());
    const validateMedia = httpsCallable(functions, 'validateMediaContent');
    try {
      const result = await validateMedia({ base64Image });
      const { flagged, categories } = result.data;
      if (flagged) {
        console.warn('🚫 Imagen bloqueada por IA:', categories);
        alert('La imagen contiene contenido ofensivo. Usa otra imagen.');
        return false;
      }
      return true;
    } catch (error) {
      console.error('❌ Error al validar la imagen:', error);
      alert('Ocurrió un error al validar la imagen. Intenta nuevamente.');
      return false;
    }
  };

  // ----------------------
  // RENDER
  // ----------------------
  const renderHeader = (
    <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: 'absolute', top: 3, left: -2, zIndex: 10 }}>
      <Ionicons name="arrow-back" size={28} color="#fff" />
    </TouchableOpacity>
  );

  // Modo Upload bloqueado hasta que esté "paid"
  const uploadBlocked = enableUpload && !loadingOrder && orderDoc?.status !== 'paid';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
        {renderHeader}

        {!enableUpload ? (
          // ------------------------
          // MODO PLANES (PRE-PAGO)
          // ------------------------
          <>
            <Text style={styles.title}>Publicidad en El Enlace</Text>
            <Text style={styles.subtleIntro}>
              📢 Esta sección es informativa. El pago se realiza en nuestra web y luego vuelves aquí automáticamente para subir tu anuncio.
            </Text>

            <Text style={styles.label}>Tipo de contenido publicitario</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <TouchableOpacity
                onPress={() => handleMediaTypeSelection('imagen')}
                style={[styles.optionButton, mediaType === 'imagen' && styles.selectedOption, { flex: 1, marginRight: 5 }]}
              >
                <Text style={styles.optionText}>🖼️ Imagen publicitaria</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleMediaTypeSelection('video')}
                style={[styles.optionButton, mediaType === 'video' && styles.selectedOption, { flex: 1, marginLeft: 5 }]}
              >
                <Text style={styles.optionText}>🎬 Video publicitario</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Planes y duración</Text>
            <View style={styles.optionColumns}>
              {mediaType === 'video' ? (
                <View style={styles.column}>
                  <Text style={styles.columnTitle}>🎬 Video destacado</Text>
                  {opcionesVideo.destacado.map((op, i) => {
                    const sel = selectedDuration === op.duracion;
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[styles.optionButton, sel && styles.selectedOption]}
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
                      const sel = selectedPlan === 'normal' && selectedDuration === op.duracion;
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[styles.optionButton, sel && styles.selectedOption]}
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
                      const sel = selectedPlan === 'destacado' && selectedDuration === op.duracion;
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[styles.optionButton, sel && styles.selectedOption]}
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

            {!!priceCLP && (
              <Text style={{ color: '#ccc', marginTop: 8 }}>
                💰 Total: <Text style={{ color: '#fff', fontWeight: 'bold' }}>${priceCLP.toLocaleString('es-CL')}</Text>
              </Text>
            )}

            <TouchableOpacity style={styles.button} onPress={createOrderAndOpenWeb}>
              <Text style={styles.buttonText}>🌐 Continuar en la web</Text>
            </TouchableOpacity>

            <Text style={{ color: '#777', fontSize: 11, marginTop: 10 }}>
              Al pagar en la web, volverás automáticamente a esta pantalla para subir tu anuncio.
            </Text>
          </>
        ) : (
          // ------------------------
          // MODO SUBIR (POST-PAGO)
          // ------------------------
          <>
            <Text style={styles.title}>Subir anuncio</Text>
            {loadingOrder ? (
              <Text style={{ color: '#ccc', marginTop: 10 }}>Verificando tu pago…</Text>
            ) : orderDoc?.status !== 'paid' ? (
              <Text style={{ color: '#f66', marginTop: 10 }}>
                Aún no tenemos confirmación de pago para la orden {orderIdFromParams}. Si ya pagaste, vuelve a abrir el enlace que te llevó aquí.
              </Text>
            ) : (
              <Text style={{ color: '#7f7', marginTop: 10 }}>
                ✅ Pago confirmado. Plan: {orderDoc.planType} — {orderDoc.durationDays} días
              </Text>
            )}

            <Text style={styles.label}>Tipo de contenido publicitario</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, opacity: 0.6 }}>
              <View style={[styles.optionButton, { flex: 1, marginRight: 5, backgroundColor: '#222' }]}>
                <Text style={styles.optionText}>
                  {orderDoc?.mediaKind === 'video' ? '🎬 Video' : '🖼️ Imagen'} (fijado por el plan)
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 5 }} />
            </View>

            <View style={styles.imagePicker}>
              {orderDoc?.mediaKind === 'imagen' && imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
              {orderDoc?.mediaKind === 'video' && videoUri && (
                <Text style={{ color: ACCENT, fontSize: 12 }}>🎬 Video listo para publicar (máx. 30 s)</Text>
              )}
              {!imageUri && !videoUri && (
                <Text style={styles.imageText}>
                  {orderDoc?.mediaKind === 'video' ? 'Selecciona tu video' : 'Selecciona tu imagen'}
                </Text>
              )}
            </View>

            {orderDoc?.status === 'paid' && (
              <TouchableOpacity onPress={openGallery} style={styles.button}>
                <Text style={styles.buttonText}>
                  📤 {orderDoc?.mediaKind === 'video' ? 'Sube tu video publicitario' : 'Sube tu imagen publicitaria'}
                </Text>
              </TouchableOpacity>
            )}

            <Text style={styles.subtleIntro}>📝 Publica un anuncio para promocionar tu perfil, servicios o proyectos.</Text>

            <Text style={styles.label}>Título del anuncio *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Clases de actuación"
              placeholderTextColor="#888"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>
              Enlace externo (opcional)
              {'\n'}
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
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={{ color: '#888', fontSize: 12, marginTop: 8 }}>
              {orderDoc?.mediaKind === 'video'
                ? 'Máx. 30s. Formato horizontal recomendado.'
                : 'Recomendamos imágenes 16:9 para el Dashboard.'}
            </Text>

            <TouchableOpacity
              style={[styles.button, { opacity: isSubmitting || uploadBlocked ? 0.6 : 1 }]}
              disabled={isSubmitting || uploadBlocked}
              onPress={handlePublishAd}
            >
              <Text style={styles.buttonText}>{publishBtnText}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* MODALES */}
        <Modal visible={showSuccessModal} transparent animationType="fade">
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

        <Modal visible={showWaitModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>🚦 Cupo lleno</Text>
              <Text style={styles.modalSubtext}>
                Hay 20 anuncios activos. Tu anuncio quedará en espera y se activará automáticamente cuando haya espacio.
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
                style={[styles.modalButton, { opacity: isPublishing ? 0.6 : 1 }]}
                disabled={isPublishing}
                onPress={async () => {
                  setIsPublishing(true);
                  try {
                    await guardarYPublicarAnuncio(imageUri || videoUri ? null : null); // placeholder para state
                  } finally {
                    setIsPublishing(false);
                  }
                }}
              >
                <Text style={styles.modalButtonText}>{isPublishing ? '⏳ Publicando…' : '✅ Publicar de todos modos'}</Text>
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

// Construye el objeto del anuncio
function buildAdObject({
  urlFromStorage,
  mediaKind,
  userData,
  title,
  link,
  destacado,
  durationDays,
  approved,
  waiting,
  orderId,
}) {
  const now = Date.now();
  return {
    id: now.toString(),
    orderId: String(orderId || ''),
    imageUri: mediaKind === 'imagen' ? urlFromStorage : null,
    videoUri: mediaKind === 'video' ? urlFromStorage : null,
    tipo: mediaKind, // 'imagen' | 'video'
    title: title?.trim(),
    link: link?.trim() || null,
    creatorEmail: String(userData?.email || '').trim().toLowerCase(),
    membershipType: userData?.membershipType,
    destacado: !!destacado,
    plan: String(durationDays),
    monto:
      mediaKind === 'video'
        ? preciosVideo.destacado?.[String(durationDays)]
        : (destacado ? precios.destacado?.[String(durationDays)] : precios.normal?.[String(durationDays)]),
    aprobado: !!approved,
    enEspera: !!waiting,
    createdAt: now,
    expiresAt: now + Number(durationDays || 7) * 24 * 60 * 60 * 1000,
    status: approved ? 'active' : waiting ? 'queued' : 'pending',
  };
}

const styles = StyleSheet.create({
  container: { 
    backgroundColor: DASH_BG, 
    flex: 1, 
    marginTop: 15, 
    padding: 22 
  },

  title: { 
    color: ACCENT,   // ahora usa tu dorado
    fontWeight: '#D8A353', 
    fontSize: 22, 
    marginBottom: 10, 
    textAlign: 'center',  // mejor centrado que un marginLeft fijo
  },

  label: { 
    color: '#CCCCCC', 
    marginBottom: 5, 
    marginTop: 25, 
    fontSize: 12 
  },

  input: { 
    backgroundColor: '#1a1a1a', 
    color: '#fff', 
    padding: 10, 
    borderRadius: 10 
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

  imageText: { color: '#888' },
  image: { width: '100%', height: '100%', borderRadius: 12 },

  optionColumns: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 0, 
    marginBottom: -10 
  },

  column: { width: '48%' },

  columnTitle: { 
    color: ACCENT, 
    fontWeight: 'bold', 
    fontSize: 14, 
    marginBottom: 8 
  },

  optionButton: { 
    borderColor: ACCENT, 
    borderWidth: 1, 
    borderRadius: 10, 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    marginBottom: 10 
  },

  selectedOption: { backgroundColor: ACCENT },

  optionText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: 'bold' 
  },

  button: { 
    backgroundColor: ACCENT, 
    marginTop: 20, 
    padding: 15, 
    borderRadius: 15, 
    alignItems: 'center' 
  },

  buttonText: { 
    color: '#000', 
    fontWeight: 'bold' 
  },

  subtleIntro: { 
    color: '#888', 
    fontSize: 12, 
    textAlign: 'center', 
    marginTop: 15, 
    marginBottom: 15, 
    paddingHorizontal: 10 
  },

  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  modalContent: { 
    backgroundColor: '#1a1a1a', 
    padding: 25, 
    borderRadius: 10, 
    borderColor: ACCENT, 
    borderWidth: 1, 
    alignItems: 'center', 
    width: '85%' 
  },

  modalText: { 
    color: ACCENT, 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 10, 
    textAlign: 'center' 
  },

  modalSubtext: { 
    color: '#ccc', 
    fontSize: 13, 
    marginBottom: 20, 
    textAlign: 'center' 
  },

  modalButton: { 
    backgroundColor: ACCENT, 
    paddingVertical: 10, 
    paddingHorizontal: 25, 
    borderRadius: 10 
  },

  modalButtonText: { 
    color: '#000', 
    fontWeight: 'bold' 
  },
});
