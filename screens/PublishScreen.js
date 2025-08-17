import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { getWeeklyServicePostCount, registerServicePost } from '../utils/postLimits';
import DropDownPicker from 'react-native-dropdown-picker';
import { Ionicons } from '@expo/vector-icons';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const SERVICE_CATEGORIES = [
  // Producción y coordinación
  { label: 'Producción y coordinación', value: 'HEADER_PROD', disabled: true, icon: () => null, labelStyle: { color: 'green', fontWeight: 'bold' } },
  { label: 'Productor', value: 'Productor' },
  { label: 'Productor ejecutivo', value: 'Productor ejecutivo' },
  { label: 'Asistente de dirección', value: 'Asistente de dirección' },
  { label: 'Asistente de producción', value: 'Asistente de producción' },
  { label: 'Stage manager', value: 'Stage manager' },
  { label: 'Coordinador de locaciones', value: 'Coordinador de locaciones' },
  { label: 'Continuista', value: 'Continuista' },

  // Cámara e imagen
  { label: 'Cámara e imagen', value: 'HEADER_CAM', disabled: true, icon: () => null, labelStyle: { color: 'green', fontWeight: 'bold' } },
  { label: 'Camarógrafo', value: 'Camarógrafo' },
  { label: 'Asistente de cámara', value: 'Asistente de cámara' },
  { label: 'Operador de drone', value: 'Operador de drone' },
  { label: 'Técnico de grúa', value: 'Técnico de grúa' },
  { label: 'Grúas para filmación', value: 'Grúas para filmación' },
  { label: 'Fotógrafo', value: 'Fotógrafo' },
  { label: 'Fotógrafo de backstage', value: 'Fotógrafo de backstage' },
  { label: 'Estudio fotográfico', value: 'Estudio fotográfico' },

  // Arte y vestuario
  { label: 'Arte y vestuario', value: 'HEADER_ARTE', disabled: true, icon: () => null, labelStyle: { color: 'green', fontWeight: 'bold' } },
  { label: 'Diseñador de arte', value: 'Diseñador de arte' },
  { label: 'Decorador de set', value: 'Decorador de set' },
  { label: 'Escenógrafo', value: 'Escenógrafo' },
  { label: 'Ilustrador / storyboarder', value: 'Ilustrador / storyboarder' },
  { label: 'Vestuarista', value: 'Vestuarista' },
  { label: 'Asistente de vestuario', value: 'Asistente de vestuario' },
  { label: 'Maquillista', value: 'Maquillista' },
  { label: 'Caracterizador (maquillaje FX)', value: 'Caracterizador (maquillaje FX)' },
  { label: 'Peluquero / estilista', value: 'Peluquero / estilista' },

  // Postproducción y sonido
  { label: 'Postproducción y sonido', value: 'HEADER_POST', disabled: true, icon: () => null, labelStyle: { color: 'green', fontWeight: 'bold' } },
  { label: 'Editor de video', value: 'Editor de video' },
  { label: 'Postproductor', value: 'Postproductor' },
  { label: 'Colorista', value: 'Colorista' },
  { label: 'Sonidista', value: 'Sonidista' },
  { label: 'Microfonista', value: 'Microfonista' },
  { label: 'Técnico de efectos especiales', value: 'Técnico de efectos especiales' },

  // Transporte y logística
  { label: 'Transporte y logística', value: 'HEADER_TRANS', disabled: true, icon: () => null, labelStyle: { color: 'green', fontWeight: 'bold' } },
  { label: 'Transporte de talentos', value: 'Transporte de talentos' },
  { label: 'Transporte de producción', value: 'Transporte de producción' },
  { label: 'Vans de producción', value: 'Vans de producción' },
  { label: 'Autos clásicos para escenas', value: 'Autos clásicos para escenas' },
  { label: 'Autos personales', value: 'Autos personales' },
  { label: 'Motos o bicicletas para escenas', value: 'Motos o bicicletas para escenas' },
  { label: 'Camiones de arte para rodajes', value: 'Camiones de arte para rodajes' },
  { label: 'Casas rodantes para producción', value: 'Casas rodantes para producción' },

  // Catering y servicios generales
  { label: 'Catering y servicios generales', value: 'HEADER_CATERING', disabled: true, icon: () => null, labelStyle: { color: 'green', fontWeight: 'bold' } },
  { label: 'Servicios de catering', value: 'Servicios de catering' },
  { label: 'Coffee break / snacks', value: 'Coffee break / snacks' },
  { label: 'Ambientador', value: 'Ambientador' },
  { label: 'Limpieza de locaciones', value: 'Limpieza de locaciones' },
  { label: 'Seguridad / guardias', value: 'Seguridad / guardias' },

  // Comunicación y marketing
  { label: 'Comunicación y marketing', value: 'HEADER_COM', disabled: true, icon: () => null, labelStyle: { color: 'green', fontWeight: 'bold' } },
  { label: 'Community manager', value: 'Community manager' },
  { label: 'Creador de contenido digital', value: 'Creador de contenido digital' },
  { label: 'Diseñador gráfico', value: 'Diseñador gráfico' },

  // Otros
  { label: 'Otros', value: 'HEADER_OTRO', disabled: true, icon: () => null, labelStyle: { color: 'green', fontWeight: 'bold' } },
  { label: 'Otro (especificar)', value: 'Otro' },
];

