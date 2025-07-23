import * as VideoThumbnails from 'expo-video-thumbnails';
import { uploadMediaToStorage } from './uploadMediaToStorage';
import { validateImageWithIA } from './validateMediaContent'; // Corregida la importación
import * as FileSystem from 'expo-file-system';

/**
 * Valida un video local generando 3 thumbnails y detectando contenido ofensivo.
 * @param {string} localPath - Ruta local del video (file://...)
 * @returns {Promise<{ valid: boolean, categories: object }>}
 */
export const validateVideoWithIA = async (localPath) => {
  try {
    if (!localPath || typeof localPath !== 'string' || !localPath.startsWith('file://')) {
      console.warn('⚠️ Ruta local de video inválida:', localPath);
      return { valid: true, categories: {} };
    }

    // Obtener duración del video
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (!fileInfo.exists) {
      console.warn('⚠️ Video no existe:', localPath);
      return { valid: false, error: 'Video no encontrado' };
    }

    // Generar thumbnails en 25%, 50%, 75% de la duración
    const duration = await getVideoDuration(localPath);
    const times = [duration * 0.25, duration * 0.5, duration * 0.75].map(t => Math.floor(t * 1000));
    const email = 'jhjhsan@gmail.com'; // Ajusta según tu lógica
    const results = [];

    for (const [index, time] of times.entries()) {
      console.log(`📸 Generando thumbnail en ${time}ms...`);
      const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(localPath, { time });

      // Subir thumbnail a Firebase Storage
      const tempUrl = await uploadMediaToStorage(thumbnailUri, `temp_photos/${email}_temp_video_thumbnail${Date.now()}_${index}.jpg`);
      console.log('📤 Thumbnail subido:', tempUrl);

      // Validar thumbnail con IA
      const validation = await validateImageWithIA(tempUrl);
      console.log(`🧪 Validación IA [${time}ms]:`, validation);

      results.push(validation);
      if (!validation.valid) {
        console.warn(`🚫 Video rechazado por IA en frame ${time}ms`);
        return { valid: false, categories: validation.categories };
      }
    }

    // Combinar categorías de todos los thumbnails
    const combinedCategories = results.reduce((acc, r) => ({ ...acc, ...r.categories }), {});
    return { valid: true, categories: combinedCategories };
  } catch (error) {
    console.error('❌ Error al validar video con IA:', error);
    return { valid: false, error: `No se pudo validar el video: ${error.message}` };
  }
};

// Helper para obtener duración del video
async function getVideoDuration(uri) {
  try {
    const { duration } = await VideoThumbnails.getThumbnailAsync(uri, { time: 0 });
    return duration / 1000; // Convertir a segundos
  } catch (error) {
    console.warn('⚠️ No se pudo obtener duración, usando valor por defecto:', error);
    return 10; // Valor por defecto: 10 segundos
  }
}