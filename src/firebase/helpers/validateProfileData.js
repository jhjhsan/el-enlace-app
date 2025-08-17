// src/firebase/helpers/validateProfileData.js
export const validateProfileData = (profile) => {
  const suggestions = [];

  // Descripción
  if (!profile.description || profile.description.trim().length < 30) {
    suggestions.push(
      "La descripción es muy breve. Agrega detalles sobre experiencia, logros o enfoque profesional."
    );
  }

  // Fotos
  if (!Array.isArray(profile.bookPhotos) || profile.bookPhotos.length < 2) {
    suggestions.push(
      "Agrega al menos 2 fotos de calidad para mostrar tu presencia escénica o fotogénica."
    );
  }

  // Video
  if (!profile.profileVideo || typeof profile.profileVideo !== "string" || !profile.profileVideo.startsWith("http")) {
    suggestions.push("Incluye un video de presentación que muestre tu voz, presencia y estilo.");
  }

// Validar Instagram (acepta https://, @usuario, o usuario simple)
if (typeof profile.instagram === 'string' && profile.instagram.trim().length > 0) {
  const ig = profile.instagram.trim();
  const ok =
    /^https?:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/i.test(ig) || // URL completa
    /^@[A-Za-z0-9._]+$/.test(ig) ||                                        // @usuario
    /^[A-Za-z0-9._]+$/.test(ig);                                           // usuario
  if (!ok) {
    observations.push("El Instagram parece inválido. Usa URL, @usuario o solo el usuario.");
  }
}

  // Sitio web
  if (profile.webLink && !/^https?:\/\//.test(profile.webLink)) {
    suggestions.push("El enlace de tu sitio web es inválido. Verifica que tenga el formato correcto.");
  }

  // Coherencia edad/categoría (ejemplo)
  if (profile.age && profile.category) {
    const categories = Array.isArray(profile.category) ? profile.category : [profile.category];
    const ageNum = Number(profile.age); // por si viene como string
    if (!Number.isNaN(ageNum) && ageNum < 12 && categories.map(c => String(c).toLowerCase()).includes("actor adulto")) {
      suggestions.push("La edad no coincide con la categoría seleccionada. Revisa tu información.");
    }
  }

  // Opcional: un veredicto simple para mostrar badge/estado
  const verdict = suggestions.length === 0 ? "Perfil sólido" : "";

  return { suggestions, verdict };
};
