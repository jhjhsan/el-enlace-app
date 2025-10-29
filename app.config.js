// app.config.js
const fs = require('fs');

function pickPath(envValue, fallback) {
  // Si viene vacío o con el token @file:, ignóralo
  if (!envValue || String(envValue).startsWith('@file:')) {
    return fallback;
  }
  try {
    if (fs.existsSync(envValue)) return envValue;
  } catch {}
  return fallback;
}

module.exports = ({ config }) => {
  const androidEnv = process.env.GOOGLE_SERVICES_JSON;
  const iosEnv = process.env.GOOGLE_SERVICE_INFO_PLIST;

  const androidFallback = config?.android?.googleServicesFile || './google-services.json';
  const iosFallback = config?.ios?.googleServicesFile || './GoogleService-Info.plist';

  return {
    ...config,
    android: {
      ...(config.android || {}),
      googleServicesFile: pickPath(androidEnv, androidFallback),
    },
    ios: {
      ...(config.ios || {}),
      googleServicesFile: pickPath(iosEnv, iosFallback),
    },
  };
};
