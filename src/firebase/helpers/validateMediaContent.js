import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';

/**
 * Valida una imagen mediante IA para detectar contenido ofensivo.
 * Acepta URL pública o base64.
 * @param {string} input - URL pública o base64 string
 * @returns {Promise<{ valid: boolean, categories: object }>}
 */
export const validateImageWithIA = async (input) => {
  
  if (!input || typeof input !== 'string' || input.trim() === '') {
  console.warn('🚫 Entrada vacía o inválida en validateImageWithIA:', input);
  return { valid: true, categories: {} };
}

  try {
    if (!input || typeof input !== 'string') {
      console.warn('🚫 Entrada inválida en validateImageWithIA:', input);
      return { valid: true, categories: {} }; // ✅ No bloquear si viene vacío
    }

    const validateMedia = httpsCallable(functions, 'validateMediaContent');

    const payload = input.startsWith('https://')
      ? { imageUrl: input }
      : { base64Image: input };

    const result = await validateMedia(payload);

    if (__DEV__) {
      console.log('🧪 Resultado validación IA:', result.data);
    }

    return {
      valid: !result.data?.flagged,
      categories: result.data?.categories || {},
    };
  } catch (error) {
    console.error('❌ Error al validar imagen con IA:', error?.message || error);
    return { valid: true, categories: {} }; // ✅ No bloquear si falla
  }
};
