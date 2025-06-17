const functions = require("firebase-functions");
const { initializeApp, getApps } = require("firebase-admin/app");

if (!getApps().length) {
  initializeApp();
}

const { analyzeAd } = require("./analyzeAd");
const { generateSuggestions } = require("./generateSuggestions");
const { interpretSearchPhrase } = require("./interpretSearchPhrase");
const { sendTrialEmail } = require("./sendTrialAlertEmail");
const { checkProfileUpdateReminder } = require("./checkProfileUpdateReminder");
const { analyzeCastingDocx } = require('./analyzeCastingDocx');
const { analyzeCastingImage } = require('./analyzeCastingImage');

exports.analyzeAd = analyzeAd;
exports.generateSuggestions = generateSuggestions;
exports.interpretSearchPhrase = interpretSearchPhrase;
exports.sendTrialEmail = sendTrialEmail;
exports.checkProfileUpdateReminder = checkProfileUpdateReminder;
exports.analyzeCastingDocx = analyzeCastingDocx;
exports.analyzeCastingImage = analyzeCastingImage;