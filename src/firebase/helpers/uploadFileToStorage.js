import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';

/**
 * Sube un archivo a Firebase Storage y devuelve la URL pública
 * @param {string} localUri - Ruta local del archivo
 * @param {string} storagePath - Ruta en Storage (ej: 'reportes/user@example.com/postulaciones.pdf')
 * @returns {Promise<string|null>}
 */
export const uploadFileToStorage = async (localUri, storagePath) => {
  try {
    const fileData = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const storage = getStorage();
    const fileRef = ref(storage, storagePath);

    const blob = Buffer.from(fileData, 'base64');
    await uploadBytes(fileRef, blob);

    const downloadURL = await getDownloadURL(fileRef);
    return downloadURL;
  } catch (error) {
    console.error('❌ Error al subir archivo a Firebase Storage:', error);
    return null;
  }
};
