import React, { createContext, useContext, useState, useEffect } from 'react';
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '../src/firebase/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import normalizeEmail from '../utils/normalizeEmail'; // asegúrate de tener esta función

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let unsubscribe;

    const startListening = async () => {
      const json = await AsyncStorage.getItem('userProfile');
      const user = json ? JSON.parse(json) : null;
      if (!user || !user.email) return;

      const email = normalizeEmail(user.email);
      const ref = collection(db, `notifications/${email}/items`);

 unsubscribe = onSnapshot(ref, (snapshot) => {
  const count = snapshot.docs.filter(doc => doc.data().read !== true).length;
  console.log('🔔 Unread count actualizado:', count);
  setUnreadCount(count);
});
    };

    startListening();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
