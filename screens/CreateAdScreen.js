// screens/CreateAdScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { syncAdToFirestore } from '../src/firebase/helpers/syncAdToFirestore';
import { analyzeAdContent } from '../src/firebase/helpers/analyzeAdContent';
import { db } from '../src/firebase/firebaseConfig';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import * as FileSystem from 'expo-file-system';
import { uploadMediaToStorage } from '../src/firebase/helpers/uploadMediaToStorage';

// Colores
const DASH_BG = '#000';
const ACCENT = '#D8A353';

// 🔗 URL de la web
const WEB_URL = 'https://app.elenlace.cl/publicidad';

export default function CreateAdScreen() {
  const { userData } = useUser();
  const navigation = useNavigation();
  const route = useRoute();

  // Solo mostramos info + botón web
  const renderHeader = (
    <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: 'absolute', top: 3, left: -2, zIndex: 10 }}>
      <Ionicons name="arrow-back" size={28} color="#fff" />
    </TouchableOpacity>
  );

  const handleOpenWeb = async () => {
    try {
      await Linking.openURL(WEB_URL);
    } catch (e) {
      Alert.alert('Error', 'No se pudo abrir la web. Copia y pega esta URL en tu navegador:\n' + WEB_URL);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
        {renderHeader}

        <Text style={styles.title}>Publicidad en El Enlace</Text>
        <Text style={styles.subtleIntro}>
          📢 ¿Quieres publicitar con nosotros? Sigue en la web y encontrarás toda la información necesaria para publicar tu anuncio.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleOpenWeb}>
          <Text style={styles.buttonText}>🌐 Cambiar a la web</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: DASH_BG,
    flex: 1,
    marginTop: 15,
    padding: 22,
  },

  title: {
    color: ACCENT,
    fontWeight: 'bold', // ✅ corregido (antes estaba '#D8A353')
    fontSize: 22,
    marginBottom: 10,
    textAlign: 'center',
  },

  button: {
    backgroundColor: ACCENT,
    marginTop: 20,
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
  },

  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  },

  subtleIntro: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
});
