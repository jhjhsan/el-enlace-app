import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { Video } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import { db } from '../src/firebase/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  exportApplicationsToPDF,
  exportApplicationsToExcel,
  EXPORT_STATUS,
} from '../utils/exportUtils';

/* =========================
   Helpers
   ========================= */
const normalizeEmail = (email = '') =>
  email
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9@._+\-]/gi, '');

const toMs = (t) => {
  if (typeof t === 'number') return t;
  if (t?.seconds) return t.seconds * 1000; // Firestore Timestamp
  const n = Date.parse(t || '');
  return isNaN(n) ? 0 : n;
};

/* 🔎 Palabras clave para detectar “recurso” */
const RESOURCE_CATS = [
  // Transporte
  'transporte', 'van', 'vans', 'camion', 'camión', 'camiones',
  'motorhome', 'casa rodante', 'camerino', 'auto', 'autos', 'vehículo', 'vehiculos',
  'moto', 'motos', 'bicicleta', 'bicicletas',
  // Locaciones / estudios
  'locacion', 'locación', 'locaciones', 'estudio', 'plato', 'foro', 'galpon', 'galpón',
  // Renta equipos
  'renta', 'equipo', 'equipos', 'cámara', 'camara', 'lente', 'iluminacion', 'iluminación',
  'grip', 'generador', 'drone', 'gimbal', 'steady', 'monitoreo',
  // Arte / vestuario / props
  'utileria', 'utilería', 'props', 'vestuario', 'mobiliario', 'ambientacion', 'ambientación',
];

const gatherText = (val) => {
  if (!val) return '';
  if (Array.isArray(val)) return val.join(' ');
  if (typeof val === 'object') return Object.values(val).join(' ');
  return String(val);
};

const isResourceProfile = (p = {}) => {
  const raw = [
    p.categories, p.category, p.categoryList,
    p.skills, p.skillsText, p.tags,
    p.about, p.aboutMe, p.bio, p.description, p.services, p.offerType,
  ]
    .map(gatherText)
    .join(' ')
    .toLowerCase();

  return RESOURCE_CATS.some((kw) => raw.includes(kw));
};

/* Detectar tipo (resource > elite > pro > free) */
const kindFromProfile = (p = {}) => {
  const mt = String(p.membershipType || p.type || '').toLowerCase().trim();
  const explicitResource = mt.includes('resource') || mt.includes('recurso') || p.isResource === true;
  if (explicitResource || isResourceProfile(p)) return 'resource';
  if (mt.includes('pro')) return 'pro';
  if (mt.includes('free')) return 'free';
  return 'free';
};

/* Badge styles por tipo */
const kindStyle = (k) => {
  switch (k) {
    case 'elite':
      return { borderColor: '#7E57C2', backgroundColor: '#221b2b' };
    case 'pro':
      return { borderColor: '#D8A353', backgroundColor: '#1e1a12' };
    case 'resource':
      return { borderColor: '#2E7D32', backgroundColor: '#112115' };
    default:
      return { borderColor: '#555', backgroundColor: '#141414' };
  }
};

