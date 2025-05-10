import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function FocusListScreen({ navigation }) {
  const [focusList, setFocusList] = useState([]);

  useEffect(() => {
    const loadFocusList = async () => {
      try {
        const json = await AsyncStorage.getItem('focusList');
        if (json) {
          const list = JSON.parse(json);
          setFocusList(list.reverse()); // Muestra el más reciente arriba
        }
      } catch (error) {
        console.error('Error cargando Focus:', error);
      }
    };

    const unsubscribe = navigation.addListener('focus', loadFocusList);
    return unsubscribe;
  }, [navigation]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🧠 Anuncios de Focus Group</Text>

      {focusList.length === 0 ? (
        <Text style={styles.empty}>Aún no hay publicaciones.</Text>
      ) : (
        focusList.map((focus) => (
          <View key={focus.id} style={styles.card}>
            <Text style={styles.cardTitle}>{focus.title}</Text>
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
          </View>
        ))
      )}

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.back}>⬅ Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    flex: 1,
    padding: 20,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  empty: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderColor: '#D8A353',
    borderWidth: 1,
    padding: 15,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    color: '#D8A353',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  label: {
    color: '#aaa',
    marginTop: 5,
    fontWeight: 'bold',
  },
  text: {
    color: '#fff',
  },
  back: {
    color: '#aaa',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 30,
    textDecorationLine: 'underline',
  },
});
