import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';

/**
 * Valida una imagen mediante IA para detectar contenido ofensivo
 * @param {string} imageUrl - URL pública de la imagen
 * @returns {Promise<{ valid: boolean, categories: object }>}
 */
export const validateImageWithIA = async (imageUrl) => {
  try {
    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('https://')) {
      console.warn('⚠️ URL de imagen inválida al validar IA:', imageUrl);
      return { valid: true }; // No bloquea si falla
    }

    const validateMedia = httpsCallable(functions, 'validateMediaContent');
    const result = await validateMedia({ imageUrl });

    // Solo en modo desarrollo muestra alerta
    if (__DEV__) {
      alert('✅ Validación IA completada.\n' + JSON.stringify(result.data?.categories || {}, null, 2));
    }

    return {
      valid: !result.data?.flagged,
      categories: result.data?.categories || {},
    };
  } catch (error) {
    console.error('❌ Error al validar imagen con IA:', error);
    return { valid: true }; // No bloquea si falla
  }
};
