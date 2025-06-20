const functions = require("firebase-functions");
const fetch = require("node-fetch");

const OPENAI_API_KEY = functions.config().openai.key;

exports.validateMediaContent = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    const { base64Image } = data;

    if (!base64Image) {
      return { error: "No se recibió imagen." };
    }

    try {
      const response = await fetch("https://api.openai.com/v1/moderations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ input: base64Image })
      });

      const result = await response.json();

      const flagged = result.results[0].flagged;
      const categories = result.results[0].categories;

      return { flagged, categories };

    } catch (error) {
      console.error("❌ Error en validateMediaContent:", error);
      return { error: "No se pudo analizar el contenido de la imagen." };
    }
  });
