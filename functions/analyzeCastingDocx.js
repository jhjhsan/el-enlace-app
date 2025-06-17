const functions = require('firebase-functions');
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

/**
 * Función callable desde el frontend que analiza texto de un .docx
 */
exports.analyzeCastingDocx = functions.https.onCall(async (data, context) => {
  try {
    const { content } = data;

    if (!content) throw new Error('No se recibió contenido');

    const systemPrompt = `
Eres un asistente experto en casting. Vas a recibir el contenido textual de un documento .docx.
Extrae y responde con un JSON con los siguientes campos:
- title
- description
- category
- payment
- agencyName
- deadline (formato YYYY-MM-DD)
- modality
- location

Si algún campo no aparece, colócalo como null.
`;

    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content },
      ],
    });

    return {
      success: true,
      result: completion.data.choices[0].message.content,
    };
  } catch (error) {
    console.error('❌ Error en analyzeCastingDocx:', error);
    return {
      success: false,
      error: error.message,
    };
  }
});
