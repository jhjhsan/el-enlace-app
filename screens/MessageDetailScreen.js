import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import BackButton from '../components/BackButton';
import { Linking } from 'react-native';

export default function MessageDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { contactEmail } = route.params || {};
  const { userData } = useUser();

  const [conversation, setConversation] = useState(null);
  const [response, setResponse] = useState('');

  useEffect(() => {
    loadConversation();
  }, []);

  const loadConversation = async () => {
    const json = await AsyncStorage.getItem('professionalMessages');
    if (!json) return;

    const all = JSON.parse(json);
    const match = all.find(
      (msg) =>
        ((msg.from === userData.email && msg.to === contactEmail) ||
         (msg.from === contactEmail && msg.to === userData.email)) &&
        !msg.archived
    );
    setConversation(match);
  };

  const handleReply = async () => {
    if (!response.trim()) {
      Alert.alert('Campo vacío', 'Escribe una respuesta antes de enviar.');
      return;
    }

    const json = await AsyncStorage.getItem('professionalMessages');
    if (!json) return;

    const all = JSON.parse(json);
    const updated = all.map((msg) => {
      if (msg.id === conversation.id) {
        return {
          ...msg,
          response: response.trim(),
          archived: true,
        };
      }
      return msg;
    });

    await AsyncStorage.setItem('professionalMessages', JSON.stringify(updated));
    Alert.alert('✅ Respuesta enviada', 'La conversación ha sido cerrada.');
    navigation.goBack();
  };

  if (!conversation) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Cargando conversación...</Text>
      </View>
    );
  }

  const isSender = conversation.from === userData.email;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>📨 Detalle del mensaje</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Mensaje original:</Text>
          <Text style={styles.text}>{conversation.message}</Text>
        </View>

        {/* Mostrar perfil adjunto si existe */}
        {conversation.profileAttachment && (
          <View style={styles.card}>
            <Text style={styles.label}>📎 Perfil adjunto:</Text>
            <Text style={styles.text}>👤 {conversation.profileAttachment.name || 'Nombre no disponible'}</Text>
            <Text style={styles.text}>📧 {conversation.profileAttachment.email || 'Email no disponible'}</Text>
            <Text style={styles.text}>🏷️ {conversation.profileAttachment.category || 'Categoría no especificada'}</Text>
          </View>
        )}

        {conversation.response ? (
          <View style={styles.card}>
            <Text style={styles.label}>Respuesta:</Text>
            <Text style={styles.text}>{conversation.response}</Text>
          </View>
        ) : !isSender ? (
          <>
            <Text style={styles.label}>Responder:</Text>
            <TextInput
              style={styles.input}
              multiline
              maxLength={250}
              placeholder="Escribe tu respuesta..."
              placeholderTextColor="#888"
              value={response}
              onChangeText={setResponse}
            />
            <TouchableOpacity style={styles.button} onPress={handleReply}>
              <Text style={styles.buttonText}>Enviar respuesta</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.note}>Aún no han respondido a tu mensaje.</Text>
        )}

        {conversation.response && (
          <TouchableOpacity
            style={styles.emailButton}
            onPress={() => Linking.openURL(`mailto:${contactEmail}`)}
          >
            <Text style={styles.emailButtonText}>✉️ Continuar contacto por email</Text>
          </TouchableOpacity>
        )}

        <BackButton />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 40,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    color: '#D8A353',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1A1A1A',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderColor: '#D8A353',
    borderWidth: 1,
  },
  label: {
    color: '#D8A353',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  text: {
    color: '#fff',
    fontSize: 14,
  },
  input: {
    backgroundColor: '#1A1A1A',
    color: '#fff',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    height: 120,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#D8A353',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  note: {
    color: '#aaa',
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },
  loading: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 40,
  },
  emailButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
    borderColor: '#D8A353',
    borderWidth: 1,
  },
  emailButtonText: {
    color: '#D8A353',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
