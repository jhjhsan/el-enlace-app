const functions = require("firebase-functions");
const fetch = require("node-fetch");
const vision = require("@google-cloud/vision");

const client = new vision.ImageAnnotatorClient();

exports.validateMediaContent = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    const { imageUrl, base64Image } = data;

    // Validar entrada
    if (!imageUrl && !base64Image) {
      console.error("No input provided: imageUrl and base64Image are undefined");
      return { error: "Se debe proporcionar una URL válida o una imagen en base64." };
    }
    if (imageUrl && typeof imageUrl !== "string") {
      console.error("Invalid imageUrl type:", typeof imageUrl);
      return { error: "La URL debe ser una cadena válida." };
    }
    if (base64Image && typeof base64Image !== "string") {
      console.error("Invalid base64Image type:", typeof base64Image);
      return { error: "La imagen base64 debe ser una cadena válida." };
    }

    try {
      let buffer;

      if (imageUrl) {
        if (!imageUrl.startsWith("https://")) {
          console.error("Invalid URL format:", imageUrl);
          return { error: "La URL debe comenzar con https://." };
        }
        console.log("Fetching image from:", imageUrl);
        const imageResponse = await fetch(imageUrl, {
          headers: { Accept: "image/*" }
        });
        if (!imageResponse.ok) {
          console.error("Fetch failed:", imageResponse.status, imageResponse.statusText);
          throw new Error(`Fetch failed: ${imageResponse.status} ${imageResponse.statusText}`);
        }
        const contentType = imageResponse.headers.get("content-type");
        if (!contentType || !contentType.startsWith("image/")) {
          console.error("Invalid content type:", contentType);
          throw new Error("La URL no apunta a una imagen válida.");
        }
        buffer = await imageResponse.buffer();
        console.log("Image downloaded, buffer size:", buffer.length);
      } else {
        console.log("Processing base64 image, length:", base64Image.length);
        try {
          buffer = Buffer.from(base64Image, "base64");
        } catch (err) {
          console.error("Base64 decode error:", err.message);
          throw new Error("No se pudo decodificar la imagen base64.");
        }
      }

      if (!buffer || buffer.length === 0) {
        console.error("Empty or invalid buffer");
        throw new Error("El buffer de la imagen está vacío o es inválido.");
      }

      console.log("Running Google Cloud Vision analysis...");
      const [result] = await client.safeSearchDetection({ image: { content: buffer } });
      const detections = result.safeSearchAnnotation;
      console.log("Google Vision result:", JSON.stringify(detections, null, 2));

      const flagged =
        detections.adult === "LIKELY" ||
        detections.adult === "VERY_LIKELY" ||
        detections.violence === "LIKELY" ||
        detections.violence === "VERY_LIKELY" ||
        detections.racy === "VERY_LIKELY";

      return {
        flagged,
        categories: detections,
        valid: !flagged // Añadido para compatibilidad con validateImageWithIA
      };
    } catch (error) {
      console.error("Error analyzing content:", error.message, error.stack);
      return { error: `No se pudo analizar la imagen: ${error.message}` };
    }
  });