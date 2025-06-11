const functions = require("firebase-functions");
const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

exports.checkProfileUpdateReminder = functions
  .runWith({ timeoutSeconds: 60, memory: "512MB" })
  .region("us-central1")
  .pubsub.schedule("every monday 07:00") // 📅 Revisión semanal
  .timeZone("America/Santiago")
  .onRun(async (context) => {
    console.log("🔄 Revisando perfiles para recordar actualización...");

    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    try {
      const collections = ["profiles", "profilesPro"]; // Free y Pro
      for (const col of collections) {
        const snapshot = await db.collection(col).get();
        for (const doc of snapshot.docs) {
          const profile = doc.data();
          const { email, membershipType, lastUpdatedAt } = profile;

          if (
            !email ||
            !lastUpdatedAt ||
            membershipType === "free" // 🔒 No aplica para Free
          )
            continue;

          const lastUpdateDate = new Date(lastUpdatedAt);
          if (lastUpdateDate < sixMonthsAgo) {
            // Guardar recordatorio como alerta interna
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
      return null;
    } catch (err) {
      console.error("❌ Error en función de recordatorio:", err);
    }
  });
