// AppEntry.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Alert, Platform, Linking } from 'react-native'; // ⬅️ AÑADIDO PASO 4: Linking
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import RootNavigator from './navigation/RootNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProvider } from './contexts/UserContext';
import { NavigationReadyProvider } from './contexts/NavigationReady';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { navigationRef } from './navigation/NavigationService';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './src/firebase/firebaseConfig';
import { getFirestore, collection, query, where, orderBy, onSnapshot, getDoc } from 'firebase/firestore'; // ⬅️ getDoc ya viene aquí
import { MessageProvider } from './contexts/MessageContext';
import 'react-native-get-random-values';
import { NotificationProvider } from './contexts/NotificationContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import eventBus from './utils/eventBus';
import * as Application from 'expo-application';

// ⬇️ Crashlytics con carga condicional (funciona en Expo Go y en APK)
// No usar import estático en Expo Go: usar require condicional

let _rnfbCrash = null;
try {
  if (Constants.appOwnership !== 'expo') {
    // Solo en Development Build/APK/AAB
    _rnfbCrash = require('@react-native-firebase/crashlytics').default;
  }
} catch {}

// Pequeño wrapper para no romper si _rnfbCrash no existe (Expo Go)
const crashlytics = () => {
  if (_rnfbCrash) return _rnfbCrash();
  // shim no-op para Expo Go
  return {
    setCrashlyticsCollectionEnabled: () => {},
    setAttribute: () => {},
    recordError: () => {},
    crash: () => {},
  };
};

// Activa recolección (no-op en Expo Go)
crashlytics().setCrashlyticsCollectionEnabled(true);

// Helper para loguear errores controlados
export const safeLogError = (e, context = {}) => {
  try {
    if (context && typeof context === 'object') {
      Object.entries(context).forEach(([k, v]) => {
        crashlytics().setAttribute(String(k), typeof v === 'string' ? v : JSON.stringify(v));
      });
    }
  } catch {}
  crashlytics().recordError(e);
};

// (SOLO PRUEBA EN APK/DEV CLIENT) — NO hará nada en Expo Go
// setTimeout(() => { crashlytics().crash(); }, 5000);


// Helper para normalizar email a ID de documento
const normalizeEmail = (e) =>
  (e || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9@._\-+]/gi, '')
    .replace(/@{2,}/g, '@');

// ✅ Limpieza de correos corruptos en AsyncStorage (conservada de tu base)
async function limpiarTodoEmailCorrupto() {
  const claves = [
    'allProfiles',
    'allProfilesFree',
    'allProfilesElite',
    'allProfilesPro',
    'professionalMessages',
  ];

  for (const key of claves) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const array = Array.isArray(parsed) ? parsed : [];

      const filtrados = array.filter((p) => {
        if (!p || typeof p !== 'object' || !p.email || typeof p.email !== 'string') return false;
        const email = p.email.trim().toLowerCase();
        const arrobas = (email.match(/@/g) || []).length;
        const valido = arrobas === 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        return valido;
      });

      if (filtrados.length !== array.length) {
        await AsyncStorage.setItem(key, JSON.stringify(filtrados));
      }
    } catch {}
  }
}

async function enforceMinVersion() {
  try {
    // versionCode seguro: si no existe, usamos 0
    let versionCode = 0;
    try {
      const raw = Application && Application.nativeBuildVersion;
      versionCode = Number(raw ?? 0);
    } catch (_) {
      versionCode = 0;
    }

    const ref = doc(getFirestore(), 'app_config', 'android');
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      console.log('[version] No existe /app_config/android');
      return;
    }

    const data = snap.data() || {};
    const min = Number(data.min_version_code ?? 0);
    const url = data.latest_url;
    const msg = data.message || 'Hay una nueva versión obligatoria para continuar.';

    console.log('[version] comparando', { versionCode, min });

    if (versionCode < min) {
      Alert.alert(
        'Actualización requerida',
        msg,
        [{ text: 'Actualizar', onPress: () => url && Linking.openURL(url) }],
        { cancelable: false }
      );
    }
  } catch (e) {
    console.log('[version] ERROR enforceMinVersion:', e?.message || e);
  }
}

// ⬆️⬆️⬆️  FIN AÑADIDO PASO 4  ⬆️⬆️⬆️

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const MyDarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#000',
  },
};

