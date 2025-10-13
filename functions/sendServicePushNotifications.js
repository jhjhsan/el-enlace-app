const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const expo = new Expo();

const ICON_URL = "https://firebasestorage.googleapis.com/v0/b/elenlaceapp.firebasestorage.app/o/logo-banner.png?alt=media&token=c5865b54-d7a4-4fce-a967-0e2d85d2149a";
const normalizeEmail = (e) =>
  (e || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9@._+\-]/gi, '')
    .replace(/@{2,}/g, '@');

// hace chunks para no superar 500 escrituras en batch
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

      // excluir al creador
      const creatorEmailLower =
        normalizeEmail(
          serviceData?.creatorEmailLower ||
          serviceData?.creatorEmail ||
          ''
        ) || null;

      const profileCollections = ['profiles', 'profilesFree', 'profilesPro', 'profilesElite'];

      const recipientKeys = new Set();
      const tokensByKey = new Map();

      for (const colName of profileCollections) {
        const snapshot = await db.collection(colName).get();

        snapshot.forEach((docSnap) => {
          const user = docSnap.data() || {};
          const raw =
            user.emailLower ||
            user.email ||
            user.mail ||
            user.contactEmail ||
            '';

          const key = normalizeEmail(raw);
          if (!key || !key.includes('@')) return;

          // EXCLUIR SIEMPRE al creador del servicio
          if (creatorEmailLower && key === creatorEmailLower) return;

          const token = user.expoPushToken;
          if (!token || !Expo.isExpoPushToken(token)) return;

          recipientKeys.add(key);
          tokensByKey.set(key, token);
        });
      }

      if (recipientKeys.size === 0) {
        console.log('🔕 No hay destinatarios con Expo token válido.');
        return { success: false, message: 'No recipients' };
      }

      const notifTitle = `🛠️ Nuevo servicio: ${title}`;
      const bodyText = description.length > 60 ? description.substring(0, 57) + '…' : description;
      const nowServerTs = admin.firestore.FieldValue.serverTimestamp();

      // construir tarjetas + mensajes expo
      const expoMessages = [];
      const batchChunks = chunk(Array.from(recipientKeys), 450);
      let written = 0;

      for (const slice of batchChunks) {
        const batch = db.batch();
        const createdAtMs = Date.now();

        slice.forEach((key) => {
          // tarjeta
          const ref = db.collection('notifications').doc(key).collection('items').doc();
          batch.set(ref, {
            id: ref.id,
            recipient: key,
            type: 'servicio',
            title: notifTitle,
            body: bodyText,
            message: bodyText,     // espejo por compatibilidad
            timestamp: nowServerTs,
            createdAtMs,
            serviceId,
            read: false,
            sender: 'sistema',
            creatorEmailLower,
          });

          // push Expo
          const token = tokensByKey.get(key);
          if (token) {
            expoMessages.push({
              to: token,
              title: notifTitle,
              body: bodyText,
              data: { type: 'servicio', serviceId },
              sound: 'default',
              priority: 'high',
              channelId: 'messages',
              icon: 'icon-noti',
              image: ICON_URL,
            });
          }
        });

        await batch.commit();
        written += slice.length;
      }

      console.log('📝 Notificaciones guardadas en Firestore:', written);

      // envío Expo
      let sentOk = 0;
      try {
        const chunks = expo.chunkPushNotifications(expoMessages);
        const tickets = [];
        for (const chunk of chunks) {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        }
        for (const t of tickets) if (t?.status === 'ok') sentOk++;

        const receiptIds = tickets.filter(t => t?.id).map(t => t.id);
        if (receiptIds.length) {
          const rchunks = expo.chunkPushNotificationReceiptIds(receiptIds);
          for (const rc of rchunks) {
            const receipts = await expo.getPushNotificationReceiptsAsync(rc);
            for (const [, r] of Object.entries(receipts)) {
              if (r.status === 'error') {
                functions.logger.error('PUSH_RECEIPT_ERROR', { message: r.message, details: r.details || null });
              }
            }
          }
        }
      } catch (e) {
        console.error('❌ Error enviando notificaciones Expo (servicios):', e);
      }

      console.log(`✅ Push de servicio enviadas OK: ${sentOk}`);
      return { success: true, sentOk, savedDocs: written, recipients: recipientKeys.size };
    } catch (error) {
      console.error('❌ Error en sendServicePushNotifications:', error);
      return { success: false, error: error.message };
    }
  });
