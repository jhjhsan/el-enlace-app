// app.config.js  (reemplazo completo)
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...(config.android || {}),
    googleServicesFile: "./google-services.json",
  },
  ios: {
    ...(config.ios || {}),
    // usa el secreto si existe; si no, cae al archivo local
    googleServicesFile: process.env.GOOGLE_SERVICES_PLIST || "./GoogleService-Info.plist",
  },
});
