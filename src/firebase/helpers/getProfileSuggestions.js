import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

const db = getFirestore();
const functions = getFunctions();

export const getProfileSuggestions = async (profile, userData) => {
  try {
    const uid = userData.email.toLowerCase();
    const ref = doc(db, "ia_suggestions", uid);
    const snap = await getDoc(ref);

    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    // Si ya existen sugerencias recientes, las devolvemos
    if (snap.exists()) {
      const data = snap.data();
      const last = data?.timestamp?.toMillis?.() || 0;

      if (now - last < oneWeek && data.suggestions) {
        return { suggestions: data.suggestions };
      }
    }
    console.log("📦 membershipType enviado:", userData?.membershipType);
    const callable = httpsCallable(functions, "generateSuggestions");
    const result = await callable({ profile, userData });

    if (result.data?.error) return { error: result.data.error };

    const raw = result.data.suggestions;

const suggestions = Array.isArray(raw)
  ? raw
  : typeof raw === 'string'
    ? raw
        .split(/\n+/)
        .map(line => line.replace(/^\d+[\).\s]?/, '').trim())
        .filter(line => line.length > 0)
    : [];

    // Guardar sugerencias con timestamp
    await setDoc(ref, {
      suggestions,
      timestamp: serverTimestamp(),
      type: userData.membershipType,
    });

    return { suggestions };

  } catch (err) {
    console.error("Error al generar sugerencias IA:", err);
    return { error: "No se pudieron generar sugerencias." };
  }
};
