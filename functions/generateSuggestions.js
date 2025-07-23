const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore(); // ✅ Usa la app ya inicializada desde index.js

const fetch = require("node-fetch").default;

const OPENAI_API_KEY = functions.config().openai.key;

console.log("🔐 Clave OpenAI cargada:", OPENAI_API_KEY?.slice?.(0, 10) + '...');

exports.generateSuggestions = functions.https.onCall(async (data, context) => {
  const profile = data.profile;
  const userType = data?.userData?.membershipType;
if (!userType) {
  console.warn("❌ No se detectó el tipo de cuenta. userData:", data.userData);
  return { error: "No se detectó el tipo de cuenta del usuario." };
}

  const userEmail = (profile?.email || "").toLowerCase();

  if (!userEmail) {
    console.warn("❌ No se encontró el correo del usuario.");
    return { error: "No se encontró el correo del usuario." };
  }

  if (!profile || !profile.category || (Array.isArray(profile.category) && profile.category.length === 0)) {
    console.warn("❌ Perfil incompleto. Falta categoría:", profile);
    return { error: "Perfil incompleto. Se requiere al menos una categoría." };
  }

  const ref = db.collection("ia_suggestions").doc(userEmail);
  const snap = await ref.get();

  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;

  if (snap.exists) {
    const data = snap.data();
    const last = data?.timestamp?.toMillis?.() || 0;
    if (now - last < oneWeek) {
      console.log("🕒 Ya generó esta semana. Tiempo restante:", Math.ceil((oneWeek - (now - last)) / (60 * 60 * 1000)), "horas");
      return { error: "Ya has generado sugerencias esta semana. Intenta nuevamente después." };
    }
  }

  if (!profile.name || !profile.category) {
    console.warn("⚠️ Perfil sin nombre o sin categoría:", profile);
  }

  let extraPrompt = '';

  const categoryList = Array.isArray(profile.category)
    ? profile.category.map(c => c.toLowerCase())
    : [profile.category?.toLowerCase()];

  if ((userType || '').toLowerCase().trim() === 'elite') {
    extraPrompt = 'Evalúa este perfil como empresa o agencia. Revisa si tiene logo, datos de contacto, presencia profesional, sitio web o redes, y que el servicio esté bien representado visualmente.';
  } else if (userType === 'pro') {
    if (categoryList.includes('actor') || categoryList.includes('actriz')) {
      extraPrompt = 'Evalúa si el perfil es adecuado para actor/actriz: presentación en video, expresividad, buena imagen, edad y ciudad clara, etc.';
    } else if (categoryList.includes('modelo') || categoryList.includes('modelo publicitario')) {
      extraPrompt = 'Evalúa si el perfil muestra variedad de fotos de book, presencia visual, buena postura, y apariencia profesional.';
    } else if (categoryList.includes('maquillista') || categoryList.includes('maquillaje')) {
      extraPrompt = 'Evalúa si se muestran trabajos anteriores, diversidad de estilos, limpieza, profesionalismo y equipo usado.';
    } else if (categoryList.includes('fotógrafo') || categoryList.includes('camarógrafo')) {
      extraPrompt = 'Evalúa si el perfil muestra portafolio fotográfico o audiovisual con buena calidad técnica y creatividad visual.';
    } else {
      extraPrompt = 'Evalúa este perfil como talento individual. Considera presentación, fotos de book, video, y datos personales completos.';
    }
  } else {
    extraPrompt = 'Evalúa el perfil con base en estándares generales para la industria audiovisual.';
  }

  let prompt = '';

if (userType === 'elite') {
  prompt = `
Eres un asesor experto en mejorar perfiles de empresas audiovisuales para una plataforma profesional. Evalúa el siguiente perfil de agencia **sin sugerir cambios en el nombre ni en la identidad de la empresa existente**. Enfócate solo en mejorar su presentación visual, calidad del contenido, redes sociales, medios cargados (fotos, videos), datos de contacto y profesionalismo general.

NO debes sugerir cambiar el nombre de la agencia ni el representante si ya están claros.

${extraPrompt}

Nombre de la agencia: ${profile.agencyName || 'No indicada'}
Representante: ${profile.representative || 'No indicado'}
Tipo de empresa: ${profile.companyType || 'No indicado'}
Categoría: ${Array.isArray(profile.category) ? profile.category.join(', ') : profile.category || 'No indicada'}
Región: ${profile.region || 'No indicada'}
Ciudad: ${profile.city || 'No indicada'}
¿Tiene logo? ${Array.isArray(profile.logos) && profile.logos.length > 0 ? 'Sí' : 'No'}
¿Tiene video de presentación? ${profile.profileVideo ? 'Sí' : 'No'}
Instagram: ${profile.instagram || 'No indicado'}
WhatsApp: ${profile.whatsapp || 'No indicado'}
Sitio web: ${profile.webLink || 'No indicado'}

Devuelve una lista de sugerencias profesionales para mejorar la presencia de esta agencia en la app.
`.trim();

  } else {
    prompt = `
Eres un asesor profesional experto en perfiles para una app de casting y talento. Tu tarea es analizar el siguiente perfil y entregar una lista clara de sugerencias para mejorarlo profesionalmente y hacerlo más atractivo para productores, directores y agencias. Evalúa la calidad, completitud y presentación del perfil.

${extraPrompt}

Nombre: ${profile.name || 'Desconocido'}
Edad: ${profile.age || 'No indicada'}
Estatura: ${profile.estatura || 'No indicada'} m
Ciudad: ${profile.city || 'No indicada'}
Región: ${profile.region || 'No indicada'}
Categoría(s): ${Array.isArray(profile.category) ? profile.category.join(", ") : profile.category}

Descripción: No aplica (el campo ha sido removido del formulario)

Color de piel: ${profile.skinColor || 'No indicado'}
Color de ojos: ${profile.eyeColor || 'No indicado'}
Color de cabello: ${profile.hairColor || 'No indicado'}

¿Tiene foto de perfil? ${profile.profilePhoto ? 'Sí' : 'No'}
¿Tiene video de presentación? ${profile.profileVideo ? 'Sí' : 'No'}
¿Tiene mínimo 3 fotos en el book? ${(Array.isArray(profile.bookPhotos) && profile.bookPhotos.length >= 3) ? 'Sí' : 'No'}

¿Tiene tatuajes? ${profile.tattoos ? 'Sí' : 'No'} ${profile.tattoosLocation ? `(Ubicación: ${profile.tattoosLocation})` : ''}
¿Tiene piercings? ${profile.piercings ? 'Sí' : 'No'} ${profile.piercingsLocation ? `(Ubicación: ${profile.piercingsLocation})` : ''}

Talla de camisa: ${profile.shirtSize || 'No indicada'}
Talla de pantalón: ${profile.pantsSize || 'No indicada'}
Talla de calzado: ${profile.shoeSize || 'No indicada'}

No incluyas sugerencias relacionadas con el campo descripción, ya que ha sido eliminado del perfil.

Devuelve una lista de recomendaciones para mejorar este perfil profesionalmente.
`.trim();
  }

  try {
    console.log("🧠 Enviando prompt a OpenAI...");
    console.log("📧 Email del usuario:", userEmail);
    console.log("💼 Tipo de cuenta:", userType);
    console.log("📂 Categoría:", profile.category); // ✅ Corregido
    console.log("🧪 Profile completo:", JSON.stringify(profile, null, 2));
    console.log("📝 Prompt final generado:\n", prompt);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Eres un asesor experto en perfiles para casting." },
          { role: "user", content: prompt }
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
    console.log("✅ result.choices:", result.choices);

    const content = result?.choices?.[0]?.message?.content;

    if (!content || typeof content !== 'string') {
      console.error("❌ Contenido inválido en respuesta OpenAI:", result);
      return { error: "Respuesta de IA inválida." };
    }

    const suggestionLines = content
      .split(/\n+/)
      .map(line => line.replace(/^\d+[\).\s]?/, '').trim())
      .filter(line => line.length > 0)
      .slice(0, 5);

    console.log("📋 Sugerencias extraídas:", suggestionLines);

await ref.set({
  suggestions: suggestionLines,
  timestamp: admin.firestore.FieldValue.serverTimestamp(), // ✅ Clásico
  type: userType, // ⬅️ Guarda el tipo de cuenta ('elite', 'pro')
});

    console.log("✅ Sugerencias guardadas correctamente.");
    return { suggestions: suggestionLines };

  } catch (error) {
    console.error("🔥 Error inesperado al generar sugerencias IA:", error);
    return { error: "Error interno al generar sugerencias IA." };
  }
});
