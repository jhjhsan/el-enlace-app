import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function FocusDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { focus } = route.params;
  const [hasParticipated, setHasParticipated] = useState(false);

  useEffect(() => {
    const checkParticipation = async () => {
      const raw = await AsyncStorage.getItem('focusResponses');
      const list = raw ? JSON.parse(raw) : [];
      const already = list.find((item) => item.focusId === focus.id);
      setHasParticipated(!!already);
    };

    checkParticipation();
  }, [focus]);

  const handleParticipation = async () => {
    try {
      const raw = await AsyncStorage.getItem('focusResponses');
      const list = raw ? JSON.parse(raw) : [];

      if (list.find((item) => item.focusId === focus.id)) {
        Alert.alert('Ya participaste', 'Gracias por tu interés.');
        return;
      }

      list.push({ focusId: focus.id, timestamp: Date.now() });
      await AsyncStorage.setItem('focusResponses', JSON.stringify(list));
      setHasParticipated(true);
      Alert.alert('✅ Participación registrada', 'Gracias por participar en este estudio.');
    } catch (err) {
      console.error('Error guardando respuesta:', err);
      Alert.alert('Error', 'Ocurrió un problema al registrar tu respuesta.');
    }
  };

  return (
    <View style={styles.screen}>
      {/* Flecha retroceso */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🎯 {focus.title}</Text>

        <Text style={styles.label}>👤 Requisitos:</Text>
        <Text style={styles.text}>{focus.requirements}</Text>

        <Text style={styles.label}>🗓️ Fecha y hora:</Text>
        <Text style={styles.text}>{focus.dateTime}</Text>

        {focus.duration ? (
          <>
            <Text style={styles.label}>⏱️ Duración:</Text>
            <Text style={styles.text}>{focus.duration}</Text>
          </>
        ) : null}

        <Text style={styles.label}>💰 Pago:</Text>
        <Text style={styles.text}>
          {focus.payment} ({focus.paymentMethod})
        </Text>

        {focus.description ? (
          <>
            <Text style={styles.label}>📝 Descripción:</Text>
            <Text style={styles.text}>{focus.description}</Text>
          </>
        ) : null}

        {focus.authorName && (
          <>
            <Text style={styles.label}>👤 Publicado por:</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('ProfileDetailScreen', {
                  email: focus.authorEmail,
                })
              }
            >
              <Text style={styles.link}>{focus.authorName}</Text>
            </TouchableOpacity>
          </>
        )}

        {!hasParticipated ? (
          <TouchableOpacity style={styles.button} onPress={handleParticipation}>
            <Text style={styles.buttonText}>✅ Participar</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.thankyou}>✅ Ya participaste en este Focus Group.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1000,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    color: '#aaa',
    marginTop: 12,
    fontWeight: 'bold',
  },
  text: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 5,
  },
  link: {
    color: '#4da6ff',
    textDecorationLine: 'underline',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#D8A353',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  thankyou: {
    marginTop: 30,
    color: '#4da6ff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
