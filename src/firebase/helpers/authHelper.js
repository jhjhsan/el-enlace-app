// src/firebase/helpers/authHelper.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../firebaseConfig';

// Registrar nuevo usuario y enviar verificación por correo
export const registerWithEmail = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);

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

// Verifica si el usuario ya confirmó su email
export const isEmailVerified = (user) => {
  return user?.emailVerified === true;
};

// Iniciar sesión y validar si el correo ya está verificado
export const loginWithEmail = async (email, password) => {
  try {
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

// Enviar correo de recuperación de contraseña
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log('📧 Email de recuperación enviado a:', email);
    return { success: true };
  } catch (error) {
    console.error('❌ Error al enviar recuperación:', error);
    return { success: false, error };
  }
};

// Verifica si hay un usuario activo y si su correo está verificado
export const checkAuthState = (callback) => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      callback({
        user,
        isVerified: user.emailVerified === true,
      });
    } else {
      callback(null);
    }
  });
};
