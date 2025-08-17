// src/firebase/helpers/runProfileIAAnalysis.js
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getProfileSuggestions } from "./getProfileSuggestions"; // <-- tu helper actualizado

const db = getFirestore();

// ---------- helpers ----------
const clean = (s) => (typeof s === "string" ? s.trim() : "");
const normEmail = (e) => (e || "").trim().toLowerCase();
const pickFirst = (...vals) => {
  for (const v of vals) {
    const s = clean(v);
    if (s) return s;
  }
  return "";
};
const normInstagram = (raw) => {
  const v = clean(raw);
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  const user = v.replace(/^@+/, "").replace(/[^a-z0-9._]/gi, "");
  return user ? `https://instagram.com/${user}` : "";
};
// genera variantes de ID para buscar el doc de perfil
const idVariants = (email) => {
  const e = normEmail(email);
  return [e, e.replace(/[.@]/g, "_")];
};
// orden de colecciones donde buscar
const PROFILE_COLLECTIONS = ["profilesPro", "profilesElite", "profilesFree", "profiles"];

// Busca el perfil probando colecciones e IDs alternos
async function fetchProfileAny(email) {
  const tried = [];
  const ids = idVariants(email);
  for (const col of PROFILE_COLLECTIONS) {
    for (const id of ids) {
      tried.push(id);
      const r = doc(db, col, id);
      const s = await getDoc(r);
      if (s.exists()) {
        return {
          found: true,
          preferedCollection: col,
          usedCol: col,
          usedId: id,
          data: s.data(),
          triedIds: tried,
        };
      }
    }
  }
  return { found: false, preferedCollection: "profiles", usedCol: null, usedId: null, triedIds: tried, data: null };
}
// ---------------------------------------------

/**
 * Ejecuta el análisis de perfil desde cualquier dashboard (Pro/Elite/Free),
 * normalizando city/region/instagram y registrando logs claros.
 */
export async function runProfileIAAnalysis({ email, membershipType: mtHint } = {}) {
  const emailNorm = normEmail(email);
  if (!emailNorm) throw new Error("Email inválido");

  // 1) Obtener perfil real desde Firestore (en la colección correcta)
  const lookup = await fetchProfileAny(emailNorm);
  console.log("🔎 Lookup perfil", {
    found: lookup.found,
    preferedCollection: lookup.preferedCollection,
    triedIds: lookup.triedIds,
    usedCol: lookup.usedCol,
    usedId: lookup.usedId,
  });
  if (!lookup.found) throw new Error("Perfil no encontrado en Firestore");

  const p = lookup.data || {};

  // 2) Normalización robusta para evitar "city undefined"
  const city = pickFirst(p.city, p.ciudad, p.comuna).toLowerCase();
  const region = pickFirst(p.region, p.región).toLowerCase();
  const country = pickFirst(p.country, p.pais, p.país);

  const profileNormalized = {
    ...p,
    email: emailNorm,
    city,
    region,
    country,
    instagram: normInstagram(p.instagram),
    age: pickFirst(p.age, p.edad),
    sexo: pickFirst(p.sexo, p.gender),
    height: pickFirst(p.estatura, p.altura),
    phone: pickFirst(p.phone, p.telefono, p.teléfono),
    video: clean(p.profileVideo),
    bookPhotos: Array.isArray(p.bookPhotos) ? p.bookPhotos : [],
  };

  console.log("🌆 Ciudad recibida del perfil:", city || null);
  console.log("✅ Perfil cargado:", profileNormalized);

  // 3) Determinar label real del dashboard para el log (no hardcodear "ELITE")
  const mt = (p.membershipType || mtHint || "desconocido").toString().toUpperCase();
  const runId = String(Date.now());
  console.log(`📦 Enviando perfil a IA desde DASHBOARD ${mt}:`, profileNormalized);
  console.log("👤 Enviando userData:", { ...profileNormalized, membershipType: p.membershipType || mtHint || "desconocido" });

  // 4) Llamar SIEMPRE al mismo helper (getProfileSuggestions) que ya guarda en:
  //    - ia_suggestions/{email}
  //    - (profiles|Pro|Elite|Free)/{email}.ia_suggestion
  //    Y que ahora está SIN caché o con force=true
  const res = await getProfileSuggestions(profileNormalized, {
    email: emailNorm,
    membershipType: p.membershipType || mtHint || "desconocido",
    model: "gpt-5",
    runId,
  });

  if (res?.error) {
    console.warn("IA error:", res.error);
    return { ok: false, error: res.error, runId };
  }

  console.log("✅ Sugerencias IA:", res.suggestions);
  return { ok: true, suggestions: res.suggestions, runId, usedCol: lookup.usedCol, usedId: lookup.usedId };
}

export default runProfileIAAnalysis;
