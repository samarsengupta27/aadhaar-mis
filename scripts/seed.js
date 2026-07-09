// scripts/seed.js
//
// One-time setup script: creates the initial rate card, holiday calendar,
// and the first Circle Office (CO) login. Run this once against your
// Firebase project after deploying Firestore security rules (no Cloud
// Functions deploy needed — this project doesn't use Cloud Functions;
// see README "Why no Cloud Functions").
//
// Usage:
//   1. Download a service account key from Firebase Console >
//      Project Settings > Service Accounts > Generate new private key.
//      Save it as scripts/serviceAccountKey.json (already gitignored).
//      Note: generating this key works on the free Spark plan — it does
//      NOT require Blaze/billing, since it's unrelated to Cloud Functions.
//   2. node scripts/seed.js
//
// This uses the Admin SDK, so it bypasses Firestore Security Rules —
// that's expected and fine for one-time bootstrap data.

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const CIRCLE_ID = 'ASM'; // Assam Circle

async function seed() {
  console.log('Seeding rate card...');
  await db.doc('rateCard/current').set({
    effectiveFrom: new Date().toISOString().slice(0, 10),
    rates: {
      newEnrolment: 125,
      mandatoryUpdate: 125,
      demographicUpdate: 75,
      biometricUpdate: 125,
      mbu: 125,
    },
    gstNote: 'Rates inclusive of GST.',
    updatedBy: 'seed-script',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('Seeding holiday calendar...');
  await db.doc(`holidays/${CIRCLE_ID}`).set({
    circleId: CIRCLE_ID,
    weeklyOff: [0], // Sunday
    dates: {
      '2026-01-26': 'Republic Day',
      '2026-08-15': 'Independence Day',
      '2026-10-02': 'Gandhi Jayanti',
      // Add Assam-specific and other gazetted holidays here.
    },
    updatedBy: 'seed-script',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('Creating Circle Office (CO) login...');
  const coEmail = process.env.CO_EMAIL || 'co.assam@indiapost.gov.in';
  const coPassword = process.env.CO_PASSWORD || 'ChangeMe123!';

  let coUser;
  try {
    coUser = await admin.auth().createUser({
      email: coEmail,
      password: coPassword,
      displayName: 'Circle Office, Assam',
    });
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      coUser = await admin.auth().getUserByEmail(coEmail);
      console.log('CO user already exists, reusing it.');
    } else {
      throw err;
    }
  }

  await db.doc(`users/${coUser.uid}`).set({
    uid: coUser.uid,
    role: 'co',
    name: 'Circle Office, Assam',
    phone: '',
    email: coEmail,
    circleId: CIRCLE_ID,
    regionId: null,
    divisionId: null,
    centreId: null,
    active: true,
    engagementStartDate: new Date().toISOString().slice(0, 10),
    engagementEndDate: null,
    createdBy: 'seed-script',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('\nDone.');
  console.log(`CO login: ${coEmail} / ${coPassword}`);
  console.log('Change this password after first login.');
  console.log('\nNext: use the CO login to create Division Office (DO) logins via the');
  console.log('"All Users" admin page, or run scripts/seed-divisions.js to bootstrap');
  console.log('your 9-11 divisions and centres from a CSV.');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
