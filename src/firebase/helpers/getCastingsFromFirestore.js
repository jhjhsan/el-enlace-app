import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// ---- utils de fecha/ids ----
function toDateOrNull(v) {
  if (!v) return null;
  if (typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d) ? null : d;
  }
  if (typeof v === 'string') {
    const d = new Date(v);
    if (!isNaN(d)) return d;
    const d2 = new Date(v.replace(' ', 'T'));
    return isNaN(d2) ? null : d2;
  }
  if (v?.toDate && typeof v.toDate === 'function') return v.toDate();
  if (v?.seconds) return new Date(v.seconds * 1000);
  return null;
}

function extractMsToken(x) {
  if (!x) return null;
  if (typeof x === 'number') {
    const s = String(x);
    return s.length >= 12 ? x : null;
  }
  if (typeof x === 'string') {
    const m = x.match(/(\d{12,14})/);
    return m ? Number(m[1]) : null;
  }
  return null;
}

function getCastingDate(data, docId) {
  return (
    toDateOrNull(data?.timestamp) ||
    toDateOrNull(data?.syncedAt) ||
    toDateOrNull(data?.date) ||
    (extractMsToken(docId) ? new Date(extractMsToken(docId)) : null)
  );
}

/**
 * Obtiene castings con métricas (postulaciones, días, etc.) para un owner.
 * - Lee castings de /castings.
 * - Cuenta postulaciones en /applications (no /postulations).
 * - Agrupa y consulta en bloques de 10 IDs (limite Firestore IN).
 */
export const getCastingsFromFirestore = async (email) => {
  try {
    const snap = await getDocs(collection(db, 'castings'));
    // 1) Filtrar castings del owner
    const myCastings = [];
    for (const docSnap of snap.docs) {
      const data = docSnap.data() || {};
      if ((data?.creatorEmail || '').toLowerCase() !== (email || '').toLowerCase()) continue;
      // id real del casting
      const castingId = String(data.id || docSnap.id);
      myCastings.push({ docId: docSnap.id, castingId, data });
    }

    if (myCastings.length === 0) {
      console.log('📊 Se cargaron 0 castings con análisis de Firestore.');
      return [];
    }

    // 2) Contar postulaciones desde /applications
    //    - Hacemos IN por bloques de 10
    const counts = new Map(); // castingId -> count
    const ids = myCastings.map(x => x.castingId);
    const idsSet = new Set(ids);
    const applicationsRef = collection(db, 'applications');

    for (let i = 0; i < ids.length; i += 10) {
      const chunk = ids.slice(i, i + 10);
      const qIn = query(applicationsRef, where('castingId', 'in', chunk));
      const apps = await getDocs(qIn);
      apps.forEach(d => {
        const a = d.data() || {};
        const rawId = String(a.castingId || '');
        // Coincidencia exacta primero
        if (idsSet.has(rawId)) {
          counts.set(rawId, (counts.get(rawId) || 0) + 1);
        } else {
          // si viene como email_17547..., mapeamos por token numérico
          const token = extractMsToken(rawId);
          if (token) {
            // busca algún casting cuyo id comparta ese token
            const match = myCastings.find(c => extractMsToken(c.castingId) === token);
            if (match) counts.set(match.castingId, (counts.get(match.castingId) || 0) + 1);
          }
        }
      });
    }

    // 3) Construir respuesta con métricas
    const now = new Date();
    const allCastings = myCastings.map(({ docId, castingId, data }) => {
      const created = getCastingDate(data, docId);
      const diasDesdePublicacion = created ? Math.floor((now - created) / (1000 * 60 * 60 * 24)) : null;

      return {
        ...data,
        castingId,
        id: castingId,
        postulaciones: counts.get(castingId) || 0,
        diasDesdePublicacion,
        tieneVideo: !!data.video,
        tieneImagen: !!data.image,
        destacado: !!data.destacado,
      };
    });

    console.log(`📊 Se cargaron ${allCastings.length} castings con análisis de Firestore.`);
    return allCastings;
  } catch (error) {
    console.error('❌ Error al obtener desempeño de castings:', error);
    return [];
  }
};
