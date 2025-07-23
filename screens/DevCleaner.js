import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DevCleaner() {
  useEffect(() => {
    const cleanMessages = async () => {
      try {
        const json = await AsyncStorage.getItem('professionalMessages');
        const all = json ? JSON.parse(json) : [];
        console.log('📦 professionalMessages antes de limpieza:', all);

       const normalizeEmail = (email) => {
  if (!email || typeof email !== 'string') {
    console.warn('⛔ Email no válido detectado (nulo o no string):', email);
    return null;
  }

  let limpio = email.trim().toLowerCase();

  // ⚠️ Corregir múltiples @
  if ((limpio.match(/@/g) || []).length > 1) {
    const dominio = limpio.substring(limpio.lastIndexOf('@') + 1);
    const local = limpio.substring(0, limpio.lastIndexOf('@')).replace(/@+/g, '.');
    limpio = `${local}@${dominio}`;
    console.warn(`🧽 Corregido email con múltiples @: ${email} → ${limpio}`);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(limpio)) {
    console.warn('⛔ Email malformado tras limpieza:', limpio);
    return null;
  }

  return limpio;
};

        const cleaned = all
          .map((msg) => ({
            ...msg,
            from: normalizeEmail(msg.from),
            to: normalizeEmail(msg.to),
          }))
          .filter((msg) => msg.from && msg.to); // Elimina mensajes con correos inválidos

        console.log('🧹 Limpiando professionalMessages, entradas válidas:', cleaned);
        const safe = (TU_VARIABLE_ORIGINAL || []).map((conv) => ({
  ...conv,
  messages: (conv.messages || []).slice(-50), // Limita a últimos 50
}));

await AsyncStorage.setItem('professionalMessages', JSON.stringify(safe));

        console.log('✅ Mensajes limpiados correctamente desde DevCleaner');
      } catch (error) {
        console.error('❌ Error al limpiar professionalMessages:', error.message || error);
      }
    };

    cleanMessages();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#D8A353', fontSize: 16, textAlign: 'center' }}>
        🧼 Limpiando mensajes duplicados...
      </Text>
    </View>
  );
}