import * as FileSystem from 'expo-file-system';

export const convertImageToBase64 = async (localImagePath) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(localImagePath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Error al convertir imagen a base64:', error);
    return '';
  }
};
