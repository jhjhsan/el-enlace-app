const functions = require("firebase-functions");
const { initializeApp, getApps } = require("firebase-admin/app");
const nodemailer = require("nodemailer");

// Inicializa Firebase Admin solo si no está activo
if (!getApps().length) {
  initializeApp();
}

// Credenciales seguras desde config
const GMAIL_USER = functions.config().gmail.user;
const GMAIL_PASS = functions.config().gmail.pass;

// Configuración del transporter con Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,
  },
});

// Función callable adaptada a Gen 2
exports.sendTrialAlertEmail = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" }) // ⚙️ Config mínima para Gen 2
  .region("us-central1")
  .https.onCall(async (data, context) => {
    const { to, subject, message } = data;

    if (!to || !subject || !message) {
      return { error: "Faltan campos requeridos: to, subject o message." };
    }

    const mailOptions = {
      from: `"El Enlace App" <${GMAIL_USER}>`,
      to,
      subject,
      html: `<div style="font-family:sans-serif; font-size:15px; line-height:1.6;">
        <p>${message}</p>
        <p style="margin-top:30px;">— Equipo El Enlace</p>
      </div>`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("✅ Correo enviado correctamente a:", to);
      return { success: true };
    } catch (error) {
      console.error("❌ Error al enviar correo:", error);
      return { error: "No se pudo enviar el correo. Verifica las credenciales o el destinatario." };
    }
  });
