const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const expo = new Expo();

const ICON_URL = "https://firebasestorage.googleapis.com/v0/b/elenlaceapp.firebasestorage.app/o/logo-banner.png?alt=media&token=c5865b54-d7a4-4fce-a967-0e2d85d2149a";

// Normaliza emails para comparar SIEMPRE igual
const normalizeEmail = (e = '') =>
  String(e)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9@._+\-]/gi, '')
    .replace(/@{2,}/g, '@');

const PROFILE_COLLECTIONS = ['profiles', 'profilesPro', 'profilesElite', 'profilesFree'];

exports.sendFocusPushNotifications = functions.firestore
  .document('focusGroups/{focusId}')
  .onCreate(async (snap, context) => {
    try {
      const focusData = snap.data() || {};
      const focusId = context.params.focusId;

      const {
        title = 'Nuevo focus',
        dateTime = '',
        payment = '',
        paymentMethod = '',
        authorEmail = null,
      } = focusData;

      // email del creador normalizado (clave para excluirlo)
      const authorEmailLower = normalizeEmail(authorEmail || '');

      // Dedup por email + map email→token Expo válido
      const recipientEmails = new Set();
      const tokensByEmail = new Map();

      // Recolectar destinatarios
      for (const colName of PROFILE_COLLECTIONS) {
        const snapshot = await db.collection(colName).get();

        snapshot.forEach(doc => {
          const emailKey = normalizeEmail(doc.id || '');
          if (!emailKey || !emailKey.includes('@')) return;

          // EXCLUIR SIEMPRE al creador
          if (authorEmailLower && emailKey === authorEmailLower) return;

          const user = doc.data() || {};
          const token = user.expoPushToken;

          // Solo Expo tokens válidos
          if (!token || !Expo.isExpoPushToken(token)) return;

          recipientEmails.add(emailKey);
          tokensByEmail.set(emailKey, token); // último token conocido
        });
      }

      if (recipientEmails.size === 0) {
        console.log('🔕 No hay destinatarios con Expo token válido (o solo el autor).');
        return { success: false, message: 'No recipients' };
      }

      const notifTitle = `🎯 ${title}`;
      const bodyText = `Participa el ${dateTime}. Pago: ${payment} (${paymentMethod})`;
      const nowServerTs = admin.firestore.FieldValue.serverTimestamp();

      // Construir tarjetas y mensajes Expo
      const messages = [];
      const batch = db.batch();

      for (const email of recipientEmails) {
        // Tarjeta en Firestore
        const ref = db.collection('notifications').doc(email).collection('items').doc();
        batch.set(ref, {
          id: ref.id,
          recipient: email,
          type: 'focus',
          title: notifTitle,
          body: bodyText,
          timestamp: nowServerTs,
          focusId,
          read: false,
          sender: authorEmailLower || 'sistema',
        });

        // Push Expo
        const token = tokensByEmail.get(email);
        messages.push({
          to: token,
          title: notifTitle,
          body: bodyText,
          data: { type: 'focus', focusId, largeIconUrl: ICON_URL },
          sound: 'default',
          priority: 'high',
          channelId: 'messages', // canal ya existente en tu app
          icon: 'icon-noti',     // small icon configurado en app.json
          image: ICON_URL,       // logo grande
        });
      }

      await batch.commit();
      console.log(`📝 Notificaciones guardadas en Firestore: ${recipientEmails.size}`);

      // Envío Expo (chunks + receipts)
      let sentOk = 0;
      try {
        const chunks = expo.chunkPushNotifications(messages);
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
        console.error('❌ Error enviando notificaciones Expo (focus):', e);
      }

      console.log(`✅ Push de focus enviadas OK: ${sentOk}`);
      return { success: true, sentOk, recipients: recipientEmails.size };
    } catch (error) {
      console.error('❌ Error en sendFocusPushNotifications:', error);
      return { success: false, error: error.message };
    }
  });
