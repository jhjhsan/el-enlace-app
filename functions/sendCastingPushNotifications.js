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
      const {
        title,
        description,
        gender, // 'masculino', 'femenino', 'otro'
        minAge, // e.g. 25
        maxAge, // e.g. 35
        ethnicity, // e.g. 'afroamericano', 'blanco', etc.
      } = castingData;
      const castingId = context.params.castingId;

      const profileCollections = ['profiles', 'profilesPro', 'profilesElite'];
      const notifications = [];
      const tokensMap = new Map();

      // Buscar en todas las colecciones de perfiles
      for (const collection of profileCollections) {
        const snapshot = await db.collection(collection).get();
        snapshot.forEach(doc => {
          const user = doc.data();
          const email = doc.id;

          if (!user.expoPushToken) return;

          tokensMap.set(email, user.expoPushToken);

          const userAge = user.birthYear ? new Date().getFullYear() - user.birthYear : null;
          const matchGender = gender ? user.gender?.toLowerCase() === gender.toLowerCase() : true;
          const matchEthnicity = ethnicity ? user.ethnicity?.toLowerCase() === ethnicity.toLowerCase() : true;
          const matchAge = userAge && minAge && maxAge ? userAge >= minAge && userAge <= maxAge : true;

          if (matchGender && matchEthnicity && matchAge) {
            notifications.push({
              recipientEmail: email,
              data: {
                type: 'casting',
                title: `🎬 Nuevo casting: ${title}`,
                body: `Buscamos perfiles como el tuyo. ¡Revisa los detalles!`,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                castingId,
              }
            });
          }
        });
      }

      if (notifications.length === 0) {
        console.log('🔕 Ningún perfil coincide con el casting.');
        return { success: false, message: 'No matching profiles found.' };
      }

      let successCount = 0;
      for (const noti of notifications) {
        const pushToken = tokensMap.get(noti.recipientEmail);
        if (!pushToken) continue;

        try {
          const message = {
            token: pushToken,
            notification: {
              title: noti.data.title,
              body: noti.data.body,
            },
            data: {
              type: noti.data.type,
              castingId: noti.data.castingId,
            },
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                channelId: 'default',
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  contentAvailable: true,
                },
              },
            },
          };

          await messaging.send(message);
          successCount++;
        } catch (e) {
          console.warn(`❌ Error enviando a ${noti.recipientEmail}:`, e.message);
        }
      }

      console.log(`✅ Notificaciones enviadas: ${successCount}`);

      const batch = db.batch();
      notifications.forEach(noti => {
        const ref = db.collection('notifications').doc(noti.recipientEmail).collection('items').doc();
        batch.set(ref, {
          recipient: noti.recipientEmail,
          type: noti.data.type,
          title: noti.data.title,
          body: noti.data.body,
          timestamp: noti.data.timestamp,
          castingId: noti.data.castingId,
          read: false,
          sender: 'sistema',
        });
      });
      await batch.commit();
      console.log('📝 Notificaciones guardadas en Firestore');

      return { success: true, sent: successCount };
    } catch (error) {
      console.error('❌ Error en sendCastingPushNotifications:', error);
      return { success: false, error: error.message };
    }
  });