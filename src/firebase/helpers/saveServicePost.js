import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

/**
 * Guarda el servicio en AsyncStorage y en Firebase Firestore.
 * @param {Object} post - El objeto del servicio a guardar.
 */
export const saveServicePost = async (post) => {
  try {
const enrichedPost = {
  ...post,
  creatorEmail: (post.creatorEmail || '').trim().toLowerCase(), // 🧼 limpio y normalizado
  createdAt: new Date().toISOString(),
};

    // 🔒 Guardar localmente
    const localData = await AsyncStorage.getItem('posts');
    const parsed = localData ? JSON.parse(localData) : [];
    const updated = [...parsed, enrichedPost];
    await AsyncStorage.setItem('posts', JSON.stringify(updated));
    console.log('📦 Guardado en AsyncStorage');

    // 🔁 Guardar en Firestore
    const docId = `${enrichedPost.creatorEmail.replace(/[^a-zA-Z0-9]/g, '_')}_${enrichedPost.id}`;
    await setDoc(doc(db, 'services', docId), enrichedPost);
    console.log('📤 Guardado en Firestore con ID:', docId);
  } catch (error) {
    console.error('❌ Error al guardar el servicio:', error);
    throw error;
  }
};
