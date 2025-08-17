import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { saveServicePost } from '../src/firebase/helpers/saveServicePost';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

export default function Publish({ navigation }) {
  const { userData } = useUser();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const appendLocalNotification = async (notif) => {
    try {
      // Obtener userId seguro para la clave de notificaciones locales
      const profileRaw = await AsyncStorage.getItem('userProfile');
      const profile = profileRaw ? JSON.parse(profileRaw) : null;
      const userId = profile?.id || userData?.id;
      if (!userId) return;

      const key = `notifications_${userId}`;
      const raw = await AsyncStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];

      // Evitar duplicados por id
      const exists = list.some((n) => n.id === notif.id);
      const next = exists ? list : [notif, ...list].slice(0, 200);

      await AsyncStorage.setItem(key, JSON.stringify(next));
    } catch (e) {
      console.error('No se pudo guardar la notificación local de servicio:', e);
    }
  };

  const handleSubmit = async () => {
    if (isPublishing) return; // evita doble toque
    if (!title?.trim() || !description?.trim() || !category?.trim()) {
      Alert.alert('Completa todos los campos');
      return;
    }

    setIsPublishing(true);
    try {
      const newPost = {
        id: Date.now().toString(),
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        creatorEmail: userData?.email || 'anonimo',
        date: new Date().toISOString(),
        type: 'servicio',
        status: 'published',
        createdAt: Date.now(),
        isPromotional: false,
      };

      // Guardar el servicio (debe escribir en AsyncStorage: 'posts' para que aparezca en "Mis Servicios")
      await saveServicePost(newPost);

      // Disparar notificación global via Cloud Function (otros usuarios verán push / tarjetas según tu backend)
      try {
        const functions = getFunctions(getApp());
        const sendPush = httpsCallable(functions, 'sendServicePushNotifications');
        await sendPush({
          type: 'servicio',
          serviceId: newPost.id,
          title: newPost.title,
          description: newPost.description,
          creatorEmail: newPost.creatorEmail,
        });
        console.log('✅ Cloud Function de notificación de servicio ejecutada');
      } catch (err) {
        console.error('❌ Error enviando notificación push de servicio:', err);
      }

      // Crear tarjeta de notificación local para el creador (para ver en su propia pantalla de notificaciones)
      await appendLocalNotification({
        id: `svc_${newPost.id}`,
        type: 'servicio',
        title: newPost.title,
        message: newPost.description,
        serviceId: newPost.id,
        createdAt: Date.now(),
        read: false,
        from: newPost.creatorEmail,
        origin: 'local',
      });

      Alert.alert('✅ Servicio publicado correctamente');
      setTitle('');
      setDescription('');
      setCategory('');
      navigation.goBack();
    } catch (error) {
      console.error('Error al guardar el servicio:', error);
      Alert.alert('Error al publicar el servicio');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📢 Publicar un servicio</Text>

      <TextInput
        style={styles.input}
        placeholder="Título del servicio"
        placeholderTextColor="#888"
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Descripción detallada"
        placeholderTextColor="#888"
        multiline
        numberOfLines={5}
        value={description}
        onChangeText={setDescription}
      />

      <TextInput
        style={styles.input}
        placeholder="Categoría"
        placeholderTextColor="#888"
        value={category}
        onChangeText={setCategory}
      />

      <TouchableOpacity
        style={[styles.submitButton, isPublishing && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={isPublishing}
      >
        <Text style={styles.submitButtonText}>
          {isPublishing ? '⏳ Publicando…' : 'Publicar ahora'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => (!isPublishing ? navigation.goBack() : null)}
        style={styles.backButton}
        disabled={isPublishing}
      >
        <Ionicons name="arrow-back" size={18} color="#FFF" />
        <Text style={styles.backText}>Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  title: {
    color: '#D8A353',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    width: '100%',
    marginBottom: 20,
  },
  multiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#D8A353',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 30,
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
  },
  backText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
  },
});
