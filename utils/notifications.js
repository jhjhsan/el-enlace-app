import AsyncStorage from '@react-native-async-storage/async-storage';

// Esta función guarda una nueva notificación
export const addNotification = async (message) => {
  try {
    const stored = await AsyncStorage.getItem('userNotifications');
    const notifications = stored ? JSON.parse(stored) : [];

    const newNotification = {
      message,
      read: false,
      timestamp: new Date().toISOString(), // puedes formatear si quieres
    };

    const updated = [newNotification, ...notifications]; // orden: más nueva primero
    await AsyncStorage.setItem('userNotifications', JSON.stringify(updated));
  } catch (error) {
    console.error('Error al guardar la notificación:', error);
  }
};
