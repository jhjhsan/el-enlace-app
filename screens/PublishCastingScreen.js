// screens/PublishCastingScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DropDownPicker from 'react-native-dropdown-picker';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';

import { useUser } from '../contexts/UserContext';
import BackButton from '../components/BackButton';

import { uploadMediaToStorage } from '../src/firebase/helpers/uploadMediaToStorage';
import { syncCastingToFirestore } from '../src/firebase/helpers/syncCastingToFirestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from 'firebase/auth';

export default function PublishCastingScreen({ navigation }) {
  const { userData } = useUser();

  // ---- Selector de modo
  const [mode, setMode] = useState('extras'); // 'extras' | 'full'

  // ---- Estado común
  const [title, setTitle] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [producerName, setProducerName] = useState('');
  const [deadline, setDeadline] = useState(''); // DD-MM-AAAA o DD-MM-AA
  const [modality, setModality] = useState(''); // Presencial / Remoto / Mixto / Self-tape
  const [location, setLocation] = useState('');
  const [payment, setPayment] = useState(''); // solo para modo full (resumen libre)
  const [description, setDescription] = useState(''); // breve

  // ---- Modo EXTRAS (rápido)
  const [exDate, setExDate] = useState('');      // 12-08-2025
  const [exTime, setExTime] = useState('');      // 10:00 a 13:00
  const [exScene, setExScene] = useState('');    // Funeral, Reunión apoderados, etc.
  const [exAgeRange, setExAgeRange] = useState(''); // 20-25 / 30-60 / 20-80
  const [exGender, setExGender] = useState(null);   // dropdown
  const [exLook, setExLook] = useState('');      // look/restricciones
  const [exPayAmount, setExPayAmount] = useState(''); // 17000 / 20000
  const [exPayNotes, setExPayNotes] = useState('');   // +5000 almuerzo, etc.

  // ---- Modo FULL (roles dinámicos)
  const [roles, setRoles] = useState([
    { name: 'Protagónico', profile: '', dayRate: '', buyoutMoving: '', buyoutPrint: '', exclusivityMonths: '' },
  ]);

  // ---- Media
  const [images, setImages] = useState([]); // uris locales
  const [video, setVideo] = useState(null); // { uri }

  // ---- Filtros opcionales
  const [gender, setGender] = useState(null);
  const [ethnicity, setEthnicity] = useState(null);
  const [openGender, setOpenGender] = useState(false);
  const [openEthnicity, setOpenEthnicity] = useState(false);

  // ---- Tipo de casting
  const [castingType, setCastingType] = useState(null);
  const [openCastingType, setOpenCastingType] = useState(false);

  const [isPublishing, setIsPublishing] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [showAgencyModal, setShowAgencyModal] = useState(false);

  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    Alert.alert('Error', 'No estás autenticado en Firebase.');
    return null;
  }

  useEffect(() => {
    if (userData?.membershipType !== 'elite') {
      Alert.alert(
        'Acceso restringido',
        'Solo los usuarios Elite pueden publicar castings.',
        [{ text: 'Ver planes', onPress: () => navigation.navigate('Subscription') }]
      );
      navigation.goBack();
    }
  }, [userData]);

  // --- Catálogos
  const castingTypeOptions = [
    { label: '🎭 Casting normal (gratis)', value: 'normal' },
    { label: '🚨 Casting urgente (CLP 3.990)', value: 'urgente' },
  ];

  const genderItems = [
    { label: 'Hombres y Mujeres', value: 'hombres_y_mujeres' },
    { label: 'Hombre', value: 'hombre' },
    { label: 'Mujer', value: 'mujer' },
    { label: 'Otro / No especifica', value: 'otro' },
  ];

  const ethnicityItems = [
    { label: 'Todos', value: 'todos' },
    { label: 'Afrodescendiente', value: 'afrodescendiente' },
    { label: 'Caucásico', value: 'caucasico' },
    { label: 'Latino', value: 'latino' },
    { label: 'Asiático', value: 'asiatico' },
    { label: 'Indígena', value: 'indigena' },
    { label: 'Otro', value: 'otro' },
  ];
    // Defaults invisibles para modo EXTRAS
