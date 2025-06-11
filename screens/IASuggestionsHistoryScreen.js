// src/screens/IASuggestionsHistoryScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../src/firebase/firebaseConfig';
import { useUser } from '../contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';

export default function IASuggestionsHistoryScreen({ navigation }) {
  const { userData } = useUser();
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const docRef = doc(db, 'suggestionsHistory', userData.email.toLowerCase());
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setHistory(docSnap.data());
        } else {
          setHistory(null);
        }
      } catch (error) {
        console.error('Error al cargar historial IA:', error);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  if (loading) {
    return (
      <View style={styles.containerCenter}>
        <ActivityIndicator size="large" color="#D8A353" />
        <Text style={styles.loadingText}>Cargando historial IA...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Historial de Sugerencias IA</Text>
        {history ? (
          <View>
            <Text style={styles.dateText}>🕒 Última actualización: {new Date(history.timestamp).toLocaleString()}</Text>
            {history.suggestions.map((s, i) => (
              <View key={i} style={styles.suggestionBox}>
                <Ionicons name="bulb-outline" size={18} color="#D8A353" style={{ marginRight: 6 }} />
                <Text style={styles.suggestionText}>{s}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noData}>No hay sugerencias guardadas aún.</Text>
        )}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  containerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#D8A353',
    marginTop: 10,
  },
  content: {
    padding: 20,
    paddingBottom: 80,
  },
  title: {
    color: '#D8A353',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  suggestionBox: {
    backgroundColor: '#1B1B1B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  suggestionText: {
    color: '#FFFFFF',
    flex: 1,
  },
  dateText: {
    color: '#888888',
    fontSize: 12,
    marginBottom: 10,
  },
  noData: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
  backButton: {
    marginTop: 30,
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
});
