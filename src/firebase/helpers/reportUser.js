// src/firebase/helpers/reportUser.js
import AsyncStorage from '@react-native-async-storage/async-storage';
// Si luego decides usar Firestore: descomenta e indica la colección exacta
// import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
// import { getApp } from 'firebase/app';

/**
 * Envía un reporte de usuario.
 * Por ahora: guarda una copia local en AsyncStorage para la beta cerrada.
 * Cuando me digas qué colección usar en Firestore (p.ej. "reports"), habilitamos el write.
 */
export async function submitReport({ reporterEmail, targetEmail, targetType = 'profile', reason, context = {} }) {
  const when = new Date().toISOString();
  const payload = { reporterEmail, targetEmail, targetType, reason, context, createdAt: when };

  // 1) Guardar local (útil para QA en beta cerrada)
  try {
    const raw = await AsyncStorage.getItem('reports_local');
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(payload);
    await AsyncStorage.setItem('reports_local', JSON.stringify(list.slice(0, 1000)));
  } catch (e) {
    // noop
  }

  // 2) (TODO) Guardar en Firestore — dime tu colección y lo activo
  // try {
  //   const db = getFirestore(getApp());
  //   const col = collection(db, 'reports'); // <- DIME el nombre definitivo
  //   await addDoc(col, { ...payload, timestamp: serverTimestamp() });
  // } catch (e) {
  //   console.warn('submitReport Firestore warn:', e?.message || e);
  // }

  return true;
}
