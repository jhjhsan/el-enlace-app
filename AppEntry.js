// AppEntry.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Alert, Platform } from 'react-native';
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
import { getFirestore, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { MessageProvider } from './contexts/MessageContext';
import 'react-native-get-random-values';
import { NotificationProvider } from './contexts/NotificationContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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

// Mantén el splash hasta que marquemos listo
SplashScreen.preventAutoHideAsync().catch(() => {});

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

  // Registrar/actualizar token push en Firestore
  const registerForPushNotificationsAsync = async (email, membershipType) => {
    if (Constants.appOwnership === 'expo') {
      console.log('⚠️ Saltando push: ejecutando en Expo Go (usa Development Build o apk/ipa).');
      return;
    }
    if (!Device.isDevice) {
      console.log('🔒 Las notificaciones solo funcionan en dispositivos físicos');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Permisos requeridos',
        'Las notificaciones son necesarias para recibir mensajes y actualizaciones.',
        [{ text: 'OK' }]
      );
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'fe8be4be-c9bd-403b-bb2a-20e32af9dc84',
    });
    const expoPushToken = tokenData.data;
    await AsyncStorage.setItem('expoPushToken', expoPushToken);

    if (email && membershipType) {
      const collectionName =
        membershipType === 'elite'
          ? 'profilesElite'
          : membershipType === 'pro'
          ? 'profilesPro'
          : membershipType === 'free'
          ? 'profilesFree'
          : 'profiles';

      const id = normalizeEmail(email);

      try {
        const userDocRef = doc(db, collectionName, id);
        await setDoc(userDocRef, { expoPushToken }, { merge: true });
        // Espejo opcional en 'profiles' para resiliencia entre planes
        await setDoc(doc(db, 'profiles', id), { expoPushToken }, { merge: true });
        console.log('✅ Token push registrado/refrescado para', id, 'en', collectionName);
      } catch (e) {
        console.log('⚠️ Error guardando token:', e?.message || e);
      }
    }
  };

  // 🧹 1) Limpiar storage y recién luego marcar app lista
  useEffect(() => {
    (async () => {
      try {
        await limpiarTodoEmailCorrupto();
      } catch {}
      setIsAppReady(true);
    })();
  }, []);

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

  // 🔔 4) Notificaciones: canal Android + guardar locales + navegación por toque
  useEffect(() => {
    let notificationListener, responseListener;

    const initNotifications = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FFA726',
        });
      }

      // Foreground
      notificationListener = Notifications.addNotificationReceivedListener(async (notification) => {
        const content = notification.request.content;
        const data = content?.data || {};
          console.log('📲 NOTIF CONTENT:', content.title, content.body, data);

        const userDataJson = await AsyncStorage.getItem('userData');
        const userData = userDataJson ? JSON.parse(userDataJson) : null;
        if (!userData?.id) return;

        const norm = (e) => (e || '').toLowerCase().trim();
        const me = norm(userData.email);
        const sender = norm(data.sender);

        // Evitar autospam si yo mismo envié el mensaje
        if (data?.type === 'mensaje' && sender === me) return;

        const key = `notifications_${userData.id}`;
        const storedJson = await AsyncStorage.getItem(key);
        const existing = storedJson ? JSON.parse(storedJson) : [];

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

        if (!existing.some((n) => n.id === newNotif.id)) {
          const updated = [newNotif, ...existing].slice(0, 60);
          await AsyncStorage.setItem(key, JSON.stringify(updated));
        }
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
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
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
