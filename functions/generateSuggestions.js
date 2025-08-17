// functions/generateSuggestions.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();

const fetch = require("node-fetch").default;

const OPENAI_API_KEY = functions.config().openai.key;

console.log("🔐 Clave OpenAI cargada:", OPENAI_API_KEY?.slice?.(0, 10) + "...");

exports.generateSuggestions = functions.https.onCall(async (data, context) => {
  // -------- payload / flags --------
  const profile   = data?.profile || {};
  const userType  = data?.userData?.membershipType;
  const force     = !!data?.force;               // 👈 forzar nueva generación
  const runId     = data?.runId || null;         // 👈 auditoría opcional
  const presentFields = data?.presentFields || {}; // 👈 para bloquear redundancias

  if (!userType) {
    console.warn("❌ No se detectó el tipo de cuenta. userData:", data?.userData);
    return { error: "No se detectó el tipo de cuenta del usuario." };
  }

  const userEmail = String(profile?.email || "").toLowerCase().trim();
  if (!userEmail) {
    console.warn("❌ No se encontró el correo del usuario.");
    return { error: "No se encontró el correo del usuario." };
  }

  if (!profile || !profile.category || (Array.isArray(profile.category) && profile.category.length === 0)) {
    console.warn("❌ Perfil incompleto. Falta categoría:", profile);
    return { error: "Perfil incompleto. Se requiere al menos una categoría." };
  }

  // 🔧 Helpers
  const toStr = (v) => (typeof v === "string" ? v : v == null ? "" : String(v));
  const clean = (s) => toStr(s).trim();
  const normalizeSp = (s) =>
    clean(s).replace(/\s+/g, " ").replace(/\u00A0/g, " ").replace(/[’`]/g, "'");

  // 🔎 City y Region: tomar desde múltiples campos
  const cityValRaw   = profile.city ?? profile.ciudad ?? profile.comuna ?? "";
  const regionValRaw = profile.region ?? profile.región ?? profile["region "] ?? "";

  const cityVal   = normalizeSp(cityValRaw);
  const regionVal = normalizeSp(regionValRaw);

  const hasCity   = cityVal.length > 0 || !!presentFields.city;
  const hasRegion = regionVal.length > 0 || !!presentFields.region;

  // 🧱 Límite semanal (solo si NO es force)
  try {
    const ref = db.collection("ia_suggestions").doc(userEmail);
    const snap = await ref.get();

    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

  } catch (throttleErr) {
    console.warn("⚠️ Error al evaluar límite semanal (se continúa):", throttleErr);
  }

  if (!profile.name || !profile.category) {
    console.warn("⚠️ Perfil sin nombre o sin categoría:", profile);
  }

  // 🎯 Extra prompt por tipo/ categoría
  let extraPrompt = "";
  const categoryList = Array.isArray(profile.category)
    ? profile.category.map((c) => toStr(c).toLowerCase())
    : [toStr(profile.category).toLowerCase()];

  if (toStr(userType).toLowerCase().trim() === "elite") {
    extraPrompt =
      "Evalúa este perfil como empresa o agencia. Revisa si tiene logo, datos de contacto, presencia profesional, sitio web o redes, y que el servicio esté bien representado visualmente.";
  } else if (userType === "pro") {
    if (categoryList.includes("actor") || categoryList.includes("actriz")) {
      extraPrompt =
        "Evalúa si el perfil es adecuado para actor/actriz: presentación en video, expresividad, buena imagen, edad y ciudad clara, etc.";
    } else if (categoryList.includes("modelo") || categoryList.includes("modelo publicitario")) {
      extraPrompt =
        "Evalúa si el perfil muestra variedad de fotos de book, presencia visual, buena postura, y apariencia profesional.";
    } else if (categoryList.includes("maquillista") || categoryList.includes("maquillaje")) {
      extraPrompt =
        "Evalúa si se muestran trabajos anteriores, diversidad de estilos, limpieza, profesionalismo y equipo usado.";
    } else if (categoryList.includes("fotógrafo") || categoryList.includes("camarógrafo")) {
      extraPrompt =
        "Evalúa si el perfil muestra portafolio fotográfico o audiovisual con buena calidad técnica y creatividad visual.";
    } else {
      extraPrompt =
        "Evalúa este perfil como talento individual. Considera presentación, fotos de book, video, y datos personales completos.";
    }
  } else {
    extraPrompt =
      "Evalúa el perfil con base en estándares generales para la industria audiovisual.";
  }

  // 🧱 Bloqueos por campos presentes (evitar redundancias)
  const blocked = [];
  if (presentFields.city || hasCity) blocked.push("ciudad");
  if (presentFields.region || hasRegion) blocked.push("región");
  if (presentFields.instagram) blocked.push("instagram");
  if (presentFields.phone) blocked.push("teléfono");
  if (presentFields.age) blocked.push("edad");
  if (presentFields.height) blocked.push("estatura/altura");
  if (presentFields.video) blocked.push("video de presentación");
  if (presentFields.book) blocked.push("book/portafolio");

  // 📝 Prompt final (usa bloqueos además de hasCity/hasRegion)
  let prompt = "";

  if (toStr(userType).toLowerCase().trim() === "elite") {
    prompt = `
Eres un asesor experto en mejorar perfiles de empresas audiovisuales para una plataforma profesional. Evalúa el siguiente perfil de agencia **sin sugerir cambios en el nombre ni en la identidad de la empresa existente**. Enfócate solo en mejorar su presentación visual, calidad del contenido, redes sociales, medios cargados (fotos, videos), datos de contacto y profesionalismo general.
${extraPrompt}

Reglas importantes:
- ${hasCity && hasRegion ? "El perfil ya incluye región y ciudad, **no sugieras actualizarlas**." : "Si faltan región o ciudad, puedes sugerir incluirlas."}
${blocked.length ? `- No sugieras completar: ${blocked.join(", ")} (ya está en el perfil).` : ""}

Nombre de la agencia: ${clean(profile.agencyName) || "No indicada"}
Representante: ${clean(profile.representative) || "No indicado"}
Tipo de empresa: ${clean(profile.companyType) || "No indicado"}
Categoría: ${Array.isArray(profile.category) ? profile.category.join(", ") : clean(profile.category) || "No indicada"}
Región: ${hasRegion ? regionVal : "No indicada"}
Ciudad: ${hasCity ? cityVal : "No indicada"}
¿Tiene logo? ${Array.isArray(profile.logos) && profile.logos.length > 0 ? "Sí" : (profile.profilePhoto ? "Sí" : "No")}
¿Tiene video de presentación? ${profile.profileVideo ? "Sí" : "No"}
Instagram: ${clean(profile.instagram) || "No indicado"}
WhatsApp: ${clean(profile.whatsapp) || "No indicado"}
Sitio web: ${clean(profile.webLink) || "No indicado"}

Devuelve una lista de sugerencias profesionales para mejorar la presencia de esta agencia en la app.
`.trim();
  } else {
    prompt = `
Eres un asesor profesional experto en perfiles para una app de casting y talento. Tu tarea es analizar el siguiente perfil y entregar una lista clara de sugerencias para mejorarlo profesionalmente y hacerlo más atractivo para productores, directores y agencias. Evalúa la calidad, completitud y presentación del perfil.
${extraPrompt}

Reglas importantes:
- ${hasCity && hasRegion ? "El perfil ya incluye región y ciudad, **no sugieras actualizarlas**." : "Si faltan región o ciudad, puedes sugerir incluirlas."}
- No incluyas sugerencias relacionadas con el campo descripción, ya que ha sido eliminado del perfil.
${blocked.length ? `- No sugieras completar: ${blocked.join(", ")} (ya está en el perfil).` : ""}

Nombre: ${clean(profile.name) || "Desconocido"}
Edad: ${clean(profile.age) || clean(profile.edad) || "No indicada"}
Estatura: ${clean(profile.estatura || profile.height) || "No indicada"} m
Ciudad: ${hasCity ? cityVal : "No indicada"}
Región: ${hasRegion ? regionVal : "No indicada"}
Categoría(s): ${Array.isArray(profile.category) ? profile.category.join(", ") : clean(profile.category)}

Color de piel: ${clean(profile.skinColor) || "No indicado"}
Color de ojos: ${clean(profile.eyeColor) || "No indicado"}
Color de cabello: ${clean(profile.hairColor) || "No indicado"}

¿Tiene foto de perfil? ${profile.profilePhoto ? "Sí" : "No"}
¿Tiene video de presentación? ${profile.profileVideo ? "Sí" : "No"}
¿Tiene mínimo 3 fotos en el book? ${Array.isArray(profile.bookPhotos) && profile.bookPhotos.length >= 3 ? "Sí" : "No"}

¿Tiene tatuajes? ${profile.tattoos ? "Sí" : "No"} ${profile.tattoosLocation ? `(Ubicación: ${clean(profile.tattoosLocation)})` : ""}
¿Tiene piercings? ${profile.piercings ? "Sí" : "No"} ${profile.piercingsLocation ? `(Ubicación: ${clean(profile.piercingsLocation)})` : ""}

Talla de camisa: ${clean(profile.shirtSize) || "No indicada"}
Talla de pantalón: ${clean(profile.pantsSize) || "No indicada"}
Talla de calzado: ${clean(profile.shoeSize) || "No indicada"}

Devuelve una lista de recomendaciones para mejorar este perfil profesionalmente.
`.trim();
  }

  try {
    console.log("🧠 Enviando prompt a OpenAI...");
    console.log("📧 Email del usuario:", userEmail);
    console.log("💼 Tipo de cuenta:", userType);
    console.log("📂 Categoría:", profile.category);
    console.log("🌍 hasCity/hasRegion:", { hasCity, hasRegion, cityVal, regionVal });
    console.log("🚫 presentFields (bloqueos):", presentFields);
    console.log("📝 Prompt final generado:\n", prompt);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // puedes subir a gpt-4o-mini si quieres mejor calidad/costo
        messages: [
          { role: "system", content: "Eres un asesor experto en perfiles para casting. Entrega entre 5 y 8 sugerencias, una por línea, sin encabezados ni repetición." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    console.log("📡 Solicitud enviada a OpenAI. Esperando respuesta...");

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Error HTTP desde OpenAI:", response.status, errorText);
      return { error: `OpenAI HTTP Error ${response.status}` };
    }

    const result = await response.json();
    console.log("📬 Respuesta completa recibida de OpenAI:", JSON.stringify(result, null, 2));
    const content = result?.choices?.[0]?.message?.content;

    if (!content || typeof content !== "string") {
      console.error("❌ Contenido inválido en respuesta OpenAI:", result);
      return { error: "Respuesta de IA inválida." };
    }

    // 🧹 Parseo y filtro de sugerencias
    let suggestionLines = content
      .split(/\n+/)
      .map((line) => line.replace(/^\s*[-*•]?\s*\d*[\).\s-]?\s*/, "").trim())
      .filter((line) => line.length > 0);

    // Filtrar redundancias por bloqueos (además de ciudad/región)
    const cityRegionRegex = /\b(ciudad|residencia|región|region)\b/i;
    suggestionLines = suggestionLines.filter((line) => {
      if ((hasCity || hasRegion) && cityRegionRegex.test(line)) return false;
      if (presentFields.instagram && /instagram/i.test(line)) return false;
      if (presentFields.phone && /(tel[eé]fono|celular|whats?app)/i.test(line)) return false;
      if (presentFields.age && /edad/i.test(line)) return false;
      if (presentFields.height && /(estatura|altura)/i.test(line)) return false;
      if (presentFields.video && /video de presentaci[oó]n|presentaci[oó]n en video/i.test(line)) return false;
      if (presentFields.book && /\b(book|portafolio|portfolio)\b/i.test(line)) return false;
      return true;
    });

    // Limitar y deduplicar (máx 8, tú antes usabas 5)
    const seen = new Set();
    const filtered = [];
    for (const s of suggestionLines) {
      const key = s.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        filtered.push(s);
      }
      if (filtered.length === 5) break;
    }

    console.log("📋 Sugerencias extraídas/filtradas:", filtered);

    // Guarda en cache canónica (timestamp) y auditoría
    const ref = db.collection("ia_suggestions").doc(userEmail);
    await ref.set(
      {
        suggestions: filtered,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: userType,
        lastCFRunAt: admin.firestore.FieldValue.serverTimestamp(),
        lastCFRunId: runId || null,
        forceUsed: !!force,
      },
      { merge: true }
    );

    console.log("✅ Sugerencias guardadas correctamente.");
    return { suggestions: filtered, runId: runId || null };
  } catch (error) {
    console.error("🔥 Error inesperado al generar sugerencias IA:", error);
    return { error: "Error interno al generar sugerencias IA." };
  }
});
