import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  Switch,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import BackButton from '../components/BackButton';

export default function MessagesScreen() {
  const [message, setMessage] = useState('');
  const [remaining, setRemaining] = useState(100);
  const [includeProfile, setIncludeProfile] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [membershipType, setMembershipType] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [showPendingModal, setShowPendingModal] = useState(false);

  const navigation = useNavigation();
  const route = useRoute();
  const { recipient, email } = route.params || {};
  const { userData } = useUser();

  useEffect(() => {
    loadUserData();
    checkMessageLimit();
  }, []);

  const loadUserData = async () => {
    const json = await AsyncStorage.getItem('userProfile');
    if (!json) return;

    const profile = JSON.parse(json);
    setMembershipType(profile.membershipType || 'free');
    setUserProfile(profile);

    if (profile.membershipType === 'free') {
      Alert.alert(
        '🔒 Acceso restringido',
        'La mensajería está disponible solo para usuarios Pro o Elite.',
        [{ text: 'Volver', onPress: () => navigation.goBack() }]
      );
    }
  };

  const checkMessageLimit = async () => {
    const storedLimit = await AsyncStorage.getItem('messageLimit');
    const today = new Date().toISOString().split('T')[0];
    let limitInfo = storedLimit
      ? JSON.parse(storedLimit)
      : { count: 0, weekStart: today };

    const diffDays = Math.floor(
      (new Date(today) - new Date(limitInfo.weekStart)) /
        (1000 * 60 * 60 * 24)
    );

    if (diffDays >= 7) {
      limitInfo = { count: 0, weekStart: today };
    }

    setSentCount(limitInfo.count);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert('❌ Mensaje vacío', 'Debes escribir un mensaje antes de enviarlo.');
      return;
    }

    const allMessagesRaw = await AsyncStorage.getItem('professionalMessages');
    const allMessages = allMessagesRaw ? JSON.parse(allMessagesRaw) : [];

    const alreadySent = allMessages.find(
      (msg) => msg.from === userData.email && msg.to === email && !msg.archived
    );

    if (alreadySent) {
      Alert.alert(
        '⚠️ Ya enviaste un mensaje',
        'Solo puedes enviar un mensaje por usuario. Espera una respuesta o archiva la conversación actual.'
      );
      return;
    }

    if (membershipType === 'free' && sentCount >= 1) {
      Alert.alert('⛔ Límite alcanzado', 'Solo puedes enviar 1 mensaje por semana.');
      return;
    }

    if (membershipType === 'elite' && email.includes('@') && userProfile?.membershipType !== 'free') {
      const weekLimitReached = allMessages.filter(
        (msg) => msg.to === email && msg.from === userData.email
      ).length >= 1;

      if (weekLimitReached) {
        const pendingNotification = {
          toEmail: email,
          fromEmail: userData.email,
          timestamp: new Date().toISOString(),
          profileData: {
            name: userProfile?.name || '',
            category: userProfile?.category || '',
            email: userProfile?.email || '',
          },
        };

        const existing = await AsyncStorage.getItem('pendingMessages');
        const existingParsed = existing ? JSON.parse(existing) : [];

        await AsyncStorage.setItem(
          'pendingMessages',
          JSON.stringify([...existingParsed, pendingNotification])
        );

        setShowPendingModal(true);
        return;
      }
    }

    if (membershipType === 'free') {
      const today = new Date().toISOString().split('T')[0];
      const newLimit = { count: sentCount + 1, weekStart: today };
      await AsyncStorage.setItem('messageLimit', JSON.stringify(newLimit));
      setSentCount(newLimit.count);
    }

    const newMsg = {
      id: Date.now().toString(),
      from: userData.email,
      to: email,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      response: null,
      archived: false,
      profileAttachment: includeProfile
        ? {
            name: userProfile?.name || '',
            email: userProfile?.email || '',
            category: userProfile?.category || '',
          }
        : null,
    };

    const updatedMessages = [...allMessages, newMsg];
    await AsyncStorage.setItem('professionalMessages', JSON.stringify(updatedMessages));

    Alert.alert('✅ Enviado', 'Tu mensaje fue enviado correctamente.');
    setMessage('');
    setRemaining(100);
    setIncludeProfile(false);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <BackButton />
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>💬 Mensajería</Text>

        <Text style={styles.subtext}>
          Enviando mensaje a: <Text style={styles.highlight}>{recipient}</Text>
        </Text>

        {membershipType === 'free' && (
          <>
            <Text style={styles.note}>
              Puedes enviar 1 mensaje por semana de hasta 100 caracteres.
            </Text>
            <Text style={styles.counter}>
              Mensajes usados esta semana: {sentCount} / 1
            </Text>
          </>
        )}

        <TextInput
          style={styles.input}
          placeholder="Escribe tu mensaje..."
          placeholderTextColor="#888"
          multiline
          maxLength={membershipType === 'free' ? 100 : undefined}
          value={message}
          onChangeText={(text) => {
            setMessage(text);
            if (membershipType === 'free') {
              setRemaining(100 - text.length);
            }
          }}
        />

        {membershipType === 'free' && (
          <Text style={styles.remaining}>Caracteres restantes: {remaining}</Text>
        )}

        <View style={styles.switchContainer}>
          <Switch
            value={includeProfile}
            onValueChange={setIncludeProfile}
            thumbColor={includeProfile ? '#D8A353' : '#888'}
          />
          <Text style={styles.switchText}>Incluir mi perfil en el mensaje</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSend}>
          <Text style={styles.buttonText}>📤 Enviar mensaje</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showPendingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPendingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔔 Mensaje no enviado</Text>
            <Text style={styles.modalText}>
              Este usuario ya ha recibido un mensaje esta semana. Si sube a plan Pro, podrá recibir más mensajes. Guardaremos tu intento de contacto.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowPendingModal(false)}
            >
              <Text style={styles.modalButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 40,
  },
  inner: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtext: {
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 10,
  },
  note: {
    color: '#aaa',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 5,
  },
  counter: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#1A1A1A',
    color: '#fff',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    height: 250,
    padding: 10,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  remaining: {
    color: '#777',
    fontSize: 12,
    marginTop: 5,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  switchText: {
    color: '#ccc',
    marginLeft: 10,
  },
  button: {
    backgroundColor: '#D8A353',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  highlight: {
    color: '#D8A353',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    padding: 25,
    borderRadius: 12,
    borderColor: '#D8A353',
    borderWidth: 1,
  },
  modalTitle: {
    color: '#D8A353',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
});