const extrasDefaults = {
  modalityDefault: 'Presencial',
  producerDefault: userData?.companyName || userData?.displayName || '',
  agencyDefault: userData?.companyName || userData?.displayName || '',
};

  // ---- Roles (FULL)
  const addRole = () => {
    setRoles(prev => [...prev, { name: '', profile: '', dayRate: '', buyoutMoving: '', buyoutPrint: '', exclusivityMonths: '' }]);
  };
  const removeRole = (idx) => setRoles(prev => prev.filter((_, i) => i !== idx));
  const updateRole = (idx, key, value) => setRoles(prev => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));

  // ---- Media
  const pickImages = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.85,
    });
    if (!res.canceled) {
      const selected = res.assets?.map(a => a.uri) || [];
      setImages(prev => [...prev, ...selected]);
    }
  };
  const pickVideo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!res.canceled && res.assets?.[0]?.uri) setVideo({ uri: res.assets[0].uri });
  };

  // ---- Fechas helper
  const toISODate = (dateStr) => {
    if (!dateStr?.trim()) return '';
    const m = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})$/);
    if (!m) return '';
    let [ , d, mo, y ] = m;
    d = parseInt(d,10); mo = parseInt(mo,10); y = parseInt(y,10); if (y<100) y+=2000;
    const test = new Date(y, mo-1, d);
    if (test.getFullYear()!==y || test.getMonth()+1!==mo || test.getDate()!==d) return '';
    return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  };

  // ---- Publicar
  const handlePublish = async () => {
    if (isPublishing) return;

// Validaciones comunes
if (!title.trim()) return Alert.alert('Falta título', 'Ingresa el título del casting.');
if (!location.trim()) return Alert.alert('Falta ubicación', 'Ingresa la ciudad/país o remoto.');

// Agencia obligatoria (ambos modos)
if (!agencyName.trim()) {
  setShowAgencyModal(true);
  return;
}

    // Validaciones por modo
    if (mode === 'extras') {
      if (!exDate.trim()) return Alert.alert('Falta fecha', 'Ingresa la fecha de rodaje (DD-MM-AAAA).');
      if (!exTime.trim()) return Alert.alert('Falta horario', 'Ingresa el horario (ej. 10:00 a 13:00).');
      if (!exAgeRange.trim()) return Alert.alert('Edad', 'Indica el rango de edad (ej. 20-25).');
      if (!exPayAmount.trim()) return Alert.alert('Pago', 'Ingresa el monto (ej. 20.000).');
    } else {
      if (!roles.length) return Alert.alert('Faltan roles', 'Agrega al menos un rol.');
      const hasMoney = roles.some(r => r.dayRate || r.buyoutMoving || r.buyoutPrint);
      if (!hasMoney) return Alert.alert('Presupuesto', 'Ingresa al menos un monto en algún rol.');
    }

    // Fechas
    const finalDeadline = toISODate(deadline);
    if (deadline && !finalDeadline) return Alert.alert('Fecha límite inválida', 'Usa DD-MM-AAAA o DD-MM-AA.');

    try {
      setIsPublishing(true);

      // Subir media
      const attachmentUrls = [];
      for (const uri of images) {
        const url = await uploadMediaToStorage(uri, `castings/images/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
        if (url) attachmentUrls.push(url);
      }
      let videoUrl = null;
      if (video?.uri) {
        videoUrl = await uploadMediaToStorage(video.uri, `castings/videos/${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);
      }

      const base = {
        id: Date.now().toString(),
        type: 'casting',
        title: title.trim(),
        agencyName: agencyName.trim(),
        producer: producerName.trim(),
        modality: modality.trim(),
        location: location.trim(),
        castingType,
        date: new Date().toISOString().split('T')[0],
        isPromotional: castingType === 'normal',
        status: 'published',
        creatorId: userData?.id || '',
        creatorEmail: userData?.email || '',
        image: attachmentUrls[0] || null,
        images: attachmentUrls,
        videoExplain: videoUrl,
        filters: { gender, ethnicity },
        structured: { schemaVersion: '1.0', source: 'manual' },
        timestamp: Date.now(),
        mode, // <-- clave
      };

      let payload = {};
if (mode === 'extras') {
  payload = {
    ...base,
    // sobrescribir con defaults invisibles en EXTRAS
agencyName: agencyName.trim(),
producer: (producerName || '').trim(),
modality: (modality || '').trim() || 'Presencial',

    description: description.trim(),
    // En extras NO usamos deadline (si quieres mantenerlo, deja finalDeadline)
    deadline: '',

    extras: {
      date: toISODate(exDate) || exDate,
      time: exTime.trim(),
      scene: exScene.trim(),
      profile: {
        ageRange: exAgeRange.trim(),
        gender: exGender,
        lookNotes: exLook.trim(),
      },
      pay: {
        amount: (exPayAmount || '').toString().trim(),
        notes: exPayNotes.trim(),
      },
    },

    roles: [],
    payment: '',
  };
      } else {
        payload = {
          ...base,
          description: description.trim(),
          payment: payment.trim(),
          deadline: finalDeadline,
          roles: roles.map(r => ({
            name: (r.name || 'Rol').trim(),
            profile: (r.profile || '').trim(),
            dayRate: (r.dayRate || '').toString().trim(),
            buyoutMoving: (r.buyoutMoving || '').toString().trim(),
            buyoutPrint: (r.buyoutPrint || '').toString().trim(),
            exclusivityMonths: (r.exclusivityMonths || '').toString().trim(),
          })),
          extras: null,
        };
      }

      const res = await syncCastingToFirestore(payload);
      if (!res?.ok) throw new Error(res?.error || 'No se pudo guardar en Firestore');

      // Guardado local para Dashboard
      try {
        const raw = await AsyncStorage.getItem('castings');
        const list = raw ? JSON.parse(raw) : [];
        const withId = { ...payload, docId: res.docId || payload.id };
        const updated = [withId, ...list].slice(0, 50);
        await AsyncStorage.setItem('castings', JSON.stringify(updated));
      } catch {}

      setSuccessVisible(true);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message || 'No se pudo publicar.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <View style={styles.screen}>
      <BackButton color="#fff" size={28} top={40} left={20} />
      <Text style={styles.title}>Publicar Casting</Text>

      <ScrollView contentContainerStyle={[styles.container, { flexGrow: 1 }]}>
        {/* Selector de modo */}
        <View style={styles.segmentWrap}>
          <TouchableOpacity
            style={[styles.segment, mode==='extras' && styles.segmentActive]}
            onPress={() => setMode('extras')}
          >
            <Text style={[styles.segmentText, mode==='extras' && styles.segmentTextActive]}>
              Casting rápido: Extras
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, mode==='full' && styles.segmentActive]}
            onPress={() => setMode('full')}
          >
            <Text style={[styles.segmentText, mode==='full' && styles.segmentTextActive]}>
              Casting completo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Material de referencia */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={pickImages} style={styles.mediaBtn}>
            <Ionicons name="images-outline" size={18} color="#fff" />
            <Text style={styles.mediaBtnText}>Subir imágenes</Text>
          </TouchableOpacity>

          <TouchableOpacity 
  onPress={pickVideo} 
  style={[styles.mediaBtn, { marginLeft: 'auto' }]}
>
  <Ionicons name="videocam-outline" size={18} color="#fff" />
  <Text style={styles.mediaBtnText}>Video explicativo</Text>
</TouchableOpacity>
        </View>

        {!!images.length && (
          <ScrollView horizontal style={{ marginTop: 12 }} showsHorizontalScrollIndicator={false}>
            {images.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.thumb} />
            ))}
          </ScrollView>
        )}
        {video?.uri ? (
  <View style={{ width: '60%', height: 140, marginTop: 8, marginBottom: 6, alignSelf: 'center' }}>
    <Video
      source={{ uri: video.uri }}
      useNativeControls
      resizeMode="contain"
      style={{ width: '100%', height: '100%', borderRadius: 10 }}
      shouldPlay={false}
    />
  </View>
) : null}

