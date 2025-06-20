import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig'; // ✅ Corrección
import * as FileSystem from 'expo-file-system'; // ← NECESARIO PARA APKS

/**
 * 📤 Sube un archivo de imagen o video a Firebase Storage
 * @param {string} localUri - URI local del archivo (debe empezar con file://)
 * @param {string} path - Ruta en Firebase Storage (ej: 'profile_photos/usuario.jpg')
 * @returns {Promise<string|null>} - URL pública o null si falla
 */
export const uploadMediaToStorage = async (localUri, path) => {
  try {
    console.log('🧪 URI recibida en uploadMediaToStorage:', localUri);

    if (!localUri || !localUri.startsWith('file://')) {
      console.warn('⚠️ URI inválida:', localUri);
      return null;
    }

    // ✅ Convierte el archivo local a blob (válido en APK)
    const fileInfo = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const blob = await fetch(`data:image/jpeg;base64,${fileInfo}`).then(res => res.blob());

    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);

    console.log('✅ Subida completa:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('❌ Error al subir a Firebase:', error);
    return null;
  }
};
