const fs = require("fs");
const b64 = process.env.GOOGLE_SERVICES_JSON_BASE64;
if (!b64) { console.error("GOOGLE_SERVICES_JSON_BASE64 no está seteada"); process.exit(1); }
fs.writeFileSync("google-services.json", Buffer.from(b64, "base64"));
console.log("✅ google-services.json escrito en la raíz");
