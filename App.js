// App.js — REEMPLAZO COMPLETO
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import AppEntry from './AppEntry';
import { auth } from './src/firebase/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

import crashlytics from '@react-native-firebase/crashlytics';

import { getCurrentVersion, isOutdated } from './utils/forceUpdate';
import UpdateRequired from './screens/UpdateRequired';

// 🔧 sube/ajusta esto cuando quieras forzar actualización
const MIN_REQUIRED = '1.0.2';

// Controlar splash SOLO aquí
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [checking, setChecking] = useState(true);
  const [mustUpdate, setMustUpdate] = useState(false);
  const hidRef = useRef(false);

  const hideSplash = useCallback(async () => {
    if (hidRef.current) return;
    hidRef.current = true;
    try { await SplashScreen.hideAsync(); } catch {}
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};
    try { unsubscribe = onAuthStateChanged(auth, () => {}); } catch {}

    // Crashlytics opcional; si te molesta el warning, lo quitamos luego
    try {
      if (!__DEV__) crashlytics().setCrashlyticsCollectionEnabled(true);
      crashlytics().log('app:start');
    } catch {}

    const fallback = setTimeout(hideSplash, 8000); // anti-bloqueo

    (async () => {
      try {
        const current = getCurrentVersion(); // p.ej. "1.0.1"
        console.log('VERSION current=', current, 'min=', MIN_REQUIRED);
        setMustUpdate(isOutdated(current, MIN_REQUIRED));
      } catch (e) {
        console.log('forceUpdate error:', e?.message || e);
        setMustUpdate(false); // no bloquear si falla la lectura
      } finally {
        setChecking(false);
        hideSplash(); // SIEMPRE ocultar el splash
      }
    })();

    return () => { clearTimeout(fallback); try { unsubscribe(); } catch {} };
  }, [hideSplash]);

  if (checking) {
    return (
      <View
        style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:'#000' }}
        onLayout={hideSplash}
      >
        <ActivityIndicator color="#D8A353" />
      </View>
    );
  }

  if (mustUpdate) {
    return (
      <View style={{ flex:1 }} onLayout={hideSplash}>
        <UpdateRequired />
      </View>
    );
  }

  return (
    <View style={{ flex:1 }} onLayout={hideSplash}>
      <AppEntry />
    </View>
  );
}
