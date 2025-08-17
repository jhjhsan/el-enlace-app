// src/firebase/helpers/blockUserLocal.js
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Estructura en AsyncStorage:
 * key: "blockedUsers"
 * value: {
 *   [blockerEmail]: string[]  // lista de emails bloqueados por esa persona
 * }
 */

const KEY = 'blockedUsers';

export async function isBlockedLocal(blockerEmail, blockedEmail) {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const map = raw ? JSON.parse(raw) : {};
    const list = Array.isArray(map?.[blockerEmail]) ? map[blockerEmail] : [];
    return list.includes(blockedEmail);
  } catch (_) {
    return false;
  }
}

export async function blockUserLocal(blockerEmail, blockedEmail) {
  const b = String(blockerEmail || '').trim().toLowerCase();
  const t = String(blockedEmail || '').trim().toLowerCase();
  if (!b || !t) return;
  const raw = await AsyncStorage.getItem(KEY);
  const map = raw ? JSON.parse(raw) : {};
  const list = Array.isArray(map[b]) ? map[b] : [];
  if (!list.includes(t)) list.push(t);
  map[b] = list;
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
  return true;
}

export async function unblockUserLocal(blockerEmail, blockedEmail) {
  const b = String(blockerEmail || '').trim().toLowerCase();
  const t = String(blockedEmail || '').trim().toLowerCase();
  if (!b || !t) return;
  const raw = await AsyncStorage.getItem(KEY);
  const map = raw ? JSON.parse(raw) : {};
  const list = Array.isArray(map[b]) ? map[b] : [];
  map[b] = list.filter((x) => x !== t);
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
  return true;
}
