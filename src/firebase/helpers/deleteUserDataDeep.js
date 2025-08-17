// src/firebase/helpers/deleteUserDataDeep.js
import {
  getFirestore,
  doc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { getApp } from 'firebase/app';
import {
  getStorage,
  ref,
  listAll,
  deleteObject,
} from 'firebase/storage';

// -------- utils --------
async function safeDeleteDoc(db, pathSegments) {
  try {
    const r = doc(db, ...pathSegments);
    await deleteDoc(r);
  } catch (e) {
    console.warn('safeDeleteDoc warn:', e?.message || e);
  }
}

async function deleteByQuery(q) {
  const snap = await getDocs(q);
  const ops = [];
  snap.forEach((d) => ops.push(deleteDoc(d.ref)));
  await Promise.allSettled(ops);
}

// Borra un objeto puntual (si existe)
async function deleteStorageObject(objectPath) {
  if (!objectPath) return;
  const storage = getStorage();
  const objRef = ref(storage, objectPath);
  try {
    await deleteObject(objRef);
  } catch (e) {
    console.warn('deleteStorageObject warn:', objectPath, e?.message || e);
  }
}

// Lista y borra solo objetos cuyo nombre (no path completo) comience con un prefijo
async function deleteOnlyUserObjects(folder, nameStartsWith) {
  const storage = getStorage();
  const folderRef = ref(storage, `${folder}/`);
  try {
    const all = await listAll(folderRef);
    const ops = [];
    all.items.forEach((itemRef) => {
      const baseName = itemRef.name || ''; // e.g., {email}_book1.jpg
      if (baseName.startsWith(nameStartsWith)) {
        ops.push(deleteObject(itemRef));
      }
    });
    // subcarpetas
    for (const sub of all.prefixes) {
      await deleteOnlyUserObjects(sub.fullPath, nameStartsWith);
    }
    await Promise.allSettled(ops);
  } catch (e) {
    console.warn('deleteOnlyUserObjects warn:', folder, e?.message || e);
  }
}

/**
 * Borrado profundo del usuario:
 * - Firestore:
 *   * Perfiles en profiles / profilesPro / profilesElite / profilesFree (docId = email normalizado)
 *   * Mensajes en "messages" (from == email) y (to == email)
 *   * Notificaciones en "notifications/{email}/items" + doc padre "notifications/{email}"
 *   * Castings/Servicios propios por owner/email
 * - Storage (según CompleteProfileScreen):
 *   * profile_photos/{email}_photo.jpg
 *   * book_photos/{email}_book*.jpg   (selectivo por prefijo)
 *   * profile_videos/{email}_video.mp4
 *   * temp_photos/{email}_temp_*.jpg  (selectivo por prefijo)
 *
 * @param {string} uid    // (no usado aquí)
 * @param {string} email  // email normalizado (lowercase + trim)
 */
export default async function deleteUserDataDeep(uid, email) {
  const db = getFirestore(getApp());
  const userEmail = String(email || '').trim().toLowerCase();

  // ---------- FIRESTORE ----------
  // Perfiles (docId == email)
  const profileCollections = ['profiles', 'profilesPro', 'profilesElite', 'profilesFree'];
  await Promise.allSettled(profileCollections.map((col) => safeDeleteDoc(db, [col, userEmail])));

  // Mensajes (colección correcta: "messages")
  await deleteByQuery(query(collection(db, 'messages'), where('from', '==', userEmail)));
  await deleteByQuery(query(collection(db, 'messages'), where('to', '==', userEmail)));

  // Notificaciones: notifications/{email}/items + doc padre
  try {
    const itemsCol = collection(db, 'notifications', userEmail, 'items');
    const itemsSnap = await getDocs(itemsCol);
    const delOps = [];
    itemsSnap.forEach((d) => delOps.push(deleteDoc(d.ref)));
    await Promise.allSettled(delOps);
  } catch (e) {
    console.warn('notifications delete warn:', e?.message || e);
  }
  await safeDeleteDoc(db, ['notifications', userEmail]);

  // Castings propios (ajusta el campo si usas otro)
  await deleteByQuery(query(collection(db, 'castings'), where('owner', '==', userEmail)));
  await deleteByQuery(query(collection(db, 'castings'), where('email', '==', userEmail)));

  // Servicios propios (ajusta el campo si usas otro)
  await deleteByQuery(query(collection(db, 'services'), where('owner', '==', userEmail)));
  await deleteByQuery(query(collection(db, 'services'), where('email', '==', userEmail)));

  // ---------- STORAGE ----------
  // Foto de perfil
  await deleteStorageObject(`profile_photos/${userEmail}_photo.jpg`);

  // Video de perfil
  await deleteStorageObject(`profile_videos/${userEmail}_video.mp4`);

  // Temp profile
  await deleteStorageObject(`temp_photos/${userEmail}_temp_profile.jpg`);

  // Book y temporales: eliminar SOLO archivos del usuario por prefijo
  await deleteOnlyUserObjects('book_photos', `${userEmail}_book`);
  await deleteOnlyUserObjects('temp_photos', `${userEmail}_temp_`);

  return true;
}
