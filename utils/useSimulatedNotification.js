// utils/useSimulatedNotification.js
import { useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useSimulatedNotification(userProfile) {
  useEffect(() => {
    if (!userProfile) return;

    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];

    const showNotification = async () => {
      const seen = await AsyncStorage.getItem(`notified-${todayKey}`);
      if (seen) return; // ya se mostró hoy

      // Simula mensaje según perfil del usuario
      const role = userProfile.categories?.[0] || 'talento';
      const city = userProfile.city || 'tu ciudad';

      Alert.alert(
        '🎬 Nuevo casting disponible',
        `Hay una nueva oportunidad para ${role} en ${city}. ¡Revisa y postúlate ahora!`
      );

      await AsyncStorage.setItem(`notified-${todayKey}`, 'true');
    };

    showNotification();
  }, [userProfile]);
}
