// src/firebase/helpers/interpretSearchPhrase.js

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

const functions = getFunctions(getApp());

export const interpretSearchPhrase = async (phrase) => {
  try {
    const callable = httpsCallable(functions, 'interpretSearchPhrase');
    const result = await callable({ phrase });

    if (result.data?.error) {
      console.warn('⚠️ Error IA:', result.data.error);
      return null;
    }

    return result.data; // Esperado: { category, region, minAge, maxAge, keywords }
  } catch (err) {
    console.error('❌ Error al interpretar frase con IA:', err);
    return null;
  }
};