export default function AppEntry() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [initialUserData, setInitialUserData] = useState(null);

  // ✅ Reemplazar TODO el bloque por esta función
  const registerForPushNotificationsAsync = async (email, membershipType) => {
    try {
      // No registrar en Expo Go
      if (Constants.appOwnership === 'expo') {
        console.log('⚠️ Saltando push: Expo Go. Usa Development Build o APK/AAB.');
        return;
      } else {
        console.log('✅ Entorno válido para push (no Expo Go).');
      }

      if (!Device.isDevice) {
        console.log('🔒 Push requiere dispositivo físico');
        return;
      }

      // Leer projectId desde app.json (fallback al UUID por si acaso)
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ||
        Constants?.easConfig?.projectId ||
        'fe8be4be-c9bd-403b-bb2a-20e32af9dc84';

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Mensajes',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#D8A353',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }

      // Permisos (Android 13+ y iOS)
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('Permisos requeridos', 'Activa las notificaciones para recibir avisos.');
        return;
      }

      // Obtener token de Expo push
      const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
      
      console.log('🔑 ExpoPushToken:', expoPushToken);
      if (!expoPushToken) {
        console.log('❌ No se obtuvo ExpoPushToken');
        return;
      }
      await AsyncStorage.setItem('expoPushToken', expoPushToken);

      // Guardar token en Firestore (colección según plan) + espejo en "profiles"
      if (email && membershipType) {
        const collectionName =
          membershipType === 'elite' ? 'profilesElite'
          : membershipType === 'pro' ? 'profilesPro'
          : membershipType === 'free' ? 'profilesFree'
          : 'profiles';

        const id = normalizeEmail(email);
        try {
          await setDoc(doc(db, collectionName, id), { expoPushToken }, { merge: true });
          await setDoc(doc(db, 'profiles', id), { expoPushToken }, { merge: true });
          console.log(`✅ Token guardado para ${id} en ${collectionName}`);
        } catch (e) {
          console.log('⚠️ Error guardando token en Firestore:', e?.message || e);
        }
      } else {
        console.log('ℹ️ No hay email/membershipType para guardar token en Firestore');
      }
    } catch (err) {
      console.log('💥 Error registrando push:', err?.message || err);
      // Registrar también en Crashlytics
      safeLogError(err, { where: 'registerForPushNotificationsAsync' });
    }
  };

  // 🧹 1) Limpiar storage y recién luego marcar app lista
  useEffect(() => {
    (async () => {
      try {
        await limpiarTodoEmailCorrupto();
      } catch (e) {
        safeLogError(e, { where: 'limpiarTodoEmailCorrupto' });
      }
      setIsAppReady(true);
    })();
  }, []);
