import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig';

export const uploadMediaToStorage = async (localUri, path) => {
  console.log('📥 URI enviada a Firebase:', localUri);
  console.log('📤 Path Firebase Storage:', path);

  try {
    if (!localUri || !localUri.startsWith('file://')) {
      throw new Error('URI inválida o vacía');
    }

    // ⚡ Reemplaza XMLHttpRequest por fetch (más rápido en APK real)
    const blob = await fetch(localUri).then((res) => res.blob());

    const storageRef = ref(storage, path);
    const uploadResult = await uploadBytes(storageRef, blob);
    console.log('✅ Resultado de uploadBytes:', uploadResult);

    const downloadURL = await getDownloadURL(storageRef);
    console.log('🔗 URL del archivo subido:', downloadURL);
    return downloadURL;

  } catch (error) {
    console.error('❌ Error al subir archivo:', error);
    return null;
  }
};
