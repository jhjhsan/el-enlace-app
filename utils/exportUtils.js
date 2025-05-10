import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function exportApplicationsToPDF() {
  try {
    const data = await AsyncStorage.getItem('applications');
    const applications = data ? JSON.parse(data) : [];

    if (applications.length === 0) {
      throw new Error('No hay postulaciones para exportar.');
    }

    const htmlContent = applications.map((item, index) => {
      const profile = item.profile || {};
      const formattedDate = new Date(item.timestamp).toLocaleString();

      return `
        <div style="border:1px solid #ccc; padding:20px; margin-bottom:20px; border-radius:10px;">
          <h2 style="color:#D8A353;">Postulación #${index + 1}</h2>
          <p><strong>🕒 Fecha:</strong> ${formattedDate}</p>
          <p><strong>🎬 Casting:</strong> ${item.castingTitle}</p>
          <hr/>
          <p><strong>Nombre:</strong> ${profile.name || ''}</p>
          <p><strong>Email:</strong> ${profile.email || ''}</p>
          <p><strong>Edad:</strong> ${profile.age || ''}</p>
          <p><strong>Sexo:</strong> ${profile.sex || ''}</p>
          <p><strong>Estatura:</strong> ${profile.height || ''}</p>
          <p><strong>Categorías:</strong> ${(profile.categories || []).join(', ')}</p>
          ${profile.profilePhoto ? `<img src="${profile.profilePhoto}" width="100" style="border-radius:8px;" />` : ''}
          <p><strong>Video Presentación:</strong> ${profile.presentationVideo || 'No disponible'}</p>
          <p><strong>Videos Acting:</strong></p>
          <ul>
            ${(item.videos || []).map((v, i) => `<li>Acting ${i+1}: ${v}</li>`).join('')}
          </ul>
        </div>
      `;
    }).join('');

    const { uri } = await Print.printToFileAsync({
      html: `<html><body style="font-family:sans-serif; padding:20px;">${htmlContent}</body></html>`,
    });

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Compartir ficha PDF',
      UTI: 'com.adobe.pdf',
    });
  } catch (error) {
    console.error('Error al exportar PDF:', error);
    throw error;
  }
}
