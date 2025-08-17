import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { sendMessageTest } from '../src/firebase/messaging/sendMessageTest';

export default function SendMessageTestScreen() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [text, setText] = useState('');

  const handleSend = async () => {
    if (!from || !to || !text) {
      Alert.alert('Error', 'Todos los campos son obligatorios');
      return;
    }

    const res = await sendMessageTest({ from, to, text });

    if (res.success) {
      Alert.alert('✅ Enviado', `Mensaje ID: ${res.messageId}`);
      setText('');
    } else {
      Alert.alert('❌ Error', res.error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>🧑 From:</Text>
      <TextInput
        style={styles.input}
        placeholder="correo origen"
        value={from}
        onChangeText={setFrom}
        autoCapitalize="none"
      />

      <Text style={styles.label}>🎯 To:</Text>
      <TextInput
        style={styles.input}
        placeholder="correo destino"
        value={to}
        onChangeText={setTo}
        autoCapitalize="none"
      />

      <Text style={styles.label}>💬 Mensaje:</Text>
      <TextInput
        style={styles.input}
        placeholder="Escribe algo..."
        value={text}
        onChangeText={setText}
      />

      <TouchableOpacity style={styles.button} onPress={handleSend}>
        <Text style={styles.buttonText}>📤 Enviar mensaje</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000',
  },
  label: {
    color: '#D8A353',
    marginTop: 10,
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  button: {
    backgroundColor: '#D8A353',
    padding: 14,
    borderRadius: 10,
    marginTop: 30,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  },
});
