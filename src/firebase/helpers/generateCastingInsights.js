import { getCastingsFromFirestore } from './getCastingsFromFirestore';
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { saveSuggestionToFirestore } from './saveSuggestionToFirestore';

/**
 * Genera insights personalizados para agencias según sus castings.
 * @param {string} email - Email de la agencia.
 */
export const generateCastingInsights = async (email) => {
  try {
    const castings = await getCastingsFromFirestore(email);
    if (!castings || castings.length === 0) return;

    // 🔍 Preparar resumen para IA
    const resumen = castings.map((c) => ({
      titulo: c.title || 'Sin título',
      dias: c.diasDesdePublicacion || 0,
      postulaciones: c.postulaciones || 0,
      tieneImagen: c.tieneImagen ? 'sí' : 'no',
      tieneVideo: c.tieneVideo ? 'sí' : 'no',
      destacado: c.destacado ? 'sí' : 'no',
    }));

    const prompt = `
Eres un asesor experto en producción y casting. Analiza este resumen de castings publicados por una agencia y entrega sugerencias para mejorar sus publicaciones y atraer más postulaciones. Sé claro y directo.

Resumen:
${JSON.stringify(resumen, null, 2)}
`;

    const functions = getFunctions(getApp());
    const getSuggestion = httpsCallable(functions, 'generateSuggestions');

    const response = await getSuggestion({ prompt });
    const textoIA = response?.data?.text;

    if (textoIA) {
      await saveSuggestionToFirestore(email, textoIA, 'casting_insight');
      console.log('✅ Insight IA generado y guardado para:', email);
    } else {
      console.warn('⚠️ No se recibió texto de IA.');
    }
  } catch (error) {
    console.error('❌ Error generando insights IA para castings:', error);
  }
};
