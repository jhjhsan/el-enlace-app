// src/firebase/notificationsUnread.js
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

const db = getFirestore();

/** Lee el valor guardado localmente (sin romper si no existe) */
async function getStoredUnread() {
  try {
    const raw = await AsyncStorage.getItem('notifications_unread');
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Setea el badge del ícono en iOS/Android de forma segura */
export async function setAppBadge(unread) {
  try {
    const val = Math.max(0, Number(unread || 0));
    await Notifications.setBadgeCountAsync(val);
  } catch {
    // silencioso
  }
}

/** Obtiene el contador REAL desde Firestore.
 *  Si no hay uid o falla, NO devolvemos 0 “duro”; devolvemos el guardado. */
export async function getUnreadCount(uid) {
  try {
    if (!uid) return await getStoredUnread();
    const q = query(collection(db, 'users', uid, 'notifications'), where('seen', '==', false));
    const snap = await getDocs(q);
    return snap.size || 0;
  } catch {
    // si falla, devolvemos lo que tengamos en cache para no hacer flicker a 0
    return await getStoredUnread();
  }
}

/** Marca TODAS como vistas en Firestore (no se usa en el arranque) */
export async function markAllAsSeen(uid) {
  if (!uid) return 0;
  const q = query(collection(db, 'users', uid, 'notifications'), where('seen', '==', false));
  const snap = await getDocs(q);
  if (snap.empty) return 0;

  const batch = writeBatch(db);
  snap.forEach((d) => batch.update(d.ref, { seen: true, seenAt: serverTimestamp() }));
  await batch.commit();
  return snap.size;
}

/** Guarda en cache local + emite evento */
export async function syncLocalUnread(unread) {
  const val = Math.max(0, Number(unread || 0));
  try {
    await AsyncStorage.setItem('notifications_unread', String(val));
  } catch {}
  DeviceEventEmitter.emit('unread-updated', val);
}

/** Helper completo con ANTI-FLICKER:
 *  - Si no hay uid, NO pisamos con 0: usamos el valor local.
 *  - Si el valor nuevo == valor local, no emitimos de nuevo.
 */
export async function refreshUnreadEverywhere(uid) {
  const prev = await getStoredUnread();
  const fresh = await getUnreadCount(uid); // ya viene protegido
  if (fresh === prev) return fresh;

  await setAppBadge(fresh);
  await syncLocalUnread(fresh); // esto emite 'unread-updated'
  return fresh;
}
