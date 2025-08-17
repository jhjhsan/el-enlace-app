const functions = require('firebase-functions');
const vision = require('@google-cloud/vision');
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: functions.config().openai.key,
});
const openai = new OpenAIApi(configuration);

// OCR client
const client = new vision.ImageAnnotatorClient();

exports.analyzeCastingImage = functions.https.onCall(async (data, context) => {
  try {
    const { imageBase64 } = data;
    if (!imageBase64) throw new Error('No se recibió imagen.');

    // 1) OCR (layout-friendly)
    const [result] = await client.documentTextDetection({
      image: { content: Buffer.from(imageBase64, 'base64') },
    });

    const detections = result?.fullTextAnnotation?.text
      ? [{ description: result.fullTextAnnotation.text }]
      : result.textAnnotations;

    if (!detections || detections.length === 0) {
      throw new Error('No se encontró texto en la imagen.');
    }

    const extractedText = detections[0].description || '';
    const lowerText = extractedText.toLowerCase();

    // 2) Prompt (salida JSON estricta)
    const systemPrompt = `
Eres un asistente experto en castings. Recibirás el texto OCR de 1 o más imágenes.
Devuelve SOLO un JSON (sin backticks, sin explicaciones) que SIGA EXACTAMENTE este esquema:

{
  "title": "",
  "producer": "",
  "dates": { "callback": "", "wardrobe_shoot": "", "release": "" },
  "exclusivity": "",
  "rights": "",
  "budgets": [
    { "role": "protagonico|secundario|extra|ocp", "day": "", "buyout_moving": "", "buyout_print": "", "exclusivity_12m": "" }
  ],
  "roles": [
    { "roleTitle": "", "minAge": null, "maxAge": null, "gender": "masculino|femenino|ambos|null", "description": "" }
  ],
  "self_tape": { "presentation": "", "photo": "", "acting": "", "format": "" },
  "restrictions": [],
  "location": "",
  "modality": "presencial|online|hibrido|null",
  "deadline": "",
  "confidence_by_field": { "title": 0.0, "producer": 0.0, "budgets": 0.0 }
}

Reglas:
- Normaliza fechas a YYYY-MM-DD si es posible; si no, deja "".
- Normaliza montos en CLP: sólo dígitos (ej: "1400000").
- Extrae TODAS las viñetas/perfiles aunque estén separados.
- Si algo falta, usa "" o null según corresponda.
- Responde SOLO el JSON válido y limpio.
`;

    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: extractedText },
      ],
    });

    // 3) Sanitizar JSON de salida
    let raw = completion.data.choices[0]?.message?.content || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}$/);
    if (jsonMatch) raw = jsonMatch[0];

    let json;
    try {
      json = JSON.parse(raw);
      console.log('📦 JSON recibido:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.error('❌ JSON inválido:', raw);
      throw new Error('La respuesta de la IA no es un JSON válido.');
    }

    // 4) Validación mínima
    if (!json.roles || !Array.isArray(json.roles) || json.roles.length === 0) {
      console.error('⚠️ No se encontraron roles válidos en la respuesta de la IA.');
      throw new Error('No se detectaron roles en el casting.');
    }

    // 5) Post-procesado: fechas / montos
    const toISO = (s) => {
      if (!s || typeof s !== 'string') return '';
      const meses = { enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12 };
      const low = s.toLowerCase();

      // "30 o 31 de julio" -> 30 julio (aprox)
      let m = low.match(/(\d{1,2}).*de\s+([a-zá]+)/i);
      if (m && meses[m[2].normalize('NFD').replace(/\p{Diacritic}/gu,'')]) {
        const d = String(m[1]).padStart(2,'0');
        const month = String(meses[m[2].normalize('NFD').replace(/\p{Diacritic}/gu,'')]).padStart(2,'0');
        const year = (new Date()).getFullYear();
        return `${year}-${month}-${d}`;
      }

      // Ya viene ISO
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      return '';
    };

    if (json?.dates) {
      json.dates.callback = toISO(json.dates.callback || '');
      json.dates.wardrobe_shoot = toISO(json.dates.wardrobe_shoot || '');
      json.dates.release = toISO(json.dates.release || '');
    }

    const normNumber = (s) => (s ? String(s).replace(/[^\d]/g, '') : '');

    if (Array.isArray(json.budgets)) {
      json.budgets = json.budgets.map(b => ({
        role: b.role || '',
        day: normNumber(b.day),
        buyout_moving: normNumber(b.buyout_moving),
        buyout_print: normNumber(b.buyout_print),
        exclusivity_12m: normNumber(b.exclusivity_12m),
      }));
    }

    // 6) Extra: bloque de remuneración crudo (regexs tolerantes)
    let fullRemunerationBlock = '';
    const startIndex = lowerText.search(/(remuneraci[oó]n|pago|presupuesto|buyout|exclusividad)/i);
    if (startIndex !== -1) {
      fullRemunerationBlock = extractedText.slice(startIndex).trim();
    }

    const remunerationObject = { generalTerms: '', roles: [] };
    if (fullRemunerationBlock) {
      const lines = fullRemunerationBlock.split('\n').map(l => l.trim()).filter(Boolean);
      const generalLines = [];
      let current = null;

      const roleHeaderRe = /^(OC(?:\s*PROTAG[OÓ]NICO)?|PROTAG[OÓ]NICO|SECUNDARIO|EXTRA|FEAT\.?\s*EXTRA)/i;
      const kvRe = /(D[ÍI]A(?:\s*DE\s*TRAB.*)?|BUYOUT(?:\s+ALL\s+MOVING\s+MEDIA)?|BUYOUT\s*PRINT|EXCLUSIVIDAD(?:\s*12\s*m|.*)?):?\s*\$?\s*([\d\.\,]+)/i;

      for (const line of lines) {
        if (roleHeaderRe.test(line)) {
          if (current) remunerationObject.roles.push(current);
          current = { roleTitle: line.replace(/\s*:\s*$/, '').trim(), paymentDetails: {} };
          continue;
        }
        const m = line.match(kvRe);
        if (m && current) {
          const key = m[1]
            .toLowerCase()
            .replace(/\s+/g, '_')
            .normalize('NFD').replace(/\p{Diacritic}/gu,'');
          current.paymentDetails[key] = normNumber(m[2]);
        } else if (!current) {
          generalLines.push(line);
        }
      }
      if (current) remunerationObject.roles.push(current);
      remunerationObject.generalTerms = generalLines.join(' ');
    }

    // 7) Respuesta final
    return {
      success: true,
      result: {
        schemaVersion: '1.0',
        confidence: json?.confidence_by_field || {},
        ...json,
        rawText: extractedText,
        fullTextAnnotation: extractedText,
        textBlocks: extractedText.split('\n').map(text => ({ text })),
        structuredPayment: remunerationObject,
      },
    };

  } catch (error) {
    console.error('❌ Error en analyzeCastingImage:', error);
    return { success: false, error: error.message };
  }
});
