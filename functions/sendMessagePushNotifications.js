const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const expo = new Expo();

const ICON_URL = "https://firebasestorage.googleapis.com/v0/b/elenlaceapp.firebasestorage.app/o/logo-banner.png?alt=media&token=c5865b54-d7a4-4fce-a967-0e2d85d2149a";

// Colecciones de perfiles (usadas para remitente y destinatario)
const PROFILE_COLLECTIONS = ['profiles', 'profilesPro', 'profilesElite', 'profilesFree'];

// Helpers
const toTitle = (s = '') =>
  s.replace(/\s+/g, ' ').trim().split(' ')
    .map(w => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');

const deriveNameFromEmail = (email = '') => {
  const m = String(email).split('@')[0] || '';
  return toTitle(m.replace(/[._-]+/g, ' ')) || 'Usuario';
};

exports.sendMessagePushNotifications = functions.firestore
  .document('mensajes/{messageId}')
  .onCreate(async (snap, context) => {
    try {
      const messageData = snap.data();
      const { to: recipientEmail, from: senderEmail, text: messageText } = messageData;

      // 🔍 LOG A: datos del mensaje
      functions.logger.info('MSG_DATA', {
        id: context.params.messageId,
        from: messageData.from,
        to: messageData.to,
        fromDisplayName: messageData.fromDisplayName,
      });

      // Nombre prioritario que puede venir en el propio doc de "mensajes"
      const senderNameInline =
        (messageData.fromDisplayName ||
          messageData.senderName ||
          messageData.displayName ||
          ''
        ).toString().trim();

      // 🔍 LOG B: nombre inline
      functions.logger.info('SENDER_INLINE', { senderNameInline });

      if (!recipientEmail || !senderEmail || messageText == null) {
        throw new Error('Faltan campos requeridos en el mensaje');
      }

      const normalizedRecipient = String(recipientEmail).trim().toLowerCase();
      const normalizedSender = String(senderEmail).trim().toLowerCase();

      if (normalizedRecipient === normalizedSender) {
        console.log('ℹ️ Mismo remitente y destinatario; no se envía push.');
        return;
      }

// === RESOLVER NOMBRE ===
// 1) Prioriza lo que venga en el mensaje
let senderName = (
  messageData.fromDisplayName ||
  messageData.senderName ||
  messageData.displayName ||
  ''
).toString().trim();

// 2) Si no vino, busca en perfiles (Elite/Agency → agencyName primero; resto → name)
if (!senderName) {
  const PROFILE_COLLECTIONS = ['profilesElite', 'profilesPro', 'profilesFree', 'profiles'];
  let senderData = null;
  let senderColl = null;
  for (const collection of PROFILE_COLLECTIONS) {
    const s = await db.collection(collection).doc(normalizedSender).get();
    if (s.exists) { senderData = s.data(); senderColl = collection; break; }
  }

  const isElite =
    senderColl === 'profilesElite' ||
    String(senderData?.membershipType || '').toLowerCase() === 'elite' ||
    String(senderData?.accountType || '').toLowerCase() === 'agency';

  senderName = (
    (isElite ? (senderData?.agencyName || senderData?.name) : senderData?.name) ||
    senderData?.fullName ||
    senderData?.displayName ||
    senderData?.agencyName ||
    ''
  ).toString().trim();
}

// 3) Fallback final (si no hay nada, derivar del email — nunca “Contacto”)
if (!senderName) {
  const base = (String(senderEmail).split('@')[0] || '').replace(/[._-]+/g, ' ').trim();
  senderName = base ? base[0].toUpperCase() + base.slice(1) : 'Usuario';
}

      // 🔍 LOG C: nombre final
      functions.logger.info('SENDER_FINAL', { senderName });

      // === Buscar token receptor ===
      let recipientData = null;
      let recipientCollectionFound = null;
      for (const collection of PROFILE_COLLECTIONS) {
        const docRef = db.collection(collection).doc(normalizedRecipient);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          recipientData = docSnap.data();
          recipientCollectionFound = collection;
          break;
        }
      }

      if (!recipientData || !recipientData.expoPushToken) {
        console.warn('⚠️ Token push no disponible para:', normalizedRecipient);
        console.warn('❌ No se enviará push, pero la tarjeta fue guardada en Firestore');
        return;
      }

      const pushToken = recipientData.expoPushToken;

      if (!Expo.isExpoPushToken(pushToken)) {
        console.error('❌ Token no válido para Expo:', pushToken);
        if (recipientCollectionFound) {
          await db.collection(recipientCollectionFound).doc(normalizedRecipient).update({
            expoPushToken: admin.firestore.FieldValue.delete(),
          });
        }
        return;
      }

// Ajustar cuerpo (seguro ante tipos no string)
const textStr = String(messageText || '');
const body = textStr.length > 60 ? textStr.substring(0, 57) + '...' : textStr;

const messages = [
  {
    to: pushToken,
    title: `📩 Nuevo mensaje de ${senderName}`,
    body,
    data: {
      type: 'mensaje',
      displayName: senderName,
      sender: normalizedSender,
      chatId: context.params.messageId,
      serviceId: '',
      castingId: '',
      // útil si luego quieres manejarlo en el cliente
      largeIconUrl: ICON_URL,
    },

    // —— Android / Expo ——
    sound: 'default',
    priority: 'high',
    channelId: 'messages',

    // Small icon (monocromo) DEBE existir en la app como recurso:
    // app.json -> "notification": { "icon": "./assets/icon-noti.png" }
    icon: 'icon-noti',

    // Imagen grande (color) — aquí va tu logo dorado/negro
    image: ICON_URL,
  },
];

// Log opcional
functions.logger.info('PUSH_PAYLOAD', {
  title: messages[0].title,
  image: messages[0].image,
  icon: messages[0].icon,
});

      // 🔍 LOG D: payload a enviar
      functions.logger.info('PUSH_PAYLOAD', {
        title: messages[0].title,
        displayName: messages[0].data.displayName,
      });

      // Guardar notificación en Firestore (para NotificationScreen)
      const notifRef = await db
        .collection('notifications')
        .doc(normalizedRecipient)
        .collection('items')
        .add({
          id: '',
          recipient: normalizedRecipient,
          type: 'mensaje',
          title: `📩 Nuevo mensaje de ${senderName}`,
          body,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
          sender: normalizedSender,
          displayName: senderName, // guardado también en la tarjeta
          chatId: context.params.messageId,
        });

      await notifRef.update({ id: notifRef.id });

      try {
        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];
        for (const chunk of chunks) {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        }
        console.log('✅ Notificación push enviada:', tickets);

        for (const ticket of tickets) {
          if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            if (recipientCollectionFound) {
              await db.collection(recipientCollectionFound).doc(normalizedRecipient).update({
                expoPushToken: admin.firestore.FieldValue.delete(),
              });
            }
          }
        }
        // Receipts: limpia tokens inválidos detectados después del envío
try {
  const receiptIds = tickets.filter(t => t?.id).map(t => t.id);
  if (receiptIds.length) {
    const chunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    for (const chunk of chunks) {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      for (const [id, r] of Object.entries(receipts)) {
        if (r.status === 'error') {
          functions.logger.error('PUSH_RECEIPT_ERROR', { id, message: r.message, details: r.details || null });
          if (r.details?.error === 'DeviceNotRegistered' && recipientCollectionFound) {
            await db.collection(recipientCollectionFound).doc(normalizedRecipient)
              .update({ expoPushToken: admin.firestore.FieldValue.delete() });
          }
        }
      }
    }
  }
} catch (e) {
  functions.logger.error('RECEIPTS_FETCH_ERROR', { error: e?.message || e });
}

      } catch (pushError) {
        console.error('❌ Error al enviar notificación push:', pushError);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error al enviar notificación de mensaje:', error);
      return { success: false, error: error.message };
    }
  });
