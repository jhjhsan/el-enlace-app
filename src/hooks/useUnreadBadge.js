// src/hooks/useUnreadBadge.js
import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function useUnreadBadge() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let sub;
    
    // Sincronización inicial del contador
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('notifications_unread');
        setUnread(Number(raw || 0)); // Inicializamos el contador de notificaciones
      } catch {
        setUnread(0);
      }
    })();

    // Escuchar el evento cuando se actualiza el contador global
    sub = DeviceEventEmitter.addListener('unread-updated', (n) => {
      setUnread(Number(n || 0)); // Actualizamos el estado local con el nuevo contador
    });

    return () => {
      try { sub?.remove?.(); } catch {}
    };
  }, []);

  return unread;
}
