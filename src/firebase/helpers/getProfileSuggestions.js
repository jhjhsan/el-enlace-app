// src/firebase/helpers/getProfileSuggestions.js
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

const db = getFirestore();
const functions = getFunctions();

// ---------- helpers ----------
const clean = (s) => (typeof s === "string" ? s.trim() : "");
const normalizeEmail = (e) => (e || "").trim().toLowerCase();
const pickFirst = (...vals) => {
  for (const v of vals) {
    const s = clean(v);
    if (s) return s;
  }
  return "";
};
const normalizeInstagram = (raw) => {
  const v = clean(raw);
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  const user = v.replace(/^@+/, "").replace(/[^a-z0-9._]/gi, "");
  return user ? `https://instagram.com/${user}` : "";
};

async function upsertProfileSuggestion(email, payload) {
  const cols = ["profilesPro", "profilesElite", "profilesFree", "profiles"];
  for (const c of cols) {
    const r = doc(db, c, email);
    const s = await getDoc(r);
    if (s.exists()) {
      await updateDoc(r, payload);
      return { collection: c, created: false };
    }
  }
  await setDoc(doc(db, "profiles", email), { email, ...payload }, { merge: true });
  return { collection: "profiles", created: true };
}
// --------------------------------

export async function getProfileSuggestions(profile, userData) {
  try {
    const email = normalizeEmail(userData?.email || profile?.email || "");
    if (!email) return { error: "Email inválido" };

    // Normalización robusta (lo que recibe la IA):
    const normalizedProfile = {
      ...profile,
      email,
      city:   pickFirst(profile.city, profile.ciudad, profile.comuna).toLowerCase(),
      region: pickFirst(profile.region, profile["región"]).toLowerCase(),
      country: pickFirst(profile.country, profile.pais, profile.país),
      instagram: normalizeInstagram(profile.instagram),
      age: pickFirst(profile.age, profile.edad),
      sexo: pickFirst(profile.sexo, profile.gender),
      height: pickFirst(profile.height, profile.estatura, profile.altura),
      phone: pickFirst(profile.phone, profile.telefono, profile.teléfono),
      video: clean(profile.profileVideo || profile.video),
      bookPhotos: Array.isArray(profile.bookPhotos) ? profile.bookPhotos : [],
      category: Array.isArray(profile.category) ? profile.category : (profile.category ? [String(profile.category)] : []),
    };

    // Campos presentes (para bloquear sugerencias redundantes en el backend)
    const presentFields = {
      city: !!normalizedProfile.city,
      region: !!normalizedProfile.region,
      instagram: !!normalizedProfile.instagram,
      phone: !!normalizedProfile.phone,
      age: !!normalizedProfile.age,
      height: !!normalizedProfile.height,
      video: !!normalizedProfile.video,
      book: Array.isArray(normalizedProfile.bookPhotos) && normalizedProfile.bookPhotos.length > 0,
    };

    // ⚠️ Fuerza nueva generación SIEMPRE
    const callable = httpsCallable(functions, "generateSuggestions");
    const runId = String(Date.now());
    const result = await callable({
      profile: normalizedProfile,
      userData: {
        ...userData,
        email,
      },
      force: true,
      runId,
      presentFields,
    });

    if (result.data?.error) {
      return { error: result.data.error };
    }

    // Normaliza salida a array de strings:
    const raw = result.data?.suggestions;
    const lines = Array.isArray(raw)
      ? raw
      : typeof raw === "string"
        ? raw.split(/\n+/).map((t) => t.trim()).filter(Boolean)
        : [];

    // Escribe perfil vigente y cache canónica (sin depender de TTLs)
    await upsertProfileSuggestion(email, {
      ia_suggestion: lines,
      ia_suggestion_model: userData?.model || "gpt",
      ia_suggestion_updatedAt: serverTimestamp(),
      ia_suggestion_runId: runId,
    });

    await setDoc(doc(db, "ia_suggestions", email), {
      suggestions: lines,
      timestamp: serverTimestamp(),
      type: userData?.membershipType || null,
      runId,
    }, { merge: true });

    return { suggestions: lines };
  } catch (err) {
    console.error("Error al generar sugerencias IA:", err);
    return { error: "No se pudieron generar sugerencias." };
  }
}

export default getProfileSuggestions;
