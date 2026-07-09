# Aadhaar Daily Business MIS — Assam Circle

A daily operations and revenue-reporting system for Aadhaar Enrolment Centres
(POAKs) under Department of Posts, Assam Circle. Operators log End-of-Day
(EoD) figures; Division, Region, and Circle offices see rolled-up MIS with
month-on-month, quarter-on-quarter, and year-on-year growth, target vs
achievement, and cash-deposit reconciliation.

Built with **React (Vite) + Firebase (Auth, Firestore, Hosting)** — runs
entirely on Firebase's **free Spark plan, no credit card required.**

See **`DATA_MODEL.md`** for the full Firestore schema and **`DESIGN.md`**
for the visual design rationale before touching any UI code.

---

## Why no Cloud Functions

Earlier versions of this project used Cloud Functions for server-side
revenue calculation, account creation, and approval workflows. That
required Firebase's Blaze (pay-as-you-go) plan, which requires a credit
card on file even though actual usage would stay near ₹0/month.

Since a card wasn't readily available, this build removes Cloud Functions
entirely and moves that logic to the browser (revenue calculation) and
Firestore Security Rules (access control, shape/ownership validation).
**The tradeoff**: rules can verify that the right person is writing to the
right record with sensibly-shaped numbers, but they cannot independently
re-verify that submitted revenue actually equals counts x rate the way a
trusted server function could — a technically capable user could in
principle submit a mismatched number undetected by rules alone.

This tradeoff was made deliberately because this system's stated purpose
is **internal monitoring** of revenue and performance against targets, not
an adversarial system where someone profits by defeating it — cash
collected is independently reconciled against Post Office deposit records
regardless of what this dashboard shows. If this system's purpose ever
expands to something with real adversarial incentive to falsify figures,
this decision should be revisited (most likely by reintroducing Cloud
Functions once billing is available).

One operational consequence: **creating an Operator login** can no longer
use the Admin SDK from a server function. Instead, the Division Office's
browser creates the account directly using a second, isolated Firebase
Auth session (see `src/firebase/config.js` -> `getSecondaryAuth` and
`src/utils/createOperator.js`) so that creating someone else's login
doesn't sign the DO out of their own session. This works entirely within
the free plan.

---

# Step-by-step installation

There are two phases now (no backend-functions deploy step):
**(A) one-time Firebase project setup**, done once ever; **(B) bootstrap
your data and deploy the app**, done once initially and again whenever you
redeploy the frontend.

Work through these in order — each step assumes the previous one is done.

## Phase A — One-time Firebase project setup

**A1. Install prerequisites** (skip anything you already have)
```bash
node --version        # need 20+; if missing, install from nodejs.org
npm install -g firebase-tools
```

**A2. Create a Firebase project**
Go to https://console.firebase.google.com -> "Add project" -> name it (e.g.
`aadhaar-mis-assam`) -> finish the wizard. Free, no card needed for project
creation itself.

**A3. Enable the two services this app uses**, inside your new project:
- **Build -> Authentication** -> "Get started" -> enable **Email/Password**
  sign-in method
- **Build -> Firestore Database** -> "Create database" -> **Standard
  edition** -> start in **production mode** -> pick a region near India
  (e.g. `asia-south1`) -> Create