{/* Campos comunes */}
<TextInput
  placeholder="Título del casting"
  placeholderTextColor="#888"
  style={styles.input}
  value={title}
  onChangeText={setTitle}
/>

<TextInput
  placeholder="Ciudad o lugar"
  placeholderTextColor="#888"
  style={styles.input}
  value={location}
  onChangeText={setLocation}
/>

{/* Estos campos SOLO aparecen en modo FULL */}
{mode === 'full' && (
  <>
    <TextInput
      placeholder="Productora"
      placeholderTextColor="#888"
      style={styles.input}
      value={producerName}
      onChangeText={setProducerName}
    />
 <TextInput
  placeholder="Nombre de la agencia que envía el casting (obligatorio)"
  placeholderTextColor="#888"
  style={styles.input}
  value={agencyName}
  onChangeText={setAgencyName}
/>
    <TextInput
      placeholder="Modalidad (presencial / remoto / selftape)"
      placeholderTextColor="#888"
      style={styles.input}
      value={modality}
      onChangeText={setModality}
    />
  </>
)}

        {/* Modo EXTRAS */}
        {mode === 'extras' && (
          <>
<TextInput
  placeholder="Nombre de la agencia / productora (obligatorio)"
  placeholderTextColor="#888"
  style={styles.input}
  value={agencyName}
  onChangeText={setAgencyName}
/>
            <TextInput
              placeholder="Fecha de rodaje (DD-MM-AAAA)"
              placeholderTextColor="#888"
              style={styles.input}
              value={exDate}
              onChangeText={setExDate}
            />
            <TextInput
              placeholder="Horario (ej. 10:00 a 13:00)"
              placeholderTextColor="#888"
              style={styles.input}
              value={exTime}
              onChangeText={setExTime}
            />
            <TextInput
              placeholder="Situación / Escena (ej. exterior, oficina, fiesta)"
              placeholderTextColor="#888"
              style={styles.input}
              value={exScene}
              onChangeText={setExScene}
            />
            <TextInput
              placeholder="Rango de edad (ej. 20-25 / 30-60 / 20-80)"
              placeholderTextColor="#888"
              style={styles.input}
              value={exAgeRange}
              onChangeText={setExAgeRange}
            />

            <DropDownPicker
              open={openGender}
              value={exGender}
              items={genderItems}
              setOpen={setOpenGender}
              setValue={setExGender}
              placeholder="Género (Mixto / Hombre / Mujer)"
              listMode="SCROLLVIEW"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              textStyle={{ color: '#D8A353' }}
              labelStyle={{ color: '#D8A353' }}
              placeholderStyle={{ color: '#888' }}
              arrowIconStyle={{ tintColor: '#D8A353' }}
              zIndex={3000}
            />

            <TextInput
              placeholder="Look / Restricciones (ej. look tradicional, sin pelo teñido)"
              placeholderTextColor="#888"
              style={styles.textarea}
              multiline
              numberOfLines={3}
              value={exLook}
              onChangeText={setExLook}
            />

            <TextInput
              placeholder="Pago líquido (ej. 17.000 / 20.000)"
              placeholderTextColor="#888"
              style={styles.input}
              keyboardType="numeric"
              value={exPayAmount}
              onChangeText={setExPayAmount}
            />
            <TextInput
              placeholder="Adicionales (ej. +5.000 almuerzo, colación, transporte)"
              placeholderTextColor="#888"
              style={styles.input}
              value={exPayNotes}
              onChangeText={setExPayNotes}
            />

            <TextInput
              placeholder="Descripción breve (opcional)"
              placeholderTextColor="#888"
              style={styles.textarea}
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />
          </>
        )}

        {/* Modo FULL */}
        {mode === 'full' && (
          <>
            <TextInput
              placeholder="Fecha límite (DD-MM-AAAA o DD-MM-AA)"
              placeholderTextColor="#888"
              style={styles.input}
              value={deadline}
              onChangeText={setDeadline}
            />
            <TextInput
              placeholder="Descripción breve (opcional)"
              placeholderTextColor="#888"
              style={styles.textarea}
              multiline
              numberOfLines={6}
              value={description}
              onChangeText={setDescription}
            />
            <TextInput
              placeholder="Resumen de presupuesto (opcional)"
              placeholderTextColor="#888"
              style={styles.textarea}
              multiline
              numberOfLines={4}
              value={payment}
              onChangeText={setPayment}
            />

            <Text style={styles.section}>Roles y presupuestos *</Text>
            {roles.map((r, idx) => (
              <View key={idx} style={styles.roleCard}>
                <View style={styles.roleHeader}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                    value={r.name}
                    onChangeText={v => updateRole(idx, 'name', v)}
                    placeholder="Nombre del rol (Protagónico, Secundario, etc.)"
                    placeholderTextColor="#888"
                  />
                  {roles.length > 1 && (
                    <TouchableOpacity onPress={() => removeRole(idx)} style={styles.iconBtn}>
                      <Ionicons name="trash-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>

                <TextInput
                  style={styles.input}
                  value={r.profile}
                  onChangeText={v => updateRole(idx, 'profile', v)}
                  placeholder="Perfil (edad, género, look, habilidades)"
                  placeholderTextColor="#888"
                />
                <TextInput
                  style={styles.input}
                  value={r.dayRate}
                  onChangeText={v => updateRole(idx, 'dayRate', v)}
                  placeholder="Pago por día (ej: 300.000)"
                  keyboardType="numeric"
                  placeholderTextColor="#888"
                />
                <TextInput
                  style={styles.input}
                  value={r.buyoutMoving}
                  onChangeText={v => updateRole(idx, 'buyoutMoving', v)}
                  placeholder="Buyout Moving (ej: 1.100.000)"
                  keyboardType="numeric"
                  placeholderTextColor="#888"
                />
                <TextInput
                  style={styles.input}
                  value={r.buyoutPrint}
                  onChangeText={v => updateRole(idx, 'buyoutPrint', v)}
                  placeholder="Buyout Print (ej: 900.000)"
                  keyboardType="numeric"
                  placeholderTextColor="#888"
                />
                <TextInput
                  style={styles.input}
                  value={r.exclusivityMonths}
                  onChangeText={v => updateRole(idx, 'exclusivityMonths', v)}
                  placeholder="Exclusividad (meses, ej: 12)"
                  keyboardType="numeric"
                  placeholderTextColor="#888"
                />
              </View>
            ))}
            <TouchableOpacity onPress={addRole} style={styles.addBtn}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.addBtnText}>Agregar rol</Text>
            </TouchableOpacity>

            {/* Filtros opcionales para notifs (full) */}
            <DropDownPicker
              open={openEthnicity}
              value={ethnicity}
              items={ethnicityItems}
              setOpen={setOpenEthnicity}
              setValue={setEthnicity}
              placeholder="Etnia preferente (opcional)"
              listMode="SCROLLVIEW"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              textStyle={{ color: '#D8A353' }}
              labelStyle={{ color: '#D8A353' }}
              placeholderStyle={{ color: '#888' }}
              arrowIconStyle={{ tintColor: '#D8A353' }}
              zIndex={2000}
            />
            <DropDownPicker
              open={openGender}
              value={gender}
              items={genderItems}
              setOpen={setOpenGender}
              setValue={setGender}
              placeholder="Género preferente (opcional)"
              listMode="SCROLLVIEW"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              textStyle={{ color: '#D8A353' }}
              labelStyle={{ color: '#D8A353' }}
              placeholderStyle={{ color: '#888' }}
              arrowIconStyle={{ tintColor: '#D8A353' }}
              zIndex={3000}
            />
          </>
        )}

        {/* Tipo de casting */}
        <DropDownPicker
          open={openCastingType}
          value={castingType}
          items={castingTypeOptions}
          setOpen={setOpenCastingType}
          setValue={setCastingType}
          placeholder="Selecciona el tipo de casting"
          listMode="SCROLLVIEW"
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropdownContainer}
          textStyle={{ color: '#D8A353' }}
          labelStyle={{ color: '#D8A353' }}
          placeholderStyle={{ color: '#888' }}
          arrowIconStyle={{ tintColor: '#D8A353' }}
          zIndex={1000}
        />

        {castingType === 'normal' && (
          <Text style={styles.note}>
            ✅ Gratis. Aparecerá en el Dashboard por 3 días y en la página de castings por 5 días.
          </Text>
        )}
        {castingType === 'urgente' && (
          <Text style={styles.note}>
            🚨 Aparecerá entre los primeros en el Dashboard (Pro/Free) durante 24 horas y en la página de castings por 2 días.
          </Text>
        )}

        {/* Publicar */}
        <TouchableOpacity
          style={[styles.publishButton, isPublishing && { opacity: 0.7 }]}
          onPress={handlePublish}
          disabled={isPublishing}
        >
          <Text style={styles.publishText}>
            {isPublishing ? 'Publicando…' : '📤 Publicar Casting'}
          </Text>
        </TouchableOpacity>

        {/* Modal éxito */}
        <Modal visible={successVisible} transparent animationType="fade" onRequestClose={() => setSuccessVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Ionicons name="checkmark-circle" size={42} color="#4CAF50" style={{ marginBottom: 8 }} />
              <Text style={styles.modalTitleTxt}>Casting enviado</Text>
              <Text style={styles.modalText}>Tu casting se publicó correctamente.</Text>

              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => {
                  setSuccessVisible(false);
                  navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
                }}
              >
                <Text style={styles.modalBtnText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal falta agencia */}
        <Modal
          visible={showAgencyModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAgencyModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Falta información</Text>
              <Text style={styles.modalMessage}>
                Debes indicar el nombre de la agencia que envía el casting antes de publicarlo.
              </Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowAgencyModal(false)}
              >
                <Text style={styles.modalButtonText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  container: { padding: 20, top: 30, paddingBottom: 140 },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    top: 50,
    marginBottom: 20,
  },

  // Segment
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: '#2A2B2F',
    marginBottom: 14,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: '#D8A353' },
  segmentText: { color: '#aaa', fontWeight: '700' },
  segmentTextActive: { color: '#000', fontWeight: '800' },

  input: {
    backgroundColor: '#1A1A1A',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    borderColor: '#D8A353',
    borderWidth: 1,
  },
  textarea: {
    backgroundColor: '#1A1A1A',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 20,
    marginBottom: 15,
    borderColor: '#D8A353',
    borderWidth: 1,
    textAlignVertical: 'top',
  },

  // Media
  mediaBtn: {
    backgroundColor: '#2A2B2F',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  mediaBtnText: { color: '#fff', fontWeight: '600' },
  thumb: { width: 90, height: 90, borderRadius: 10, marginRight: 8 },
  videoHint: { color: '#9DD6FF', marginVertical: 6 },

  // Roles (full)
  section: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 18, marginBottom: 8 },
  roleCard: {
    backgroundColor: '#17181B',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2B2F',
  },
  roleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconBtn: { backgroundColor: '#B43B3B', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  addBtn: {
    backgroundColor: '#1F6FEB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '700' },

  // Dropdowns
  dropdown: {
    backgroundColor: '#1A1A1A',
    borderColor: '#D8A353',
    marginBottom: 20,
  },
  dropdownContainer: { backgroundColor: '#000', borderColor: '#D8A353' },

  // Publicar
  publishButton: {
    backgroundColor: '#D8A353',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  publishText: { color: '#000', fontWeight: 'bold' },
  note: {
    color: '#ccc',
    fontSize: 13,
    marginTop: -10,
    marginBottom: 15,
    textAlign: 'center',
  },

  // Modal éxito
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '82%',
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
  },
  modalTitleTxt: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalText: { color: '#ccc', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  modalBtn: {
    backgroundColor: '#D8A353',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  modalBtnText: { color: '#000', fontWeight: 'bold' },

  // Modal falta agencia
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  modalMessage: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  modalButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonText: { color: '#fff', fontWeight: 'bold' },
});
