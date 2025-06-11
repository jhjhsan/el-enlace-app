// helpers/validateProfileData.js

export const validateProfileData = (profile) => {
  const observations = [];

  // Validar descripción
  if (!profile.description || profile.description.trim().length < 30) {
    observations.push("La descripción es muy breve. Agrega detalles sobre experiencia, logros o enfoque profesional.");
  }

  // Validar fotos
  if (!Array.isArray(profile.bookPhotos) || profile.bookPhotos.length < 2) {
    observations.push("Agrega al menos 2 fotos de calidad para mostrar tu presencia escénica o fotogénica.");
  }

  // Validar video
  if (!profile.profileVideo || typeof profile.profileVideo !== 'string' || !profile.profileVideo.startsWith('http')) {
    observations.push("Incluye un video de presentación que muestre tu voz, presencia y estilo.");
  }

  // Validar Instagram
  if (profile.instagram && !/^https?:\/\//.test(profile.instagram)) {
    observations.push("El enlace de Instagram parece inválido. Asegúrate de que comience con https://");
  }

  // Validar sitio web
  if (profile.webLink && !/^https?:\/\//.test(profile.webLink)) {
    observations.push("El enlace de tu sitio web es inválido. Verifica que tenga el formato correcto.");
  }

  // Validar coherencia entre edad y categoría
  if (profile.age && profile.category) {
    const categories = Array.isArray(profile.category) ? profile.category : [profile.category];
    if (profile.age < 12 && categories.includes('actor adulto')) {
      observations.push("La edad no coincide con la categoría seleccionada. Revisa tu información.");
    }
  }

  return observations;
};
