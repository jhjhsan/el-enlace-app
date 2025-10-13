// src/firebase/helpers/createFocusDoc.js
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const normalizeEmail = (e) =>
  (typeof e === 'string' ? e : '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/@{2,}/g, '@');

export async function createFocusDoc(db, focus, user) {
  const authorEmail = user?.email || '';
  const authorEmailNormalized = normalizeEmail(authorEmail);
  const authorName =
    user?.name || user?.agencyName || user?.displayName || 'Usuario';

  const ref = doc(collection(db, 'focus'), String(focus.id));
  await setDoc(
    ref,
    {
      id: String(focus.id),
      title: focus.title || '',
      requirements: focus.requirements || '',
      dateTime: focus.dateTime || '',
      duration: focus.duration || '',
      payment: focus.payment || '',
      paymentMethod: focus.paymentMethod || '',
      whatsapp: focus.whatsapp || '',
      description: focus.description || '',
      authorEmail,
      authorEmailNormalized,
      authorName,
      createdAt: serverTimestamp(),
      createdAtMs: focus.createdAtMs || Date.now(),
    },
    { merge: true }
  );

  return { authorEmailNormalized, authorName };
}
