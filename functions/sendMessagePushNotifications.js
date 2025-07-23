const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const expo = new Expo();

exports.sendMessagePushNotifications = functions.firestore
  .document('mensajes/{messageId}')
  .onCreate(async (snap, context) => {
    try {
      const messageData = snap.data();
      const { to: recipientEmail, from: senderEmail, text: messageText } = messageData;

      if (!recipientEmail || !senderEmail || !messageText) {
        throw new Error('Faltan campos requeridos en el mensaje');
      }

      const normalizedRecipient = recipientEmail.trim().toLowerCase();
      const normalizedSender = senderEmail.trim().toLowerCase();

      // Fetch sender name
      const senderCollections = ['profiles', 'profilesPro', 'profilesElite'];
      let senderData = null;
      for (const collection of senderCollections) {
        const docRef = db.collection(collection).doc(normalizedSender);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          senderData = docSnap.data();
          break;
        }
      }
      const senderName = senderData?.displayName || senderData?.name || senderEmail;

      // Fetch recipient token
      const recipientCollections = ['profiles', 'profilesPro', 'profilesElite'];
      let recipientData = null;
      for (const collection of recipientCollections) {
        const docRef = db.collection(collection).doc(normalizedRecipient);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          recipientData = docSnap.data();
          break;
        }
      }

      if (!recipientData || !recipientData.expoPushToken) {
        console.warn('⚠️ Token push no disponible para:', normalizedRecipient);
        console.warn('❌ No se enviará push, pero la tarjeta fue guardada en Firestore');
        return;
      }

      const pushToken = recipientData.expoPushToken;
      const tokenType = recipientData.tokenType || 'expo'; // Asume Expo por defecto

      console.log('Token usado:', pushToken);
      console.log('Tipo de token:', tokenType);

      // Validar que el token sea un token válido de Expo
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error('❌ Token no válido para Expo:', pushToken);
        // Eliminar token inválido de Firestore
        await db.collection(recipientCollections[0]).doc(normalizedRecipient).update({
          expoPushToken: admin.firestore.FieldValue.delete(),
        });
        return;
      }

      // Construir el mensaje para Expo
      const messages = [
        {
          to: pushToken,
          sound: 'default',
          title: `📩 Nuevo mensaje de ${senderName}`,
          body: messageText.length > 60 ? messageText.substring(0, 57) + '...' : messageText,
          data: {
            type: 'mensaje',
            sender: senderEmail,
            chatId: context.params.messageId,
            serviceId: '',
            castingId: '',
          },
          priority: 'high',
        },
      ];

      // Guardar notificación en Firestore
      const notifRef = await db
        .collection('notifications')
        .doc(normalizedRecipient)
        .collection('items')
        .add({
          recipient: normalizedRecipient,
          type: 'mensaje',
          title: `📩 Nuevo mensaje de ${senderName}`,
          body: messageText.length > 60 ? messageText.substring(0, 57) + '...' : messageText,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
          sender: senderEmail,
          chatId: context.params.messageId,
        });

      await notifRef.update({ id: notifRef.id });
      console.log('📝 Notificación guardada en Firestore con ID:', notifRef.id);

      // Enviar notificación push usando Expo
      try {
        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];
        for (const chunk of chunks) {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        }
        console.log('✅ Notificación push enviada:', tickets);

        // Manejar errores de tickets (por ejemplo, tokens no registrados)
        for (const ticket of tickets) {
          if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            console.log('Eliminando token no registrado:', pushToken);
            await db.collection(recipientCollections[0]).doc(normalizedRecipient).update({
              expoPushToken: admin.firestore.FieldValue.delete(),
            });
          }
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