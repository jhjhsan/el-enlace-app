import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

// Límite seguro para enviar inline en base64 (~10 MB request, 33% overhead)
const DOCX_MAX_INLINE_MB = 6.5;

export async function parseDocxToCasting() {
  try {
    // 1) Elegir DOCX
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      throw new Error('No se seleccionó un archivo .docx');
    }

    const file = result.assets[0];
    const fileUri = file.uri;
    const fileName = file.name || 'casting.docx';
    const fileSize = typeof file.size === 'number' ? file.size : 0;
    const mime = file.mimeType || '';

    // 2) Validaciones
    const isDocx =
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      /\.docx$/i.test(fileName);

    if (!isDocx) {
      throw new Error('El archivo debe ser .docx (Word).');
    }

    if (fileSize && fileSize > DOCX_MAX_INLINE_MB * 1024 * 1024) {
      throw new Error(
        `El archivo es grande (${(fileSize / (1024 * 1024)).toFixed(
          1
        )} MB). Súbelo a Storage y procesa por backend (evita base64 inline).`
      );
    }

    // 3) Leer como base64
    const fileBase64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 4) Llamar función de análisis (usa la región correcta de tu proyecto)
    const functions = getFunctions(getApp(), 'us-central1'); // <- ajusta si usas otra
    const analyzeDocx = httpsCallable(functions, 'analyzeCastingDocx');

    const response = await analyzeDocx({ content: fileBase64, filename: fileName });

    // 5) Tolerar formatos de respuesta
    const payload = response?.data;
    if (!payload) throw new Error('Respuesta vacía del servidor.');

    if (payload.success === false) {
      throw new Error(payload.error || 'Error desconocido en analyzeCastingDocx');
    }

    let parsed = payload.result ?? payload.parsed ?? payload;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        throw new Error('La función devolvió texto no-JSON.');
      }
    }

    // 6) Normalizar salida al mismo esquema que parseImageToCasting
    const safe = (v, d) => (v == null ? d : v);
    return {
      title: safe(parsed.title, ''),
      agencyName: safe(parsed.agencyName || parsed.producer, ''),
      location: safe(parsed.location, ''),
      modality: safe(parsed.modality, ''),
      description: safe(parsed.description, ''), // breve, NO transcripción cruda
      roles: Array.isArray(parsed.roles) ? parsed.roles : [],
      budgets: Array.isArray(parsed.budgets) ? parsed.budgets : [],
      dates: safe(parsed.dates, {}),
      exclusivity: safe(parsed.exclusivity, ''),
      rights: safe(parsed.rights, ''),
      self_tape: safe(parsed.self_tape, {}),
      restrictions: Array.isArray(parsed.restrictions) ? parsed.restrictions : [],
      structuredPayment: parsed.structuredPayment || null,
      __structured: parsed.__structured || null,
    };
  } catch (error) {
    console.error('❌ Error al analizar el .docx:', error);
    return null;
  }
}
