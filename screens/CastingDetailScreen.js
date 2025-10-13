import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../src/firebase/firebaseConfig';
import { Video } from 'expo-av';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';

// 👇 Parche mínimo: ScrollView que envuelve strings/números sueltos en <Text>
const SafeScrollView = ({ children, ...props }) => (
  <ScrollView {...props}>
    {React.Children.map(children, (ch, i) =>
      typeof ch === 'string' || typeof ch === 'number'
        ? <Text key={`s-${i}`}>{String(ch)}</Text>
        : Array.isArray(ch)
          ? ch.map((c, j) =>
              (typeof c === 'string' || typeof c === 'number')
                ? <Text key={`s-${i}-${j}`}>{String(c)}</Text>
                : c
            )
          : ch
    )}
  </ScrollView>
);
// --- FREE LIMIT CONFIG ---
const FREE_APPLIES_PER_MONTH = 4;
const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

export default function CastingDetailScreen({ route }) {
  const navigation = useNavigation();
  const { userData } = useUser();
  const { casting, castingId } = route.params || {};

  const [castingData, setCastingData] = useState(casting || null);
  const [remainingPostulations, setRemainingPostulations] = useState(null);
  const [loading, setLoading] = useState(!casting && !!castingId);

  // ✅ nuevo: flag local de “ya postulado”
  const [isApplied, setIsApplied] = useState(false);

  // Lightbox (zoom pantalla completa)
  const [lightbox, setLightbox] = useState({ open: false, url: null });
  const openLightbox = (url) => {
    setLightbox({ open: true, url });
    // reset "en seco" desde JS
    savedScale.value = 1;
    scale.value = 1;
    panX.value = 0;
    panY.value = 0;
  };
  const closeLightbox = () => setLightbox({ open: false, url: null });
  // ----- Zoom/drag para lightbox -----
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);

  const resetZoomWorklet = () => {
    'worklet';
    savedScale.value = 1;
    scale.value = withTiming(1, { duration: 150 });
    panX.value = withTiming(0, { duration: 150 });
    panY.value = withTiming(0, { duration: 150 });
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.max(1, Math.min(next, 4));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (savedScale.value < 1.02) resetZoomWorklet(); // <- worklet
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((_e, success) => {
      if (!success) return;
      if (scale.value > 1.05) {
        resetZoomWorklet(); // <- worklet
      } else {
        runOnJS(closeLightbox)(); // <- JS
      }
    });
  const panGesture = Gesture.Pan()
    .onChange((e) => {
      if (scale.value > 1) {
        panX.value += e.changeX;
        panY.value += e.changeY;
      }
    });

  // Sin tap simple sobre la imagen para NO cerrar por accidente
  const combined = Gesture.Simultaneous(pinch, panGesture);

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value },
      { translateY: panY.value },
      { scale: scale.value },
    ],
  }));

  const isHttpUrl = (v) => typeof v === 'string' && /^https?:\/\//i.test(v.trim());
  const isOwner = castingData?.creatorId === userData?.id;

  // Limite de postulaciones para FREE (4/mes)
  useEffect(() => {
    const fetchPostulationLimit = async () => {
      if (userData?.membershipType !== 'free') return;

      try {
        const key = `applies_${userData.id}_${monthKey()}`;
        const stored = await AsyncStorage.getItem(key);
        const used = stored ? Number(stored) || 0 : 0;
        setRemainingPostulations(Math.max(0, FREE_APPLIES_PER_MONTH - used));
      } catch (e) {
        console.error('Error leyendo cupo:', e);
        setRemainingPostulations(FREE_APPLIES_PER_MONTH);
      }
    };
    fetchPostulationLimit();
  }, [userData?.id, userData?.membershipType]);

