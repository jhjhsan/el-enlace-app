// utils/exportUtils.js
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as MailComposer from 'expo-mail-composer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../src/firebase/firebaseConfig';
import { Platform } from 'react-native';

/* =========================================================
   CONFIG – ENLACES INTELIGENTES (Universal/App Links + Fallback)
   ========================================================= */
const PUBLIC_BASE = 'https://enlace.app';
const INCLUDE_QR  = false;

const landingUrl = (id, params = {}) => {
  const q = new URLSearchParams({ src: 'pdf', ...params }).toString();
  return `${PUBLIC_BASE}/t/${encodeURIComponent(id)}${q ? `?${q}` : ''}`;
};
const videoUrl = (id, params = {}) => `${landingUrl(id, params)}#video`;
const bookUrl  = (id, params = {}) => `${landingUrl(id, params)}#book`;
const reelUrl  = (id, params = {}) => `${landingUrl(id, params)}#reel`;

// --- Excel/CSV (ES) ---
const CSV_SEP = ';';          // Excel en español usa ; como separador de columnas
const EXCEL_ARG_SEP = ';';    // Separador de argumentos en fórmulas de Excel ES
const HYPERLINK_FN = 'HYPERLINK'; // Excel suele aceptar el nombre en inglés; si no, usa 'HIPERVINCULO'

// ID robusto por perfil (prioridad id/uid/email)
const getTalentId = (p, fallback = '') =>
  p?.id || p?.uid || (p?.email ? p.email.trim().toLowerCase() : '') || fallback;

/* =========================================================
   HELPERS (escape, show, limpieza caché, upload, CSV, filename)
   ========================================================= */
const esc = (v) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const hasValue = (v) => {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.filter(Boolean).length > 0;
  const s = String(v).trim();
  return s !== '' && s !== '–' && s !== '-';
};

const show = (v) => {
  const s = (v ?? '').toString().trim();
  return s ? esc(s) : '';
};

async function cleanOldPrintCache() {
  try {
    const dir = FileSystem.cacheDirectory + 'Print/';
    const info = await FileSystem.getInfoAsync(dir);
    if (info.exists) {
      const files = await FileSystem.readDirectoryAsync(dir);
      await Promise.all(files.map((f) => FileSystem.deleteAsync(dir + f, { idempotent: true })));
    }
  } catch {}
}

function isHttpUrl(u) {
  return typeof u === 'string' && /^https?:\/\//i.test(u);
}

function sanitizeFilename(name) {
  return String(name ?? '')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_')
    .trim();
}

function guessContentType(fileName = '') {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'csv') return 'text/csv';
  if (ext === 'html') return 'text/html; charset=utf-8';
  return 'application/octet-stream';
}

