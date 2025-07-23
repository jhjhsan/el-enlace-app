const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

exports.sendServicePushNotifications = functions.firestore
  .document('services/{serviceId}')
  .onCreate(async (snap, context) => {
    try {
      const serviceData = snap.data();
      const {
        title,
        description,
        category, // Ej. 'fotografía', 'modelaje'
        location, // Ej. 'Santiago', 'Chile'
      } = serviceData;
      const serviceId = context.params.serviceId;

      const profileCollections = ['profiles', 'profilesPro', 'profilesElite'];
      const notifications = [];
      const tokensMap = new Map();

      // Buscar perfiles en todas las colecciones
      for (const collection of profileCollections) {
        const snapshot = await db.collection(collection).get();
        snapshot.forEach(doc => {
          const user = doc.data();
          const email = doc.id;

          if (!user.expoPushToken) return;

          tokensMap.set(email, user.expoPushToken);

          // Filtrar por categoría y ubicación (ajusta según tu modelo de datos)
          const matchCategory = category ? user.interests?.includes(category.toLowerCase()) : true;
          const matchLocation = location ? user.location?.toLowerCase() === location.toLowerCase() : true;

          if (matchCategory && matchLocation) {
            notifications.push({
              recipientEmail: email,
              data: {
                type: 'servicio',
                title: `🛠️ Nuevo servicio: ${title}`,
                body: description.length > 60 ? description.substring(0, 57) + '...' : description,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                serviceId,
              }
            });
          }
        });
      }

      if (notifications.length === 0) {
        console.log('🔕 Ningún perfil coincide con el servicio.');
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
              serviceId: noti.data.serviceId,
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
          serviceId: noti.data.serviceId,
          read: false,
          sender: 'sistema',
        });
      });
      await batch.commit();
      console.log('📝 Notificaciones guardadas en Firestore');

      return { success: true, sent: successCount };
    } catch (error) {
      console.error('❌ Error en sendServicePushNotifications:', error);
      return { success: false, error: error.message };
    }
  });