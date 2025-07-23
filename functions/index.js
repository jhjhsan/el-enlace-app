const functions = require("firebase-functions");
const { initializeApp, getApps } = require("firebase-admin/app");

if (!getApps().length) {
  initializeApp();
}

const { generateSuggestions } = require("./generateSuggestions");
exports.generateSuggestions = generateSuggestions;

const { analyzeAd } = require("./analyzeAd");
exports.analyzeAd = analyzeAd;

const { interpretSearchPhrase } = require("./interpretSearchPhrase");
exports.interpretSearchPhrase = interpretSearchPhrase;

const { sendTrialAlertEmail } = require("./sendTrialAlertEmail");
exports.sendTrialAlertEmail = sendTrialAlertEmail;

const { validateMediaContent } = require("./validateMediaContent");
exports.validateMediaContent = validateMediaContent;

const { analyzeCastingDocx } = require("./analyzeCastingDocx");
exports.analyzeCastingDocx = analyzeCastingDocx;

const { analyzeCastingImage } = require("./analyzeCastingImage");
exports.analyzeCastingImage = analyzeCastingImage;

const { sendTrialNotificationsCron } = require("./sendTrialNotificationsCron");
exports.sendTrialNotificationsCron = sendTrialNotificationsCron;

const { sendCastingPushNotifications } = require("./sendCastingPushNotifications");
exports.sendCastingPushNotifications = sendCastingPushNotifications;

const { sendMessagePushNotifications } = require("./sendMessagePushNotifications");
exports.sendMessagePushNotifications = sendMessagePushNotifications;

const { sendServicePushNotifications } = require("./sendServicePushNotifications");
exports.sendServicePushNotifications = sendServicePushNotifications;

const { sendFocusPushNotifications } = require("./sendFocusPushNotifications");
exports.sendFocusPushNotifications = sendFocusPushNotifications;

const { syncFocusToFirestore } = require("./syncFocusToFirestore");
exports.syncFocusToFirestore = syncFocusToFirestore;