/** Escapa celdas CSV (comas, comillas, saltos de línea) */
function csvCell(v, { isFormula = false } = {}) {
  const s = String(v ?? '');
  if (isFormula) return s; // no encerrar fórmulas entre comillas
  if (s.includes('"') || s.includes(CSV_SEP) || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Sube un archivo local a Firebase Storage evitando warnings.
 * - file:// → intenta base64 (rápido y fiable)
 * - content:// → sube por Blob (fetch)
 * Retorna la downloadURL.
 */
async function uploadFileToFirebase(localUri, fileName) {
  const contentType = guessContentType(fileName);
  const storageRef = ref(storage, `exports/${fileName}`);
  const isFileScheme = typeof localUri === 'string' && localUri.startsWith('file://');

  // 1) file:// → base64
  if (isFileScheme) {
    try {
      const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
      await uploadString(storageRef, base64, 'base64', { contentType });
      return await getDownloadURL(storageRef);
    } catch (_ignore) {
      // cae a Blob sin spamear consola
    }
  }

  // 2) content:// o fallback → Blob
  const resp = await fetch(localUri);
  const blob = await resp.blob();
  await uploadBytes(storageRef, blob, { contentType });
  return await getDownloadURL(storageRef);
}

/* =========================================================
   BOOK – Galería HTML (todas las fotos)
   ========================================================= */
// HTML mínimo sin dependencias externas
function buildBookGalleryHtml(title, urls = []) {
  const safeTitle = esc(title);
  const items = (urls || []).map((u, i) =>
    `<a class="item" href="${esc(u)}" target="_blank" rel="noopener">
       <img loading="lazy" src="${esc(u)}" alt="Book ${i + 1}" />
     </a>`
  ).join('');
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Book — ${safeTitle}</title>
<style>
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#111;color:#fff}
  header{padding:12px 16px;font-weight:600;font-size:14px;background:#000;position:sticky;top:0}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;padding:12px}
  .item{display:block;background:#000;border-radius:10px;overflow:hidden;border:1px solid #222}
  .item img{width:100%;height:240px;object-fit:cover;display:block}
</style>
</head><body>
<header>Book — ${safeTitle}</header>
<div class="grid">${items}</div>
</body></html>`;
}

// Crea archivo HTML temporal y súbelo a Firebase (aprovecha uploadFileToFirebase con file://)
async function createAndUploadBookGallery(title, urls, fileStamp, id) {
  const html = buildBookGalleryHtml(title, urls);
  const fname = `book_${sanitizeFilename(id)}_${fileStamp}.html`;
  const tmp = FileSystem.cacheDirectory + fname;
  await FileSystem.writeAsStringAsync(tmp, html, { encoding: FileSystem.EncodingType.UTF8 });
  const url = await uploadFileToFirebase(tmp, fname);
  try { await FileSystem.deleteAsync(tmp, { idempotent: true }); } catch {}
  return url;
}

// Prepara perfiles: si hay >1 foto → genera galería y guarda _bookHref
async function withBookGalleries(profiles, fileStamp) {
  const out = [];
  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i] || {};
    const id = getTalentId(p, `talent_${i}`);
    const title = p.name || p.agencyName || `Perfil ${i + 1}`;
    const urls = Array.isArray(p.bookPhotos)
      ? p.bookPhotos.filter(u => typeof u === 'string' && /^https?:\/\//i.test(u))
      : [];
    let _bookHref = null;

    if (urls.length > 1) {
      _bookHref = await createAndUploadBookGallery(title, urls, fileStamp, id);
    } else if (urls.length === 1) {
      _bookHref = urls[0];
    }
    out.push({ ...p, _bookHref });
  }
  return out;
}

/* =========================================================
   PDF – HTML (sin “Ver Perfil”)
   ========================================================= */
function buildPDFHtmlFromProfiles(profiles, title) {
  const esc = (v) => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const has = (v) => {
    if (v === null || v === undefined) return false;
    if (Array.isArray(v)) return v.filter(Boolean).length > 0;
    const s = String(v).trim();
    return s !== '' && s !== '-' && s !== '–';
  };
  const seg = (k, v, min = 64) =>
    has(v) ? `<span class="seg"><span class="key" style="min-width:${min}px">${k}:</span> ${esc(v)}</span>` : '';
  const onlyDigits = (s='') => (s.match(/\d+/g) || []).join('');
  const igHandle = (ig='') => ig.toString().replace(/^@/, '').trim();

  const rows = profiles.map((p, i) => {
    const id = p.id || p.uid || (p.email ? p.email.trim().toLowerCase() : `talent_${i}`);
    const name = p.name || p.agencyName || 'Sin nombre';

    // contacto
    const email = p.email || '';
    const phone = p.phone || p.phoneNumber || p.telefono || '';
    const phoneDigits = onlyDigits(phone);
    const ig = igHandle(p.instagram || '');

    // foto + check
    const photo = (p.profilePhoto && /^https?:\/\//.test(p.profilePhoto))
      ? `<img class="avatar" src="${esc(p.profilePhoto)}" />`
      : '<div class="avatar ph">👤</div>';

    // materiales
    const videoDirect = has(p.profileVideo) ? p.profileVideo : null;
    const reelDirect  = p.reelActoral || p.actorReel || p.reel || null;

    const videoHref = videoDirect || videoUrl(id);
    const bookHref  = (p._bookHref)
      || (Array.isArray(p.bookPhotos) && p.bookPhotos.filter(Boolean).length ? p.bookPhotos[0] : null)
      || bookUrl(id);
    const reelHref  = reelDirect  || reelUrl(id);

    // Col 1
    const col1 = [
      `<span class="name">${esc(name)}</span>`,
      seg('Edad', p.age || p.edad, 54),
      seg('Estatura', p.estatura || p.height, 54),
      seg('Sexo', p.sexo || p.sex, 54),
      seg('Piel', p.skinColor || p.piel, 54),
      seg('Ojos', p.eyeColor || p.ojos, 54),
      seg('Cabello', p.hairColor || p.cabello, 54),
    ].filter(Boolean).join('');

    // Col 2
    const col2 = [
      seg('Etnia', p.ethnicity),
      seg('Tatuajes', p.tattoos),
      seg('Ubic. Tatuajes', p.tattoosLocation || p.tattoosUbicacion),
      seg('Piercing', p.piercings),
      seg('Polera', p.shirtSize || p.tallaPolera),
      seg('Pantalón', p.pantsSize || p.tallaPantalon),
      seg('Zapatos', p.shoeSize || p.tallaZapato),
    ].filter(Boolean).join('');

    // Col 3
    const cats = Array.isArray(p.categories) ? p.categories.join(', ')
               : Array.isArray(p.category)   ? p.category.join(', ')
               : (p.category || '');
    const col3 = [
      seg('Categorías', cats),
      seg('País', p.country || p.pais),
      seg('Región', p.region),
      seg('Comuna', p.comuna),
      seg('Ciudad', p.ciudad || p.city),
      seg('Dirección', p.address),
      seg('Correo', email),
    ].filter(Boolean).join('');

    // Col 4: SIN enlace “Perfil”
    const col4Items = [
      has(phone)       ? `<a class="vlink" href="tel:${esc(phoneDigits || phone)}"><i class="fas fa-phone" style="color:#111;"></i> ${esc(phone)}</a>` : '',
      has(phoneDigits) ? `<a class="vlink" href="https://wa.me/${esc(phoneDigits)}" target="_blank"><i class="fab fa-whatsapp" style="color:#25D366;"></i> WhatsApp</a>` : '',
      has(ig)          ? `<a class="vlink" href="https://instagram.com/${esc(ig)}" target="_blank"><i class="fab fa-instagram" style="color:#E4405F;"></i> ${esc(ig)}</a>` : '',
      `<a class="vlink" href="${esc(videoHref)}" target="_blank"><i class="fas fa-video" style="color:#E11D48;"></i> Video</a>`,
      bookHref ? `<a class="vlink" href="${esc(bookHref)}"  target="_blank"><i class="fas fa-camera" style="color:#111;"></i> Book</a>` : '',
      has(reelDirect)  ? `<a class="vlink" href="${esc(reelHref)}" target="_blank"><i class="fas fa-film" style="color:#6B7280;"></i> Reel</a>` : '',
    ].filter(Boolean).join('');

    return `
      <div class="card">
        <div class="left">
          <div class="check"></div>
          ${photo}
        </div>
        <div class="right">
          <div class="grid4">
            <div class="col col1">${col1}</div>
            <div class="col">${col2}</div>
            <div class="col">${col3}</div>
            <div class="col col4">${col4Items}</div>
          </div>
        </div>
      </div>`;
  }).join('');

  return `
  <html>
  <head>
    <meta charset="utf-8" />
    <!-- Font Awesome para iconos -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
      @page { size: A4; margin: 6mm; }
      body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; color:#111; margin:0; }
      .wrap { padding: 6px 8px 10px; }
      h1 { font-size: 13px; margin: 0 0 4px 0; }
      .sub { color:#666; font-size: 9px; margin: 0 0 8px 0; }

      .card { display:flex; gap:10px; border:1px solid #eee; border-radius:10px; padding:7px; margin-bottom:7px; }
      .left { width:112px; display:flex; align-items:center; gap:9px; }
      .check { width:14px; height:14px; border:1.25px solid #bbb; border-radius:3px; }
      .avatar { width:62px; height:62px; border-radius:10px; object-fit:cover; border:1px solid #eaeaea; }
      .avatar.ph { width:62px; height:62px; display:flex; align-items:center; justify-content:center; background:#f5f5f5; color:#777; border:1px solid #eaeaea; }

      .right { flex:1; min-width:0; }

      .grid4 { display:grid; grid-template-columns: 1.28fr 1fr 1.15fr 0.95fr; gap:5px 14px; align-items:start; }
      .col   { display:flex; flex-wrap:wrap; gap:3px 14px; align-content:flex-start; }
      .col1 .seg { width:100%; }

      .name { font-weight:700; font-size:12px; width:100%; }
      .seg  { white-space:nowrap; font-size:9.8px; color:#333; line-height:1.22; }
      .key  { display:inline-block; font-weight:600; color:#000; }

      .col4 { display:flex; flex-direction:column; gap:4px; align-items:flex-start; padding-top:2px; }
      .vlink { display:block; color:#0b65c2; text-decoration:none; font-size:9.8px; line-height:1.22; }
      .vlink i { font-size:11px; margin-right:6px; vertical-align:-1px; }
      .vlink:hover { text-decoration:underline; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>📥 Postulaciones — ${esc(title)}</h1>
      <p class="sub">Total: ${profiles.length}</p>
      ${rows}
    </div>
  </body>
  </html>`;
}

/* =========================================================
   CSV (Excel) – SIN columnas de “Perfil”
   ========================================================= */
function buildCSVFromProfiles(profiles, title) {
  const header = [
    'Nombre','Email','Teléfono','Instagram',
    'Edad','Sexo','Estatura','Piel','Ojos','Cabello','Etnia','Tatuajes','Ubic. Tatuajes','Piercing',
    'Polera','Pantalón','Zapatos','País','Región','Comuna','Ciudad','Dirección','Categorías',
    'Video (link)','Book (link)','Reel actoral (link)',
    'Video URL','Book URL','Reel URL'
  ];

  // helper para fórmula de hipervínculo con separador local
  const HLINK = (url, label) => `=${HYPERLINK_FN}("${url}"${EXCEL_ARG_SEP}"${label}")`;

  const rows = profiles.map((p, i) => {
    const id = getTalentId(p, `talent_${i}`);
    const ig = (p.instagram || '').toString().replace(/^@/, '');
    const catsArr = Array.isArray(p.categories) ? p.categories
                  : Array.isArray(p.category)   ? p.category
                  : (p.category ? [p.category] : []);
    const cats = catsArr.join(', ');

    const vUrlDef  = videoUrl(id);
    const bUrlDef  = bookUrl(id);
    const reelRaw  = p.reelActoral || p.reelActoral || p.actorReel || p.reel || '';
    const rUrlDef  = reelUrl(id);

    // Si existe galería (_bookHref), úsala
    const bookHref = p._bookHref
      || (Array.isArray(p.bookPhotos) ? (p.bookPhotos.find(u => /^https?:\/\//i.test(u)) || '') : '')
      || bUrlDef;

    // Fórmulas clicables (sin comillas externas)
    const videoFormula = hasValue(p.profileVideo) ? HLINK(vUrlDef, 'Ver Video') : '';
    const bookFormula  = bookHref ? HLINK(bookHref, 'Ver Book') : '';
    const reelFormula  = hasValue(reelRaw) ? HLINK(reelRaw || rUrlDef, 'Ver Reel') : '';

    const data = [
      p.name || p.agencyName || '',
      p.email || '',
      p.phone || p.phoneNumber || p.telefono || '',
      ig ? '@' + ig : '',
      p.age || p.edad || '',
      p.sexo || p.sex || '',
      p.estatura || p.height || '',
      p.skinColor || p.piel || '',
      p.eyeColor || p.ojos || '',
      p.hairColor || p.cabello || '',
      p.ethnicity || '',
      p.tattoos || '',
      p.tattoosLocation || p.tattoosUbicacion || '',
      p.piercings || '',
      p.shirtSize || p.tallaPolera || '',
      p.pantsSize || p.tallaPantalon || '',
      p.shoeSize || p.tallaZapato || '',
      p.country || p.pais || '',
      p.region || '',
      p.comuna || '',
      p.ciudad || p.city || '',
      p.address || '',
      cats,
      // 👇 fórmulas marcadas como isFormula:true para no poner comillas
      csvCell(videoFormula, { isFormula: true }),
      csvCell(bookFormula,  { isFormula: true }),
      csvCell(reelFormula,  { isFormula: true }),
      vUrlDef,
      bookHref,
      hasValue(reelRaw) ? (reelRaw || rUrlDef) : ''
    ];

    return data.map((x) => csvCell(x)).join(CSV_SEP);
  });

  const csv = [
    header.map((h) => csvCell(h)).join(CSV_SEP),
    ...rows
  ].join('\n');

  return { filename: `Postulaciones_${sanitizeFilename(title)}.csv`, content: csv };
}

/* =========================================================
   CARGA DE PERFILES (mejor perfil por email) – POR CASTING
   ========================================================= */
async function loadProfilesForCasting(castingId) {
  const appsRaw = await AsyncStorage.getItem('applications');
  const appsAll = appsRaw ? JSON.parse(appsRaw) : [];
  const apps = appsAll.filter((a) => a.castingId === castingId);
  if (!apps.length) throw new Error('No hay postulantes para este casting.');

  const wanted = new Set(
    apps.map((a) => (a.profile?.email || '').toLowerCase().trim()).filter(Boolean)
  );

  const [rawFree, rawPro, rawElite] = await Promise.all([
    AsyncStorage.getItem('allProfilesFree'),
    AsyncStorage.getItem('allProfiles'),       // Pro
    AsyncStorage.getItem('allProfilesElite'),
  ]);
  const free = rawFree ? JSON.parse(rawFree) : [];
  const pro = rawPro ? JSON.parse(rawPro) : [];
  const elite = rawElite ? JSON.parse(rawElite) : [];
  const rank = { free: 1, pro: 2, elite: 3 };

  const bestByEmail = {};
  [...free, ...pro, ...elite].forEach((p) => {
    const k = (p.email || '').toLowerCase().trim();
    if (!wanted.has(k)) return;
    const cur = bestByEmail[k];
    if (!cur || (rank[p.membershipType] || 0) > (rank[cur.membershipType] || 0)) {
      bestByEmail[k] = p;
    }
  });

  const profiles = apps
    .map((a) => bestByEmail[(a.profile?.email || '').toLowerCase().trim()])
    .filter(Boolean);

  const effectiveTitle = apps[0]?.castingTitle || 'Casting';
  return { profiles, effectiveTitle };
}

/* =========================================================
   NORMALIZAR lista de postulaciones SUELTAS (seleccionados)
   ========================================================= */
function normalizePostulationsToProfiles(rawList = []) {
  const safeArr = Array.isArray(rawList) ? rawList : [];
  return safeArr.map((p, i) => ({
    id: p.id || p.uid || (p.email ? p.email.trim().toLowerCase() : `sel_${i}`),
    name: p.name || p.agencyName || '',
    email: p.email || '',
    phone: p.phone || p.phoneNumber || p.telefono || '',
    instagram: p.instagram || '',
    age: p.age || p.edad || '',
    sexo: p.sexo || p.sex || '',
    estatura: p.estatura || p.height || '',
    skinColor: p.skinColor || p.piel || '',
    eyeColor: p.eyeColor || p.ojos || '',
    hairColor: p.hairColor || p.cabello || '',
    ethnicity: p.ethnicity || '',
    tattoos: p.tattoos || '',
    tattoosLocation: p.tattoosLocation || p.tattoosUbicacion || '',
    piercings: p.piercings || '',
    shirtSize: p.shirtSize || p.tallaPolera || '',
    pantsSize: p.pantsSize || p.tallaPantalon || '',
    shoeSize: p.shoeSize || p.tallaZapato || '',
    country: p.country || p.pais || '',
    region: p.region || '',
    comuna: p.comuna || '',
    ciudad: p.ciudad || p.city || '',
    address: p.address || '',
    categories: Array.isArray(p.category) ? p.category : (p.categories || []),
    profilePhoto: p.profilePhoto || '',
    profileVideo: p.profileVideo || '',
    bookPhotos: Array.isArray(p.bookPhotos) ? p.bookPhotos : [],
    reelActoral: p.reelActoral || p.reelActoral || p.actorReel || p.reel || '',
  }));
}

/* =========================================================
   UTILES DE ESTADO PARA BOTONES ("Exportando…")
   ========================================================= */
export const EXPORT_STATUS = {
  START: 'start',
  DONE: 'done',
  ERROR: 'error',
};
function signal(onStatus, type, phase) {
  try {
    if (typeof onStatus === 'function') onStatus(type, phase);
  } catch {}
}

/* =========================================================
   EXPORTAR PDF – POR CASTING (sin modal propio) + onStatus
   ========================================================= */
export async function exportApplicationsToPDF(castingId, castingTitle = '', opts = {}) {
  const { onStatus } = opts;
  try {
    signal(onStatus, 'pdf', EXPORT_STATUS.START);
    await cleanOldPrintCache();

    const { profiles, effectiveTitle: fallbackTitle } = await loadProfilesForCasting(castingId);
    const effectiveTitle = castingTitle || fallbackTitle;

    // Prepara Book galleries (si aplica)
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const profilesReady = await withBookGalleries(profiles, stamp);

    const html = buildPDFHtmlFromProfiles(profilesReady, effectiveTitle);
    const { uri } = await Print.printToFileAsync({ html, base64: false });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${sanitizeFilename(effectiveTitle)}_${timestamp}.pdf`;

    if (Platform.OS === 'ios') {
      await Sharing.shareAsync(uri);
      try { await uploadFileToFirebase(uri, fileName); } catch {}
    } else {
      const target = FileSystem.documentDirectory + fileName;
      try {
        const info = await FileSystem.getInfoAsync(target);
        if (info.exists) await FileSystem.deleteAsync(target, { idempotent: true });
        await FileSystem.copyAsync({ from: uri, to: target });
        await Sharing.shareAsync(target);
        try { await uploadFileToFirebase(target, fileName); } catch {}
      } catch {
        await Sharing.shareAsync(uri);
        try { await uploadFileToFirebase(uri, fileName); } catch {}
      }
    }

    signal(onStatus, 'pdf', EXPORT_STATUS.DONE);
  } catch (e) {
    console.error('Error al exportar PDF (perfiles):', e);
    signal(onStatus, 'pdf', EXPORT_STATUS.ERROR);
    throw e;
  }
}

/* =========================================================
   ENVIAR PDF POR CORREO – POR CASTING (opcional)
   ========================================================= */
export async function sendPDFByEmail(castingId, castingTitle = '', opts = {}) {
  const { onStatus } = opts;
  try {
    signal(onStatus, 'email_pdf', EXPORT_STATUS.START);

    const { profiles, effectiveTitle: fallbackTitle } = await loadProfilesForCasting(castingId);
    const effectiveTitle = castingTitle || fallbackTitle;

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const profilesReady = await withBookGalleries(profiles, stamp);

    const html = buildPDFHtmlFromProfiles(profilesReady, effectiveTitle);
    const { uri } = await Print.printToFileAsync({ html, base64: false });

    const ok = await MailComposer.isAvailableAsync();
    if (!ok) {
      await Sharing.shareAsync(uri);
      signal(onStatus, 'email_pdf', EXPORT_STATUS.DONE);
      return;
    }

    await MailComposer.composeAsync({
      subject: `Postulaciones — ${effectiveTitle}`,
      body: 'Adjunto PDF con perfiles de postulantes.',
      attachments: [uri],
    });

    signal(onStatus, 'email_pdf', EXPORT_STATUS.DONE);
  } catch (e) {
    console.error('Error al enviar PDF por correo:', e);
    signal(onStatus, 'email_pdf', EXPORT_STATUS.ERROR);
    throw e;
  }
}

/* =========================================================
   EXPORTAR EXCEL (CSV) – POR CASTING (sin modal propio) + onStatus
   ========================================================= */
export async function exportApplicationsToExcel(castingId, castingTitle = '', opts = {}) {
  const { onStatus } = opts;
  try {
    signal(onStatus, 'excel', EXPORT_STATUS.START);

    const { profiles, effectiveTitle: fallbackTitle } = await loadProfilesForCasting(castingId);
    const effectiveTitle = castingTitle || fallbackTitle;

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const profilesReady = await withBookGalleries(profiles, stamp);

    const { filename, content } = buildCSVFromProfiles(profilesReady, effectiveTitle);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const finalName = `${sanitizeFilename(filename.replace(/\.csv$/i,''))}_${timestamp}.csv`;
    const target = FileSystem.documentDirectory + finalName;

    const contentWithBOM = '\uFEFF' + content; // UTF-8 BOM
await FileSystem.writeAsStringAsync(target, contentWithBOM, { encoding: FileSystem.EncodingType.UTF8 });

    await Sharing.shareAsync(target);
    await uploadFileToFirebase(target, finalName);

    signal(onStatus, 'excel', EXPORT_STATUS.DONE);
  } catch (e) {
    console.error('Error al exportar Excel (CSV):', e);
    signal(onStatus, 'excel', EXPORT_STATUS.ERROR);
    throw e;
  }
}

/* =========================================================
   ENVIAR EXCEL (CSV) POR CORREO – POR CASTING
   ========================================================= */
export async function sendExcelByEmail(castingId, castingTitle = '', opts = {}) {
  const { onStatus } = opts;
  try {
    signal(onStatus, 'email_excel', EXPORT_STATUS.START);

    const { profiles, effectiveTitle: fallbackTitle } = await loadProfilesForCasting(castingId);
    const effectiveTitle = castingTitle || fallbackTitle;

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const profilesReady = await withBookGalleries(profiles, stamp);

    const { filename, content } = buildCSVFromProfiles(profilesReady, effectiveTitle);
    const finalName = `${sanitizeFilename(filename)}`;

    const target = FileSystem.documentDirectory + finalName;
    const contentWithBOM = '\uFEFF' + content; // UTF-8 BOM
await FileSystem.writeAsStringAsync(target, contentWithBOM, { encoding: FileSystem.EncodingType.UTF8 });

    const ok = await MailComposer.isAvailableAsync();
    if (!ok) {
      await Sharing.shareAsync(target);
      signal(onStatus, 'email_excel', EXPORT_STATUS.DONE);
      return;
    }

    await MailComposer.composeAsync({
      subject: `Postulaciones (Excel) — ${effectiveTitle}`,
      body: 'Adjunto CSV con perfiles y enlaces a video, book y reel.',
      attachments: [target],
    });

    signal(onStatus, 'email_excel', EXPORT_STATUS.DONE);
  } catch (e) {
    console.error('Error al enviar Excel por correo:', e);
    signal(onStatus, 'email_excel', EXPORT_STATUS.ERROR);
    throw e;
  }
}

/* =========================================================
   EXPORTAR PDF/EXCEL – SOLO SELECCIONADOS (sin modal propio) + onStatus
   ========================================================= */
export async function exportSelectedToPDF(selectedPostulations = [], title = 'Seleccionados', opts = {}) {
  const { onStatus } = opts;
  try {
    signal(onStatus, 'pdf_selected', EXPORT_STATUS.START);
    await cleanOldPrintCache();

    const profiles = normalizePostulationsToProfiles(selectedPostulations);
    if (!profiles.length) throw new Error('No hay postulaciones seleccionadas.');

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const profilesReady = await withBookGalleries(profiles, stamp);

    const html = buildPDFHtmlFromProfiles(profilesReady, title);
    const { uri } = await Print.printToFileAsync({ html, base64: false });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${sanitizeFilename(title)}_${timestamp}.pdf`;

    if (Platform.OS === 'ios') {
      await Sharing.shareAsync(uri);
      try { await uploadFileToFirebase(uri, fileName); } catch {}
    } else {
      const target = FileSystem.documentDirectory + fileName;
      try {
        const info = await FileSystem.getInfoAsync(target);
        if (info.exists) await FileSystem.deleteAsync(target, { idempotent: true });
        await FileSystem.copyAsync({ from: uri, to: target });
        await Sharing.shareAsync(target);
        try { await uploadFileToFirebase(target, fileName); } catch {}
      } catch {
        await Sharing.shareAsync(uri);
        try { await uploadFileToFirebase(uri, fileName); } catch {}
      }
    }

    signal(onStatus, 'pdf_selected', EXPORT_STATUS.DONE);
  } catch (e) {
    console.error('Error al exportar PDF (seleccionados):', e);
    signal(onStatus, 'pdf_selected', EXPORT_STATUS.ERROR);
    throw e;
  }
}

export async function exportSelectedToExcel(selectedPostulations = [], title = 'Seleccionados', opts = {}) {
  const { onStatus } = opts;
  try {
    signal(onStatus, 'excel_selected', EXPORT_STATUS.START);

    const profiles = normalizePostulationsToProfiles(selectedPostulations);
    if (!profiles.length) throw new Error('No hay postulaciones seleccionadas.');

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const profilesReady = await withBookGalleries(profiles, stamp);

    const { filename, content } = buildCSVFromProfiles(profilesReady, title);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const finalName = `${sanitizeFilename(filename.replace(/\.csv$/i,''))}_${timestamp}.csv`;
    const target = FileSystem.documentDirectory + finalName;

   const contentWithBOM = '\uFEFF' + content; // UTF-8 BOM
await FileSystem.writeAsStringAsync(target, contentWithBOM, { encoding: FileSystem.EncodingType.UTF8 });

    await Sharing.shareAsync(target);
    await uploadFileToFirebase(target, finalName);

    signal(onStatus, 'excel_selected', EXPORT_STATUS.DONE);
  } catch (e) {
    console.error('Error al exportar Excel (seleccionados):', e);
    signal(onStatus, 'excel_selected', EXPORT_STATUS.ERROR);
    throw e;
  }
}
