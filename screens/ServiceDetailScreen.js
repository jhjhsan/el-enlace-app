import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, ActivityIndicator, Modal, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  getFirestore,
  doc as fsDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';

const GOLD = '#D8A353';

export default function ServiceDetailScreen({ route }) {
  const navigation = useNavigation();
  const db = getFirestore();

  const passedService = route?.params?.service || null;
  const passedId = route?.params?.serviceId ? String(route.params.serviceId) : null;

  const [service, setService] = useState(passedService || null);
  const [loading, setLoading] = useState(!passedService);
  const [notFound, setNotFound] = useState(false);

  // ---------- helpers ----------
  const normalize = (p) => {
    if (!p) return null;
    return {
      id: String(p.id || p._docId || p.docId || Date.now()),
      title: p.title || 'Servicio',
      description: p.description || '',
      category: p.category || '',
      date: p.date || '',
      location: p.location || '',
      creatorEmail: (p.creatorEmail || '').toLowerCase(),
      creatorId: p.creatorId || '',
      chatEnabled: p.chatEnabled !== false,
      enableWhats: !!p.enableWhats,
      contactWhats: p.contactWhats || '',
      createdAt: Number(p.createdAt || p.createdAtMs || 0) || 0,
    };
  };
   const handleContact = () => {
  const email = (service?.creatorEmail || '').trim().toLowerCase();
  if (service?.chatEnabled && email) {
    // Mensaje interno
    navigation.navigate('MessageDetail', { contactEmail: email });
    return;
  }
  // Fallback a WhatsApp si está disponible
  if (service?.enableWhats && service?.contactWhats) {
    openWhats(service.contactWhats, service.title || 'Servicio');
    return;
  }
  // Si no hay nada disponible, avisa
  // (si quieres alerta, importa Alert desde 'react-native')
  // Alert.alert('Sin contacto', 'Este servicio no tiene métodos de contacto disponibles.');
  console.log('Sin contacto disponible para este servicio');
};

  const openWhats = (num, title) => {
    if (!num) return;
    const phone = String(num).replace(/[^\d+]/g, '').replace(/^\+/, '');
    const msg = encodeURIComponent(`Hola! Vi tu servicio "${title}" en El Enlace.`);
    Linking.openURL(`https://wa.me/${phone}?text=${msg}`);
  };

  const goToProfileDetail = async (email) => {
    try {
      const storedFree  = await AsyncStorage.getItem('allProfilesFree');
      const storedPro   = await AsyncStorage.getItem('allProfiles');
      const storedElite = await AsyncStorage.getItem('allProfilesElite');

      const parsedFree  = storedFree  ? JSON.parse(storedFree)  : [];
      const parsedPro   = storedPro   ? JSON.parse(storedPro)   : [];
      const parsedElite = storedElite ? JSON.parse(storedElite) : [];
      const allProfiles = [...parsedFree, ...parsedPro, ...parsedElite];

      const match = allProfiles.find(
        (p) => (p.email || '').toLowerCase() === (email || '').toLowerCase()
      );
      if (!match) {
        setNotFound(true);
        return;
      }

      const tipo = match?.membershipType || 'free';
      if (tipo === 'elite') {
        navigation.navigate('ProfileElite', { viewedProfile: match });
      } else if (tipo === 'pro') {
        navigation.navigate('ProfilePro', { viewedProfile: match });
      } else {
        navigation.navigate('Profile', { viewedProfile: match });
      }
    } catch {
      setNotFound(true);
    }
  };

  // ---------- load logic ----------
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (service || !passedId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);

        // 1) Firestore doc directo
        const direct = await getDoc(fsDoc(db, 'services', passedId));
        if (direct.exists()) {
          mounted && setService(normalize({ id: passedId, ...direct.data() }));
          return;
        }

        // 2) Query por campo id
        const qById = query(
          collection(db, 'services'),
          where('id', '==', String(passedId)),
          limit(1)
        );
        const snap = await getDocs(qById);
        if (!snap.empty) {
          const d = snap.docs[0];
          mounted && setService(normalize({ id: d.id, ...d.data() }));
          return;
        }

        // 3) Fallback local
        const raw = await AsyncStorage.getItem('posts');
        const arr = raw ? JSON.parse(raw) : [];
        const local = (Array.isArray(arr) ? arr : []).find((x) => String(x.id) === String(passedId));
        if (local) {
          mounted && setService(normalize(local));
          return;
        }

        // 4) No hay nada
        mounted && setNotFound(true);
      } catch {
        mounted && setNotFound(true);
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [passedId]);

  const title = useMemo(() => service?.title || 'Detalle del Servicio', [service]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={{ color: GOLD, marginTop: 10 }}>Cargando servicio…</Text>
      </View>
    );
  }
