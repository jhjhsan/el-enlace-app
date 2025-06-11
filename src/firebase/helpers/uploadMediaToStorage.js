import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export const uploadMediaToStorage = async (localUri, storagePath) => {
  try {
    const response = await fetch(localUri);
    const blob = await response.blob();

    const fileType = blob.type || 'application/octet-stream';
    const metadata = { contentType: fileType };

    const storage = getStorage();
    const fileRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(fileRef, blob, metadata);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        null,
        (error) => {
          console.error('❌ Error al subir:', error);
          reject(null);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  } catch (error) {
    console.error('❌ Error en uploadMediaToStorage:', error);
    return null;
  }
};
