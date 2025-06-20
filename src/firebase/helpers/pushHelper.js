// ✅ Archivo: src/helpers/pushHelper.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getPushToken = async () => {
  try {
    if (!Device.isDevice) {
      console.warn('⚠️ Las notificaciones push solo funcionan en dispositivos físicos.');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('❌ Permiso de notificaciones no concedido.');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;

    console.log('✅ Push token obtenido:', pushToken);
    await AsyncStorage.setItem('pushToken', pushToken);
    return pushToken;
  } catch (error) {
    console.error('❌ Error al obtener push token:', error);
    return null;
  }
};