const functions = require("firebase-functions");
const { initializeApp, getApps } = require("firebase-admin/app");
const fetch = require("node-fetch");

// Inicializa Firebase Admin solo si aún no está activo
if (!getApps().length) {
  initializeApp();
}

// API Key desde configuración segura
const OPENAI_API_KEY = functions.config().openai.key;

exports.analyzeAd = functions.https.onCall(async (data, context) => {
  const { title, description } = data;

  if (!title || !description) {
    return { error: "Faltan campos obligatorios (título y descripción)." };
  }

  const prompt = `
Evalúa este anuncio para una app de casting:

Título: "${title}"
Descripción: "${description}"

¿Es profesional? ¿Hay errores de redacción? ¿Detectas lenguaje ofensivo o spam? Responde de forma estructurada con:

- Profesionalismo: (✔️/❌ y comentario)
- Claridad del mensaje: (✔️/❌ y comentario)
- Lenguaje ofensivo o inapropiado: (✔️/❌ y comentario)
- Recomendación final: (Publicar / Revisar / Bloquear)
`.trim();

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Eres un revisor profesional de contenido para una plataforma de anuncios." },
          { role: "user", content: prompt }
        ],
        temperature: 0.4
      })
    });

    const result = await response.json();

    if (!result.choices || !result.choices.length) {
      console.error("❌ Respuesta vacía de OpenAI:", result);
      return { error: "La IA no entregó un resultado válido." };
    }

    const analysis = result.choices[0].message.content;
    return { analysis };

  } catch (error) {
    console.error("❌ Error en analyzeAd:", error);
    return { error: "No se pudo analizar el contenido del anuncio." };
  }
});
