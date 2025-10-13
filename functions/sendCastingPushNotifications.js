const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const expo = new Expo();

const ICON_URL = "https://firebasestorage.googleapis.com/v0/b/elenlaceapp.firebasestorage.app/o/logo-banner.png?alt=media&token=c5865b54-d7a4-4fce-a967-0e2d85d2149a";
const PROFILE_COLLECTIONS = ['profiles', 'profilesPro', 'profilesElite', 'profilesFree'];

exports.sendCastingPushNotifications = functions.firestore
  .document('castings/{castingId}')
  .onCreate(async (snap, context) => {
    try {
      const castingData = snap.data() || {};
      const castingId = context.params.castingId;

      const {
        title,
        description,
        gender,     // opcional
        minAge,     // opcional
        maxAge,     // opcional
        ethnicity,  // opcional
      } = castingData;

      // email creador normalizado
      const creatorEmailLower =
        (castingData?.creatorEmailLower && String(castingData.creatorEmailLower).toLowerCase()) ||
        (castingData?.creatorEmail && String(castingData.creatorEmail).toLowerCase()) ||
        null;

      // recolectar destinatarios únicos con Expo token válido
      const recipientEmails = new Set();
      const tokensByEmail = new Map();

      for (const colName of PROFILE_COLLECTIONS) {
        const snapshot = await db.collection(colName).get();

        snapshot.forEach(doc => {
          const email = String(doc.id || '').toLowerCase();
          const user = doc.data();

          // excluir al creador
          if (creatorEmailLower && email === creatorEmailLower) return;

          const pushToken = user?.expoPushToken;
          if (!pushToken || !Expo.isExpoPushToken(pushToken)) return;

          // filtros opcionales
          const userBirthYear = user?.birthYear;
          const userAge = userBirthYear ? (new Date().getFullYear() - userBirthYear) : null;

          const matchGender = gender ? String(user.gender || '').toLowerCase() === String(gender).toLowerCase() : true;
          const matchEthnicity = ethnicity ? String(user.ethnicity || '').toLowerCase() === String(ethnicity).toLowerCase() : true;
          const matchAge = (userAge && minAge && maxAge) ? (userAge >= minAge && userAge <= maxAge) : true;

          if (matchGender && matchEthnicity && matchAge) {
            recipientEmails.add(email);
            tokensByEmail.set(email, pushToken);
          }
        });
      }

      if (recipientEmails.size === 0) {
        console.log('🔕 No hay destinatarios con Expo token válido (o filtros muy estrictos).');
        return { success: false, message: 'No matching recipients' };
      }

      const notifTitle = `🎬 Nuevo casting: ${title || 'Oportunidad'}`;
      const notifBody  = `Buscamos perfiles como el tuyo. ¡Revisa los detalles!`;
      const nowServerTs = admin.firestore.FieldValue.serverTimestamp();

      // construir tarjetas + mensajes expo
      const messages = [];
      const batch = db.batch();

      for (const email of recipientEmails) {
        const token = tokensByEmail.get(email);
        if (!token) continue;

        // tarjeta Firestore
        const ref = db.collection('notifications').doc(email).collection('items').doc();
        batch.set(ref, {
          id: ref.id,
          recipient: email,
          type: 'casting',
          title: notifTitle,
          body: notifBody,
          timestamp: nowServerTs,
          read: false,
          sender: 'sistema',
          castingId,
          creatorEmailLower: creatorEmailLower || '',
        });

        // push Expo
        messages.push({
          to: token,
          title: notifTitle,
          body: notifBody,
          data: { type: 'casting', castingId, largeIconUrl: ICON_URL },
          sound: 'default',
          priority: 'high',
          channelId: 'messages',
          icon: 'icon-noti',
          image: ICON_URL,
        });
      }

      await batch.commit();
      console.log(`📝 Tarjetas guardadas en Firestore: ${recipientEmails.size}`);

      // enviar por Expo (chunks + receipts)
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
        console.error('❌ Error enviando notificaciones Expo (castings):', e);
      }

      console.log(`✅ Push de casting enviadas OK: ${sentOk}`);
      return { success: true, sentOk, recipients: recipientEmails.size };
    } catch (error) {
      console.error('❌ Error en sendCastingPushNotifications:', error);
      return { success: false, error: error.message };
    }
  });
