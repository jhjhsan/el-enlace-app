import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeEmail } from './normalizeEmail';

export const saveProfessionalMessages = async (newConv, userEmail) => {
  try {
    const normalizedUser = normalizeEmail(userEmail);
    const normalizedTarget =
      normalizeEmail(newConv.from) === normalizedUser
        ? normalizeEmail(newConv.to)
        : normalizeEmail(newConv.from);

    const key = 'professionalMessages';
    const raw = await AsyncStorage.getItem(key);
    const existing = raw ? JSON.parse(raw) : [];

    // Buscar si ya existe conversación entre esos 2 usuarios
    const existingIndex = existing.findIndex((conv) => {
      const from = normalizeEmail(conv.from);
      const to = normalizeEmail(conv.to);
      return (
        (from === normalizedUser && to === normalizedTarget) ||
        (from === normalizedTarget && to === normalizedUser)
      );
    });

    if (existingIndex !== -1) {
      const existingConv = existing[existingIndex];
      const mergedMessages = [
        ...existingConv.messages,
        ...newConv.messages.filter(
          (msg) => !existingConv.messages.some((m) => m.id === msg.id)
        ),
      ].slice(-50);

      existing[existingIndex] = {
        ...existingConv,
        messages: mergedMessages,
        lastMessage: mergedMessages[mergedMessages.length - 1],
        timestamp: mergedMessages[mergedMessages.length - 1]?.timestamp,
      };
    } else {
      existing.push({
        ...newConv,
        lastMessage: newConv.messages[newConv.messages.length - 1],
        timestamp: newConv.messages[newConv.messages.length - 1]?.timestamp,
      });
    }

    await AsyncStorage.setItem(key, JSON.stringify(existing));
    console.log('✅ Conversaciones guardadas correctamente:', existing.length);
  } catch (error) {
    console.error('❌ Error en saveProfessionalMessages:', error);
  }
};
