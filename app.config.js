// app.config.js (reemplazo completo)
const base = require("./app.json"); // reutiliza tu app.json existente

module.exports = () => {
  const expo = base.expo || base;
  return {
    expo: {
      ...expo,
      android: {
        ...(expo.android || {}),
        googleServicesFile: "./google-services.json",
      },
      ios: {
  ...(config.ios || {}),
  googleServicesFile: process.env.GOOGLE_SERVICES_PLIST || "./GoogleService-Info.plist",
},
    },
  };
};
