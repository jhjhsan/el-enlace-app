// contexts/NotificationContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import eventBus from '../utils/eventBus';

const NotificationContext = createContext();

const normalizeEmail = (e = '') =>
  e.toLowerCase().trim().replace(/\s+/g, '').replace(/[^a-z0-9@._\-+]/gi, '').replace(/@{2,}/g, '@');

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);

  // 🔢 Fuente prioritaria: notifications_unread (la escribe AppEntry onSnapshot)
  // ⚠️ Solo si ya está hidratado (notifications_hydrated === '1') usamos las listas locales como fallback.
  const recalculateUnreadCount = async (forcedUserId) => {
    try {
      // 1) Si existe el contador unificado, úsalo y sal
      const unified = await AsyncStorage.getItem('notifications_unread');
      if (unified !== null) {
        const n = Number(unified);
        if (Number.isFinite(n) && n >= 0) {
          setUnreadCount(n);
          return;
        }
      }

      // 2) Si aún no hay hidratación, no cuentes desde listas (evita sumar “viejas”)
      const hydrated = await AsyncStorage.getItem('notifications_hydrated');
      if (hydrated !== '1') {
        return; // mantener el valor actual hasta que llegue el snapshot
      }

      // 3) Fallback (solo hidratado): contar desde listas locales por ID o EMAIL
      const up = await AsyncStorage.getItem('userProfile');
      const ud = await AsyncStorage.getItem('userData');
      const userP = up ? JSON.parse(up) : null;
      const userD = ud ? JSON.parse(ud) : null;

      const userId =
        forcedUserId || userP?.id || userD?.id || userD?.user?.id || null;

      const emailN =
        normalizeEmail(userP?.email) ||
        normalizeEmail(userD?.email) ||
        normalizeEmail(userD?.user?.email) ||
        null;

      if (userId) {
        const rawId = await AsyncStorage.getItem(`notifications_${userId}`);
        const listId = rawId ? JSON.parse(rawId) : [];
        const unread = (listId || []).filter(n => n?.read !== true && n?.read !== 'true').length;
        setUnreadCount(unread);
        return;
      }

      if (emailN) {
        const rawEm = await AsyncStorage.getItem(`notifications_${emailN}`);
        const listEm = rawEm ? JSON.parse(rawEm) : [];
        const unread = (listEm || []).filter(n => n?.read !== true && n?.read !== 'true').length;
        setUnreadCount(unread);
        return;
      }

      setUnreadCount(0);
    } catch (e) {
      // No poner 0 aquí: evita destellos/resets
      // console.log('[NotificationContext][ERROR] recalc:', e?.message || e);
    }
  };

  // Recalcula al montar y cada vez que alguien emite "notificationsUpdated"
  useEffect(() => {
    let off;
    (async () => {
      await recalculateUnreadCount(); // tomará notifications_unread si ya existe
      off = eventBus.on('notificationsUpdated', () => {
        recalculateUnreadCount().catch(() => {});
      });
    })();
    return () => { try { off && off(); } catch {} };
  }, []);

  return (
    <NotificationContext.Provider value={{
      unreadCount,
      recalculateUnreadCount,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