export default function ViewApplicationsScreen({ route }) {
  const { castingId, castingTitle } = route.params || {};
  const [applications, setApplications] = useState([]);
  const navigation = useNavigation();
  const { userData } = useUser();
  const castingIdStr = String(castingId || '').trim();

  // Estados de carga para exportación
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);

  // Callback que reciben las funciones de exportación (NECESARIO)
  const onStatus = (type, phase) => {
    if (type === 'pdf' || type === 'pdf_selected') {
      setLoadingPDF(phase === EXPORT_STATUS.START);
    }
    if (type === 'excel' || type === 'excel_selected') {
      setLoadingExcel(phase === EXPORT_STATUS.START);
    }
  };

  // Filtros y selección
  const [queryText, setQueryText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all|free|pro|resource|elite
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set()); // ids seleccionados

  const shortlistKey = `applications_shortlist_${castingIdStr}`;

  // 🔎 Índice local de perfiles (para enriquecer tipo)
  const [profilesIndex, setProfilesIndex] = useState({});

  // Solo Elite puede ver esta pantalla
  useEffect(() => {
    if (userData?.membershipType !== 'elite') {
      navigation.goBack();
    }
  }, [userData, navigation]);

  // 0) Construir índice local de perfiles (free/pro/elite + recurso)
  useEffect(() => {
    const buildIndex = async () => {
      try {
        const [rawFree, rawPro, rawElite] = await Promise.all([
          AsyncStorage.getItem('allProfilesFree'),
          AsyncStorage.getItem('allProfiles'), // Pro
          AsyncStorage.getItem('allProfilesElite'),
        ]);

        const free = rawFree ? JSON.parse(rawFree) : [];
        const pro = rawPro ? JSON.parse(rawPro) : [];
        const elite = rawElite ? JSON.parse(rawElite) : [];

        const idx = {};
        const addArr = (arr, fallbackType) => {
          arr.forEach((p) => {
            const email = normalizeEmail(p?.email);
            if (!email) return;
            const prev = idx[email] || {};
            const merged = { ...prev, ...p };
            const mt = String(merged.membershipType || merged.type || fallbackType || '').toLowerCase().trim();
            merged.membershipType = mt;
            merged.isResource = Boolean(prev.isResource) || Boolean(p?.isResource) || isResourceProfile(merged);
            idx[email] = merged;
          });
        };

        addArr(free, 'free');
        addArr(pro, 'pro');

        setProfilesIndex(idx);
      } catch (e) {
        console.log('⚠️ No se pudo construir índice de perfiles:', e);
        setProfilesIndex({});
      }
    };
    buildIndex();
  }, []);

  // 1) Carga caché local (por casting)
  useEffect(() => {
    const loadCache = async () => {
      try {
        const cacheKey = `applications_cache_${castingIdStr}`;
        const raw = await AsyncStorage.getItem(cacheKey);
        const parsed = raw ? JSON.parse(raw) : [];
        const filtered = Array.isArray(parsed) ? parsed : [];
        filtered.sort((a, b) => toMs(b.timestamp) - toMs(a.timestamp));
        setApplications(filtered);
      } catch (error) {
        console.error('Error al cargar postulaciones (cache):', error);
      }
    };
    const unsub = navigation.addListener('focus', loadCache);
    return unsub;
  }, [navigation, castingIdStr]);

  // 2) Escucha Firestore (fuente de verdad)
  useEffect(() => {
    if (!castingIdStr) return;

    const q = query(
      collection(db, 'applications'),
      where('castingId', '==', castingIdStr)
    );

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const fromFs = snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            castingId: data.castingId ?? castingIdStr,
            castingTitle: data.castingTitle ?? '',
            timestamp: data.timestamp ?? data.submittedAt ?? data.createdAt ?? Date.now(),

            // 🆕 Prioriza actingVideos; si no, videos (compat)
            videos: Array.isArray(data.actingVideos) ? data.actingVideos
                  : (Array.isArray(data.videos) ? data.videos : []),

            profile: {
              ...(data.profile || {}),
              name: data.profile?.name || '',
              email: data.profile?.email || '',
              profilePhoto: data.profile?.profilePhoto || '',
              membershipType: (data.profile?.membershipType || data.profile?.type || '').toLowerCase(),
              isResource: data.profile?.isResource === true,
              categories: data.profile?.categories || data.profile?.categoryList || data.profile?.category || [],
              skills: data.profile?.skills || data.profile?.skillsText || [],
              bio: data.profile?.bio || data.profile?.about || data.profile?.aboutMe || '',
              description: data.profile?.description || '',
            },
          };
        });

        const sorted = [...fromFs].sort((x, y) => toMs(y.timestamp) - toMs(x.timestamp)); // recientes primero
        setApplications(sorted);

        // Cachea último snapshot (por casting)
        try {
          const cacheKey = `applications_cache_${castingIdStr}`;
          await AsyncStorage.setItem(cacheKey, JSON.stringify(sorted));
        } catch {}
      },
      (err) => console.error('❌ Firestore applications error:', err)
    );

    return () => unsub();
  }, [castingIdStr]);

  // 3) Cargar selección persistida
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(shortlistKey);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) setSelectedIds(new Set(arr));
        }
      } catch {}
    })();
  }, [shortlistKey]);

  // 4) Guardar selección persistida
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(shortlistKey, JSON.stringify(Array.from(selectedIds)));
      } catch {}
    })();
  }, [selectedIds, shortlistKey]);

  // Enriquecer cada postulación con el índice local y calcular kind
  const appsEnriched = useMemo(() => {
    return applications.map((a) => {
      const email = normalizeEmail(a?.profile?.email);
      const idx = email ? profilesIndex[email] || {} : {};
      const mergedProfile = { ...a.profile, ...idx };
      const kind = kindFromProfile(mergedProfile);
      return { ...a, profile: mergedProfile, _kind: kind };
    });
  }, [applications, profilesIndex]);

  // Filtrado
  const filteredApps = useMemo(() => {
    const qtext = queryText.trim().toLowerCase();
    let list = [...appsEnriched];

    if (qtext) {
      list = list.filter((a) => {
        const name = (a.profile?.name || '').toLowerCase();
        const email = (a.profile?.email || '').toLowerCase();
        return name.includes(qtext) || email.includes(qtext);
      });
    }

    if (typeFilter !== 'all') {
      list = list.filter((a) => a._kind === typeFilter);
    }

    list.sort((x, y) => toMs(y.timestamp) - toMs(x.timestamp));
    return list;
  }, [appsEnriched, queryText, typeFilter]);

  const selectedCount = selectedIds.size;

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((s) => !s);
  }, []);

  const toggleSelectId = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    const ids = filteredApps.map((a) => a.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, [filteredApps]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const getScopeData = (scope) => {
    if (scope === 'selected') {
      const set = selectedIds;
      return filteredApps.filter((a) => set.has(a.id));
    }
    return filteredApps;
  };

  const handleExportSmart = async (kind /* 'pdf'|'excel' */) => {
    try {
      const scope = selectedCount > 0 ? 'selected' : 'all';
      const data = getScopeData(scope);
      if (data.length === 0) {
        Alert.alert('Sin datos', 'No hay postulaciones para exportar (revisa los filtros o la selección).');
        return;
      }
      const title = castingTitle || 'Casting';
      const typeStr =
        kind === 'pdf'
          ? scope === 'selected' ? 'pdf_selected' : 'pdf'
          : scope === 'selected' ? 'excel_selected' : 'excel';

      const options = { onStatus, type: typeStr, data };
// --- Helpers de export seguros (aceptan ambas firmas del util) ---
const callExportSafely = async (fn, id, title, extra = {}) => {
  // Preferimos la firma nueva con options:
  try {
    await fn(id, title, { onStatus, ...extra });   // v2
    return;
  } catch (e) {
    // Fallback a la firma antigua: fn(id, title, onStatus)
    try {
      await fn(id, title, onStatus);               // v1
      return;
    } catch (e2) {
      console.log('❌ Export error (fallback):', e2);
      throw e2;
    }
  }
};

const exportPDF = (id, title, data) =>
  callExportSafely(exportApplicationsToPDF, id, title, { type: 'pdf', data });

const exportExcel = (id, title, data) =>
  callExportSafely(exportApplicationsToExcel, id, title, { type: 'excel', data });

      if (kind === 'pdf') {
        await exportApplicationsToPDF(castingIdStr, title, options);
      } else {
        await exportApplicationsToExcel(castingIdStr, title, options);
      }
    } catch (e) {
      console.log('❌ Error exportando:', e);
      Alert.alert('Error', 'Ocurrió un problema al exportar.');
    }
  };

  /* ============ Render de tarjeta ============ */
  const renderItem = ({ item }) => {
    const isChecked = selectedIds.has(item.id);
    const kind = item._kind; // ya viene enriquecido
    const badgeStyles = [styles.badgePill, kindStyle(kind)];

    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>🕒 Enviado: </Text>
          <Text style={styles.value}>{new Date(toMs(item.timestamp)).toLocaleString()}</Text>
        </View>

        <View style={styles.headerRow}>
          {selectionMode && (
            <TouchableOpacity
              onPress={() => toggleSelectId(item.id)}
              style={styles.checkboxBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isChecked ? 'checkbox' : 'square-outline'}
                size={22}
                color="#D8A353"
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.profilePreview}
            onPress={() => {
              try {
                const tipo = kind; // ya calculado
                if (tipo === 'elite') {
                  navigation.navigate('ProfileElite', { viewedProfile: item.profile });
                } else if (tipo === 'pro') {
                  navigation.navigate('ProfilePro', { viewedProfile: item.profile });
                } else {
                  navigation.navigate('Profile', { viewedProfile: item.profile });
                }
              } catch (e) {
                console.log('❌ Error al navegar al perfil:', e);
                navigation.navigate('Profile', { viewedProfile: item.profile });
              }
            }}
          >
            {item.profile?.profilePhoto ? (
              <Image source={{ uri: item.profile.profilePhoto }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text>👤</Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.profile?.name || 'Sin nombre'}
                </Text>
                <View style={badgeStyles}>
                  <Text style={styles.badgeText}>{kind.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.emailText} numberOfLines={1}>
                {item.profile?.email || ''}
              </Text>
            </View>

            <Text style={styles.link}>Ver perfil</Text>
          </TouchableOpacity>
        </View>

        {/* 👇 Se eliminó la previsualización de videos acting en tarjetas */}
        {/* (No mostrar players; los links se verán en el PDF exportado) */}
      </View>
    );
  };

  /* ============ Header (con buscador debajo del título) ============ */
  const ListHeader = useMemo(() => {
    return (
      <View style={styles.headerContainer}>
        <Text style={styles.title}>📥 Postulaciones Recibidas</Text>
        <Text style={styles.subtitle}>{castingTitle || 'Casting'}</Text>

        {/* Buscador no-controlado para no perder foco en Android */}
        <Text style={styles.counter}>
          Total: {applications.length}  ·  Mostrando: {filteredApps.length}  ·  Seleccionados: {selectedIds.size}
        </Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o email…"
          placeholderTextColor="#888"
          defaultValue={queryText}
          onChangeText={setQueryText}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          blurOnSubmit={false}
        />

        {/* Barra de filtros (chips) */}
        <View style={styles.filtersBar}>
          <View style={styles.filterChipsRow}>
            <TouchableOpacity
              style={[styles.chip, typeFilter === 'all' && styles.chipActive]}
              onPress={() => setTypeFilter('all')}
            >
              <Text style={styles.chipText}>Todos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, typeFilter === 'free' && styles.chipActive]}
              onPress={() => setTypeFilter('free')}
            >
              <Text style={styles.chipText}>Free</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, typeFilter === 'pro' && styles.chipActive]}
              onPress={() => setTypeFilter('pro')}
            >
              <Text style={styles.chipText}>Pro</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, typeFilter === 'resource' && styles.chipActive]}
              onPress={() => setTypeFilter('resource')}
            >
              <Text style={styles.chipText}>Recursos</Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* Acciones de selección */}
        <View style={styles.selectionBar}>
          <TouchableOpacity
            style={[styles.modeBtn, selectionMode && styles.modeBtnActive]}
            onPress={toggleSelectionMode}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#D8A353" />
            <Text style={styles.modeBtnText}>
              {selectionMode ? 'Modo selección (ON)' : 'Modo selección (OFF)'}
            </Text>
          </TouchableOpacity>

          {selectionMode && (
            <View style={styles.selectionActions}>
              <TouchableOpacity style={styles.smallBtn} onPress={selectAllVisible}>
                <Text style={styles.smallBtnText}>Seleccionar visibles</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallBtn} onPress={clearSelection}>
                <Text style={styles.smallBtnText}>Limpiar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [castingTitle, applications.length, filteredApps.length, selectedIds.size, typeFilter, selectionMode]);

  /* ============ Footer (export) ============ */
  const ListFooter = () => {
    // Intenta varias firmas:
    // 1) fn(id, title, data, { onStatus, type })
    // 2) fn(id, title, { onStatus, type, data })
    // 3) fn(id, title, data, onStatus)
    // 4) fn(id, title, onStatus)
    const tryExport = async (fn, id, title, data, type) => {
      try {
        await fn(id, title, data, { onStatus, type }); // v1
        return;
      } catch (e1) {
        try {
          await fn(id, title, { onStatus, type, data }); // v2
          return;
        } catch (e2) {
          try {
            await fn(id, title, data, onStatus); // v3
            return;
          } catch (e3) {
            await fn(id, title, onStatus); // v4
          }
        }
      }
    };

    const getScopeData = () => {
      if (selectedCount > 0) {
        const set = selectedIds;
        return filteredApps.filter((a) => set.has(a.id));
      }
      return filteredApps;
    };

    const onPressPDF = async () => {
      const data = getScopeData();
      if (!data.length) {
        alert('No hay postulaciones para exportar (revisa filtros o selección).');
        return;
      }
      try {
        setLoadingPDF(true);
        const type = selectedCount > 0 ? 'pdf_selected' : 'pdf';
        await exportApplicationsToPDF(
          castingIdStr,
          castingTitle || 'Casting',
          { onStatus, type, data }
        );

      } catch (e) {
        console.log('❌ Error exportando PDF (todas las firmas fallaron):', e);
        alert('Ocurrió un problema al exportar el PDF.');
      } finally {
        setLoadingPDF(false);
      }
    };

    const onPressExcel = async () => {
      const data = getScopeData();
      if (!data.length) {
        alert('No hay postulaciones para exportar (revisa filtros o selección).');
        return;
      }
      try {
        setLoadingExcel(true);
        const type = selectedCount > 0 ? 'excel_selected' : 'excel';
        await exportApplicationsToExcel(
          castingIdStr,
          castingTitle || 'Casting',
          { onStatus, type, data }
        );

      } catch (e) {
        console.log('❌ Error exportando Excel (todas las firmas fallaron):', e);
        alert('Ocurrió un problema al exportar el Excel.');
      } finally {
        setLoadingExcel(false);
      }
    };

    return (
      <View style={styles.footerContainer}>
        {/* PDF */}
        <TouchableOpacity
          style={[
            styles.exportBtn,
            { backgroundColor: '#8B0000' },
            ((selectedCount === 0 && filteredApps.length === 0) || loadingPDF) && { opacity: 0.5 },
          ]}
          onPress={onPressPDF}
          disabled={(selectedCount === 0 && filteredApps.length === 0) || loadingPDF}
        >
          {loadingPDF ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" />
              <Text style={styles.exportText}>  Exportando…</Text>
            </View>
          ) : (
            <Text style={styles.exportText}>
              {selectedCount > 0 ? '🧾 Exportar PDF (Solo seleccionados)' : '🧾 Exportar PDF (Todos)'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Excel (Próximamente - deshabilitado) */}
        <TouchableOpacity
          style={[
            styles.exportBtn,
            { backgroundColor: '#2E7D32', opacity: 0.6 }, // un poco opaco
          ]}
          activeOpacity={1}
          onPress={() => {}}
          disabled
        >
          <Text style={styles.exportText}>📊 Excel (Próximamente)</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Back */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <FlatList
        data={filteredApps}
        keyExtractor={(item) => `${item.id}`}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay postulaciones que coincidan con los filtros.</Text>
        }
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
        removeClippedSubviews={false}
        initialNumToRender={10}
        windowSize={11}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  listContent: { padding: 8, paddingTop: 70, paddingBottom: 20 },

  /* Header */
  headerContainer: { marginBottom: 8 },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: { color: '#ccc', fontSize: 14, textAlign: 'center', marginBottom: 8 },
  counter: { color: '#aaa', fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 12 },

  /* Buscador (debajo del título) */
  searchInput: {
    backgroundColor: '#0e0e0e',
    borderColor: '#2a2a2a',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#fff',
  },

  /* Tarjetas */
  card: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 0.2,
    borderRadius: 8,
    paddingVertical: 0,
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  label: { color: '#D8A353', fontWeight: 'bold', marginBottom: 4 },
  value: { color: '#ccc', marginBottom: 10 },

  headerRow: { flexDirection: 'row', alignItems: 'center' },
  checkboxBtn: { marginRight: 6, padding: 2 },

  profilePreview: { flex: 1, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    marginTop: -6,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  name: { color: '#fff', fontWeight: 'bold', maxWidth: '70%' },
  emailText: { color: '#aaa', fontSize: 12 },
  link: { color: '#D8A353', fontSize: 13, textDecorationLine: 'underline' },

  // Badge junto al nombre
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 0.8,
  },
  badgeText: { color: '#ddd', fontSize: 10, fontWeight: '700' },

  video: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#D8A353',
    marginBottom: 10,
  },

  /* Barra de filtros (chips) */
  filtersBar: {
    backgroundColor: '#121212',
    borderColor: '#2a2a2a',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  filterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#141414',
  },
  chipActive: {
    borderColor: '#D8A353',
    backgroundColor: '#1e1a12',
  },
  chipText: { color: '#ddd', fontSize: 12 },

  /* Selección */
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  modeBtn: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#141414',
  },
  modeBtnActive: {
    borderColor: '#D8A353',
    backgroundColor: '#1e1a12',
  },
  modeBtnText: { color: '#ddd', fontSize: 12, fontWeight: '600' },
  selectionActions: { flexDirection: 'row', gap: 8, marginLeft: 8 },
  smallBtn: {
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#141414',
  },
  smallBtnText: { color: '#ddd', fontSize: 12, fontWeight: '600' },

  /* Footer / Exportar */
  footerContainer: { marginTop: 15 },
  exportBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  exportText: { color: '#fff', fontWeight: 'bold' },

  /* Empty */
  empty: { color: '#999', textAlign: 'center', marginTop: 20 },
});
