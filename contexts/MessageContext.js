import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useUser } from './UserContext';

const MessageContext = createContext();

export const MessageProvider = ({ children }) => {
  const { userData } = useUser();
  const [conversations, setConversations] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadMessages = async () => {
    const json = await AsyncStorage.getItem('professionalMessages');
    if (!json) return;

    const allMessages = JSON.parse(json);
    const myConversations = allMessages.filter(
      (msg) => msg.from === userData?.email || msg.to === userData?.email
    );

    let unread = 0;
    myConversations.forEach((conv) => {
      conv.messages.forEach((msg) => {
        if (msg?.read === false && msg?.sender !== userData?.email) {
          unread++;
        }
      });
    });

    setUnreadCount(unread);
    const safeConvs = myConversations.map((conv) => {
  const safeMessages = conv.messages
    ?.slice(-50)
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

const convsToSave = [...(safeConvs || local || [])].map((conv) => ({
  ...conv,
  messages: (conv.messages || []).slice(-50),
}));

const safe = algo.map((conv) => ({
  ...conv,
  messages: (conv.messages || []).slice(-50), // solo últimos 50 mensajes
}));

await AsyncStorage.setItem('professionalMessages', JSON.stringify(safe));


    setConversations(myConversations);
  };

  const updateUnreadCount = (newCount) => {
    setUnreadCount(newCount);
  };

  useEffect(() => {
    if (!userData?.email) return;

    const firestore = getFirestore();
    const qFrom = query(
      collection(firestore, 'mensajes'),
      where('from', '==', userData.email),
      orderBy('timestamp', 'asc')
    );
    const qTo = query(
      collection(firestore, 'mensajes'),
      where('to', '==', userData.email),
      orderBy('timestamp', 'asc')
    );

    const handleSnapshot = async (snapshot) => {
      const newMessages = snapshot.docChanges()
        .filter((change) => change.type === 'added')
        .map((change) => ({
          id: change.doc.id,
          ...change.doc.data(),
        }));

      if (newMessages.length === 0) return;

      const storedRaw = await AsyncStorage.getItem('professionalMessages');
      let local = storedRaw ? JSON.parse(storedRaw) : [];
      let newUnread = unreadCount;

      newMessages.forEach((msg) => {
        const { from, to, text, timestamp, id } = msg;
        const newMsgObj = {
          id,
          sender: from,
          text,
          timestamp,
          read: from === userData.email,
        };

        if (!newMsgObj.read) {
          newUnread++;
        }

        const existing = local.find(
          (conv) =>
            (conv.from === from && conv.to === to) ||
            (conv.from === to && conv.to === from)
        );

        if (existing) {
          const exists = existing.messages.some(
            (m) =>
              m.text === newMsgObj.text &&
              new Date(m.timestamp).getTime() === new Date(newMsgObj.timestamp).getTime()
          );

          if (!exists) {
            existing.messages.push(newMsgObj);
          }
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

      const convsToSave = [...(safeConvs || local || [])].map((conv) => ({
  ...conv,
  messages: (conv.messages || []).slice(-50),
}));

await AsyncStorage.setItem('professionalMessages', JSON.stringify(convsToSave));

      setConversations(local.filter((msg) => msg.from === userData.email || msg.to === userData.email));
      setUnreadCount(newUnread);
    };

    const unsubscribeFrom = onSnapshot(qFrom, handleSnapshot);
    const unsubscribeTo = onSnapshot(qTo, handleSnapshot);

    loadMessages();

    return () => {
      unsubscribeFrom();
      unsubscribeTo();
    };
  }, [userData?.email, unreadCount]);

  return (
    <MessageContext.Provider value={{ conversations, loadMessages, unreadCount, updateUnreadCount }}>
      {children}
    </MessageContext.Provider>
  );
};

export const useMessages = () => useContext(MessageContext);