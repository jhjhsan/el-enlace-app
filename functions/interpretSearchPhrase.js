const functions = require("firebase-functions");
const { initializeApp, getApps } = require("firebase-admin/app");
const fetch = require("node-fetch");

// Inicializa Firebase Admin solo si no está activo
if (!getApps().length) {
  initializeApp();
}

// Clave segura desde Firebase config
const OPENAI_API_KEY = functions.config().openai.key;

exports.interpretSearchPhrase = functions.https.onCall(async (data, context) => {
  const phrase = data.phrase;

  if (!phrase || phrase.trim() === "") {
    return { error: "Frase vacía. Ingresa una descripción para buscar perfiles." };
  }

  const prompt = `
Eres un asistente experto en seleccionar talentos audiovisuales en LATAM.

Dada esta frase de búsqueda del usuario:

"${phrase}"

Extrae la información estructurada en formato JSON con estas claves si están presentes:

{
  "category": "Modelo publicitario",
  "region": "Región Metropolitana",
  "city": "Santiago",
  "gender": "Femenino",
  "age": 25
}

Incluye solo las claves que puedas inferir claramente. No inventes datos si no aparecen.
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
          { role: "system", content: "Tu tarea es convertir frases en filtros estructurados para búsqueda de talentos." },
          { role: "user", content: prompt }
        ],
        temperature: 0.4
      })
    });

    const result = await response.json();

    if (!result.choices || !result.choices.length) {
      return { error: "La IA no respondió." };
    }

    const responseText = result.choices[0].message.content;

    try {
      const parsed = JSON.parse(responseText);
      return { result: parsed };
    } catch (err) {
      console.error("❌ JSON inválido de OpenAI:", responseText);
      return { error: "La respuesta de la IA no es un JSON válido." };
    }

  } catch (error) {
    console.error("❌ Error interpretando frase IA:", error);
    return { error: "No se pudo interpretar la frase." };
  }
});
