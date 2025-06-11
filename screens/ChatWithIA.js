import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useUser } from '../contexts/UserContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { db } from '../src/firebase/firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import BackButton from '../components/BackButton';

export default function ChatWithIA({ navigation }) {
  const { userData } = useUser();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const isEliteBlocked = userData?.membershipType === 'elite' && !userData?.hasPaid;

  // ❌ Bloqueo inmediato para cuentas Free
  useEffect(() => {
    if (userData?.membershipType === 'free') {
      Alert.alert(
        '🔒 Función exclusiva',
        'El acceso a la IA está disponible solo para cuentas Pro y Elite.',
        [{ text: 'Entendido', onPress: () => navigation.goBack() }]
      );
    }
  }, []);

  const sendToIA = async () => {
    if (!prompt || prompt.length < 5) {
      Alert.alert('Error', 'Escribe una pregunta más clara.');
      return;
    }

    setLoading(true);
    try {
      const functions = getFunctions(getApp());
      const getResponse = httpsCallable(functions, 'chatbotResponse');
      const result = await getResponse({ prompt });

      if (result.data?.response) {
        const aiResponse = result.data.response;

        // 🔥 Guardar mensaje en Firestore
        try {
          await addDoc(collection(db, 'iaSuggestions'), {
            email: userData?.email || 'desconocido',
            prompt,
            response: aiResponse,
            timestamp: new Date(),
          });
        } catch (err) {
          console.log('❌ Error guardando sugerencia en Firestore:', err);
        }

        // 🔁 Agregar al historial local
        setMessages((prev) => [...prev, { prompt, response: aiResponse }]);
        setPrompt('');
      } else {
        Alert.alert('Error', 'No se recibió respuesta.');
      }
    } catch (err) {
      console.log('Error IA Chat:', err);
      Alert.alert('Error', 'No se pudo generar la respuesta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Asistente IA</Text>

        {isEliteBlocked ? (
          <View style={styles.lockedBox}>
            <Text style={styles.lockedText}>
              🔒 Esta función está disponible solo después de activar tu plan Elite.
            </Text>
            <TouchableOpacity
              style={styles.unlockButton}
              onPress={() => navigation.navigate('PaymentElite')}
            >
              <Text style={styles.unlockText}>Pagar plan Elite</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="¿Qué deseas saber sobre tu perfil o estrategia?"
              placeholderTextColor="#888"
              value={prompt}
              onChangeText={setPrompt}
              multiline
            />

            <TouchableOpacity style={styles.button} onPress={sendToIA} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Enviar a IA</Text>
              )}
            </TouchableOpacity>

            {messages.length > 0 && (
              <View style={styles.responseBox}>
                <Text style={styles.responseLabel}>Historial de respuestas:</Text>
                {messages.map((msg, index) => (
                  <View key={index} style={{ marginBottom: 15 }}>
                    <Text style={{ color: '#D8A353', marginBottom: 3 }}>🟡 Tú: {msg.prompt}</Text>
                    <Text style={{ color: '#fff' }}>🧠 IA: {msg.response}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
        <BackButton color="#fff" size={28} top={45} left={20} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scroll: { padding: 15 },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    top:30, 
    marginBottom: 60,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1e1e1e',
    color: 'white',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#D8A353',
    padding: 15,
    marginTop: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  responseBox: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
  },
  responseLabel: {
    color: '#D8A353',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
  },
  lockedBox: {
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  lockedText: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  unlockButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  unlockText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
});
