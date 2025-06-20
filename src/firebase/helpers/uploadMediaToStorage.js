import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig'; // ✅ Corrección
import * as FileSystem from 'expo-file-system'; // ← NECESARIO PARA APKS

/**
 * 📤 Sube un archivo de imagen o video a Firebase Storage (funciona en APK real)
 * @param {string} localUri - URI local del archivo (debe comenzar con file://)
 * @param {string} path - Ruta de destino en Firebase Storage
 * @returns {Promise<string|null>} - URL pública o null si falla
 */
export const uploadMediaToStorage = async (localUri, path) => {
  try {
    console.log('🧪 URI recibida en uploadMediaToStorage:', localUri);

    if (!localUri || !localUri.startsWith('file://')) {
      console.warn('⚠️ URI inválida:', localUri);
      return null;
    }

    // ✅ Convertir URI a blob con XMLHttpRequest (funciona en APK real)
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new TypeError('❌ Error al convertir URI a blob'));
      xhr.responseType = 'blob';
      xhr.open('GET', localUri, true);
      xhr.send();
    });

    const storage = getStorage();
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