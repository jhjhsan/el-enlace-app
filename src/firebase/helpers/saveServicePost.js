import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Guarda el servicio en AsyncStorage y en Firebase Firestore.
 * @param {Object} post - Objeto del servicio.
 *  Campos recomendados: { id?, type?, title, description, category, creatorEmail?, creatorId? }
 * @param {string} plan - Plan actual del usuario (free, pro, elite).
 */
export const saveServicePost = async (post, plan = 'free') => {
  try {
    // 🔑 Traer usuario local para reforzar dueño
    const userRaw = await AsyncStorage.getItem('userData');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const ownerEmail = (post.creatorEmail || user?.email || '').trim().toLowerCase();
    const ownerId = post.creatorId ?? user?.id ?? null;

    // ⏱️ Fechas y expiración por plan
    const nowMs = Date.now();
    const expiresAtMs =
      plan === 'free'
        ? nowMs + 7 * 24 * 60 * 60 * 1000
        : nowMs + 21 * 24 * 60 * 60 * 1000;

    // 🆔 ID estable (si no viene)
    const safeId = post.id
      ? String(post.id)
      : `${ownerEmail || 'unknown'}_${nowMs}`;

    // 🧼 Enriquecer/normalizar
    const enrichedPost = {
      ...post,
      id: safeId,
      type: post.type || 'servicio',
      creatorEmail: ownerEmail,
      creatorId: ownerId,
      createdAt: nowMs,           // ms para ordenar en UI local
      createdAtTS: serverTimestamp(), // Firestore
      expiresAtMs,
      planSnapshot: plan,
    };

    // 📦 Guardado local (al INICIO y sin duplicados por id)
    const raw = await AsyncStorage.getItem('posts');
    const posts = raw ? JSON.parse(raw) : [];
    const withoutDup = posts.filter(p => p.id !== enrichedPost.id);
    const updated = [enrichedPost, ...withoutDup];
    await AsyncStorage.setItem('posts', JSON.stringify(updated));
    console.log('📦 Guardado en AsyncStorage');

    // ☁️ Guardado en Firestore (docId determinista)
    const docId = `${enrichedPost.creatorEmail.replace(/[^a-zA-Z0-9]/g, '_')}_${enrichedPost.id}`;
    await setDoc(doc(db, 'services', docId), enrichedPost, { merge: true });
    console.log('📤 Firestore OK:', docId, 'expira:', expiresAtMs);

    return enrichedPost;
  } catch (error) {
    console.error('❌ Error al guardar el servicio:', error);
    throw error;
  }
};
