// app.config.js
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    // En el builder de EAS usará el secreto (ruta temporal).
    // Localmente seguirá valiendo lo que tengas en app.json.
    googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST || config.ios?.googleServicesFile,
  },
});
