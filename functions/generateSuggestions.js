const functions = require("firebase-functions");
const { initializeApp, getApps } = require("firebase-admin/app");
const fetch = require("node-fetch");

// Inicializa Firebase Admin si no está activo
if (!getApps().length) {
  initializeApp();
}

// API Key desde configuración segura
const OPENAI_API_KEY = functions.config().openai.key;

exports.generateSuggestions = functions
  .runWith({ timeoutSeconds: 60, memory: '512MB' }) // ✅ Config Gen 2
  .region("us-central1") // ✅ Obligatorio para evitar errores
  .https.onCall(async (data, context) => {
    const profile = data.profile;

    if (!profile || !profile.category || !profile.description) {
      return { error: "Perfil incompleto. Se requiere categoría y descripción." };
    }

    if (profile.description.trim().length < 30) {
      return {
        error: "La descripción es muy breve. Agrega más detalles sobre experiencia, habilidades o proyectos.",
      };
    }

    const prompt = `
Eres un asesor profesional de perfiles para una app de casting. Analiza este perfil y entrega sugerencias claras y directas para mejorar:

Nombre: ${profile.name || 'Desconocido'}
Categoría: ${Array.isArray(profile.category) ? profile.category.join(", ") : profile.category}
Descripción: ${profile.description}
¿Tiene foto?: ${profile.profilePhoto ? 'Sí' : 'No'}
¿Tiene video?: ${profile.profileVideo ? 'Sí' : 'No'}

Devuelve solo una lista con puntos de mejora.
    `.trim();

    try {
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
        }),
      });

      const result = await response.json();

      if (!result.choices || !result.choices.length) {
        console.error("❌ Respuesta vacía de OpenAI:", result);
        return { error: "No se obtuvieron sugerencias de IA." };
      }

      const suggestions = result.choices[0].message.content;
      return { suggestions };

    } catch (error) {
      console.error("❌ Error al generar sugerencias IA:", error);
      return { error: "Error interno al generar sugerencias IA." };
    }
  });
