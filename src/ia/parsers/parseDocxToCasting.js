import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

export async function parseDocxToCasting() {
  try {
    // Elegir documento .docx
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      throw new Error('No se seleccionó un archivo válido');
    }

    const fileUri = result.assets[0].uri;

    // Leer archivo como base64
    const fileBase64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Llamar función de Firebase
    const functions = getFunctions(getApp());
    const analyzeDocx = httpsCallable(functions, 'analyzeCastingDocx');

    const response = await analyzeDocx({ content: fileBase64 });

    if (!response.data.success) throw new Error(response.data.error);

    const parsed = JSON.parse(response.data.result);

    return parsed;
  } catch (error) {
    console.error('❌ Error al analizar el .docx:', error);
    return null;
  }
}
