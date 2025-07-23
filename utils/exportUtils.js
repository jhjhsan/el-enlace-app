import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as MailComposer from 'expo-mail-composer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../src/firebase/firebaseConfig';

// 🔼 Subir archivo a Firebase Storage
export async function uploadFileToFirebase(fileUri, fileName, folder = 'exports') {
  const response = await fetch(fileUri);
  const blob = await response.blob();
  const storageRef = ref(storage, `${folder}/${fileName}`);
  await uploadBytes(storageRef, blob);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

// 📄 Generar y exportar PDF completo con diseño profesional
export async function exportApplicationsToPDF(castingId, castingTitle = 'Casting sin título', onSuccess) {
  try {
    const data = await AsyncStorage.getItem('applications');
    const allApplications = data ? JSON.parse(data) : [];
    const applications = allApplications.filter(app => app.castingId === castingId);
    if (applications.length === 0) throw new Error('No hay postulaciones para exportar.');

    const htmlContent = applications.map((item, index) => {
      const profile = item.profile || {};
      const formattedDate = new Date(item.timestamp).toLocaleString();

      const videoLinks = (item.videos || []).map((v, i) => `<li><a href="${v}">Acting ${i + 1}</a></li>`).join('');

      return `
        <div style="border:1px solid #ccc; padding:20px; margin-bottom:20px; border-radius:10px;">
          <h2 style="color:#D8A353;">Postulación #${index + 1}</h2>
          <p><strong>🕒 Fecha:</strong> ${formattedDate}</p>
          <p><strong>🎬 Casting:</strong> ${castingTitle}</p>
          <hr/>
          <p><strong>Nombre:</strong> ${profile.name || ''}</p>
          <p><strong>Email:</strong> ${profile.email || ''}</p>
          <p><strong>Edad:</strong> ${profile.age || ''}</p>
          <p><strong>Sexo:</strong> ${profile.sex || ''}</p>
          <p><strong>Estatura:</strong> ${profile.height || ''}</p>
          <p><strong>Categorías:</strong> ${(profile.categories || []).join(', ')}</p>
          ${profile.profilePhoto ? `<img src="${profile.profilePhoto}" width="100" style="border-radius:8px;" />` : ''}
          <p><strong>Video Presentación:</strong> <a href="${profile.presentationVideo || '#'}">Ver video</a></p>
          <p><strong>Videos Acting:</strong></p>
          <ul>${videoLinks}</ul>
        </div>
      `;
    }).join('');

    const { uri } = await Print.printToFileAsync({
      html: `<html><body style="font-family:sans-serif; padding:20px;">${htmlContent}</body></html>`
    });

    const asset = await MediaLibrary.createAssetAsync(uri);
    await MediaLibrary.createAlbumAsync('ElEnlace', asset, false);
    await Sharing.shareAsync(uri);

    const fileName = `postulaciones_${Date.now()}.pdf`;
    await uploadFileToFirebase(uri, fileName);

    if (onSuccess) onSuccess();
  } catch (error) {
    console.error('Error al exportar PDF:', error);
    throw error;
  }
}

// 📤 Enviar PDF por correo
export async function sendPDFByEmail(castingId, castingTitle = 'Casting sin título', recipientEmail = '') {
  try {
    const data = await AsyncStorage.getItem('applications');
    const allApplications = data ? JSON.parse(data) : [];
    const applications = allApplications.filter(app => app.castingId === castingId);
    if (applications.length === 0) throw new Error('No hay postulaciones para exportar.');

    const htmlContent = applications.map((item, index) => {
      const profile = item.profile || {};
      const formattedDate = new Date(item.timestamp).toLocaleString();

      const videoLinks = (item.videos || []).map((v, i) => `<li><a href="${v}">Acting ${i + 1}</a></li>`).join('');

      return `
        <div>
          <h3>Postulación #${index + 1}</h3>
          <p><strong>Fecha:</strong> ${formattedDate}</p>
          <p><strong>Nombre:</strong> ${profile.name || ''}</p>
          <p><strong>Email:</strong> ${profile.email || ''}</p>
          <p><strong>Edad:</strong> ${profile.age || ''}</p>
          <p><strong>Sexo:</strong> ${profile.sex || ''}</p>
          <p><strong>Categorías:</strong> ${(profile.categories || []).join(', ')}</p>
          <p><strong>Video Presentación:</strong> <a href="${profile.presentationVideo || '#'}">Ver video</a></p>
          <ul>${videoLinks}</ul>
        </div><br/>
      `;
    }).join('');

    const { uri } = await Print.printToFileAsync({
      html: `<html><body>${htmlContent}</body></html>`
    });

    await MailComposer.composeAsync({
      recipients: [recipientEmail],
      subject: `Postulaciones para: ${castingTitle}`,
      body: 'Adjunto encontrarás el resumen de postulaciones en PDF.',
      attachments: [uri],
    });
  } catch (error) {
    console.error('Error al enviar PDF por correo:', error);
    throw error;
  }
}