// ⬇️ Desactivar guard remoto por ahora (evita alerta doble)
 // useEffect(() => {
 //   enforceMinVersion();
 // }, []);

  // ⬆️⬆️⬆️  FIN AÑADIDO PASO 4  ⬆️⬆️⬆️

  // 📲 2) Registrar token push automáticamente al abrir la app leyendo userProfile
  useEffect(() => {
    const initPush = async () => {
      try {
        const profileJson = await AsyncStorage.getItem('userProfile');
        const profile = profileJson ? JSON.parse(profileJson) : null;
        if (profile?.email && profile?.membershipType) {
          await registerForPushNotificationsAsync(profile.email, profile.membershipType);
        } else {
          console.log('ℹ️ userProfile incompleto para push (email/membershipType faltante)');
        }
      } catch (err) {
        console.warn('⚠️ Error registrando token push:', err?.message || err);
        safeLogError(err, { where: 'initPush' });
      }
    };
    initPush();
  }, []);

  // ✉️ 3) Mensajería en tiempo real: dos listeners (from/to)
  useEffect(() => {
    let unsubFrom = null;
    let unsubTo = null;

    const syncAllMessagesInRealTime = async () => {
      const json = await AsyncStorage.getItem('userProfile');
      const user = json ? JSON.parse(json) : null;
      if (!user?.email) return;

      const firestore = getFirestore();
      const me = (user.email || '').toLowerCase().trim();

      // A: mensajes que envío
      const qFrom = query(
        collection(firestore, 'mensajes'),
        where('from', '==', me),
        orderBy('timestamp', 'asc')
      );

      // B: mensajes que recibo
      const qTo = query(
        collection(firestore, 'mensajes'),
        where('to', '==', me),
        orderBy('timestamp', 'asc')
      );

      const applyChanges = async (changes) => {
        const newMessages = changes
          .filter((c) => c.type === 'added')
          .map((c) => ({ id: c.doc.id, ...c.doc.data() }));

        if (!newMessages.length) return;

        try {
          const storedRaw = await AsyncStorage.getItem('professionalMessages');
          let local = storedRaw ? JSON.parse(storedRaw) : [];

          newMessages.forEach((msg) => {
            const { from, to, text, timestamp, id } = msg;
            const newMsgObj = {
              id,
              sender: from,
              text,
              timestamp,
              read: from === me, // leído si lo envié yo
            };

            const existing = local.find(
              (conv) =>
                (conv.from === from && conv.to === to) ||
                (conv.from === to && conv.to === from)
            );

            if (existing) {
              if (!existing.messages.some((m) => m.id === newMsgObj.id)) {
                existing.messages.push(newMsgObj);
              }
              // Dedup por ID
              existing.messages = [
                ...new Map(existing.messages.map((m) => [m.id, m])).values(),
              ];
            } else {
              local.push({
                id: `${from}_${to}`,
                from,
                to,
                messages: [newMsgObj],
                archived: false,
              });
            }
          });

          // Dedup por conversación + limitar a 50 y ordenar ascendente para UI
          const safeConvs = local.map((conv) => {
            const byId = new Map(conv.messages.map((m) => [m.id, m]));
            const unique = [...byId.values()]
              .sort((a, b) => {
                const at = a.timestamp?.seconds ?? a.timestamp ?? 0;
                const bt = b.timestamp?.seconds ?? b.timestamp ?? 0;
                return bt - at;
              })
              .slice(-50); // 50 más recientes en orden asc

            return { ...conv, messages: unique };
          });

          await AsyncStorage.setItem('professionalMessages', JSON.stringify(safeConvs));
          console.log('🔁 professionalMessages actualizado (from/to listeners)');
        } catch (err) {
          console.warn('Error procesando mensajes en tiempo real:', err?.message || err);
          safeLogError(err, { where: 'applyChanges' });
        }
      };

      unsubFrom = onSnapshot(qFrom, (snap) => applyChanges(snap.docChanges()), (e) =>
        console.warn('onSnapshot(from) error:', e?.message || e)
      );
      unsubTo = onSnapshot(qTo, (snap) => applyChanges(snap.docChanges()), (e) =>
        console.warn('onSnapshot(to) error:', e?.message || e)
      );
    };

    syncAllMessagesInRealTime();

    return () => {
      if (unsubFrom) unsubFrom();
      if (unsubTo) unsubTo();
    };
  }, []);

  // 🛎️ Sincroniza notificaciones al abrir la app (Firestore → AsyncStorage) para que el badge se actualice sin abrir la pantalla
  useEffect(() => {
    let unsub = null;

    (async () => {
      try {
        const profileJson = await AsyncStorage.getItem('userProfile');
        const user = profileJson ? JSON.parse(profileJson) : null;
        if (!user?.email) return;

        const emailN = normalizeEmail(user.email);
        const fs = getFirestore();

        const storageKeyById = user?.id ? `notifications_${user.id}` : null;
        const storageKeyByEmail = `notifications_${emailN}`;

        unsub = onSnapshot(collection(fs, 'notifications', emailN, 'items'), async (snap) => {
          try {
            console.log('[AppEntry][SYNC] emailN:', emailN, 'docs:', snap.size);

            const nowMs = Date.now();
            const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

            // 1) Parsear snapshot (read SOLO desde Firestore)
            const parsed = snap.docs.map(d => {
              const data = d.data() || {};
              const tsMs =
                data.timestamp?.toDate ? data.timestamp.toDate().getTime() :
                data.createdAt?.toDate ? data.createdAt.toDate().getTime() :
                (data.createdAtMs ? Number(data.createdAtMs) : 0);

              return {
                id: String(data.id || d.id),
                type: data.type,
                title: data.title,
                body: data.body ?? data.message ?? '',
                read: data.read === true, // ← SOLO servidor
                timestampMs: tsMs || 0,
              };
            });

            // 2) Orden + tope 60
            const sorted = parsed
              .sort((a, b) => b.timestampMs - a.timestampMs)
              .slice(0, 60);

            // 3) Alinear con UI: contar solo últimas 2 semanas (ajusta si quieres 10 días)
            const recent = sorted.filter(n => (nowMs - (n.timestampMs || 0)) <= TEN_DAYS_MS || !n.timestampMs);

            // 4) Persistir listas locales
            if (storageKeyById) {
              await AsyncStorage.setItem(storageKeyById, JSON.stringify(sorted));
            }
            await AsyncStorage.setItem(storageKeyByEmail, JSON.stringify(sorted));

            // 5) Guardar contador unificado desde estado REAL del servidor
            const unread = recent.filter(n => n.read !== true).length;
            await AsyncStorage.setItem('notifications_unread', String(unread));

            // 6) Marcar hidratado ANTES de emitir
            await AsyncStorage.setItem('notifications_hydrated', '1');

            // 7) Avisar a toda la app
            eventBus.emit('notificationsUpdated');

            console.log('[AppEntry][SYNC] wrote EMAIL key:', storageKeyByEmail, 'count:', sorted.length, 'unread:', unread);
          } catch (e) {
            console.log('[AppEntry][SYNC][ERROR]:', e?.message || e);
            safeLogError(e, { where: 'notificationsSnapshot' });
          }
        });
      } catch {}
    })();

    return () => { 
      try { 
        if (unsub) { console.log('[AppEntry][SYNC] unsubscribing'); unsub(); } 
      } catch (e) { 
        console.log('[AppEntry][SYNC][UNSUB][ERROR]:', e?.message || e); 
      } 
    };

  }, []);

  // 🔔 4) Notificaciones: canal Android + guardar locales + navegación por toque
  useEffect(() => {
    let notificationListener, responseListener;

    const initNotifications = async () => {

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Notificaciones',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#D8A353', // color corporativo, coincide con app.json
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: false
        });
      }

      // Foreground
      notificationListener = Notifications.addNotificationReceivedListener(async (notification) => {
        const content = notification.request.content;
        const data = content?.data || {};
        console.log('📲 NOTIF CONTENT:', content.title, content.body, data);

        const userDataJson = await AsyncStorage.getItem('userData');
        const userData = userDataJson ? JSON.parse(userDataJson) : null;
        if (!userData?.email) return;

        const norm = (e) => (e || '').toLowerCase().trim();
        const me = norm(userData.email);
        const sender = norm(data.sender);

        // Evitar autospam si yo mismo envié el mensaje
        if (data?.type === 'mensaje' && sender === me) return;

        // Claves de guardado (por id si existe, y SIEMPRE por email normalizado)
        const keyById = userData?.id ? `notifications_${userData.id}` : null;
        const keyByEmail = `notifications_${normalizeEmail(userData.email)}`;

        const notificationId = data.id || `${data.type}_${data.sender || 'anon'}_${Date.now()}`;
        const newNotif = {
          id: notificationId,
          icon: data.type || 'mensaje',
          type: data.type || 'mensaje',
          chatId: data.chatId || null,
          castingId: data.castingId || null,
          serviceId: data.serviceId || null,
          sender: data.sender || null,
          date: new Date().toISOString(),
          message: `${content.title || '🔔'}\n${content.body || ''}`,
          read: false,
        };

        // 1) Cargar/barrer por ID
        if (keyById) {
          const rawId = await AsyncStorage.getItem(keyById);
          const listId = rawId ? JSON.parse(rawId) : [];
          if (!listId.some(n => n.id === newNotif.id)) {
            const updatedId = [newNotif, ...listId].slice(0, 60);
            await AsyncStorage.setItem(keyById, JSON.stringify(updatedId));
          }
        }

        // 2) Cargar/barrer por email (fallback — SIEMPRE)
        const rawEmail = await AsyncStorage.getItem(keyByEmail);
        const listEmail = rawEmail ? JSON.parse(rawEmail) : [];
        if (!listEmail.some(n => n.id === newNotif.id)) {
          const updatedEmail = [newNotif, ...listEmail].slice(0, 60);
          await AsyncStorage.setItem(keyByEmail, JSON.stringify(updatedEmail));
        }

        eventBus.emit('notificationsUpdated'); // ← actualiza el badge al instante
      });

      // Usuario toca la notificación
      responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.type === 'mensaje' && data?.sender) {
          navigationRef.current?.navigate('MessageDetail', { contactEmail: data.sender });
        } else if (data?.type === 'casting' && data?.castingId) {
          navigationRef.current?.navigate('CastingDetail', { castingId: data.castingId });
        } else if (data?.type === 'servicio' && data?.serviceId) {
          navigationRef.current?.navigate('ServiceDetailScreen', { serviceId: data.serviceId });
        }
      });

      // App abierta desde cold start por una notificación
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastResponse) {
        const data = lastResponse.notification.request.content.data;
        if (data?.type === 'mensaje' && data?.sender) {
          navigationRef.current?.navigate('MessageDetail', { contactEmail: data.sender });
        } else if (data?.type === 'casting' && data?.castingId) {
          navigationRef.current?.navigate('CastingDetail', { castingId: data.castingId });
        } else if (data?.type === 'servicio' && data?.serviceId) {
          navigationRef.current?.navigate('ServiceDetailScreen', { serviceId: data.serviceId });
        }
      }
    };
    
    initNotifications();

    return () => {
      if (notificationListener) notificationListener.remove();
      if (responseListener) responseListener.remove();
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (isAppReady) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [isAppReady]);

  if (!isAppReady) {
    return (
      <View
        style={{ flex: 1, backgroundColor: '#000' }}
        onLayout={onLayoutRootView}
      />
    ); 
  }

  return (
    <NotificationProvider>
      <UserProvider initialUserData={initialUserData}>
        <MessageProvider>
          <NavigationReadyProvider>
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }} onLayout={onLayoutRootView}>
              <StatusBar style="light" backgroundColor="#000" />
              <NavigationContainer theme={MyDarkTheme} ref={navigationRef}>
                <RootNavigator />
              </NavigationContainer>
            </GestureHandlerRootView>
          </NavigationReadyProvider>
        </MessageProvider>
      </UserProvider>
    </NotificationProvider>
  );
}
