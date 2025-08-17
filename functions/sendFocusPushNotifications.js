const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

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

      // email del creador normalizado
      const authorEmailLower = authorEmail ? String(authorEmail).toLowerCase() : null;

      const profileCollections = ['profiles', 'profilesPro', 'profilesElite'];

      // deduplicación por email
      const recipientEmails = new Set();
      const tokensByEmail = new Map();

      // recolectar tokens
      for (const colName of profileCollections) {
        const snapshot = await db.collection(colName).get();
        snapshot.forEach(doc => {
          const email = String(doc.id || '').toLowerCase();
          const user = doc.data() || {};

          // excluir creador
          if (authorEmailLower && email === authorEmailLower) return;

          // requiere token
          if (!user.expoPushToken) return;

          recipientEmails.add(email);
          tokensByEmail.set(email, user.expoPushToken); // último token conocido
        });
      }

      if (recipientEmails.size === 0) {
        console.log('🔕 No hay destinatarios (o solo el autor y fue excluido).');
        return { success: false, message: 'No recipients' };
      }

      const notifTitle = `🎯 ${title}`;
      const notifBody = `Participa el ${dateTime}. Pago: ${payment} (${paymentMethod})`;
      const nowServerTs = admin.firestore.FieldValue.serverTimestamp();

      // enviar push
      let successCount = 0;
      for (const email of recipientEmails) {
        const token = tokensByEmail.get(email);
        if (!token) continue;

        const message = {
          token,
          notification: {
            title: notifTitle,
            body: notifBody,
          },
          data: {
            type: 'focus',
            focusId,
          },
          android: {
            priority: 'high',
            notification: { sound: 'default', channelId: 'default' },
          },
          apns: {
            payload: { aps: { sound: 'default', contentAvailable: true } },
          },
        };

        try {
          await messaging.send(message);
          successCount++;
        } catch (e) {
          console.warn(`❌ Error enviando a ${email}:`, e.message);
        }
      }

      console.log(`✅ Notificaciones enviadas (únicas): ${successCount}`);

      // guardar en Firestore (una por destinatario)
      const batch = db.batch();
      for (const email of recipientEmails) {
        const ref = db.collection('notifications').doc(email).collection('items').doc();
        batch.set(ref, {
          recipient: email,
          type: 'focus',
          title: notifTitle,
          body: notifBody,
          timestamp: nowServerTs,
          focusId,
          read: false,
          sender: authorEmailLower || 'sistema',
        });
      }
      await batch.commit();
      console.log('📝 Notificaciones guardadas en Firestore');

      return { success: true, sent: successCount };
    } catch (error) {
      console.error('❌ Error en sendFocusPushNotifications:', error);
      return { success: false, error: error.message };
    }
  });
