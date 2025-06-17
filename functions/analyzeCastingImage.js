const functions = require('firebase-functions');
const vision = require('@google-cloud/vision');
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Cliente OCR de Google Cloud Vision
const client = new vision.ImageAnnotatorClient();

exports.analyzeCastingImage = functions.https.onCall(async (data, context) => {
  try {
    const { imageBase64 } = data;
    if (!imageBase64) throw new Error('No se recibió imagen.');

    // Paso 1: Extraer texto con OCR
    const [result] = await client.textDetection({
      image: { content: Buffer.from(imageBase64, 'base64') },
    });

    const detections = result.textAnnotations;
    if (!detections || detections.length === 0) {
      throw new Error('No se encontró texto en la imagen.');
    }

    const extractedText = detections[0].description;

    // Paso 2: Enviar texto a GPT
    const systemPrompt = `
Eres un asistente experto en casting. Vas a recibir texto extraído de una imagen. Devuelve un JSON con:
- title
- description
- category
- payment
- agencyName
- deadline (YYYY-MM-DD)
- modality
- location

Si falta algo, usa null.
`;

    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: extractedText },
      ],
    });

    return {
      success: true,
      result: completion.data.choices[0].message.content,
    };
  } catch (error) {
    console.error('❌ Error en analyzeCastingImage:', error);
    return {
      success: false,
      error: error.message,
    };
  }
});
