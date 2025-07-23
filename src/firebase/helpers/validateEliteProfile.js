export const validateEliteProfile = (profile) => {
  const observations = [];

  // Validar nombre de agencia
  if (!profile.agencyName || profile.agencyName.trim().length < 3) {
    observations.push("Agrega el nombre de la agencia o marca con al menos 3 caracteres.");
  }

  // Validar representante
  if (!profile.representative || profile.representative.trim().length < 3) {
    observations.push("Especifica el nombre del representante o encargado.");
  }

  // Validar logo
  if (!profile.profilePhoto || !profile.profilePhoto.startsWith('http')) {
    observations.push("Debes subir el logo o foto institucional de la agencia.");
  }

  // Validar región y ciudad
  if (!profile.region || profile.region.trim() === '') {
    observations.push("Selecciona una región válida.");
  }
  if (!profile.city || profile.city.trim() === '') {
    observations.push("Agrega una ciudad para ubicar tu agencia.");
  }
if (!profile.companyType || profile.companyType.trim() === '') {
  observations.push("Selecciona un tipo de empresa.");
}

  // Validar email
  if (!profile.email || !profile.email.includes('@')) {
    observations.push("Correo electrónico inválido o ausente.");
  }

  // Validar teléfono
  if (!profile.phone || profile.phone.trim().length < 6) {
    observations.push("Teléfono de contacto inválido o muy corto.");
  }

  // Validar Instagram
  if (profile.instagram && !/^https?:\/\//.test(profile.instagram)) {
    observations.push("El enlace de Instagram parece inválido. Usa el formato https://...");
  }

  // Validar descripción
  if (!profile.description || profile.description.trim().length < 30) {
    observations.push("La descripción es muy breve. Agrega más información sobre tu agencia, experiencia y enfoque.");
  }

  // Validar video (opcional)
  if (profile.profileVideo && !profile.profileVideo.startsWith('http')) {
    observations.push("El video cargado no parece ser un enlace válido.");
  }

  // Validar sitio web
  if (profile.webLink && !/^https?:\/\//.test(profile.webLink)) {
    observations.push("El enlace de tu sitio web es inválido.");
  }

  return observations;
};
