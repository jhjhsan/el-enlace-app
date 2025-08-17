const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

exports.sendCastingPushNotifications = functions.firestore
  .document('castings/{castingId}')
  .onCreate(async (snap, context) => {
    try {
      const castingData = snap.data();
      const castingId = context.params.castingId;

      const {
        title,
        description,
        gender,     // filtro opcional
        minAge,     // filtro opcional
        maxAge,     // filtro opcional
        ethnicity,  // filtro opcional
      } = castingData;

      // 🔑 Email del creador en minúsculas (de preferencia usa creatorEmailLower guardado en el doc)
      const creatorEmailLower =
        (castingData.creatorEmailLower && String(castingData.creatorEmailLower).toLowerCase()) ||
        (castingData.creatorEmail && String(castingData.creatorEmail).toLowerCase()) ||
        null;

      const profileCollections = ['profiles', 'profilesPro', 'profilesElite'];

      // Usamos Set para no repetir destinatarios (si aparece en varias colecciones)
      const recipientEmails = new Set();
      const tokensByEmail = new Map();

      for (const colName of profileCollections) {
        const snapshot = await db.collection(colName).get();

        snapshot.forEach(doc => {
          const email = String(doc.id || '').toLowerCase();
          const user = doc.data();

          // 🛑 Excluir SIEMPRE al creador
          if (creatorEmailLower && email === creatorEmailLower) return;

          // Debe tener token
          if (!user.expoPushToken) return;

          // Filtros opcionales
          const userAge = user.birthYear ? new Date().getFullYear() - user.birthYear : null;
          const matchGender = gender ? String(user.gender || '').toLowerCase() === String(gender).toLowerCase() : true;
          const matchEthnicity = ethnicity ? String(user.ethnicity || '').toLowerCase() === String(ethnicity).toLowerCase() : true;
          const matchAge = (userAge && minAge && maxAge) ? (userAge >= minAge && userAge <= maxAge) : true;

          if (matchGender && matchEthnicity && matchAge) {
            recipientEmails.add(email);
            // último token conocido por email (si hay duplicado, se reemplaza; está bien)
            tokensByEmail.set(email, user.expoPushToken);
          }
        });
      }

      if (recipientEmails.size === 0) {
        console.log('🔕 Ningún perfil coincide con el casting (o solo el creador coincidía y fue excluido).');
        return { success: false, message: 'No matching profiles found.' };
      }

      // Construye el payload común
      const notifTitle = `🎬 Nuevo casting: ${title}`;
      const notifBody  = `Buscamos perfiles como el tuyo. ¡Revisa los detalles!`;
      const nowServerTs = admin.firestore.FieldValue.serverTimestamp();

      // Enviar push 1 vez por destinatario
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
            type: 'casting',
            castingId,
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

      // Guardar una notificación por destinatario (única)
      const batch = db.batch();
      for (const email of recipientEmails) {
        const ref = db.collection('notifications').doc(email).collection('items').doc();
        batch.set(ref, {
          recipient: email,
          type: 'casting',
          title: notifTitle,
          body: notifBody,
          timestamp: nowServerTs,
          castingId,
          read: false,
          sender: 'sistema',
          creatorEmailLower, // útil para auditoría
        });
      }
      await batch.commit();
      console.log('📝 Notificaciones guardadas en Firestore');

      return { success: true, sent: successCount };
    } catch (error) {
      console.error('❌ Error en sendCastingPushNotifications:', error);
      return { success: false, error: error.message };
    }
  });
