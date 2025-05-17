import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

export const deleteTempUserFiles = async () => {
  try {
    const userDataJson = await AsyncStorage.getItem('userData');
    const userData = userDataJson ? JSON.parse(userDataJson) : null;

    if (!userData || !userData.email) return;

    const emailKey = `userProfile_${userData.email}`;
    const profileJson = await AsyncStorage.getItem(emailKey);
    const profile = profileJson ? JSON.parse(profileJson) : null;

    // Eliminar video del sistema de archivos si existe
    if (profile?.profileVideo) {
      const videoPath = profile.profileVideo;
      const fileInfo = await FileSystem.getInfoAsync(videoPath);

      if (fileInfo.exists && videoPath.includes(FileSystem.documentDirectory)) {
        await FileSystem.deleteAsync(videoPath, { idempotent: true });
        console.log('🧹 Video eliminado:', videoPath);
      }
    }

    // Limpiar claves base del usuario anterior
    await AsyncStorage.multiRemove([
      'userProfile',
      'userProfileFree',
      'userProfilePro',
      'userProfileElite',
    ]);

    console.log('🧹 Perfil anterior eliminado correctamente');
  } catch (e) {
    console.log('❌ Error al eliminar archivos temporales:', e);
  }
};
