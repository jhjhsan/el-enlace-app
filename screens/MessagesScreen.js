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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import BackButton from '../components/BackButton';

export default function MessagesScreen() {
  const [message, setMessage] = useState('');
  const [sentCount, setSentCount] = useState(0);
  const [remaining, setRemaining] = useState(100);
  const [membershipType, setMembershipType] = useState('free');
  const [includeProfile, setIncludeProfile] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  const navigation = useNavigation();
  const route = useRoute();
  const { recipient, email } = route.params || {};
  const { userData } = useUser();

  useEffect(() => {
    loadUser();
    checkMessageLimit();
  }, []);

  const loadUser = async () => {
    const json = await AsyncStorage.getItem('userProfile');
    if (json) {
      const user = JSON.parse(json);
      setMembershipType(user?.membershipType || 'free');
      setUserProfile(user);

      if (user.membershipType === 'free') {
        Alert.alert(
          'Acceso restringido',
          'La mensajería está disponible solo para usuarios Pro o Elite.',
          [{ text: 'Volver', onPress: () => navigation.goBack() }]
        );
      }
    }
  };

  const checkMessageLimit = async () => {
    const limit = await AsyncStorage.getItem('messageLimit');
    const now = new Date();
    const currentWeek = now.toISOString().split('T')[0];

    let limitInfo = limit ? JSON.parse(limit) : { count: 0, weekStart: currentWeek };

    const weekStartDate = new Date(limitInfo.weekStart);
    const currentDate = new Date(currentWeek);
    const diffDays = Math.floor((currentDate - weekStartDate) / (1000 * 60 * 60 * 24));

    if (diffDays >= 7) {
      limitInfo = { count: 0, weekStart: currentWeek };
    }

    setSentCount(limitInfo.count);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert('Campo vacío', 'Debes escribir un mensaje antes de enviarlo.');
      return;
    }

    const stored = await AsyncStorage.getItem('professionalMessages');
    const messages = stored ? JSON.parse(stored) : [];

    const yaExiste = messages.find(
      (msg) =>
        msg.from === userData.email && msg.to === email && !msg.archived
    );

    if (yaExiste) {
      Alert.alert(
        'Ya has enviado un mensaje',
        'Solo puedes enviar un mensaje por usuario. Espera una respuesta o archiva el mensaje anterior.'
      );
      return;
    }

    if (membershipType === 'free') {
      if (sentCount >= 1) {
        Alert.alert('Límite alcanzado', 'Solo puedes enviar 1 mensaje por semana con el plan Free.');
        return;
      }

      const limit = await AsyncStorage.getItem('messageLimit');
      const now = new Date();
      const currentWeek = now.toISOString().split('T')[0];
      let limitInfo = limit ? JSON.parse(limit) : { count: 0, weekStart: currentWeek };

      limitInfo.count += 1;
      limitInfo.weekStart = currentWeek;

      await AsyncStorage.setItem('messageLimit', JSON.stringify(limitInfo));
      setSentCount(limitInfo.count);
    }

    const newMessage = {
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

    const updated = [...messages, newMessage];
    await AsyncStorage.setItem('professionalMessages', JSON.stringify(updated));

    Alert.alert('✅ Enviado', 'Tu mensaje fue enviado correctamente.');
    setMessage('');
    setRemaining(100);
    setIncludeProfile(false);
  };

  return (
    <View style={styles.container}>
      <BackButton />

      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>💬 Mensajería</Text>

        {recipient && (
          <Text style={{ color: '#ccc', marginBottom: 10 }}>
            Enviando mensaje a: <Text style={{ color: '#D8A353' }}>{recipient}</Text>
          </Text>
        )}

        {membershipType === 'free' && (
          <Text style={styles.note}>
            Puedes enviar 1 mensaje por semana de hasta 100 caracteres.
          </Text>
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
          <Text style={styles.counter}>Caracteres restantes: {remaining}</Text>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20 }}>
          <Switch
            value={includeProfile}
            onValueChange={setIncludeProfile}
            thumbColor={includeProfile ? '#D8A353' : '#888'}
          />
          <Text style={{ color: '#ccc', marginLeft: 10 }}>Incluir mi perfil en el mensaje</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSend}>
          <Text style={styles.buttonText}>Enviar mensaje</Text>
        </TouchableOpacity>

        {membershipType === 'free' && (
          <Text style={styles.limitInfo}>Mensajes usados esta semana: {sentCount} / 1</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    top: 10,
    backgroundColor: '#000',
  },
  inner: {
    padding: 20,
    paddingBottom: 100,
    alignItems: 'center',
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  note: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1A1A1A',
    color: '#fff',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    width: '100%',
    height: 350,
    padding: 10,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  counter: {
    color: '#888',
    fontSize: 12,
    marginTop: 5,
  },
  button: {
    backgroundColor: '#D8A353',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  limitInfo: {
    marginTop: 15,
    color: '#aaa',
    fontSize: 12,
  },
});