// Cargar casting por ID si no vino el objeto
useEffect(() => {
  const fetchCasting = async () => {
    if (!casting && castingId) {
      try {
        setLoading(true);

        // 1) Intento directo por docId
        const directRef = doc(db, 'castings', String(castingId).trim());
        const snap = await getDoc(directRef);

        if (snap.exists()) {
          const data = snap.data();
          setCastingData({ ...data, id: snap.id });
          return;
        }

        // 2) Fallback: buscar por campo shortId
        //    Evitamos traer todo, solo el que coincide con shortId
        //    (importa query, collection, where, getDocs si no los tienes ya)
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const q = query(collection(db, 'castings'), where('shortId', '==', String(castingId).trim()));
        const qs = await getDocs(q);

        if (!qs.empty) {
          const docSnap = qs.docs[0];
          const data = docSnap.data();
          setCastingData({ ...data, id: docSnap.id });
          return;
        }

        Alert.alert('Casting no encontrado', 'Este casting ya no está disponible.');
        navigation.goBack();
      } catch (error) {
        console.error('❌ Error al cargar el casting:', error);
        Alert.alert('Error', 'No se pudo cargar el detalle del casting.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    }
  };
  fetchCasting();
}, [casting, castingId, navigation]);

 // ✅ Detectar si ya fue postulado (persiste en AsyncStorage) — usa shortId
useEffect(() => {
  const loadApplied = async () => {
    try {
      const uid = userData?.id || userData?.uid || userData?.email;
      const shortId =
        castingData?.shortId
        || (typeof castingData?.id === 'string' ? castingData.id.split('_').pop() : castingData?.id);

      const castingIdStr = String(shortId || '');
      if (!uid || !castingIdStr) return;

      const flag = await AsyncStorage.getItem(`applied_${uid}_${castingIdStr}`);
      setIsApplied(!!flag);
    } catch {
      // silencioso
    }
  };
  loadApplied();
}, [userData?.id, userData?.uid, userData?.email, castingData?.id, castingData?.shortId]);

  const s = castingData?.structured || {};
  const dates = s.dates || {};
  const budgets = Array.isArray(s.budgets) ? s.budgets : [];
  const oldRolesIA = Array.isArray(s.roles) ? s.roles : [];
  const selfTape = s.self_tape || {};
  const restrictions = Array.isArray(s.restrictions) ? s.restrictions : [];

  // Derivar modo con compatibilidad hacia atrás
  const mode = castingData?.mode || (Array.isArray(castingData?.roles) && castingData.roles.length ? 'full' : 'extras');
  const isExtras = mode === 'extras';
  const isFull = mode === 'full';

  // Campos normalizados (usamos lo nuevo; si no hay, caemos a lo viejo)
  const agency = castingData?.agencyName || 'No informada';
  const producer = castingData?.producer || s.producer || 'No informada';
  const modality = castingData?.modality || (isExtras ? 'Presencial' : 'No especificada');

  // Roles normalizados (nuevo esquema y fallback a IA viejo)
  const rolesFull = Array.isArray(castingData?.roles) && castingData.roles.length
    ? castingData.roles.map(r => ({
        name: r.name || r.roleTitle || 'Rol',
        profile: r.profile || r.description || '',
        dayRate: r.dayRate || r.day || '',
        buyoutMoving: r.buyoutMoving || r.buyout_moving || '',
        buyoutPrint: r.buyoutPrint || r.buyout_print || '',
        exclusivityMonths: r.exclusivityMonths || r.exclusivity_12m || '',
      }))
    : oldRolesIA.map(r => ({
        name: r.roleTitle || 'Rol',
        profile: r.description || '',
        dayRate: r.day || '',
        buyoutMoving: r.buyout_moving || '',
        buyoutPrint: r.buyout_print || '',
        exclusivityMonths: r.exclusivity_12m || '',
      }));

  // Helper dinero
  const formatMoney = (v) => {
    const s = (v ?? '').toString().replace(/[^\d]/g,'');
    if (!s) return '—';
    return `$${Number(s).toLocaleString('es-CL')}`;
  };

  // 🔒 --- NUEVO: detectar si el casting está CERRADO ---
  const toMs = (v) => {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'string') {
      const t = Date.parse(v);
      return isNaN(t) ? 0 : t;
    }
    if (v?.toMillis) return v.toMillis();
    if (v?.seconds) return v.seconds * 1000;
    return 0;
  };

  const closedByFlag =
    String(castingData?.status || '').toLowerCase() === 'closed' ||
    castingData?.closed === true ||
    s?.closed === true ||
    String(s?.status || '').toLowerCase() === 'closed';

  const closedByDeadline = (() => {
    const d = castingData?.deadline || s?.deadline || s?.apply_until;
    const ms = toMs(d);
    return ms ? ms < Date.now() : false;
  })();

  const isClosed = closedByFlag || closedByDeadline;
  // 🔒 --- FIN NUEVO ---

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#D8A353" />
        <Text style={{ color: '#D8A353', marginTop: 10 }}>Cargando casting…</Text>
      </View>
    );
  }
  if (!castingData) {
    return (
      <View style={styles.screen}>
        <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
          Este casting ya no está disponible.
        </Text>
      </View>
    );
  }

  const handleApplyPress = async () => {
    // El dueño o agencias no postulan
    if (isOwner || userData?.accountType === 'agency') return;

    // ⛔ Si está cerrado, no dejar postular (además del botón deshabilitado)
    if (isClosed) {
      Alert.alert('Casting cerrado', 'Este casting ya no acepta postulaciones.');
      return;
    }

    if (userData?.membershipType === 'free') {
      if (remainingPostulations === null) return; // aún cargando
      if (remainingPostulations <= 0) {
        Alert.alert(
          'Límite alcanzado',
          `Has usado tus ${FREE_APPLIES_PER_MONTH} postulaciones de este mes. ` +
          'Activa un plan para postular sin límites.'
        );
        return;
      }
    }

    // Ok → Navega. Pasamos callback: incrementa contador (FREE), persiste “applied” y pinta azul
    const shortId =
      castingData?.shortId
      || (typeof castingData?.id === 'string' ? castingData.id.split('_').pop() : castingData?.id);

    const castingIdStr = String(shortId || '');

    navigation.navigate('SubmitApplication', {
      castingId: castingIdStr,                 // ← shortId en string
      castingTitle: castingData?.title,
      onSubmitted: async () => {
        try {
          if (userData?.membershipType === 'free') {
            const key = `applies_${userData.id}_${monthKey()}`;
            const stored = await AsyncStorage.getItem(key);
            const used = stored ? Number(stored) || 0 : 0;
            const next = Math.min(FREE_APPLIES_PER_MONTH, used + 1);
            await AsyncStorage.setItem(key, String(next));
            setRemainingPostulations(Math.max(0, FREE_APPLIES_PER_MONTH - next));
          }

          // ⚠️ usa la misma clave (shortId) que guardas/lees en Firestore
          const uid = userData?.id || userData?.uid || userData?.email;
          if (uid && castingIdStr) {
            await AsyncStorage.setItem(`applied_${uid}_${castingIdStr}`, '1');
          }
          setIsApplied(true);
        } catch (e) {
          console.warn('No se pudo finalizar la postulación:', e?.message);
        }
      }
    });
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      {/* 👇 Solo cambié ScrollView -> SafeScrollView (apertura y cierre) */}
      <SafeScrollView contentContainerStyle={[styles.container, { flexGrow: 1 }]}>

        <View style={{ alignItems:'center', marginBottom: 8 }}>
          <Text style={styles.title}>Casting: {castingData?.title || 'Sin título'}</Text>
          <View style={{
            marginTop: 4,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: isExtras ? '#1F6FEB' : '#D8A353'
          }}>
            <Text style={{ color:'#000', fontWeight:'800', fontSize:12 }}>
              {isExtras ? 'EXTRAS' : 'COMPLETO'}
            </Text>
          </View>
        </View>

        {/* Galería horizontal (tap = lightbox) */}
        {Array.isArray(castingData?.images) && castingData.images.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ width: '100%', marginBottom: 16 }}
          >
            {castingData.images.map((url, idx) => {
              const uri = typeof url === 'string' ? url : url?.url;
              if (!uri) return null;
              return (
                <TouchableOpacity
                  key={uri + '_' + idx}
                  activeOpacity={0.9}
                  onPress={() => {
                    if (lightbox.open && lightbox.url === uri) {
                      closeLightbox(); // Cierra si ya estaba abierta la misma imagen
                    } else {
                      openLightbox(uri); // Abre si estaba cerrada o es otra imagen
                    }
                  }}
                >
                  <View
                    style={{
                      width: 220,
                      height: 140,
                      marginRight: 10,
                      borderRadius: 10,
                      overflow: 'hidden',
                      backgroundColor: '#111',
                    }}
                  >
                    <Image
                      source={{ uri }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                      onError={(e) => console.log(`IMG galería ERROR [${idx}]`, e.nativeEvent?.error, uri)}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        {isHttpUrl(castingData?.videoExplain) ? (
          <View style={{ width: '100%', height: 260, marginBottom: 20 }}>
            <Video
              source={{ uri: castingData.videoExplain.trim() }}
              style={{ width: '100%', height: '100%', borderRadius: 10 }}
              useNativeControls
              resizeMode="contain"
              shouldPlay={false}
            />
          </View>
        ) : null}

        {/* Información base (según modo) */}
        {isExtras ? (
          <View style={styles.detailBox}>
            {/* 👇 NUEVO: AGENCIA ARRIBA DEL TEXTO "Casting de EXTRAS" */}
            <Text style={[styles.detailText, { color:'#fff', fontWeight:'bold' }]}>
              🏢 AGENCIA: {(agency || '').toUpperCase()}
            </Text>

            <Text style={[styles.detailText, { color:'#fff', fontWeight:'bold', marginTop:6 }]}>
              🎬 Casting de EXTRAS
            </Text>

            <Text style={styles.detailText}>📍 Ubicación: {castingData?.location || 'No especificada'}</Text>
            <Text style={styles.detailText}>🗓 Fecha de rodaje: {castingData?.extras?.date || 'No informada'}</Text>
            <Text style={styles.detailText}>🕒 Horario: {castingData?.extras?.time || 'No informado'}</Text>
            <Text style={styles.detailText}>🎭 Escena: {castingData?.extras?.scene || 'No informada'}</Text>

            <Text style={[styles.detailText, { color:'#fff', fontWeight:'bold', marginTop:8 }]}>👤 Perfil</Text>
            <Text style={styles.detailText}>Edad: {castingData?.extras?.profile?.ageRange || 'No especificada'}</Text>
            <Text style={styles.detailText}>
              Género: {{
                hombres_y_mujeres: 'Hombres y Mujeres',
                hombre: 'Hombre',
                mujer: 'Mujer',
                otro: 'Otro / No especifica'
              }[castingData?.extras?.profile?.gender] || 'No especificado'}
            </Text>
            {!!castingData?.extras?.profile?.lookNotes && (
              <Text style={styles.detailText}>Look/Restricciones: {castingData.extras.profile.lookNotes}</Text>
            )}

            <Text style={[styles.detailText, { color:'#fff', fontWeight:'bold', marginTop:8 }]}>💰 Pago</Text>
            <Text style={styles.detailText}>Monto: {formatMoney(castingData?.extras?.pay?.amount)}</Text>
            {!!castingData?.extras?.pay?.notes && (
              <Text style={styles.detailText}>Adicionales: {castingData.extras.pay.notes}</Text>
            )}
          </View>
        ) : (
          /* (la rama FULL queda igual, ya mostraba 🏢 Agencia) */
          <View style={styles.detailBox}>
            <Text style={styles.detailText}>🏢 Agencia: {agency}</Text>
            <Text style={styles.detailText}>🎬 Productora: {producer}</Text>
            <Text style={styles.detailText}>📍 Ubicación: {castingData?.location || 'No especificada'}</Text>
            {!!castingData?.deadline && (
              <Text style={styles.detailText}>🗓 Fecha límite: {castingData.deadline}</Text>
            )}
            <Text style={styles.detailText}>🎥 Modalidad: {modality}</Text>
            <Text style={styles.detailText}>💰 Remuneración (resumen): {castingData?.payment || 'No informada'}</Text>
          </View>
        )}

        {/* Resumen IA estructurado */}
        {(dates.callback || dates.wardrobe_shoot || dates.release || budgets.length || s.exclusivity || s.rights || Object.keys(selfTape).length || restrictions.length) && (
          <View style={[styles.detailBox, { marginTop: 10 }]}>
            <Text style={[styles.detailText, { fontWeight: 'bold', color: '#fff' }]}>🧾 Resumen IA</Text>

            {(dates.callback || dates.wardrobe_shoot || dates.release) ? (
              <View style={{ marginTop: 6 }}>
                <Text style={[styles.detailText, { color: '#fff' }]}>📅 Fechas clave</Text>
                {dates.callback ? <Text style={styles.detailText}>• Callback: {dates.callback}</Text> : null}
                {dates.wardrobe_shoot ? <Text style={styles.detailText}>• Vestuario/Rodaje: {dates.wardrobe_shoot}</Text> : null}
                {dates.release ? <Text style={styles.detailText}>• Estreno: {dates.release}</Text> : null}
              </View>
            ) : null}

            {(s.exclusivity || s.rights) ? (
              <View style={{ marginTop: 6 }}>
                {s.exclusivity ? <Text style={styles.detailText}>🔒 Exclusividad: {s.exclusivity}</Text> : null}
                {s.rights ? <Text style={styles.detailText}>🌍 Derechos: {s.rights}</Text> : null}
              </View>
            ) : null}

            {budgets.length ? (
              <View style={{ marginTop: 6 }}>
                <Text style={[styles.detailText, { color: '#fff' }]}>💰 Presupuestos por rol</Text>
                {budgets.map((b, i) => (
                  <Text key={i} style={styles.detailText}>
                    • {b.role || 'Rol'}: Día ${b.day || '-'} | Moving ${b.buyout_moving || '-'} | Print ${b.buyout_print || '-'} | Excl12m ${b.exclusivity_12m || '-'}
                  </Text>
                ))}
              </View>
            ) : null}

            {Object.keys(selfTape).length ? (
              <View style={{ marginTop: 6 }}>
                <Text style={[styles.detailText, { color: '#fff' }]}>🎥 Self tape</Text>
                {selfTape.presentation ? <Text style={styles.detailText}>• Presentación: {selfTape.presentation}</Text> : null}
                {selfTape.photo ? <Text style={styles.detailText}>• Foto: {selfTape.photo}</Text> : null}
                {selfTape.acting ? <Text style={styles.detailText}>• Acting: {selfTape.acting}</Text> : null}
                {selfTape.format ? <Text style={styles.detailText}>• Formato: {selfTape.format}</Text> : null}
              </View>
            ) : null}

            {restrictions.length ? (
              <View style={{ marginTop: 6 }}>
                <Text style={[styles.detailText, { color: '#fff' }]}>⚠️ Restricciones</Text>
                {restrictions.map((r, i) => <Text key={i} style={styles.detailText}>• {r}</Text>)}
              </View>
            ) : null}
          </View>
        )}

        {/* Roles (solo modo FULL) */}
        {isFull && rolesFull.length ? (
          <View style={[styles.detailBox, { marginTop: 10 }]} >
            <Text style={[styles.detailText, { color: '#fff', fontWeight: 'bold' }]}>🎭 Roles</Text>
            {rolesFull.map((r, i) => (
              <View key={i} style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#222' }}>
                <Text style={[styles.detailText, { color: '#D8A353', fontWeight:'700' }]}>• {r.name || 'Rol'}</Text>
                {!!r.profile && <Text style={styles.detailText}>{r.profile}</Text>}
                <Text style={styles.detailText}>Día de trabajo: {formatMoney(r.dayRate)}</Text>
                {!!r.buyoutMoving && <Text style={styles.detailText}>Buyout Moving: {formatMoney(r.buyoutMoving)}</Text>}
                {!!r.buyoutPrint && <Text style={styles.detailText}>Buyout Print: {formatMoney(r.buyoutPrint)}</Text>}
                {!!r.exclusivityMonths && <Text style={styles.detailText}>Exclusividad: {r.exclusivityMonths} meses</Text>}
              </View>
            ))}
          </View>
        ) : null}

        {/* Descripción larga (OCR/autor) */}
        {castingData?.description ? (
          <View style={[styles.detailBox, { marginTop: 10 }]} >
            <Text style={[styles.detailText, { color: '#fff', fontWeight: 'bold' }]}>📝 Descripción detallada</Text>
            <Text style={[styles.detailText, { marginTop: 6 }]}>{castingData.description}</Text>
          </View>
        ) : null}

        {/* Límite de postulaciones (FREE) */}
        {!isOwner && userData?.membershipType === 'free' && remainingPostulations !== null && (
          <Text style={styles.remaining}>
            Postulaciones restantes este mes: {remainingPostulations}
          </Text>
        )}

        {/* Botón Postularme / Postulado / Cerrado */}
        {!isOwner &&
          userData?.accountType !== 'agency' &&
          (userData?.membershipType === 'pro' || userData?.membershipType === 'free') && (
            <TouchableOpacity
              style={[
                styles.applyButton,
                isApplied && styles.appliedButton,
                isClosed && styles.closedButton, // ← NUEVO estilo cerrado
              ]}
              onPress={handleApplyPress}
              disabled={isApplied || isClosed} // ← NUEVO: bloquea si cerrado
            >
              <Text style={styles.applyText}>
                {isClosed ? 'Cerrado' : (isApplied ? 'Postulado' : 'Postularme a este Casting')}
              </Text>
            </TouchableOpacity>
          )}

        {/* Botón Ver Postulaciones (dueño) */}
        {isOwner && userData?.accountType === 'agency' && userData?.membershipType === 'elite' && (
          <TouchableOpacity
            style={styles.viewApplicationsButton}
            onPress={() =>
              navigation.navigate('ViewApplications', {
                castingId: String(castingData?.shortId || ''),   // ← shortId, en string
                castingTitle: castingData?.title || castingData?.name || castingData?.titulo || 'Casting',
              })
            }
          >
            <Text style={styles.buttonText}>📥 Ver postulaciones recibidas</Text>
          </TouchableOpacity>
        )}
      </SafeScrollView>

      {lightbox.open ? (
        <View style={styles.lightbox}>
          {/* Doble tap sobre la imagen: toggle reset/cerrar. Pinch+pan simultáneos */}
          <GestureDetector gesture={doubleTap}>
            <GestureDetector gesture={combined}>
              <Animated.Image
                source={{ uri: lightbox.url }}
                style={[{ width: '95%', height: '80%', resizeMode: 'contain' }, animatedImageStyle]}
              />
            </GestureDetector>
          </GestureDetector>
        </View>
      ) : null}
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
    alignItems: 'center',
    padding: 20,
    top: 30,
    paddingBottom: 120,
    width: '100%',
  },
  title: {
    fontSize: 22,
    color: '#D8A353',
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  detailBox: {
    width: '100%',
    backgroundColor: '#1B1B1B',
    padding: 15,
    borderRadius: 10,
    borderColor: '#D8A353',
    borderWidth: 0.5,
    marginBottom: 20,
  },
  detailText: {
    color: '#ccc',
    fontSize: 13,
    marginBottom: 5,
    lineHeight: 18,
  },
  remaining: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  applyButton: {
    backgroundColor: '#FFA500',
    paddingVertical: 15,
    borderRadius: 10,
    width: '100%',
    marginBottom: 20,
  },
  // ✅ cuando ya está postulado
  appliedButton: {
    backgroundColor: '#1F6FEB',
  },
  // ✅ NUEVO: estado cerrado
  closedButton: {
    backgroundColor: '#555',
    borderColor: '#777',
    borderWidth: 1,
  },
  applyText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  viewApplicationsButton: {
    backgroundColor: '#1B1B1B',
    paddingVertical: 15,
    borderRadius: 10,
    width: '100%',
    borderColor: '#D8A353',
    borderWidth: 0.5,
  },
  buttonText: {
    color: '#D8A353',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  lightbox: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  lightboxClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
  },
});
