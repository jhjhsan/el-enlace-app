const functions = require("firebase-functions");
const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

// Configuración de Gmail desde Firebase config
const GMAIL_USER = functions.config().gmail.user;
const GMAIL_PASS = functions.config().gmail.pass;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,
  },
});

exports.sendTrialNotificationsCron = functions
  .pubsub.schedule("every 24 hours")
  .timeZone("America/Santiago")
  .onRun(async (context) => {
    console.log("🚀 Ejecutando cron de alerta de prueba gratuita...");

    try {
      const snapshot = await db.collection("users").get();
      const now = new Date();

      for (const doc of snapshot.docs) {
        const user = doc.data();
        const { email, trialEndsAt, hasPaid, alertSent } = user;

        if (!email || !trialEndsAt || hasPaid || alertSent) continue;

        const end = new Date(trialEndsAt);
        const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

        if (diffDays === 3) {
          const message = `⚠️ Hola, tu prueba gratuita de El Enlace termina en 3 días. Activa tu plan Elite para mantener todos los beneficios.`;

          const mailOptions = {
            from: `"El Enlace App" <${GMAIL_USER}>`,
            to: email,
            subject: "⏳ Tu prueba gratuita está por terminar",
            html: `<div style="font-family:sans-serif; font-size:15px; line-height:1.6;">
              <p>${message}</p>
              <p style="margin-top:30px;">— Equipo El Enlace</p>
            </div>`,
          };

          try {
            await transporter.sendMail(mailOptions);
            console.log(`📧 Correo enviado a: ${email}`);

            await doc.ref.update({ alertSent: true });
          } catch (err) {
            console.error(`❌ Error al enviar correo a ${email}:`, err);
          }
        }
      }

      console.log("✅ Cron finalizado con éxito.");
      return null;
    } catch (error) {
      console.error("❌ Error en función cron:", error);
    }
  });
