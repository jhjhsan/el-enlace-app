import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function MyFocusScreen() {
  const [myFocusList, setMyFocusList] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    const loadMyFocus = async () => {
      const raw = await AsyncStorage.getItem('focusList');
      const profileRaw = await AsyncStorage.getItem('userProfile');
      if (!raw || !profileRaw) return;

      const focusList = JSON.parse(raw);
      const user = JSON.parse(profileRaw);
      const myList = focusList.filter(
        (item) => item.authorEmail?.toLowerCase() === user.email.toLowerCase()
      );

      setMyFocusList(myList.reverse());
    };

    const unsubscribe = navigation.addListener('focus', loadMyFocus);
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>🧠 Mis Focus Publicados</Text>

        {myFocusList.length === 0 ? (
          <Text style={styles.empty}>Aún no has publicado ningún Focus Group.</Text>
        ) : (
          myFocusList.map((focus) => (
            <View key={focus.id} style={styles.card}>
              <Text style={styles.cardTitle}>{focus.title}</Text>
              <Text style={styles.label}>🗓️ Fecha y hora:</Text>
              <Text style={styles.text}>{focus.dateTime}</Text>
              <Text style={styles.label}>💰 Pago:</Text>
              <Text style={styles.text}>{focus.payment} ({focus.paymentMethod})</Text>

              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => navigation.navigate('FocusDetailScreen', { focus })}
              >
                <Text style={styles.viewButtonText}>Ver más</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    flex: 1,
    paddingHorizontal: 20,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 2000,
  },
  scrollContent: {
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
  viewButton: {
    marginTop: 10,
    backgroundColor: '#D8A353',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
});
