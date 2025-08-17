import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const syncCastingToFirestore = async (casting) => {
  if (!casting || !casting.id || !casting.creatorEmail) return { ok: false };

  try {
    const creatorEmailLower = casting.creatorEmail.toLowerCase();
    const docId = `${creatorEmailLower}_${casting.id}`;
    const docRef = doc(db, 'castings', docId);

    // 📥 Leer doc existente
    const existingDoc = await getDoc(docRef);
    const existingData = existingDoc.exists() ? existingDoc.data() : {};

    console.log('🔍 Revisando casting en Firestore:', {
      docId,
      exists: existingDoc.exists(),
      publishedAt: existingData.publishedAt,
      publishedAtMs: existingData.publishedAtMs
    });

    const payload = {
      ...casting,
      docId,
      shortId: casting.id,
      // ✅ Mantener fecha si ya existe
      publishedAt: existingData.publishedAt || serverTimestamp(),
      publishedAtMs: existingData.publishedAtMs || Date.now(),
      date: casting.date || new Date().toISOString().split('T')[0],
      creatorEmailLower,
      syncedAt: serverTimestamp()
    };

    console.log('📤 Payload final a guardar:', {
      publishedAt: payload.publishedAt,
      publishedAtMs: payload.publishedAtMs
    });

    await setDoc(docRef, payload, { merge: true });
    console.log('✅ Casting sincronizado con Firestore:', casting.title);

    return { ok: true, docId };
  } catch (error) {
    console.error('❌ Error al sincronizar casting a Firestore:', error);
    return { ok: false };
  }
};
