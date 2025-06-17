import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

export async function parseImageToCasting() {
  try {
    // Elegir imagen
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 1,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]?.base64) {
      throw new Error('No se seleccionó una imagen válida');
    }

    const base64 = result.assets[0].base64;

    // Llamar función de Firebase
    const functions = getFunctions(getApp());
    const analyzeImage = httpsCallable(functions, 'analyzeCastingImage'); // función que haremos en backend

    const response = await analyzeImage({ imageBase64: base64 });

    if (!response.data.success) throw new Error(response.data.error);

    const parsed = JSON.parse(response.data.result);
    return parsed;
  } catch (error) {
    console.error('❌ Error al analizar imagen:', error);
    return null;
  }
}
