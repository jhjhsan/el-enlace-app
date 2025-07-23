// screens/ChatScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

export default function ChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { recipient, email } = route.params || {};
const chatId = [email, recipient].sort().join('_');

  const [messages, setMessages] = useState([]);
const [input, setInput] = useState('');
const [senderName, setSenderName] = useState('Usuario');

useEffect(() => {
  const init = async () => {
    const storedUser = await AsyncStorage.getItem('userData');
    const user = storedUser ? JSON.parse(storedUser) : null;
    if (user?.name) {
      setSenderName(user.name);
    }
    loadMessages();
  };
  init();
}, []);

  const loadMessages = async () => {
    const stored = await AsyncStorage.getItem('inboxMessages');
    const inbox = stored ? JSON.parse(stored) : [];
    const chatMessages = inbox.filter(
      (msg) => msg.email === email || msg.to === email
    );
    setMessages(chatMessages.reverse()); // mostrar recientes abajo
  };

const handleSend = async () => {
  if (!input.trim()) return;

  const chatId = [email, recipient].sort().join('_'); // ✅ Genera el ID único

  try {
    const functions = getFunctions(getApp());
    const sendPush = httpsCallable(functions, 'sendMessagePushNotifications');
    await sendPush({
      recipientEmail: email,
      senderName,
      messageText: input.trim(),
      chatId, // ✅ Enviamos el chatId a la función
    });
    console.log('✅ Notificación push enviada');
  } catch (err) {
    console.error('❌ Error enviando push:', err);
  }

    const newMessage = {
      to: recipient,
      from: 'Yo', // puedes cambiar esto si usas userData
      email,
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const stored = await AsyncStorage.getItem('inboxMessages');
    const inbox = stored ? JSON.parse(stored) : [];
    const updatedInbox = [...inbox, newMessage];
    await AsyncStorage.setItem('inboxMessages', JSON.stringify(updatedInbox));
    setMessages([newMessage, ...messages]);
    setInput('');
  };

  const renderItem = ({ item }) => (
    <View style={styles.messageContainer}>
      <Text style={styles.sender}>{item.from}:</Text>
      <Text style={styles.content}>{item.content}</Text>
      <Text style={styles.timestamp}>
        {new Date(item.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.title}>Chat con {recipient}</Text>

      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={styles.messageList}
        inverted
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="#888"
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 40,
  },
  backButton: {
    position: 'absolute',
    top: 15,
    left: 20,
    zIndex: 10,
  },
  title: {
    color: '#D8A353',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  messageList: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  messageContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  sender: {
    color: '#D8A353',
    fontWeight: 'bold',
  },
  content: {
    color: '#fff',
    marginTop: 4,
  },
  timestamp: {
    color: '#aaa',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#333',
    padding: 10,
    backgroundColor: '#000',
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 14,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#D8A353',
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
  },
  sendText: {
    color: '#000',
    fontWeight: 'bold',
  },
});
