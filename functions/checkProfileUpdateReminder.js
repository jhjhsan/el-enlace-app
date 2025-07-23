// ✅ Archivo: checkProfileUpdateReminder.js
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Inicializa Firebase Admin si no está activo
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

// ⚠️ DEFINE la función con nombre
exports.checkProfileUpdateReminderV2 = onSchedule(
  {
    schedule: "every monday 07:00",
    timeZone: "America/Santiago",
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    console.log("🔄 Revisando perfiles para recordar actualización...");

    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    try {
      const collections = ["profiles", "profilesPro"];
      for (const col of collections) {
        const snapshot = await db.collection(col).get();
        for (const doc of snapshot.docs) {
          const profile = doc.data();
          const { email, membershipType, lastUpdatedAt } = profile;

          if (!email || !lastUpdatedAt || membershipType === "free") continue;

          const lastUpdateDate = new Date(lastUpdatedAt);
          if (lastUpdateDate < sixMonthsAgo) {
            const alertRef = db
              .collection("updateAlerts")
              .doc(email.toLowerCase());

            await alertRef.set({
              email,
              message:
                "💡 Han pasado más de 6 meses desde tu última actualización. ¡Renueva tu book para mantenerte vigente!",
              timestamp: now.toISOString(),
            });

            console.log(`📌 Alerta guardada para: ${email}`);
          }
        }
      }

      console.log("✅ Revisión completada.");
    } catch (err) {
      console.error("❌ Error en función de recordatorio:", err);
    }
  }
);
