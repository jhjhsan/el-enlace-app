// src/firebase/helpers/analyzeAdContent.js
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";

export const analyzeAdContent = async (adData) => {
  try {
    const functions = getFunctions(getApp());
    const analyzeAd = httpsCallable(functions, 'analyzeAd');
    const response = await analyzeAd(adData);
    return response.data;
  } catch (error) {
    console.error("❌ Error al analizar el contenido del anuncio:", error);
    return { error: "No se pudo analizar el contenido del anuncio." };
  }
};
