const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

// 👇 MARCADOR PARA LOGS (debe aparecer sí o sí si esta versión despliega)
console.log('=== SERVICE FN vFINAL-aug10 ===');

// normaliza la clave donde el cliente escucha notifications/{email}/items
const normalizeEmail = (e) =>
  (e || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    //         ↓↓↓ guion escapado correctamente (o podrías dejar el guion al final)
    .replace(/[^a-z0-9@._+\-]/gi, '')
    .replace(/@{2,}/g, '@');

// chunk para no superar 500 escrituras
const chunk = (arr, size = 450) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

exports.sendServicePushNotifications = functions.firestore
  .document('services/{serviceId}')
  .onCreate(async (snap, context) => {
    try {
      const serviceData = snap.data() || {};
      const serviceId = context.params.serviceId;

      const title = (serviceData.title || 'Sin título').toString();
      const description = (serviceData.description || '').toString();

      // excluir al creador (normalizado)
      const creatorEmailLower =
        normalizeEmail(
          serviceData?.creatorEmailLower ||
          serviceData?.creatorEmail ||
          ''
        ) || null;

      // 👈 incluye profilesFree
      const profileCollections = ['profiles', 'profilesFree', 'profilesPro', 'profilesElite'];

      // fanout a TODOS (sin filtros)
      const recipientKeys = new Set();
      const tokensByKey = new Map();

      for (const colName of profileCollections) {
        const snapshot = await db.collection(colName).get();
snapshot.forEach((docSnap) => {
  const user = docSnap.data() || {};
  // SIEMPRE por email, jamás por docId
  const raw =
    user.emailLower ||
    user.email ||
    user.mail ||
    user.contactEmail ||
    '';

  const key = normalizeEmail(raw);

  // Si no parece email (sin @), NO lo uses
  if (!key || !key.includes('@')) return;

  // (opcional) excluir al creador:
  // if (creatorEmailLower && key === creatorEmailLower) return;

  recipientKeys.add(key);
  if (user.expoPushToken) tokensByKey.set(key, user.expoPushToken);
});
      }

      if (recipientKeys.size === 0) {
        console.log('🔕 No hay destinatarios.');
        return { success: false, message: 'No recipients' };
      }

      const notifTitle = `🛠️ Nuevo servicio: ${title}`;
      const bodyText = description.length > 60 ? description.substring(0, 57) + '…' : description;
      const nowServerTs = admin.firestore.FieldValue.serverTimestamp();

      // PUSH opcional (solo a quien tenga token)
      let pushSent = 0;
      for (const key of recipientKeys) {
        const token = tokensByKey.get(key);
        if (!token) continue;

        const message = {
          token,
          notification: { title: notifTitle, body: bodyText },
          data: { type: 'servicio', serviceId },
          android: { priority: 'high', notification: { sound: 'default', channelId: 'default' } },
          apns: { payload: { aps: { sound: 'default', contentAvailable: true } } },
        };

        try {
          await messaging.send(message);
          pushSent++;
        } catch (e) {
          console.warn(`❌ Error enviando a ${key}:`, e.message);
        }
      }
      console.log(`📤 Push enviados: ${pushSent} / ${recipientKeys.size}`);

      // TARJETAS en Firestore (chunks)
      const recipients = Array.from(recipientKeys);
      const chunks = chunk(recipients, 450);
      let written = 0;

for (const slice of chunks) {
  const batch = db.batch();
  const createdAtMs = Date.now(); // para orden estable en el cliente

  slice.forEach((key) => {
    const ref = db.collection('notifications').doc(key).collection('items').doc();
    batch.set(ref, {
      id: ref.id,                 // <-- tu UI lo espera
      recipient: key,
      type: 'servicio',
      title: notifTitle,
      body: bodyText,             // como casting
      message: bodyText,          // <-- espejo (tu UI a veces lee 'message')
      timestamp: nowServerTs,     // serverTimestamp
      createdAtMs,                // <-- ms plano para ordenar en cliente
      serviceId,
      read: false,
      sender: 'sistema',
      creatorEmailLower,
    });
  });

  await batch.commit();
  written += slice.length;
}

      console.log('📝 Notificaciones guardadas en Firestore:', written);
      return { success: true, sentPush: pushSent, savedDocs: written };
    } catch (error) {
      console.error('❌ Error en sendServicePushNotifications:', error);
      return { success: false, error: error.message };
    }
  });
