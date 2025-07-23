import React, { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator, Alert, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import RootNavigator from './navigation/RootNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProvider } from './contexts/UserContext';
import { NavigationReadyProvider } from './contexts/NavigationReady';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { checkAuthState } from './src/firebase/helpers/authHelper';
import { navigationRef } from './navigation/NavigationService';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './src/firebase/firebaseConfig';
import { getFirestore, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { MessageProvider, useMessages } from './contexts/MessageContext'; // Asegúrate de que la ruta sea correcta
import 'react-native-get-random-values';
import { NotificationProvider } from './contexts/NotificationContext'; 

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
        if (!p || typeof p !== 'object' || !p.email || typeof p.email !== 'string') {
          console.warn('❌ Email inválido detectado: objeto vacío o sin email válido');
          return false;
        }
        const email = p.email.trim().toLowerCase();
        const arrobas = (email.match(/@/g) || []).length;
        const valido = arrobas === 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!valido) {
          console.warn(`❌ Email inválido detectado en ${key}:`, email);
        }
        return valido;
      });

      if (filtrados.length !== array.length) {
        console.log(`🧹 Limpiando ${array.length - filtrados.length} entradas corruptas de ${key}`);
        await AsyncStorage.setItem(key, JSON.stringify(filtrados));
      }
    } catch (e) {
      console.warn(`⚠️ Error procesando ${key}:`, e.message);
    }
  }
}

SplashScreen.preventAutoHideAsync();

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

  const registerForPushNotificationsAsync = async (email, membershipType) => {
    if (Constants.appOwnership === 'expo') {
      console.log('⚠️ Saltando notificaciones push: estás en Expo Go');
      return;
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permisos requeridos',
          'Las notificaciones son necesarias para recibir mensajes y actualizaciones. Por favor, actívalas en los ajustes del dispositivo.',
          [{ text: 'OK' }]
        );
        return;
      }

const tokenData = await Notifications.getExpoPushTokenAsync({
  projectId: 'fe8be4be-c9bd-403b-bb2a-20e32af9dc84',
});
const expoPushToken = tokenData.data;

// Asegúrate de que AsyncStorage guarde el token correctamente
await AsyncStorage.setItem('expoPushToken', expoPushToken);
console.log('✅ Token guardado:', expoPushToken);

// Verifica el email y membershipType antes de guardar el token en Firestore
if (email && membershipType) {
  const collectionName = 
    membershipType === 'elite' ? 'profilesElite' : 
    membershipType === 'pro' ? 'profilesPro' : 'profiles';

  try {
    const userDocRef = doc(db, collectionName, email);
    console.log('📝 Guardando token en Firestore para', email);

    // Guardar o actualizar el token en Firestore
    await setDoc(userDocRef, { expoPushToken }, { merge: true });

    console.log('📤 Token actualizado en Firestore correctamente');
  } catch (err) {
    console.warn('❌ Error al guardar token en Firestore:', err.message);
  }
} else {
  console.warn('🔒 Las notificaciones solo funcionan en dispositivos físicos');
}
}; 
  };
