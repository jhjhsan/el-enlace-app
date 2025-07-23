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
    console.log('Inicializando...');
    const focusData = snap.data();
    const { title, dateTime, payment, paymentMethod, authorEmail } = focusData;
    const focusId = context.params.focusId;

    const profileCollections = ['profiles', 'profilesPro', 'profilesElite'];
    const notifications = [];
    const tokensMap = new Map();

    for (const collection of profileCollections) {
      const snapshot = await db.collection(collection).get();
      snapshot.forEach(doc => {
        const user = doc.data();
        if (user.expoPushToken) tokensMap.set(doc.id, user.expoPushToken);
      });
    }

    if (!tokensMap.size) return { success: false, message: 'No tokens found.' };

    notifications.push(...Array.from(tokensMap.keys()).map(email => ({
      recipientEmail: email,
      data: {
        type: 'focus',
        title: `🎯 Nuevo focus: ${title}`,
        body: `Participa el ${dateTime}. Pago: ${payment} (${paymentMethod})`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        focusId,
      }
    })));

    let successCount = 0;
    for (const noti of notifications) {
      try {
        await messaging.send({
          token: tokensMap.get(noti.recipientEmail),
          notification: { title: noti.data.title, body: noti.data.body },
          data: { type: noti.data.type, focusId: noti.data.focusId },
          android: { priority: 'high', notification: { sound: 'default', channelId: 'default' } },
          apns: { payload: { aps: { sound: 'default', contentAvailable: true } } },
        });
        successCount++;
      } catch (e) {
        console.warn(`❌ Error a ${noti.recipientEmail}:`, e.message);
      }
    }

    console.log(`✅ Enviadas: ${successCount}`);
    const batch = db.batch();
    notifications.forEach(noti => {
      batch.set(db.collection('notifications').doc(noti.recipientEmail).collection('items').doc(), {
        recipient: noti.recipientEmail, type: 'focus', title: noti.data.title, body: noti.data.body,
        timestamp: noti.data.timestamp, focusId: noti.data.focusId, read: false, sender: authorEmail || 'sistema',
      });
    });
    await batch.commit();
    console.log('📝 Guardadas en Firestore');

    return { success: true, sent: successCount };
  });