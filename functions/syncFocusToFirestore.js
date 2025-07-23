const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

exports.syncFocusToFirestore = functions.https.onCall(async (data, context) => {
  try {
    const focusList = data.focusList; // Recibe el array enviado desde la app
    if (!focusList || !Array.isArray(focusList)) {
      console.log('No se recibió un focusList válido.');
      return { success: false, message: 'No se recibió un focusList válido.' };
    }

    if (focusList.length === 0) {
      console.log('El focusList está vacío.');
      return { success: false, message: 'El focusList está vacío.' };
    }

    const batch = db.batch();
    focusList.forEach(focus => {
      const ref = db.collection('focusGroups').doc(focus.id);
      batch.set(ref, {
        id: focus.id,
        title: focus.title || '',
        requirements: focus.requirements || '',
        dateTime: focus.dateTime || '',
        duration: focus.duration || '',
        payment: focus.payment || '',
        paymentMethod: focus.paymentMethod || '',
        description: focus.description || '',
        authorEmail: focus.authorEmail || '',
        authorName: focus.authorName || '',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();

    console.log('Focus groups sincronizados con Firestore');
    return { success: true };
  } catch (error) {
    console.error('Error sincronizando focus groups:', error);
    return { success: false, error: error.message };
  }
});