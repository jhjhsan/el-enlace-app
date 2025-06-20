// ✅ Archivo: functions/sendCastingPushNotifications.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

module.exports = functions.https.onCall(async (castingData, context) => {
  try {
    const {
      title,
      description,
      gender,         // 'masculino', 'femenino', 'otro'
      minAge,         // e.g. 25
      maxAge,         // e.g. 35
      ethnicity,      // e.g. 'afroamericano', 'blanco', etc.
    } = castingData;

    const snapshot = await db.collection('profiles').get();
    const now = new Date();
    const matchingTokens = [];

    snapshot.forEach(doc => {
      const user = doc.data();
      if (!user.pushToken) return;

      // Filtros básicos
      const userAge = user.birthYear ? now.getFullYear() - user.birthYear : null;
      const matchGender = gender ? user.gender?.toLowerCase() === gender.toLowerCase() : true;
      const matchEthnicity = ethnicity ? user.ethnicity?.toLowerCase() === ethnicity.toLowerCase() : true;
      const matchAge = userAge && minAge && maxAge ? userAge >= minAge && userAge <= maxAge : true;

      if (matchGender && matchEthnicity && matchAge) {
        matchingTokens.push(user.pushToken);
      }
    });

    if (matchingTokens.length === 0) {
      console.log('🔕 Ningún perfil coincide con el casting.');
      return { success: false, message: 'No matching profiles found.' };
    }

    const payload = {
      notification: {
        title: `🎬 Nuevo casting: ${title}`,
        body: `Buscamos perfiles como el tuyo. ¡Revisa los detalles!`,
      },
    };

    const response = await messaging.sendEachForMulticast({
      tokens: matchingTokens,
      ...payload,
    });

    console.log(`✅ Notificaciones enviadas: ${response.successCount}`);
    return { success: true, sent: response.successCount };
  } catch (error) {
    console.error('❌ Error en sendCastingPushNotifications:', error);
    return { success: false, error: error.message };
  }
});