const handleOpenPublisherProfile = async () => {
  try {
    const email = (service?.creatorEmail || '').trim().toLowerCase();
    if (!email) {
      Alert.alert('Perfil no disponible', 'No se encontró el email del publicador.');
      return;
    }

    // Cargar los 3 buckets
    const [f, p, e] = await Promise.all([
      AsyncStorage.getItem('allProfilesFree'),
      AsyncStorage.getItem('allProfiles'),
      AsyncStorage.getItem('allProfilesElite'),
    ]);
    const all = [
      ...(f ? JSON.parse(f) : []),
      ...(p ? JSON.parse(p) : []),
      ...(e ? JSON.parse(e) : []),
    ];

    // Buscar por email (normalizado)
    let match = all.find(
      (prof) => (prof?.email || '').toLowerCase() === email
    );

    if (!match) {
      Alert.alert('Perfil no encontrado', 'No se encontró el perfil del publicador.');
      return;
    }

    // Saneos mínimos (como en Filtered)
    const cleaned = { ...match };
    if (!cleaned.name && cleaned.agencyName) cleaned.name = cleaned.agencyName;
    if (cleaned.profilePhoto && !/^https?:|^file:/.test(cleaned.profilePhoto)) cleaned.profilePhoto = null;
    if (cleaned.profileVideo && !/^https?:|^file:/.test(cleaned.profileVideo)) cleaned.profileVideo = null;

    const tipo = (cleaned.membershipType || 'free').toLowerCase();
    if (tipo === 'elite') {
      navigation.navigate('ProfileElite', { viewedProfile: cleaned });
    } else if (tipo === 'pro') {
      navigation.navigate('ProfilePro', { viewedProfile: cleaned });
    } else {
      navigation.navigate('Profile', { viewedProfile: cleaned });
    }
  } catch (err) {
    console.log('❌ Error al abrir perfil:', err);
    Alert.alert('Error', 'Ocurrió un problema al abrir el perfil.');
  }
};

  return (
    <View style={styles.screen}>
      {/* Back */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Encabezado compacto */}
        <View style={styles.header}>
    <Text style={styles.headerEmoji}>🧰</Text>
    <Text style={styles.headerTitle}>Detalle del Servicio</Text>
  </View>

  <View style={styles.content}>
    {/* más contenido */}
  </View>

        {/* Tarjeta principal */}
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          {/* Chips */}
          <View style={styles.chips}>
            {!!service?.category && (
              <View style={[styles.chip, { borderColor: '#f5c54233' }]}>
                <Text style={styles.chipText}>🏷️ {service.category}</Text>
              </View>
            )}
            {!!service?.location && (
              <View style={[styles.chip, { borderColor: '#4ea6ff33' }]}>
                <Text style={styles.chipText}>📍 {service.location}</Text>
              </View>
            )}
            {!!service?.date && (
              <View style={[styles.chip, { borderColor: '#ff6b6b33' }]}>
                <Text style={styles.chipText}>📅 {service.date}</Text>
              </View>
            )}
          </View>

          {/* Descripción */}
          {!!service?.description && (
            <>
              <Text style={styles.sectionTitle}>📝 Descripción</Text>
              <Text style={styles.desc}>{service.description}</Text>
            </>
          )}
        </View>

        {/* Acciones */}
<View style={styles.actionsRow}>
  <TouchableOpacity
    style={[styles.actionButton, styles.contactButton]}
    onPress={handleContact}
  >
    <Ionicons name="mail" size={16} color="#fff" style={styles.icon} />
    <Text style={[styles.actionText, { color: '#fff' }]}>Contactar</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.actionButton, styles.whatsButton]}
    onPress={() => service?.contactWhats && openWhats(service.contactWhats, service?.title)}
    disabled={!service?.contactWhats}
  >
    <Ionicons name="logo-whatsapp" size={16} color="#0f0" style={styles.icon} />
    <Text style={[styles.actionText, { color: '#0f0' }]}>WhatsApp</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.actionButton, styles.profileButton]}
    onPress={handleOpenPublisherProfile}
  >
    <Ionicons name="search" size={16} color="#D8A353" style={styles.icon} />
    <Text style={[styles.actionText, { color: '#D8A353' }]}>Ver perfil</Text>
  </TouchableOpacity>
