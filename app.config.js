// app.config.js
module.exports = ({ config }) => {
  return {
    ...config,
    android: {
      ...(config.android || {}),
      // Forzar el archivo local (sin @file:)
      googleServicesFile: "./google-services.json",
    },
    ios: {
      ...(config.ios || {}),
      googleServicesFile: "./GoogleService-Info.plist",
    },
  };
};
