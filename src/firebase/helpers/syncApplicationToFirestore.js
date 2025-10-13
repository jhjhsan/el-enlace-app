import { db } from '../firebaseConfig';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const normalizeEmail = (email = '') =>
  email.toLowerCase().trim().replace(/\s+/g, '').replace(/[^a-z0-9@._\-+]/gi, '');

/**
 * Sube/actualiza una postulación en Firestore (FUENTE ÚNICA: 'applications')
 * - Usa ID determinístico: {castingId}__{email_normalizado} para evitar duplicados.
 * - Guarda 'timestamp' con serverTimestamp() (última actualización).
 * - 'createdAt' y 'createdAtMs' se fijan SOLO si el doc no existía (inmutables).
 * - Conserva 'profile.emailOriginal' para auditoría.
 */
export const syncApplicationToFirestore = async (applicationData) => {
  try {
    const castingId = String(applicationData?.castingId || '').trim();
    const emailOriginal = applicationData?.profile?.email || '';
    const email = normalizeEmail(emailOriginal);

    if (!castingId || !email) {
      throw new Error('syncApplicationToFirestore: faltan castingId o profile.email');
    }

    const docId = `${castingId}__${email}`;
    const ref = doc(db, 'applications', docId);

    // ¿Ya existe? → para setear createdAt solo 1 vez
    const snap = await getDoc(ref);
    const exists = snap.exists();

    const actingVideosIn = Array.isArray(applicationData?.actingVideos)
      ? applicationData.actingVideos
      : (Array.isArray(applicationData?.videos) ? applicationData.videos : []);

    const payload = {
      castingId,
      castingTitle: applicationData?.castingTitle || '',
      profile: {
        ...(applicationData?.profile || {}),
        email,                                // normalizado (clave)
        emailOriginal: emailOriginal || null, // auditoría
      },

      // ✅ Campos de media (compat + explícito)
      videos: Array.isArray(applicationData?.videos) ? applicationData.videos : actingVideosIn,
      actingVideos: actingVideosIn, // ← preferido por exportador/PDF

      // Útil para debug/consultas rápidas
      actingVideosCount: Array.isArray(actingVideosIn) ? actingVideosIn.length : 0,

      // Tiempos
      timestamp: serverTimestamp(),
      submittedAt: applicationData?.submittedAt || null,

      // createdAt solo si no existía
      ...(exists ? {} : { createdAt: serverTimestamp(), createdAtMs: Date.now() }),
    };

    await setDoc(ref, payload, { merge: true });
    console.log('📥 Postulación sincronizada en applications:', docId);

    return { ok: true, id: docId };
  } catch (error) {
    console.error('❌ Error al sincronizar postulación:', error);
    return { ok: false, error: error?.message || String(error) };
  }
};
