// src/firebase/helpers/deleteTempImages.js
import { getStorage, ref, deleteObject } from 'firebase/storage';

export const deleteTempImages = async (email, max = 5) => {
  try {
    const storage = getStorage();
    const emailKey = email.toLowerCase().trim();

    for (let i = 1; i <= max; i++) {
      const tempRef = ref(storage, `temp_validation/${emailKey}_book_temp${i}.jpg`);
      await deleteObject(tempRef).catch(() => {}); // ignora si no existe
    }

    console.log('🧹 Temp images cleaned');
  } catch (error) {
    console.warn('⚠️ Error al borrar imágenes temporales:', error);
  }
};
