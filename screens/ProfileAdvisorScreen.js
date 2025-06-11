// En functions/index.js o archivo separado
exports.analyzeProfile = onCall(async (data, context) => {
  const profile = data.profile;

  if (!profile || !profile.description || !profile.category) {
    return { error: "Perfil incompleto. Faltan campos clave." };
  }

  const prompt = `
Actúa como un asesor experto en perfiles profesionales. Evalúa si este perfil está correctamente completo, identifica faltantes, mejoras en descripción, calidad del contenido visual y ofrece sugerencias concretas para mejorarlo.

Perfil:
${JSON.stringify(profile, null, 2)}

Responde en formato de diagnóstico claro y breve.
`;

  try {
    const response = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      max_tokens: 600,
    });

    return { analysis: response.choices[0].message.content };
  } catch (err) {
    console.error("❌ Error en análisis de perfil:", err);
    return { error: "No se pudo analizar el perfil." };
  }
});