export default function PublishScreen({ navigation }) {
  const { userData } = useUser();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(null);
  const [open, setOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [items, setItems] = useState(SERVICE_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  // Chat interno SIEMPRE. Opcional: WhatsApp
  const [enableWhats, setEnableWhats] = useState(false);
  const [whatsNumber, setWhatsNumber] = useState('');

  // Modal genérico
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMsg, setModalMsg] = useState('');
  const [modalSuccess, setModalSuccess] = useState(false);

  const openModal = (title, msg, { success = false } = {}) => {
    setModalTitle(title);
    setModalMsg(msg);
    setModalSuccess(!!success);
    setModalVisible(true);
  };

  const appendLocalNotification = async (notif) => {
    try {
      const profileRaw = await AsyncStorage.getItem('userProfile');
      const profile = profileRaw ? JSON.parse(profileRaw) : null;
      const userId = profile?.id || userData?.id;
      if (!userId) return;

      const key = `notifications_${userId}`;
      const raw = await AsyncStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];

      const exists = list.some((n) => n.id === notif.id);
      const next = exists ? list : [notif, ...list].slice(0, 200);

      await AsyncStorage.setItem(key, JSON.stringify(next));
    } catch (e) {
      console.error('No se pudo guardar la notificación local de servicio:', e);
    }
  };

  // Helpers
  const normalizeCLPhone = (raw) => {
    if (!raw) return '';
    const digits = raw.replace(/[^\d]/g, '');
    if (digits.startsWith('56')) return `+${digits}`;
    if (digits.length === 9) return `+56${digits}`;
    return `+56${digits.replace(/^0+/, '')}`;
  };

  const safeGetWeeklyServicePostCount = async () => {
    try {
      const r = await Promise.race([
        getWeeklyServicePostCount(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout postCount')), 5000)),
      ]);
      return Number.isFinite(r) ? r : 0;
    } catch (e) {
      console.log('[PublishScreen] postCount fallo -> sigo con 0', e?.message);
      return 0;
    }
  };

  const handlePublish = async () => {
    console.log('[PublishScreen] handlePublish start');
    if (isPublishing) return;

    try {
      // Validaciones con modal
      if (!title || !description || !category) {
        openModal('Campos obligatorios', 'Completa todos los campos antes de publicar.');
        return;
      }
      if (title.trim().length < 10) {
        openModal('Título muy corto', 'El título debe tener al menos 10 caracteres.');
        return;
      }
      if (description.trim().length < 30) {
        openModal('Descripción muy corta', 'La descripción debe tener al menos 30 caracteres.');
        return;
      }
      if (description.trim().split('\n').length > 100) {
        openModal('Límite de líneas', 'La descripción no puede superar las 100 líneas.');
        return;
      }

      // WhatsApp opcional
      let normalizedWhats = '';
      if (enableWhats) {
        if (!whatsNumber?.trim()) {
          openModal('WhatsApp requerido', 'Ingresa tu número de WhatsApp o desactiva la opción.');
          return;
        }
        normalizedWhats = normalizeCLPhone(whatsNumber.trim());
        if (!/^\+56\d{9,11}$/.test(normalizedWhats)) {
          openModal('WhatsApp inválido', 'Ingresa un número válido. Ej: +56912345678 o 912345678');
          return;
        }
      }

      setIsPublishing(true);

      // Límite semanal (resiliente)
      const count = await safeGetWeeklyServicePostCount();
      console.log('[PublishScreen] weeklyCount =', count, 'plan=', userData?.membershipType);
      if (
        (userData?.membershipType === 'pro' && count >= 3) ||
        (userData?.membershipType === 'free' && count >= 1)
      ) {
        openModal(
          'Límite alcanzado',
          userData?.membershipType === 'pro'
            ? 'Tu plan Pro permite publicar hasta 3 servicios por semana.'
            : 'Tu plan Free permite publicar solo 1 servicio por semana.'
        );
        return;
      }
      const plan = (userData?.membershipType || 'free').toLowerCase();
      const daysByPlan = { free: 7, pro: 30, elite: 30 };
      const addDays = (ms, d) => ms + d * 24 * 60 * 60 * 1000;

      const nowMs = Date.now();
      const expiresAtMs = addDays(nowMs, daysByPlan[plan] || 7);

      const newPost = {
        id: Date.now().toString(),
        title: title.trim(),
        description: description.trim(),
        category,
        type: 'servicio',
        date: new Date().toISOString().split('T')[0],
        createdAt: Date.now(), // ms
        status: 'published',
        isPromotional: false,
        creatorId: userData?.id || '',
        creatorEmail: userData?.email || '',
        expiresAtMs,          // <-- nueva propiedad
        planSnapshot: plan,   // útil para auditoría

        // Contacto
        chatEnabled: true,
        enableWhats: !!enableWhats,
        contactWhats: normalizedWhats || '',
      };

      // Guardar local
      console.log('[PublishScreen] guardando en AsyncStorage(posts)…');
      const existing = await AsyncStorage.getItem('posts');
      const posts = existing ? JSON.parse(existing) : [];
      const updatedPosts = [...posts, newPost];
      await AsyncStorage.setItem('posts', JSON.stringify(updatedPosts));
      console.log('[PublishScreen] posts guardados OK. len=', updatedPosts.length);

      // Guardar en Firestore (feed global)
      try {
        const db = getFirestore(getApp());
        await setDoc(
          doc(db, 'services', newPost.id),
          { ...newPost, createdAtTS: serverTimestamp() },
          { merge: true }
        );
        console.log('[PublishScreen] service guardado en Firestore');
      } catch (e) {
        console.log('[PublishScreen] Firestore fallo (continuo):', e?.message);
      }

      // Registrar conteo semanal (no bloquea)
      try {
        await registerServicePost();
        console.log('[PublishScreen] registerServicePost OK');
      } catch (e) {
        console.log('[PublishScreen] registerServicePost fallo (continuo):', e?.message);
      }

      // Notificación push (no bloquea)
      try {
        const functions = getFunctions(getApp());
        const sendPush = httpsCallable(functions, 'sendServicePushNotifications');
        await Promise.race([
          sendPush({
            type: 'servicio',
            serviceId: newPost.id,
            title: newPost.title,
            description: newPost.description,
            creatorEmail: newPost.creatorEmail,
            hasWhatsApp: newPost.enableWhats,
          }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout push')), 5000)),
        ]);
        console.log('✅ Push OK');
      } catch (err) {
        console.log('⚠️ Push fallo (continuo):', err?.message);
      }

      // Notificación local (no bloquea)
      try {
        await appendLocalNotification({
          id: `svc_${newPost.id}`,
          type: 'servicio',
          title: newPost.title,
          message: newPost.description,
          serviceId: newPost.id,
          createdAt: Date.now(),
          read: false,
          from: newPost.creatorEmail,
          origin: 'local',
        });
        console.log('[PublishScreen] notificación local OK');
      } catch (e) {
        console.log('[PublishScreen] notificación local fallo (continuo):', e?.message);
      }

      // Éxito
      openModal('✅ Servicio publicado', 'Tu publicación se ha guardado exitosamente.', { success: true });

      // Limpieza
      setTitle('');
      setDescription('');
      setCategory(null);
      setOpen(false);
      setEnableWhats(false);
      setWhatsNumber('');
    } catch (error) {
      console.log('[PublishScreen] ERROR general:', error);
      openModal('Error', String(error?.message || error));
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Back */}
      <TouchableOpacity
        onPress={() => (!isPublishing ? navigation.goBack() : null)}
        style={styles.backButton}
        disabled={isPublishing}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <Text style={styles.title}>📝 Publicar Servicio</Text>

        <TextInput
          placeholder="Ej: Servicio de maquillaje para rodaje"
          placeholderTextColor="#888"
          style={styles.input}
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          placeholder="Ej: Ofrezco servicio de maquillaje profesional para grabaciones..."
          placeholderTextColor="#888"
          style={styles.textarea}
          multiline
          numberOfLines={8}
          value={description}
          onChangeText={setDescription}
        />

<DropDownPicker
  open={open}
  value={category}
  items={items}
  setOpen={setOpen}
  setValue={setCategory}
  setItems={setItems}
  placeholder="Selecciona una categoría"
  listMode="MODAL"
  modalTitle="Selecciona una categoría"
  modalContentContainerStyle={{ backgroundColor: '#000' }}
  listItemContainerStyle={{
    backgroundColor: '#111',
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  }}
  listItemLabelStyle={{ color: '#fff' }}
  style={{ backgroundColor: '#1A1A1A', borderColor: '#D8A353' }}
  dropDownContainerStyle={{ backgroundColor: '#1A1A1A', borderColor: '#D8A353' }}
  textStyle={{ color: '#fff' }}
  ArrowDownIconComponent={({ style }) => (
    <Ionicons name="chevron-down" size={18} color="#fff" style={style} />
  )}
  ArrowUpIconComponent={({ style }) => (
    <Ionicons name="chevron-up" size={18} color="#fff" style={style} />
  )}
/>

{/* Si selecciona "Otro", mostrar input para escribir */}
{category === 'Otro' && (
  <TextInput
    style={{
      borderWidth: 1,
      borderColor: '#D8A353',
      padding: 10,
      marginTop: 10,
      borderRadius: 8,
      color: '#fff',
      backgroundColor: '#1A1A1A',
    }}
    placeholder="Especifica el servicio"
    placeholderTextColor="#888"
    value={customCategory}
    onChangeText={setCustomCategory}
  />
)}
        
        {/* WhatsApp opcional */}
        <Text style={[styles.title, { fontSize: 18, marginTop: 14 }]}>📱 Opcional: WhatsApp</Text>
        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.toggle} onPress={() => setEnableWhats(!enableWhats)}>
            <Ionicons name={enableWhats ? 'checkbox' : 'square-outline'} size={20} color="#D8A353" />
            <Text style={styles.toggleText}>Permitir contacto por WhatsApp</Text>
          </TouchableOpacity>
        </View>

        {enableWhats && (
          <TextInput
            placeholder="WhatsApp (ej: +56912345678 o 912345678)"
            placeholderTextColor="#888"
            style={styles.input}
            value={whatsNumber}
            onChangeText={setWhatsNumber}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
        )}

        <TouchableOpacity
          style={[styles.publishButton, isPublishing && { opacity: 0.6 }]}
          onPress={handlePublish}
          disabled={isPublishing}
        >
          <Text style={styles.publishText}>
            {isPublishing ? '⏳ Publicando…' : '📤 Publicar'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal genérico */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMsg}>{modalMsg}</Text>

            <View style={styles.modalActions}>
              {!modalSuccess ? (
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={[styles.modalBtn, { backgroundColor: '#333' }]}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Cerrar</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={[styles.modalBtn, { backgroundColor: '#333' }]}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Seguir aquí</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setModalVisible(false);
                      try {
                        if (navigation?.navigate) {
                          navigation.navigate('MyServices');
                        } else if (navigation?.canGoBack?.()) {
                          navigation.goBack();
                        }
                      } catch {}
                    }}
                    style={[styles.modalBtn, { backgroundColor: '#D8A353' }]}
                  >
                    <Text style={{ color: '#000', fontWeight: '700' }}>Ver mis servicios</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  container: { padding: 20, paddingTop: 60, paddingBottom: 140 },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
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
    paddingVertical: 16,
    marginBottom: 15,
    borderColor: '#D8A353',
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  publishButton: {
    backgroundColor: '#D8A353',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  publishText: { color: '#000', fontWeight: 'bold' },
  backButton: { position: 'absolute', top: 40, left: 20, zIndex: 10, backgroundColor: 'transparent' },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8, marginTop: 4 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#D8A353',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleText: { color: '#fff' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8A353',
    padding: 16,
  },
  modalTitle: { color: '#D8A353', fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  modalMsg: { color: '#eee', fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', minWidth: 130 },
});
