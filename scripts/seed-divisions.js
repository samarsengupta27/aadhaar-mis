// scripts/seed-divisions.js
//
// Bulk-creates Division Office (DO) logins and Centre (POAK) master records
// from a CSV file. Run scripts/seed.js first (needs the CO + rate card +
// holiday calendar to already exist).
//
// Usage:
//   node scripts/seed-divisions.js divisions.csv centres.csv
//
// divisions.csv columns: divisionId,divisionName,regionId,doEmail,doName,doPhone
// centres.csv columns:   centreId,centreName,divisionId,mappedPOId,mappedPOName
//
// Example divisions.csv:
//   divisionId,divisionName,regionId,doEmail,doName,doPhone
//   ASM-DIB,Dibrugarh Division,ASM-UPPER,do.dibrugarh@indiapost.gov.in,DO Dibrugarh,9000000001
//   ASM-GUW,Guwahati Division,ASM-LOWER,do.guwahati@indiapost.gov.in,DO Guwahati,9000000002
//
// Example centres.csv:
//   centreId,centreName,divisionId,mappedPOId,mappedPOName
//   ASM-DIB-001,Dibrugarh HO POAK,ASM-DIB,DIBHO,Dibrugarh HO
//   ASM-DIB-002,Tinsukia SO POAK,ASM-DIB,TSKSO,Tinsukia SO

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const CIRCLE_ID = 'ASM';

function parseCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8').trim();
  const [headerLine, ...lines] = raw.split('\n');
  const headers = headerLine.split(',').map((h) => h.trim());
  return lines
    .filter((l) => l.trim().length > 0)
    .map((line) => {
      const cells = line.split(',').map((c) => c.trim());
      const row = {};
      headers.forEach((h, i) => (row[h] = cells[i]));
      return row;
    });
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

async function createDoLogin(row) {
  let user;
  try {
    user = await admin.auth().createUser({
      email: row.doEmail,
      password: generateTempPassword(),
      displayName: row.doName,
    });
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      user = await admin.auth().getUserByEmail(row.doEmail);
      console.log(`  DO login for ${row.divisionId} already exists, reusing.`);
    } else {
      throw err;
    }
  }

  await db.doc(`users/${user.uid}`).set({
    uid: user.uid,
    role: 'do',
    name: row.doName,
    phone: row.doPhone || '',
    email: row.doEmail,
    circleId: CIRCLE_ID,
    regionId: row.regionId || null,
    divisionId: row.divisionId,
    centreId: null,
    active: true,
    engagementStartDate: new Date().toISOString().slice(0, 10),
    engagementEndDate: null,
    createdBy: 'seed-script',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return user.uid;
}

async function createCentre(row) {
  await db.doc(`centres/${row.centreId}`).set({
    centreId: row.centreId,
    name: row.centreName,
    divisionId: row.divisionId,
    regionId: null, // backfilled below from the division's regionId if known
    circleId: CIRCLE_ID,
    mappedPOId: row.mappedPOId || '',
    mappedPOName: row.mappedPOName || '',
    status: 'active',
    currentOperatorUid: null,
    dailyTarget: 40,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function main() {
  const [divisionsCsvPath, centresCsvPath] = process.argv.slice(2);
  if (!divisionsCsvPath || !centresCsvPath) {
    console.error('Usage: node scripts/seed-divisions.js divisions.csv centres.csv');
    process.exit(1);
  }

  const divisions = parseCsv(path.resolve(divisionsCsvPath));
  const centres = parseCsv(path.resolve(centresCsvPath));
  const divisionRegion = {};

  console.log(`Creating ${divisions.length} division(s)...`);
  const credentials = [];
  for (const row of divisions) {
    divisionRegion[row.divisionId] = row.regionId || null;
    const uid = await createDoLogin(row);
    credentials.push({ divisionId: row.divisionId, email: row.doEmail, uid });
    console.log(`  ✓ ${row.divisionId} — ${row.doEmail}`);
  }

  console.log(`\nCreating ${centres.length} centre(s)...`);
  for (const row of centres) {
    await createCentre(row);
    // backfill regionId from the division's region
    await db.doc(`centres/${row.centreId}`).update({ regionId: divisionRegion[row.divisionId] || null });
    console.log(`  ✓ ${row.centreId} — ${row.centreName}`);
  }

  console.log('\nDone. DO logins were created with random temporary passwords.');
  console.log('Use Firebase Console > Authentication to trigger password reset emails,');
  console.log('or call admin.auth().generatePasswordResetLink() per DO and share manually.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
