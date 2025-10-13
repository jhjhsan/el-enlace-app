// utils/forceUpdate.js — REEMPLAZO COMPLETO
import { Linking, Platform } from 'react-native';
import * as Application from 'expo-application';

const PLAY_URL_INTENT = 'market://details?id=com.elenlace.app';
const PLAY_URL_WEB = 'https://play.google.com/store/apps/details?id=com.elenlace.app';

export function openStore() {
  const url = Platform.OS === 'android' ? PLAY_URL_INTENT : PLAY_URL_WEB;
  Linking.openURL(url).catch(() => Linking.openURL(PLAY_URL_WEB));
}

export function getCurrentVersion() {
  // versionName (ej. "1.0.3")
  const v = Application.nativeApplicationVersion || Application.applicationVersion || '0.0.0';
  return String(v);
}

export function getBuildCode() {
  // versionCode (ej. 168)
  const c = Number(Application.nativeBuildVersion ?? 0);
  return Number.isFinite(c) ? c : 0;
}

// Comparador simple "1.0.2" vs "1.0.3"
export function isOutdated(current, min) {
  const a = String(current).split('.').map(n => parseInt(n, 10) || 0);
  const b = String(min).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x < y) return true;
    if (x > y) return false;
  }
  return false;
}
