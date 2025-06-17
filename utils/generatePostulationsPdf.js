import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { convertImageToBase64 } from './convertImageToBase64';
import * as Asset from 'expo-asset';

export const generatePostulationsPdf = async (postulations) => {
  const logoAsset = Asset.Asset.fromModule(require('../assets/logo.png'));
  await logoAsset.downloadAsync(); // asegura que esté cargado
  const logoBase64 = await convertImageToBase64(logoAsset.localUri || logoAsset.uri);

  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial; font-size: 10px; padding: 10px; }
          .header {
            text-align: right;
            margin-bottom: 10px;
          }
          .header img {
            width: 60px;
            height: auto;
          }
          .card {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 6px;
          }
          img.profile {
            width: 50px;
            height: 50px;
            object-fit: cover;
            border-radius: 4px;
            margin-right: 8px;
          }
          .info { flex: 1; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logoBase64}" />
        </div>

        <h2>Postulaciones Recibidas</h2>
        ${postulations.map(p => `
          <div class="card">
            <img class="profile" src="${p.profilePhoto || 'https://via.placeholder.com/50'}" />
            <div class="info">
              <div><strong>${p.name}</strong> | Edad: ${p.age || '-'} | Estatura: ${p.estatura || '-'} cm | Camisa: ${p.shirtSize || '-'} / Pantalón: ${p.pantsSize || '-'} / Zapatos: ${p.shoeSize || '-'}</div>
              <div>Email: ${p.email || '-'} | Teléfono: ${p.phone || '-'}</div>
              <div>Instagram: ${p.instagram || '-'} | Color piel: ${p.skinColor || '-'} | Ojos: ${p.eyeColor || '-'} | Cabello: ${p.hairColor || '-'}</div>
              <div>Sexo: ${p.sexo || '-'} | Etnia: ${p.ethnicity || '-'} | Tatuajes: ${p.tattoos || '-'} | Piercings: ${p.piercings || '-'} | Región: ${p.region || '-'}</div>
              <div><a href="${p.bookPhotos?.[0] || '#'}">Galería</a> | 
                   <a href="${p.profileVideo || '#'}">Video presentación</a> | 
                   <a href="${p.acting1 || '#'}">Acting 1</a> | 
                   <a href="${p.acting2 || '#'}">Acting 2</a> | 
                   <a href="${p.acting3 || '#'}">Acting 3</a>
              </div>
            </div>
          </div>
        `).join('')}
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri);
  } else {
    alert('No se pudo compartir el PDF. El archivo se guardó en: ' + uri);
  }
};
