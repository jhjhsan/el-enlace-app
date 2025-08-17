const functions = require('firebase-functions');
const admin = require('firebase-admin');

const COLLS = ['profiles', 'profilesFree', 'profilesPro', 'profilesElite'];

exports.normalizeProfile = functions.firestore
  .document('{coll}/{doc}')
  .onWrite(async (change, context) => {
    const { coll } = context.params;
    if (!COLLS.includes(coll)) return null;

    const after = change.after.exists ? change.after.data() : null;
    if (!after) return null;

    const isEliteLike =
      coll === 'profilesElite' ||
      String(after.membershipType || '').toLowerCase() === 'elite' ||
      String(after.accountType || '').toLowerCase() === 'agency';

    const preferredName =
      (isEliteLike ? (after.agencyName || after.displayName) : null) ||
      after.name ||
      after.fullName ||
      after.displayName ||
      '';

    const updates = {};

    // Asegura displayName conforme al tipo de perfil
    if (!after.displayName && preferredName) {
      updates.displayName = String(preferredName).trim();
    }
    // Si es elite/agency y tiene agencyName distinto, refleja en displayName
    if (isEliteLike && after.agencyName && after.displayName !== after.agencyName) {
      updates.displayName = String(after.agencyName).trim();
    }

    if (Object.keys(updates).length === 0) return null;

    functions.logger.info('normalizeProfile', {
      path: `${coll}/${context.params.doc}`,
      updates
    });

    return change.after.ref.update(updates);
  });
