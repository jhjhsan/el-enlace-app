import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Guarda un registro en el historial de suscripciones de Firestore.
 * @param {Object} options - Datos de la suscripción.
 * @param {string} options.email - Email del usuario.
 * @param {string} options.planType - Tipo de plan: 'pro' | 'elite'.
 * @param {string} options.paymentMethod - Método de pago: 'webpay' | 'manual' | etc.
 * @param {number} options.durationMonths - Duración del plan en meses.
 * @param {string} [options.status='active'] - Estado: 'active' | 'expired'.
 */
export const saveSubscriptionHistory = async ({
  email,
  planType,
  paymentMethod,
  durationMonths,
  status = 'active',
}) => {
  console.log('📩 Intentando guardar historial en Firestore:', {
    email, planType, paymentMethod, durationMonths, status
  });

  try {
    const docRef = collection(db, 'subscriptionHistory');
    await addDoc(docRef, {
      email: email.toLowerCase(),
      planType,
      paymentMethod,
      durationMonths,
      status,
      createdAt: Timestamp.now(),
    });
    console.log('✅ Historial de suscripción guardado');
  } catch (error) {
    console.error('❌ Error al guardar historial de suscripción:', error);
  }
};
