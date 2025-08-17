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
  Animated,
  Easing,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DropDownPicker from 'react-native-dropdown-picker';
import { Ionicons } from '@expo/vector-icons';

import { useUser } from '../contexts/UserContext';
import BackButton from '../components/BackButton';

import { parseImageToCasting } from '../src/ia/parsers/parseImageToCasting';
import { parseDocxToCasting } from '../src/ia/parsers/parseDocxToCasting';
import { uploadMediaToStorage } from '../src/firebase/helpers/uploadMediaToStorage';
import { syncCastingToFirestore } from '../src/firebase/helpers/syncCastingToFirestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAuth } from 'firebase/auth';

export default function PublishCastingScreen({ navigation }) {
  const { userData } = useUser();

  // ---- Estado base editable (lo mínimo y útil)
  const [title, setTitle] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [producerName, setProducerName] = useState('');
  const [deadline, setDeadline] = useState(''); // usuario escribe DD-MM-AAAA o DD-MM-AA
  const [modality, setModality] = useState('');
  const [location, setLocation] = useState('');
  const [payment, setPayment] = useState(''); // resumen textual opcional
  const [description, setDescription] = useState(''); // breve, no transcripción

  // ---- IA y datos estructurados
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [budgets, setBudgets] = useState([]);
  const [dates, setDates] = useState({});
  const [exclusivity, setExclusivity] = useState('');
  const [rights, setRights] = useState('');
  const [selfTape, setSelfTape] = useState({});
  const [restrictions, setRestrictions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [images, setImages] = useState([]); // URLs en Storage

  // ---- Filtros opcionales para notifs (los dejamos)
  const [gender, setGender] = useState(null);
  const [ethnicity, setEthnicity] = useState(null);
  const [openGender, setOpenGender] = useState(false);
  const [openEthnicity, setOpenEthnicity] = useState(false);

  // ---- Tipo de casting
  const [castingType, setCastingType] = useState(null);
  const [openCastingType, setOpenCastingType] = useState(false);

  // ---- Loading específico DOCX
  const [loadingDocx, setLoadingDocx] = useState(false);
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

  // --- Helper para generar una descripción corta (sin transcripción)
  const buildAutoDescription = (parsed) => {
    const parts = [];
    const producer = parsed.agencyName || parsed.producer || '';
    if (producer) parts.push(`Productora: ${producer}`);
    const ds = [];
    if (parsed.dates?.callback) ds.push(`Callback: ${parsed.dates.callback}`);
    if (parsed.dates?.wardrobe_shoot) ds.push(`Vestuario/Rodaje: ${parsed.dates.wardrobe_shoot}`);
    if (parsed.dates?.release) ds.push(`Estreno: ${parsed.dates.release}`);
    if (ds.length) parts.push(ds.join(' · '));
    if (parsed.exclusivity) parts.push(`Exclusividad: ${parsed.exclusivity}`);
    if (parsed.rights) parts.push(`Derechos: ${parsed.rights}`);
    const countRoles = Array.isArray(parsed.roles) ? parsed.roles.length : 0;
    if (countRoles) parts.push(`Perfiles: ${countRoles}`);
    return parts.join(' | ');
  };

  // ---- Mini componente de estado "IA procesando" con ícono verde girando
  const AIProcessing = ({ label = 'Procesando con IA...' }) => {
    const rotate = React.useRef(new Animated.Value(0)).current;
    React.useEffect(() => {
      const loop = Animated.loop(
        Animated.timing(rotate, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    }, [rotate]);

    const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Animated.View style={{ transform: [{ rotate: spin }], marginRight: 8 }}>
          <Ionicons name="sparkles-outline" size={18} color="#00FF7F" />
        </Animated.View>
        <Text style={[styles.uploadButtonText, { color: '#00FF7F' }]}>{label}</Text>
      </View>
    );
  };
 // --- Helpers de formato para presupuestos
const normalizeRole = (role = '') => {
  const r = role.toLowerCase().trim();
  if (r === 'ocp' || r === 'oc protagónico' || r === 'oc protagonico') return 'OC Protagónico';
  if (r === 'protagonico' || r === 'protagónico') return 'Protagónico';
  if (r === 'secundario') return 'Secundario';
  if (r === 'extra') return 'Extra';
  return role || 'Rol';
};

const money = (v) => (v ? `$${String(v).replace(/[^\d]/g, '')}` : '$-');

const formatBudgetLine = (b = {}) => {
  const role = normalizeRole(b.role);
  const day   = money(b.day);
  const mov   = money(b.buyout_moving);
  const prt   = money(b.buyout_print);
  const excl  = money(b.exclusivity_12m);
  return `• ${role}: DÍA DE TRABAJO ${day} | BUYOUT: ALL MOVING MEDIA ${mov} | BUYOUT: PRINT ${prt} | EXCLUSIVIDAD 12 MESES ${excl}`;
};

  // ------ Botón: subir imágenes → IA → autocompletar → subir imágenes
  const handleCompleteWithAI = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 6,
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) {
      Alert.alert('Sin selección', 'Debes elegir al menos una imagen.');
      return;
    }

    try {
      setIsAnalyzing(true);

      const imageUris = result.assets.map((a) => a.uri);
      const parsed = await parseImageToCasting(imageUris);

      // Autorelleno (sin transcripción)
      setTitle(parsed.title || '');
      setProducerName(parsed.agencyName || parsed.producer || '');
      setLocation(parsed.location || '');
      setModality(parsed.modality || '');

      // Estructurado
      setRoles(Array.isArray(parsed.roles) ? parsed.roles : []);
      setBudgets(Array.isArray(parsed.budgets) ? parsed.budgets : []);
      setDates(parsed.dates || {});
      setExclusivity(parsed.exclusivity || '');
      setRights(parsed.rights || '');
      setSelfTape(parsed.self_tape || {});
      setRestrictions(Array.isArray(parsed.restrictions) ? parsed.restrictions : []);

      // Descripción corta automática (no transcripción)
      const shortDesc = buildAutoDescription(parsed);
      setDescription(shortDesc);

      // Si no hay payment textual pero sí budgets, arma un mini resumen
 if (!payment && parsed.budgets?.length) {
  setPayment(parsed.budgets.map(formatBudgetLine).join('\n'));
}

      // Subir imágenes a Storage
      const uploaded = [];
      for (const uri of imageUris) {
        const filename = `castings/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const url = await uploadMediaToStorage(uri, filename);
        uploaded.push(url);
      }
      setImages(uploaded);

      Alert.alert('Listo', 'La IA completó el resumen y se subieron las imágenes.');
    } catch (e) {
      console.error('❌ Error IA (imágenes):', e);
      Alert.alert('Error', 'Ocurrió un problema al procesar las imágenes.');
    } finally {
      setIsAnalyzing(false);
    }
  };

const handlePublish = async () => {
  if (isPublishing) return;
  setIsPublishing(true);

  try {
    if (!userData?.hasPaid) {
      Alert.alert('Pago requerido', 'Debes completar el pago para publicar un casting.');
      setIsPublishing(false);
      return;
    }

    // Validar fecha en formato chileno y convertir a YYYY-MM-DD
    const dateRegex = /^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})$/;
    let finalDeadline = '';

    if (dateRegex.test(deadline)) {
      const [, dayStr, monthStr, yearStr] = deadline.match(dateRegex);
      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10);
      let year = parseInt(yearStr, 10);

      if (year < 100) year += 2000;

      const dateObj = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateObj.getFullYear() !== year || dateObj.getMonth() + 1 !== month || dateObj.getDate() !== day) {
        Alert.alert('Fecha inválida', 'La fecha ingresada no es válida.');
        setIsPublishing(false);
        return;
      }
      if (dateObj <= today) {
        Alert.alert('Fecha inválida', 'La fecha debe ser futura.');
        setIsPublishing(false);
        return;
      }

      finalDeadline = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else {
      Alert.alert('Formato inválido', 'Ingresa la fecha en formato DD-MM-AAAA o DD-MM-AA.');
      setIsPublishing(false);
      return;
    }
if (!agencyName.trim()) {
  setShowAgencyModal(true);
  setIsPublishing(false);
  return;
}

    const hasBudgets = budgets?.some((b) => b.day || b.buyout_moving || b.buyout_print || b.exclusivity_12m);
    const hasRoles = Array.isArray(roles) && roles.length > 0;
    const status = title && agencyName && hasRoles && hasBudgets ? 'published' : 'draft';

    const newPost = {
      id: Date.now().toString(),
      title,
      description,
      payment,
       agencyName,
      producer: agencyName,
      producer: producerName,
      agency: agencyName,        
      agency_name: agencyName, 
      deadline: finalDeadline,
      modality,
      location,
      castingType,
      roles,
      type: 'casting',
      date: new Date().toISOString().split('T')[0],
      isPromotional: castingType === 'normal',
      status,
      creatorId: userData?.id || '',
      creatorEmail: userData?.email || '',
      image: images?.[0] || null,
      images: images || [],
      structured: {
        schemaVersion: '1.0',
        source: 'image-ai',
        dates,
        exclusivity,
        rights,
        budgets,
        roles,
        self_tape: selfTape,
        restrictions,
      },
    };

const res = await syncCastingToFirestore(newPost);
if (!res?.ok) {
  Alert.alert('Error', 'No se pudo guardar la publicación.');
  setIsPublishing(false);
  return;
}

// ✅ Éxito → guarda copia local para el Dashboard (lee AsyncStorage)
try {
  const now = Date.now();
  const localCasting = {
    ...newPost,
    timestamp: now,                 // <-- requerido por tu Dashboard actual
    docId: res.docId || newPost.id,
  };

  const raw = await AsyncStorage.getItem('castings');
  const list = raw ? JSON.parse(raw) : [];

  const cincoDias = 5 * 24 * 60 * 60 * 1000;
  const filtered = list
    .filter(c => (now - (c.timestamp || 0)) <= cincoDias)
    .filter(c => c.docId !== localCasting.docId);

  const updated = [localCasting, ...filtered]
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  await AsyncStorage.setItem('castings', JSON.stringify(updated));
  console.log('📦 Casting guardado en AsyncStorage para Dashboard');
} catch (e) {
  console.warn('⚠️ No se pudo guardar en AsyncStorage:', e?.message);
}

// ✅ Éxito → mostramos modal
setIsPublishing(false);
setSuccessVisible(true);

  } catch (error) {
    console.error('Error al guardar casting:', error);
    Alert.alert('Error', 'No se pudo guardar la publicación.');
    setIsPublishing(false);
  }
};

  return (
    <View style={styles.screen}>
      <BackButton color="#fff" size={28} top={40} left={20} />
      <Text style={styles.title}>Publicar Casting</Text>

      <ScrollView contentContainerStyle={[styles.container, { flexGrow: 1 }]}>
        {/* Botón DOCX IA */}
        <TouchableOpacity
          style={[styles.uploadButton, loadingDocx && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }]}
          onPress={async () => {
            try {
              setLoadingDocx(true);
              const parsed = await parseDocxToCasting();
              setLoadingDocx(false);
              if (!parsed) {
                Alert.alert('Error', 'No se pudo analizar el archivo .docx');
                return;
              }

              // Rellenar desde DOCX
              setTitle(parsed.title || '');
              setProducerName(parsed.agencyName || parsed.producer || '');
              setLocation(parsed.location || '');
              setModality(parsed.modality || '');

              setRoles(Array.isArray(parsed.roles) ? parsed.roles : []);
              setBudgets(Array.isArray(parsed.budgets) ? parsed.budgets : []);
              setDates(parsed.dates || {});
              setExclusivity(parsed.exclusivity || '');
              setRights(parsed.rights || '');
              setSelfTape(parsed.self_tape || {});
              setRestrictions(Array.isArray(parsed.restrictions) ? parsed.restrictions : []);

              const shortDesc = buildAutoDescription(parsed);
              setDescription(shortDesc);

        if (!payment && parsed.budgets?.length) {
  setPayment(parsed.budgets.map(formatBudgetLine).join('\n'));
}

              Alert.alert('Listo', 'La IA extrajo la información del documento.');
            } catch (err) {
              setLoadingDocx(false);
              console.error('❌ Error IA (DOCX):', err);
              Alert.alert('Error', 'No se pudo procesar el documento.');
            }
          }}
          disabled={loadingDocx}
        >
          {loadingDocx ? (
            <AIProcessing label="Procesando DOCX..." />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="sparkles-outline" size={18} color="#4CAF50" style={{ marginRight: 6 }} />
              <Text style={[styles.uploadButtonText, { color: '#fff' }]}>Subir .docx con IA</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Botón Imágenes IA */}
        <TouchableOpacity
          style={[styles.aiButton, isAnalyzing && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }]}
          onPress={handleCompleteWithAI}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <AIProcessing label="Procesando imágenes..." />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="sparkles-outline" size={18} color="#4CAF50" style={{ marginRight: 6 }} />
              <Text style={[styles.aiButtonText, { color: '#fff' }]}>Subir imágenes del casting y analizar con IA</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Preview de imágenes subidas */}
        {images?.length ? (
          <ScrollView horizontal style={{ marginTop: 14 }} showsHorizontalScrollIndicator={false}>
            {images.map((uri, idx) => (
              <Image
                key={idx}
                source={{ uri }}
                style={{ width: 160, height: 120, borderRadius: 10, marginRight: 10 }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        ) : null}

        {/* Resumen IA compacto */}
        {(budgets.length ||
          Object.keys(dates || {}).length ||
          exclusivity ||
          rights ||
          Object.keys(selfTape || {}).length ||
          (restrictions || []).length) ? (
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12, color: '#00BFFF' }}>
              🧾 Resumen IA
            </Text>

            {(dates.callback || dates.wardrobe_shoot || dates.release) ? (
              <View style={{ marginBottom: 10 }}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>📅 Fechas clave</Text>
                {dates.callback ? <Text style={{ color: '#ccc' }}>• Callback: {dates.callback}</Text> : null}
                {dates.wardrobe_shoot ? <Text style={{ color: '#ccc' }}>• Vestuario/Rodaje: {dates.wardrobe_shoot}</Text> : null}
                {dates.release ? <Text style={{ color: '#ccc' }}>• Estreno: {dates.release}</Text> : null}
              </View>
            ) : null}

            {(exclusivity || rights) ? (
              <View style={{ marginBottom: 10 }}>
                {exclusivity ? <Text style={{ color: '#ccc' }}>🔒 Exclusividad: {exclusivity}</Text> : null}
                {rights ? <Text style={{ color: '#ccc' }}>🌍 Derechos: {rights}</Text> : null}
              </View>
            ) : null}

            {budgets.length ? (
              <View style={{ marginBottom: 10 }}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>💰 Presupuestos por rol</Text>
          {budgets.map((b, i) => (
  <Text key={i} style={{ color: '#ccc' }}>
    {formatBudgetLine(b)}
  </Text>
))}
              </View>
            ) : null}

            {Object.keys(selfTape || {}).length ? (
              <View style={{ marginBottom: 10 }}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>🎥 Self tape</Text>
                {selfTape.presentation ? <Text style={{ color: '#ccc' }}>• Presentación: {selfTape.presentation}</Text> : null}
                {selfTape.photo ? <Text style={{ color: '#ccc' }}>• Foto: {selfTape.photo}</Text> : null}
                {selfTape.acting ? <Text style={{ color: '#ccc' }}>• Acting: {selfTape.acting}</Text> : null}
                {selfTape.format ? <Text style={{ color: '#ccc' }}>• Formato: {selfTape.format}</Text> : null}
              </View>
            ) : null}

            {(restrictions || []).length ? (
              <View style={{ marginBottom: 10 }}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>⚠️ Restricciones</Text>
                {restrictions.map((r, i) => (
                  <Text key={i} style={{ color: '#ccc' }}>• {r}</Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Campos mínimos editables */}
        <TextInput
          placeholder="Título del casting"
          placeholderTextColor="#888"
          style={styles.input}
          value={title}
          onChangeText={setTitle}
        />
        
     <TextInput
  placeholder="Productora"
  placeholderTextColor="#888"
  style={styles.input}
  value={producerName}
  onChangeText={setProducerName}
/>

<TextInput
  placeholder="Nombre de la agencia que envía el casting"
  placeholderTextColor="#888"
  style={styles.input}
  value={agencyName}
  onChangeText={setAgencyName}
/>

        <TextInput
          placeholder="Fecha límite (DD-MM-AAAA o DD-MM-AA)"
          placeholderTextColor="#888"
          style={styles.input}
          value={deadline}
          onChangeText={setDeadline}
        />

        <TextInput
          placeholder="Modalidad (presencial / online / selftape)"
          placeholderTextColor="#888"
          style={styles.input}
          value={modality}
          onChangeText={setModality}
        />

        <TextInput
          placeholder="Ciudad o lugar"
          placeholderTextColor="#888"
          style={styles.input}
          value={location}
          onChangeText={setLocation}
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

        {/* Filtros opcionales para notifs */}
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
<Modal visible={successVisible} transparent animationType="fade" onRequestClose={() => setSuccessVisible(false)}>
  <View style={styles.modalBackdrop}>
    <View style={styles.modalCard}>
      <Ionicons name="checkmark-circle" size={42} color="#4CAF50" style={{ marginBottom: 8 }} />
      <Text style={styles.modalTitle}>Casting enviado</Text>
      <Text style={styles.modalText}>Tu casting se publicó correctamente.</Text>

      <TouchableOpacity
        style={styles.modalBtn}
        onPress={() => {
          setSuccessVisible(false);
          navigation.reset({
            index: 0,
              routes: [{ name: 'MainTabs' }],
          });
        }}
      >
        <Text style={styles.modalBtnText}>OK</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
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
  aiButton: {
    backgroundColor: '#222',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
    alignItems: 'center',
  },
  aiButtonText: { color: '#D8A353', fontWeight: 'bold' },
  uploadButton: {
    backgroundColor: '#222',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#D8A353',
    fontWeight: 'bold',
  },
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
  dropdown: {
    backgroundColor: '#1A1A1A',
    borderColor: '#D8A353',
    marginBottom: 20,
  },
  dropdownContainer: { backgroundColor: '#000', borderColor: '#D8A353' },
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
modalTitle: {
  color: '#fff',
  fontSize: 18,
  fontWeight: '700',
  marginBottom: 4,
},
modalText: {
  color: '#ccc',
  fontSize: 14,
  textAlign: 'center',
  marginBottom: 16,
},
modalBtn: {
  backgroundColor: '#D8A353',
  borderRadius: 10,
  paddingVertical: 10,
  paddingHorizontal: 20,
},
modalBtnText: {
  color: '#000',
  fontWeight: 'bold',
},
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
modalTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 10,
},
modalMessage: {
  fontSize: 16,
  textAlign: 'center',
  marginBottom: 20,
},
modalButton: {
  backgroundColor: '#D8A353',
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 8,
},
modalButtonText: {
  color: '#fff',
  fontWeight: 'bold',
},

});
