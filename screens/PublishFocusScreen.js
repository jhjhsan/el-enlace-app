// screens/PublishFocusScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { Ionicons } from '@expo/vector-icons';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../src/firebase/firebaseConfig';

// Firestore
import {
  collection,
  addDoc,
  setDoc,               // 🆕 para crear doc con ID propio
  serverTimestamp,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';

import { useRoute, useNavigation } from '@react-navigation/native';

export default function PublishFocusScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const isEdit = route?.params?.mode === 'edit';
  const focusEditing = route?.params?.focus || null;

  const [title, setTitle] = useState('');
  const [requirements, setRequirements] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [duration, setDuration] = useState('');
  const [payment, setPayment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [whatsapp, setWhatsapp] = useState('');           // 🆕
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // -------------------------------
  // 🆕 Helpers
  // -------------------------------
  const normalizeEmail = (e) =>
    (typeof e === 'string' ? e : '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '')
      .replace(/@{2,}/g, '@');

  // 🆕 Guardar focus en Firestore (colección 'focus')
  const createFocusDoc = async (focusObj, user) => {
    const authorEmail = user?.email || '';
    const authorEmailNormalized = normalizeEmail(authorEmail);
    const authorName =
      user?.name || user?.agencyName || user?.displayName || 'Usuario';

    const ref = doc(collection(db, 'focus'), String(focusObj.id));
    await setDoc(
      ref,
      {
        id: String(focusObj.id),
        title: focusObj.title || '',
        requirements: focusObj.requirements || '',
        dateTime: focusObj.dateTime || '',
        duration: focusObj.duration || '',
        payment: focusObj.payment || '',
        paymentMethod: focusObj.paymentMethod || '',
        whatsapp: focusObj.whatsapp || '',
        description: focusObj.description || '',
        authorEmail,
        authorEmailNormalized,
        authorName,
        createdAt: serverTimestamp(),
        createdAtMs: focusObj.createdAtMs || Date.now(),
      },
      { merge: true }
    );

    return { authorEmailNormalized, authorName };
  };

  // -------------------------------
  // Helpers de notificaciones/push
  // -------------------------------
  const getFreeAndProRecipients = async () => {
    const recipients = [];
    try {
      const freeSnap = await getDocs(query(collection(db, 'profilesFree')));
      freeSnap.forEach((d) => {
        const data = d.data() || {};
        const email = (data.email || d.id || '').toString().trim().toLowerCase();
        if (!email) return;
        recipients.push({ email, expoPushToken: data.expoPushToken || '' });
      });
    } catch (e) {
      console.log('Error leyendo profilesFree:', e?.message || e);
    }

    try {
      const proSnap = await getDocs(query(collection(db, 'profilesPro')));
      proSnap.forEach((d) => {
        const data = d.data() || {};
        const email = (data.email || d.id || '').toString().trim().toLowerCase();
        if (!email) return;
        recipients.push({ email, expoPushToken: data.expoPushToken || '' });
      });
    } catch (e) {
      console.log('Error leyendo profilesPro:', e?.message || e);
    }

    // Deduplicar por email
    const seen = new Set();
    const unique = [];
    for (const r of recipients) {
      if (seen.has(r.email)) continue;
      seen.add(r.email);
      unique.push(r);
    }
    return unique;
  };

  // ⬇️ ORIGINAL: createNotificationDocsForAll
  // 🆕 Mejorada: excluye autor y añade metadata (authorEmailNormalized, sender, senderName, focusId)
  const createNotificationDocsForAll = async ({
    title,
    body,
    recipients,
    focusId,
    authorEmailNormalized,  // 🆕
    authorName,             // 🆕
  }) => {
    const now = serverTimestamp();
    const tasks = (recipients || []).map((r) => {
      const email = (r?.email || '').toString().trim().toLowerCase();
      if (!email) return Promise.resolve();

      // 🆕 excluir al autor
      if (authorEmailNormalized && email === authorEmailNormalized) return Promise.resolve();

      return addDoc(collection(db, 'notifications', email, 'items'), {
        type: 'focus',
        // Puedes dejar el título genérico o personalizar aquí:
        // title,  // genérico "Nuevo Focus publicado"
        title: `Nuevo focus de: ${authorName || 'Usuario'}`, // 🆕 más claro para la tarjeta
        message: body,
        body,
        read: false,
        createdAt: now,
        focusId: focusId || null,
        // 🆕 metadata para filtros y UI
        authorEmailNormalized: authorEmailNormalized || null,
        sender: authorEmailNormalized || 'system',
        senderName: authorName || 'Usuario',
      });
    });
    await Promise.all(tasks);
  };

  // ⬇️ ORIGINAL: sendExpoPushBatch
  // 🆕 Mejorada: excluye al autor si se pasa authorEmailNormalized
  const sendExpoPushBatch = async ({ title, body, recipients, authorEmailNormalized }) => {
    const tokens = (recipients || [])
      .map((r) => ({
        email: (r?.email || '').toString().trim().toLowerCase(),
        token: (r?.expoPushToken || '').toString().trim(),
      }))
      .filter((x) => x.token.startsWith('ExponentPushToken['))
      .filter((x) => !authorEmailNormalized || x.email !== authorEmailNormalized); // 🆕 excluir autor (opcional)

    if (tokens.length === 0) return;

    const chunkSize = 90;
    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunk = tokens.slice(i, i + chunkSize);
      const messages = chunk.map((x) => ({
        to: x.token,
        sound: 'default',
        title,
        body,
        data: { type: 'focus' },
        priority: 'high',
      }));

      try {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages),
        });
      } catch (err) {
        console.log('Expo push error:', err?.message || err);
      }
    }
  };

  // Prefill en modo edición
  useEffect(() => {
    if (isEdit && focusEditing) {
      setTitle(focusEditing.title || '');
      setRequirements(focusEditing.requirements || '');
      setDateTime(focusEditing.dateTime || '');
      setDuration(focusEditing.duration || '');
      setPayment(focusEditing.payment || '');
      setPaymentMethod(focusEditing.paymentMethod || '');
      setWhatsapp(focusEditing.whatsapp || '');
      setDescription(focusEditing.description || '');
    }
  }, [isEdit, focusEditing]);

  // Éxito: auto-cierre y navegación amigable
  useEffect(() => {
    if (successVisible) {
      const t = setTimeout(() => {
        setSuccessVisible(false);
        if (isEdit) {
          navigation.goBack(); // vuelve a Mis Focus
        } else {
          navigation.navigate('FocusListScreen');
        }
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [successVisible, isEdit, navigation]);

  const showError = (msg) => {
    setErrorMsg(msg || 'Ocurrió un error.');
    setErrorVisible(true);
  };

  // 🔧 Actualiza en Firestore buscando por varias rutas
  const updateRemoteFocus = async (focusId, payload) => {
    const CANDS = ['focus', 'focuses', 'focusGroups', 'focus_public'];

    // 1) doc con id == focusId
    for (const colName of CANDS) {
      try {
        const dref = doc(collection(db, colName), focusId);
        const ds = await getDoc(dref);
        if (ds.exists()) {
          await updateDoc(dref, { ...payload, updatedAt: serverTimestamp() });
          return true;
        }
      } catch {}
    }

    // 2) buscar por campo id == focusId
    for (const colName of CANDS) {
      try {
        const q1 = query(collection(db, colName), where('id', '==', focusId));
        const s1 = await getDocs(q1);
        if (!s1.empty) {
          await updateDoc(s1.docs[0].ref, { ...payload, updatedAt: serverTimestamp() });
          return true;
        }
      } catch {}
      // 3) buscar por campo focusId == focusId
      try {
        const q2 = query(collection(db, colName), where('focusId', '==', focusId));
        const s2 = await getDocs(q2);
        if (!s2.empty) {
          await updateDoc(s2.docs[0].ref, { ...payload, updatedAt: serverTimestamp() });
          return true;
        }
      } catch {}
    }
    return false;
  };

  const handleSubmit = async () => {
    if (!title || !requirements || !dateTime || !payment) {
      return showError('Completa los campos obligatorios: Título, Requisitos, Fecha y hora, Pago.');
    }

    const userRaw = await AsyncStorage.getItem('userProfile');
    const user = userRaw ? JSON.parse(userRaw) : {};

    if (isEdit && focusEditing) {
      // === MODO EDICIÓN ===
      const payload = {
        title, requirements, dateTime, duration, payment, paymentMethod, whatsapp, description,
      };

      try {
        setLoading(true);

        // 1) Actualizar local
        const raw = await AsyncStorage.getItem('focusList');
        const list = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex((f) => f?.id === focusEditing.id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...payload };
          await AsyncStorage.setItem('focusList', JSON.stringify(list));
        }

        // 2) Actualizar remoto (mejor si tu CF usa una colección concreta; ver nota abajo)
        await updateRemoteFocus(focusEditing.id, payload);

        setSuccessVisible(true);
      } catch (error) {
        console.error('Error editando focus:', error);
        showError('No se pudo editar el focus. Intenta nuevamente.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // === MODO CREAR ===
    const newFocus = {
      id: uuid.v4(),
      title,
      requirements,
      dateTime,
      duration,
      payment,
      paymentMethod,
      whatsapp,
      description,
      authorEmail: user?.email || '',
      authorName: user?.name || '',
      createdAtMs: Date.now(),
    };

    try {
      setLoading(true);

      // 1) Guardar local
      const existingData = await AsyncStorage.getItem('focusList');
      const focusList = existingData ? JSON.parse(existingData) : [];
      focusList.push(newFocus);
      await AsyncStorage.setItem('focusList', JSON.stringify(focusList));

      // 2) 🆕 Guardar en Firestore (colección 'focus')
      const { authorEmailNormalized, authorName } = await createFocusDoc(newFocus, user);

      // 3) Notificar + Push (excluyendo al autor) 🆕
      const recipients = await getFreeAndProRecipients();
      const notifTitle = 'Nuevo Focus publicado';
      const notifBody = title.trim();

      await createNotificationDocsForAll({
        title: notifTitle,
        body: notifBody,
        recipients,
        focusId: newFocus.id,
        authorEmailNormalized,   // 🆕
        authorName,              // 🆕
      });

      await sendExpoPushBatch({
        title: notifTitle,
        body: notifBody,
        recipients,
        authorEmailNormalized,   // 🆕
      });

      // 4) (Opcional) Si quieres mantener tu callable:
      // const syncFocus = httpsCallable(functions, 'syncFocusToFirestore');
      // await syncFocus();

      setSuccessVisible(true);
    } catch (error) {
      console.error('Error guardando o sincronizando el focus:', error);
      showError('No se pudo guardar o sincronizar la publicación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          {isEdit ? '✏️ Editar Focus Group' : '📢 Publicar Focus Group'}
        </Text>
        <Text style={styles.label}>WhatsApp del contacto</Text>
        <TextInput
          style={styles.input}
          value={whatsapp}
          onChangeText={setWhatsapp}
          placeholder="Ej: +56 9 1234 5678"
          placeholderTextColor="#aaa"
          keyboardType="phone-pad"
          autoCapitalize="none"
        />
        <Text style={styles.label}>Título del estudio *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Ej: Club Social para hombres de 25 a 35"
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>Requisitos del participante *</Text>
        <TextInput
          style={styles.input}
          value={requirements}
          onChangeText={setRequirements}
          placeholder="Ej: Hombres, 25 a 35 años, chilenos, universitarios..."
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>Fecha y hora *</Text>
        <TextInput
          style={styles.input}
          value={dateTime}
          onChangeText={setDateTime}
          placeholder="Ej: Martes a las 18:00 hrs"
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>Duración estimada</Text>
        <TextInput
          style={styles.input}
          value={duration}
          onChangeText={setDuration}
          placeholder="Ej: 1 hora y media"
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>Pago ofrecido *</Text>
        <TextInput
          style={styles.input}
          value={payment}
          onChangeText={setPayment}
          placeholder="Ej: $20.000"
          placeholderTextColor="#aaa"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Forma de pago</Text>
        <TextInput
          style={styles.input}
          value={paymentMethod}
          onChangeText={setPaymentMethod}
          placeholder="Ej: Gift card Cencosud, transferencia..."
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>Descripción adicional</Text>
        <TextInput
          style={styles.textarea}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          placeholder="Otros detalles..."
          placeholderTextColor="#aaa"
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading
              ? (isEdit ? '⏳ Guardando cambios…' : '⏳ Publicando…')
              : (isEdit ? '✅ Guardar cambios' : '✅ Publicar Focus')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de éxito */}
      <Modal
        visible={successVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Ionicons name="checkmark-circle" size={64} color="#4CAF50" style={{ marginBottom: 12 }} />
            <Text style={styles.modalTitle}>{isEdit ? '¡Cambios guardados!' : '¡Focus publicado!'}</Text>
            <Text style={styles.modalText}>
              {isEdit ? 'Tu focus fue editado correctamente.' : 'Tu publicación se guardó y sincronizó exitosamente.'}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Modal de error / validación */}
      <Modal
        visible={errorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { borderColor: '#ff6b6b' }]}>
            <Ionicons name="warning-outline" size={48} color="#ff6b6b" style={{ marginBottom: 12 }} />
            <Text style={[styles.modalTitle, { color: '#ff6b6b' }]}>Atención</Text>
            <Text style={styles.modalText}>{errorMsg}</Text>
            <TouchableOpacity style={[styles.button, { marginTop: 10 }]} onPress={() => setErrorVisible(false)}>
              <Text style={styles.buttonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* -------------------------- STYLES -------------------------- */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  backButton: { position: 'absolute', top: 40, left: 20, zIndex: 2000 },
  container: { padding: 20, paddingTop: 60 },
  content: { paddingBottom: 120 },
  title: {
    fontSize: 22, color: '#D8A353', fontWeight: 'bold', marginBottom: 20, textAlign: 'center',
  },
  label: { color: '#D8A353', fontWeight: 'bold', marginTop: 10 },
  input: {
    backgroundColor: '#1a1a1a', color: '#fff', padding: 10, borderRadius: 8, marginTop: 5,
  },
  textarea: {
    backgroundColor: '#1a1a1a', color: '#fff', padding: 10, borderRadius: 8, marginTop: 5, textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#D8A353', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 30,
  },
  buttonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalBox: {
    width: '100%', backgroundColor: '#1A1A1A', borderRadius: 12, borderWidth: 1, borderColor: '#D8A353',
    padding: 20, alignItems: 'center',
  },
  modalTitle: { color: '#D8A353', fontSize: 18, fontWeight: 'bold', marginBottom: 6, textAlign: 'center' },
  modalText: { color: '#fff', fontSize: 14, textAlign: 'center', marginBottom: 6 },
});
