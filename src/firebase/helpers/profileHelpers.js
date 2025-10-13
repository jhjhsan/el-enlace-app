import AsyncStorage from '@react-native-async-storage/async-storage';

const fixEmail = (raw) => {
  if (!raw) return '';
  let email = String(raw).trim().toLowerCase();

  // quitar espacios
  email = email.replace(/\s+/g, '');

  // si tiene múltiples @, unir la parte local con puntos y dejar el último dominio
  const atCount = (email.match(/@/g) || []).length;
  if (atCount > 1) {
    const parts = email.split('@');
    const domain = parts.pop();
    const local = parts.join('.');
    email = `${local}@${domain}`;
    console.warn('🧽 Email autocorregido (múltiples @):', raw, '→', email);
  }

  return email;
};

export const guardarAllProfiles = async (lista) => {
  try {
    const limpio = (Array.isArray(lista) ? lista : []).filter((p) => {
      if (!p || typeof p !== 'object') return false;

      const fixed = fixEmail(p.email);
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fixed);

      if (!isValid) {
        console.warn('❌ Correo descartado por inválido:', p.email, '→', fixed);
        return false;
      }

      // persistimos el email corregido para guardar
      p.email = fixed;
      return true;
    });

    await AsyncStorage.setItem('allProfiles', JSON.stringify(limpio));
    console.log(`✅ guardados ${limpio.length} perfiles limpios en allProfiles`);
  } catch (e) {
    console.warn('❌ Error guardando allProfiles filtrado:', e.message || e);
  }
};
