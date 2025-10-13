// src/firebase/helpers/createFocusNotifs.js
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { normalizeEmail } from './createFocusDoc';

// Crea docs en notifications/…/items, excluyendo al autor
export async function createFocusNotifs(db, {
  title,
  body,
  recipients = [],
  focusId,
  authorEmailNormalized,
  authorName,
}) {
  const now = serverTimestamp();
  const tasks = recipients
    .map((r) => ({ email: normalizeEmail(r?.email), expoPushToken: r?.expoPushToken || '' }))
    .filter((r) => r.email && r.email !== authorEmailNormalized)
    .map((r) =>
      addDoc(collection(db, 'notifications', r.email, 'items'), {
        type: 'focus',
        title: `Nuevo focus de: ${authorName}`, // 👈 título claro para la tarjeta
        message: body,
        body,
        read: false,
        createdAt: now,
        focusId,
        authorEmailNormalized,
        sender: authorEmailNormalized, // para los filtros actuales
        senderName: authorName,
      })
    );
  await Promise.all(tasks);
}

// Push a Expo, excluyendo al autor
export async function sendExpoPushBatch({ title, body, recipients = [], authorEmailNormalized }) {
  const tokens = recipients
    .map((r) => ({ email: normalizeEmail(r?.email), token: (r?.expoPushToken || '').trim() }))
    .filter((x) => x.email && x.email !== authorEmailNormalized && x.token.startsWith('ExponentPushToken['))
    .map((x) => x.token);

  if (tokens.length === 0) return;

  const chunkSize = 90;
  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize);
    const messages = chunk.map((to) => ({ to, sound: 'default', title, body, data: { type: 'focus' }, priority: 'high' }));
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Accept-encoding': 'gzip, deflate', 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
    } catch (err) {
      console.log('Expo push error:', err?.message || err);
    }
  }
}
