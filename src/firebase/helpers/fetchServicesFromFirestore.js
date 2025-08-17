import { db } from '../firebaseConfig';
import {
  collection, getDocs, query, where, orderBy, limit, Timestamp
} from 'firebase/firestore';

/**
 * Carga servicios de los últimos 30 días.
 * Primero intenta con createdAtTS (Timestamp). Si no hay, hace fallback a createdAt (ms).
 * 🔹 Ahora también filtra por expiresAtMs para que no aparezcan servicios vencidos.
 */
export const fetchServicesFromFirestore = async () => {
  const nowMs = Date.now();
  const thirtyDaysAgoMs = nowMs - 30 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgoTs = Timestamp.fromMillis(thirtyDaysAgoMs);

  try {
    // ✅ Principal: por Timestamp
    const q1 = query(
      collection(db, 'services'),
      where('createdAtTS', '>=', thirtyDaysAgoTs),
      orderBy('createdAtTS', 'desc'),
      limit(200)
    );
    const s1 = await getDocs(q1);
    const r1 = s1.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => !p.expiresAtMs || p.expiresAtMs >= nowMs); // 🔹 filtro por fecha de expiración

    if (r1.length) {
      console.log(`📥 Servicios (TS): ${r1.length}`);
      return r1;
    }
  } catch (e) {
    console.log('⚠️ fetch TS fallo:', e?.message);
  }

  try {
    // 🔁 Fallback: por número (para docs antiguos sin createdAtTS)
    const s2 = await getDocs(collection(db, 'services'));
    const r2 = s2.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p =>
        typeof p.createdAt === 'number' &&
        p.createdAt >= thirtyDaysAgoMs &&
        (!p.expiresAtMs || p.expiresAtMs >= nowMs) // 🔹 filtro por fecha de expiración
      )
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 200);

    console.log(`📥 Servicios (fallback ms): ${r2.length}`);
    return r2;
  } catch (e) {
    console.log('❌ fetch fallback fallo:', e?.message);
    return [];
  }
};
