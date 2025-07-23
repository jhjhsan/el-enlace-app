import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../firebaseConfig';

export const registerWithEmail = async (email, password) => {
  try {
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('❌ Email inválido:', email);
      throw new Error('Correo electrónico inválido');
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return {
      success: true,
      user: userCredential.user,
    };
  } catch (error) {
    console.error('❌ Error al registrar:', error);
    return {
      success: false,
      error,
    };
  }
};

export const isEmailVerified = (user) => {
  return user?.emailVerified === true;
};

export const loginWithEmail = async (email, password) => {
  try {
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('❌ Email inválido:', email);
      throw new Error('Correo electrónico inválido');
    }
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    if (!userCredential.user.emailVerified) {
      return {
        success: false,
        needsVerification: true,
        error: 'Correo no verificado',
      };
    }

    return {
      success: true,
      user: userCredential.user,
    };
  } catch (error) {
    console.error('❌ Error al iniciar sesión:', error);
    return {
      success: false,
      error,
    };
  }
};

export const resetPassword = async (email) => {
  try {
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('❌ Email inválido:', email);
      throw new Error('Correo electrónico inválido');
    }
    await sendPasswordResetEmail(auth, email);
    console.log('📧 Email de recuperación enviado a:', email);
    return { success: true };
  } catch (error) {
    console.error('❌ Error al enviar recuperación:', error);
    return { success: false, error };
  }
};

export const checkAuthState = (callback) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      callback({
        user,
        isVerified: user.emailVerified === true,
      });
    } else {
      callback(null);
    }
  });
  return unsubscribe; // Devolver la función de desuscripción
};