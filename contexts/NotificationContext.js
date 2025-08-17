import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const recalculateUnreadCount = async (userId) => {
    if (!userId) return;
    const stored = await AsyncStorage.getItem(`notifications_${userId}`);
    const notifications = stored ? JSON.parse(stored) : [];
    const unread = notifications.filter(n => n.read === false);
    setUnreadCount(unread.length);
    console.log('[NotificationContext] 🔄 Unread count recalculado:', unread.length);
  };

  // Si quieres que se calcule al entrar la app
  useEffect(() => {
    (async () => {
      const userJson = await AsyncStorage.getItem('userProfile');
      const user = userJson ? JSON.parse(userJson) : null;
      if (user?.id) await recalculateUnreadCount(user.id);
    })();
  }, []);

  return (
    <NotificationContext.Provider value={{
      unreadCount,
      recalculateUnreadCount, // 👈 EXPORTA LA FUNCIÓN!
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