</View>

      </ScrollView>

      {/* Modal no disponible */}
      <Modal visible={notFound} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Servicio no disponible</Text>
            <Text style={styles.modalMsg}>
              Este servicio pudo haber sido eliminado o ya no está público.
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => { setNotFound(false); navigation.goBack(); }}>
              <Text style={{ color: '#000', fontWeight: '700' }}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ------------------------ styles ------------------------ */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center' },

  backBtn: { position: 'absolute', top: 40, left: 20, zIndex: 20 },

  container: { padding: 10, paddingBottom: 120 },

header: {
  flexDirection: 'row',       // emoji + texto en fila
  alignItems: 'center',       // centra verticalmente
  justifyContent: 'center',   // centra horizontalmente
  marginBottom: 20, 
  marginTop: 50,
},
headerEmoji: {
  fontSize: 22,
  marginRight: 8              // espacio entre emoji y texto
},
headerTitle: {
  color: '#fff',
  fontSize: 20,
  fontWeight: 'bold',
},
  card: {
    backgroundColor: '#101010',
    borderWidth: 0.2,
    borderColor: GOLD,
    borderRadius: 14,
    padding: 16,
  },

  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },

  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    borderWidth: 0.5,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#0f0f0f',
  },
  chipText: { color: '#ddd', fontSize: 12, fontWeight: '600' },

  sectionTitle: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 6,
  },
  desc: { color: '#eee', fontSize: 15, lineHeight: 22 },

  actions: {
    marginTop: 14,
    gap: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnPrimary: { backgroundColor: GOLD, borderColor: GOLD },
  btnPrimaryText: { color: '#000', fontWeight: '800' },

  // 👇 Botón WhatsApp igual al que te gustó
  btnWhats: { borderColor: '#00e67633', backgroundColor: '#0c0c0c' },
  btnWhatsText: { color: '#00e676', fontWeight: '800' },

  btnGhost: { borderColor: GOLD, backgroundColor: '#0c0c0c' },
  btnGhostText: { color: GOLD, fontWeight: '800' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalCard: {
    width: '100%', backgroundColor: '#111',
    borderRadius: 12, borderWidth: 1, borderColor: GOLD,
    padding: 18,
  },
  modalTitle: { color: GOLD, fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  modalMsg: { color: '#eee', textAlign: 'center', marginBottom: 14 },
  modalBtn: { backgroundColor: GOLD, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
actionsRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 20,
},
actionButton: {
  flex: 1,                  // mismo ancho
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 10,
  borderRadius: 8,
  marginHorizontal: 4,      // espacio entre botones
},
icon: {
  marginRight: 6,
},
contactButton: {
  backgroundColor: '#D8A353',
},
whatsButton: {
  backgroundColor: '#000',
  borderColor: '#0f0',
  borderWidth: 1,
},
profileButton: {
  backgroundColor: '#000',
  borderColor: '#D8A353',
  borderWidth: 1,
},
actionText: {
  fontSize: 13,
  fontWeight: 'bold',
},


});