Both of these are fully available on the free **Spark** plan — no upgrade
prompt, no card. (Cloud Functions would have required Blaze; this project
doesn't use Cloud Functions, so you can skip that entirely.)

**A4. Register a Web App** so you get a config object:
Project Settings (gear icon) -> scroll to "Your apps" -> click the `</>` Web
icon -> name it anything -> Register. Copy the `firebaseConfig` object
shown — you'll need it in A6.

**A5. Link this project folder to your Firebase project**
```bash
cd aadhaar-mis
firebase login
firebase use --add
# Pick the project you just created, give it the alias "default"
```

**A6. Fill in your environment file**
```bash
cp .env.example .env
```
Open `.env` and paste in the matching values from the `firebaseConfig`
object you copied in A4 (`apiKey` -> `VITE_FIREBASE_API_KEY`, etc.).

Phase A is now done — you won't repeat this unless you create a new
Firebase project from scratch.

## Phase B — Deploy security rules, bootstrap data, deploy the app

**B1. Install dependencies**
```bash
npm install
```

**B2. Deploy Firestore security rules and indexes**
```bash
firebase deploy --only firestore:rules,firestore:indexes
```
Re-run this any time you edit `firestore.rules`.

**B3. Get a service account key** (needed for the one-time seed scripts —
these use the Admin SDK to create your first logins, which bypasses
Security Rules for one-time bootstrap convenience. This is unrelated to
Cloud Functions/Blaze and works fine on the free plan.)
Project Settings -> Service Accounts tab -> "Generate new private key" ->
save the downloaded file as exactly `scripts/serviceAccountKey.json`
(already in `.gitignore`, never commit this file).

**B4. Seed the rate card, holiday calendar, and Circle Office (CO) login**
```bash
cd scripts
npm install
CO_EMAIL=co.assam@indiapost.gov.in CO_PASSWORD='SetAStrongPassword!' node seed.js
cd ..
```
Edit `scripts/seed.js` first if your actual rates or holiday list differ
from the placeholders. **Change the CO password after first login.**

**B5. Bulk-create your Divisions, DO logins, and Centres**
Prepare two CSV files matching the column headers shown in
`scripts/seed-divisions.js` (one row per division, one row per centre),
then:
```bash
node scripts/seed-divisions.js divisions.csv centres.csv
```
This creates one DO login per division (random temp password — share via
Firebase Console -> Authentication -> password reset link) and one master
record per centre. **You only run this once per division/centre batch** —
after this, each DO creates their own Operator logins from inside the app
(see "Why no Cloud Functions" above for how that works without a server).

**B6. Build and deploy the frontend**
```bash
npm run build
firebase deploy --only hosting
```
Firebase prints your live URL when this finishes (something like
`https://aadhaar-mis-assam.web.app`). That's the link operators, DOs, ROs,
and CO will use — see the printable access-instructions handout for how
operators add it to their phone's home screen.

**You're done.** Log in with the CO email/password from B4, then either
use the app's "Centres & Operators" pages going forward, or repeat B5 if
you have more divisions to bulk-import.

## Day-to-day: redeploying after a code change

- Changed only frontend code (`src/`)? -> just Phase B, step B6.
- Changed `firestore.rules`? -> Phase B, steps B2 then B6.

## Running locally before deploying (optional but recommended)

```bash
npm run dev
```
This runs against your **live** Firebase project by default (using the
`.env` from A6) — fine for solo testing, but be aware real data is being
read/written. For a fully isolated sandbox, use the Firebase Local
Emulator Suite instead:
```bash
firebase emulators:start
```
(requires pointing `src/firebase/config.js` at the emulators — see
[Firebase's emulator docs](https://firebase.google.com/docs/emulator-suite)
for the `connectFirestoreEmulator`/`connectAuthEmulator` calls to add).

## Cost

**Expected: ₹0/month, no card required.** This build runs entirely on
Firebase's free Spark plan — Authentication, Firestore, and Hosting are
all free at any reasonable usage level, and this project deliberately
avoids Cloud Functions (the one Firebase product that requires the paid
Blaze plan even at zero usage). At Assam Circle's scale (9–11 divisions,
a few hundred centres, ~250 operators submitting once daily), Firestore's
free quotas (50,000 reads/day, 20,000 writes/day) comfortably cover this
app's traffic.

---

## How the roles work

| Role | Created by | Sees |
|---|---|---|
| **Operator** | DO, for centres in their division | Only their own centre's data |
| **DO** (Division Office) | CO, or bulk-imported via script | All centres/operators/data in their division; approves corrections |
| **RO** (Regional Office) | CO | All divisions in their region |
| **CO** (Circle Office) | seed script (first one), then itself | Everything; manages rate card and holiday calendar |

If your Circle doesn't use a Region tier between CO and Division, leave
`regionId` as `null` everywhere — the RO views simply won't have anyone
assigned to them, and Division <-> Circle still works normally.

Role and scope (which division/region/centre someone belongs to) are read
directly from each user's `users/{uid}` Firestore profile doc — there are
no Firebase Auth custom claims in this build, since setting those requires
a Cloud Function. See "Why no Cloud Functions" above.

## Daily workflow

1. **Operator** logs in each evening, enters today's counts on the EoD form
   (laid out like your paper register). Revenue and cash-to-deposit are
   calculated automatically in the browser from the live rate card.
2. Cash from **New Enrolment + Demographic Update** must be deposited
   same-day at the centre's mapped Post Office; the operator records the
   deposited amount, and any shortfall/excess is flagged automatically.
3. If a mistake is found later, the operator submits a **correction**
   anytime — it sits as "pending approval" until their **DO approves or
   rejects** it. The original figures stay live until then.
4. **DO/RO/CO** view rolled-up MIS dashboards: totals, MoM/QoQ/YoY growth,
   and (for DO/Operator) target vs achievement against the 40-transactions-
   per-working-day target, auto-adjusted for the CO's holiday calendar.

## Reliability on mobile / patchy connectivity

Operators submit from mobile browsers, often on weak rural connections.
The EoD submission flow (`src/utils/submitWithRetry.js`) wraps every
Firestore write with:

- **Automatic retry with backoff** — transient network failures (timeout,
  offline, `unavailable`) retry up to 4 times with increasing delay, rather
  than failing on the first dropped packet.
- **A pending-submission queue in memory** — if the device is offline when
  "Submit" is tapped, the entry is held and retried automatically once the
  browser reports it's back online, instead of the operator losing their
  typed-in counts.
- **Idempotent submission** — `submitEod` (in `src/utils/eodActions.js`)
  checks for an existing `{centreId}_{date}` document before writing, so a
  retried request that actually succeeded the first time fails safely with
  a clear "already exists" message instead of double-counting transactions.
- **Clear status text** in the UI ("Retrying… (2/4)", "Saved offline, will
  submit when back online") so the operator isn't left guessing whether
  their entry went through.

## Scale: concurrent operator load

250 operators submitting once daily in an evening window is well within
this architecture's headroom:

- Each operator writes to a **different** Firestore document
  (`eod/{centreId}_{date}`) — no write contention.
- Firestore's free-tier write quota (20,000/day) is far above this app's
  actual daily volume even with corrections and approvals included.
- MIS pages compute totals live from `eod` rather than via a pre-aggregated
  rollup job (since there's no Cloud Functions scheduler) — this is fine at
  Division/Region/Circle scale; see "Known follow-ups" below for when that
  would need to change.

The actual bottleneck at this scale is each operator's own mobile network,
not Firebase — which is exactly what the retry/offline-queue layer above
is for.

## Known follow-ups / things to decide later

- **Region tier**: confirm whether Assam Circle actually has an RO layer
  between CO and Divisions, or whether `ro` role should be removed entirely.
- **Mandatory Update revenue classification**: the cash-vs-central split
  currently treats Mandatory Update as centrally collected (like Biometric/
  MBU), based on the clarification that only Demographic + Enrolment are
  cash-in-hand. If that's wrong for Mandatory Update specifically, the only
  place to change it is `computeRevenuePreview()` in `src/utils/constants.js`.
- **If a department card becomes available later**: Cloud Functions could
  be reintroduced to close the revenue-arithmetic verification gap
  described in "Why no Cloud Functions" above, and to add a scheduled
  pre-aggregation job if usage ever scales well beyond Assam Circle's
  current size (e.g. circle-wide across all of India Post).
- **Divisions Compare** and **All Users** admin pages are referenced in the
  nav but not yet built — natural next additions once the core daily flow
  is tested.