useEffect(() => {
  let unsubscribe = null;

  const syncAllMessagesInRealTime = async () => {
    const json = await AsyncStorage.getItem('userProfile');
    const user = json ? JSON.parse(json) : null;
    if (!user || !user.email) return;

    const firestore = getFirestore();
    const q = query(
      collection(firestore, 'mensajes'),
      where('from', 'in', [user.email]),
      where('to', 'in', [user.email]),
      orderBy('timestamp', 'asc')
    );

    unsubscribe = onSnapshot(q, async (snapshot) => {
      const newMessages = snapshot.docChanges()
        .filter((change) => change.type === 'added')
        .map((change) => ({
          id: change.doc.id,
          ...change.doc.data(),
        }));

      if (newMessages.length === 0) return;

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
            read: from === user.email,
          };

          const existing = local.find(
            (conv) =>
              (conv.from === from && conv.to === to) ||
              (conv.from === to && conv.to === from)
          );

          if (existing) {
            const exists = existing.messages.some((m) => m.id === newMsgObj.id);
            if (!exists) {
              existing.messages.push(newMsgObj);
            }

            // 🧹 Eliminar duplicados dentro de esta conversación
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

        // ✅ Eliminar duplicados por ID en todas las conversaciones
        const conversacionesFiltradas = local.map((conv) => {
          const mensajesUnicos = [...new Map(conv.messages.map((m) => [m.id, m])).values()];
          return { ...conv, messages: mensajesUnicos };
        });

        const safeConvs = conversacionesFiltradas.map((conv) => {
  const safeMessages = conv.messages
    ?.slice(-50) // últimos 50 mensajes
    .map((msg) => ({
      id: msg.id || '',
      sender: msg.sender,
      text: msg.text,
      timestamp: msg.timestamp,
      read: msg.read || false,
    }));

  return {
    ...conv,
    messages: safeMessages,
  };
});

const seen = new Set();
const limited = safeConvs.map((conv) => ({
  ...conv,
  messages: [...(conv.messages || [])]
    .filter((msg) => {
      const key = msg.id || `${msg.sender}_${msg.timestamp?.seconds || msg.timestamp}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const aTime = a.timestamp?.seconds || 0;
      const bTime = b.timestamp?.seconds || 0;
      return bTime - aTime;
    })
    .slice(0, 50)
    .reverse(),
}));

await AsyncStorage.setItem('professionalMessages', JSON.stringify(limited));


        console.log('🔁 professionalMessages actualizado globalmente (sin duplicados por ID)');
      } catch (error) {
        console.error('❌ Error al procesar mensajes en tiempo real:', error);
      }
    });
  };

  syncAllMessagesInRealTime();

  return () => {
    if (unsubscribe) unsubscribe();
  };
}, []);

  useEffect(() => {
    let unsubscribe = null;

    const loadAndValidateUser = async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FFA726',
            sound: true,
            showBadge: true,
            enableVibrate: true,
            lockscreenVisibility: 1,
          });
        }

        const userDataJson = await AsyncStorage.getItem('userData');
        let parsedUserData = null;
        try {
          parsedUserData = userDataJson ? JSON.parse(userDataJson) : null;
        } catch (parseError) {
          console.error('❌ Error al parsear userData:', parseError);
        }

        unsubscribe = checkAuthState(async (authResult) => {
          if (authResult?.user && authResult.isVerified) {
            let updatedUserData = null;
            try {
              const updatedUserDataJson = await AsyncStorage.getItem('userData');
              updatedUserData = updatedUserDataJson ? JSON.parse(updatedUserDataJson) : null;
            } catch (parseError) {
              console.error('❌ Error al parsear updatedUserData:', parseError);
            }

            if (updatedUserData) {
              setInitialUserData(updatedUserData);

              if (
                Constants.appOwnership !== 'expo' &&
                updatedUserData?.email &&
                updatedUserData?.membershipType
              ) {
                await registerForPushNotificationsAsync(
                  updatedUserData.email,
                  updatedUserData.membershipType
                );
              } else {
                console.log('⚠️ Skip push token en Expo Go o datos incompletos');
              }
            } else {
              console.warn('⚠️ updatedUserData es null, no se actualiza initialUserData');
              setInitialUserData(null);
            }
          } else {
            console.log('⚠️ Usuario no autenticado o no verificado');
            setInitialUserData(null);
          }

          setIsAppReady(true);
        });
      } catch (e) {
        console.error('❌ Error cargando datos del usuario:', e);
        setIsAppReady(true);
      }
    };

    loadAndValidateUser();

    const checkNotificationPermissions = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Notificaciones desactivadas',
          'Tu teléfono podría estar bloqueando las notificaciones de esta app. Ve a Ajustes > Notificaciones > El Enlace y actívalas manualmente.',
          [{ text: 'OK' }]
        );
      }
    };
    checkNotificationPermissions();

    let notificationListener, responseListener;

    if (Constants.appOwnership !== 'expo') {
notificationListener = Notifications.addNotificationReceivedListener(async (notification) => {
  console.log('📥 Notificación recibida:', notification);
  const content = notification.request.content;
  const data = content.data || {};

  const userDataJson = await AsyncStorage.getItem('userData');
  const userData = userDataJson ? JSON.parse(userDataJson) : null;
  const email = userData?.email;
  if (!email) return;

  // Validar que tenga datos mínimos
  if (!data || !data.type || !content.body) {
    console.warn('❌ Notificación ignorada: datos incompletos');
    return;
  }

  const notificationId = data.id || `${data.type}_${data.sender || 'anon'}_${Date.now()}`;

  const notificationObj = {
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

  const key = `notifications_${userData.id}`;
  const storedJson = await AsyncStorage.getItem(key);
  const existing = storedJson ? JSON.parse(storedJson) : [];

  const yaExiste = existing.some((n) => n.id === notificationObj.id);
  if (!yaExiste) {
    const updated = [notificationObj, ...existing];
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    console.log('📥 Notificación guardada localmente');
  } else {
    console.log('⚠️ Notificación duplicada ignorada');
  }

  if (data?.sender && content.body && email) {
    await syncMessageToFirestore(data.sender, email, content.body);

    const key = 'professionalMessages';
    const raw = await AsyncStorage.getItem(key);
    const conversations = raw ? JSON.parse(raw) : [];

    const normalizedSender = data.sender.trim().toLowerCase();
    const normalizedRecipient = email.trim().toLowerCase();

    const existingConvIndex = conversations.findIndex(
      (conv) =>
        (conv.from === normalizedSender && conv.to === normalizedRecipient) ||
        (conv.from === normalizedRecipient && conv.to === normalizedSender)
    );

    const newMessage = {
      id: `msg_${Date.now()}`,
      sender: normalizedSender,
      to: normalizedRecipient,
      text: content.body,
      timestamp: new Date().toISOString(),
      read: false,
      profileAttachment: data?.profileAttachment || null,
    };

    if (existingConvIndex !== -1) {
      conversations[existingConvIndex].messages.push(newMessage);
    } else {
      conversations.push({
        from: normalizedSender,
        to: normalizedRecipient,
        messages: [newMessage],
      });
    }

    await AsyncStorage.setItem(key, JSON.stringify(conversations));
    console.log('💾 Mensaje guardado localmente en professionalMessages');
  }
});

      responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log('👆 Notificación tocada:', data);
        if (data?.type === 'mensaje' && data?.sender) {
          navigationRef.current?.navigate('MessageDetail', { contactEmail: data.sender });
        } else if (data?.type === 'casting' && data?.castingId) {
          navigationRef.current?.navigate('CastingDetailScreen', { castingId: data.castingId });
        } else if (data?.type === 'servicio' && data?.serviceId) {
          navigationRef.current?.navigate('ServiceDetailScreen', { serviceId: data.serviceId });
        }
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
      if (notificationListener) notificationListener.remove();
      if (responseListener) responseListener.remove();
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (isAppReady) {
      await SplashScreen.hideAsync();
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
          <View style={{ flex: 1, backgroundColor: '#000' }} onLayout={onLayoutRootView}>
            <StatusBar style="light" backgroundColor="#000" />
            <NavigationContainer theme={MyDarkTheme} ref={navigationRef}>
              <RootNavigator />
            </NavigationContainer>
          </View>
        </NavigationReadyProvider>
      </MessageProvider>
    </UserProvider>
  </NotificationProvider>
);
}