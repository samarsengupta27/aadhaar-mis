# Firestore Data Model — Aadhaar Daily Business MIS

This document is the single source of truth for the schema. Every page/component
in this app reads or writes shapes defined here. If you change a shape, update
this file in the same commit.

## Hierarchy

```
Circle (CO)
  └─ Region (RO)
       └─ Division (DO)
            └─ Centre (POAK)
                 └─ Operator (one active operator per centre at a time;
                                history of past operators retained)
```

For Assam Circle: 1 Circle → N Regions → 9–11 Divisions → many Centres.
(If your Circle does not use a Region layer between CO and Division, set
`regionId: null` everywhere and RO views simply won't be used. The schema
supports both with or without the Region tier.)

---

## Collections

### `users/{uid}`
One doc per login, keyed by Firebase Auth UID.

```js
{
  uid: string,
  role: "operator" | "do" | "ro" | "co",
  name: string,
  phone: string,
  email: string,
  // Scope fields — only the relevant ones are set per role:
  circleId: "ASM",              // always set
  regionId: string | null,       // set for ro, do, operator
  divisionId: string | null,     // set for do, operator
  centreId: string | null,       // set for operator only
  active: boolean,               // DO can deactivate an operator login
  engagementStartDate: string,   // "YYYY-MM-DD" — date this operator started at this centre
  engagementEndDate: string | null,
  createdBy: string,             // uid of DO/CO who created this login
  createdAt: Timestamp,
}
```

**No custom claims.** This project has no Cloud Functions (see README "Why
no Cloud Functions"), so `role`/`circleId`/`regionId`/`divisionId`/
`centreId` are read directly from this doc — both by the frontend
(`AuthContext.jsx`, via a live `onSnapshot` listener) and by Firestore
Security Rules (via `get()` on the caller's own `users/{uid}` doc). There
is no Auth custom-claims mirror; that pattern requires a server-side
Cloud Function to write the claims, which this project deliberately
doesn't use.

---

### `centres/{centreId}`
Master data for each Aadhaar centre (POAK). Managed by DO.

```js
{
  centreId: string,              // e.g. "ASM-DIB-001"
  name: string,                  // e.g. "Dibrugarh HO POAK"
  divisionId: string,
  regionId: string | null,
  circleId: "ASM",
  mappedPOId: string,            // fixed PO for cash deposit (per your spec)
  mappedPOName: string,
  status: "active" | "inactive",
  currentOperatorUid: string | null,
  dailyTarget: 40,                // transactions/working day — overridable per centre if ever needed
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

### `centres/{centreId}/operatorHistory/{entryId}`
Tracks every operator who has worked this centre (for "date from which
operator is engaged" requirement, including past operators).

```js
{
  uid: string,
  name: string,
  startDate: string,   // "YYYY-MM-DD"
  endDate: string | null,
}
```

---

### `rateCard/current`
Single Circle-wide rate card document (CO-managed). Versioned by date so
historical revenue calculations remain correct even if rates change later.

```js
{
  effectiveFrom: "YYYY-MM-DD",
  rates: {
    newEnrolment: 125,
    mandatoryUpdate: 125,
    demographicUpdate: 75,
    biometricUpdate: 125,
    mbu: 125,
  },
  gstNote: "Rates inclusive of GST; net-of-GST shown for reference only.",
  updatedBy: string,
  updatedAt: Timestamp,
}
```

### `rateCard/history/{effectiveFrom}`
Snapshot copies kept whenever CO updates the live rate card, so old EoD
entries can be recalculated/audited against the rate in force on that date.

---

### `holidays/{circleId}`
CO-managed holiday calendar. Applies uniformly to all divisions (per your spec).

```js
{
  circleId: "ASM",
  dates: {
    "2026-01-26": "Republic Day",
    "2026-08-15": "Independence Day",
    // ...
  },
  weeklyOff: [0],   // 0 = Sunday — "6 days a week" means Sunday is the weekly off
  updatedBy: string,
  updatedAt: Timestamp,
}
```

A day is a "working day" for target purposes iff:
`weekday not in weeklyOff` AND `date not in dates`.

---

### `eod/{centreId}_{date}`  — e.g. `ASM-DIB-001_2026-06-26`
The daily EoD entry. One doc per centre per date. This is the core
transactional record operators fill in.

```js
{
  centreId: string,
  date: "YYYY-MM-DD",
  divisionId: string,
  regionId: string | null,
  circleId: "ASM",
  submittedByUid: string,
  submittedAt: Timestamp,

  counts: {
    newEnrolment: number,
    mandatoryUpdate: number,
    demographicUpdate: number,
    biometricUpdate: number,
    mbu: number,
  },

  // computed at write time from rateCard/current, never edited directly by operator
  revenue: {
    newEnrolment: number,
    mandatoryUpdate: number,
    demographicUpdate: number,
    biometricUpdate: number,
    mbu: number,
    totalTransactions: number,          // sum of all counts
    cashCollectable: number,            // demo + enrolment revenue (operator collects this in cash)
    centralCollectable: number,        // biometric + MBU revenue (collected by UIDAI centrally)
    totalExpectedRevenue: number,       // cashCollectable + centralCollectable
  },

  cashDeposit: {
    amountCollected: number,   // = revenue.cashCollectable (derived, shown for clarity)
    amountDeposited: number,   // entered by operator — must be same-day per policy
    depositDate: "YYYY-MM-DD", // must equal `date` (same-day mandatory)
    poReceiptNo: string | null,
    variance: number,          // amountCollected - amountDeposited; 0 = clean, nonzero = flagged
  },

  status: "submitted" | "pending_approval" | "approved",
  // "submitted" = original, no edits yet, stands as final
  // "pending_approval" = an edit is awaiting DO action; the *original* values above remain live
  //                        until approved
  // "approved" = an edit was approved and is now reflected in the fields above

  // Present only when status is pending_approval or when an edit was ever made:
  pendingEdit: {
    counts: {...},          // proposed new counts
    cashDeposit: {...},     // proposed new deposit info
    reason: string,         // operator's note on why correcting
    submittedAt: Timestamp,
    submittedByUid: string,
  } | null,

  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

### `eod/{centreId}_{date}/auditLog/{entryId}`
Append-only audit trail of every edit submission and DO decision.

```js
{
  action: "edit_submitted" | "edit_approved" | "edit_rejected",
  byUid: string,
  byRole: string,
  at: Timestamp,
  before: {...} | null,   // relevant snapshot before
  after: {...} | null,    // relevant snapshot after
  note: string,
}
```

---

### `targets/{centreId}_{yyyymm}`
Monthly target, computed (40/working-day × working days that month from the
holiday calendar) on first view and cached here so repeat reads don't
recompute it. Computed client-side by `src/utils/targets.js`
(`getOrComputeTarget`) — there's no Cloud Function doing this server-side;
see README "Why no Cloud Functions." Any signed-in user can trigger the
computation and write the cache (it's non-privileged derived data, not a
security-sensitive write).

```js
{
  centreId: string,
  yyyymm: "2026-06",
  workingDays: number,
  dailyTarget: 40,
  monthlyTarget: number,     // workingDays * dailyTarget
  computedAt: Timestamp,
}
```

---

## Derived / rollup reads (no separate stored collection)

MIS views (Operator / Division / Region / Circle, MoM/QoQ/YoY, Achievement %)
are computed **entirely client-side** by querying `eod` with range filters
on `date` + equality filters on `centreId`/`divisionId`/`regionId`/
`circleId`, then aggregating in the browser. See `src/utils/rollups.js`.

There is no nightly pre-aggregation job and no `dailyRollups` collection in
active use — that would have required a scheduled Cloud Function, which
this project doesn't have. At Assam Circle's actual scale (9–11 divisions,
a few hundred centres), querying `eod` directly for a month or quarter's
range is fast enough that pre-aggregation isn't needed. If this were ever
scaled to thousands of centres across multiple circles, a pre-aggregation
layer would become worth the added complexity again — see README's
"Known follow-ups" for this noted as a future scaling consideration.

**Live "today" centre status** (total/functioning/not-functioning centres)
is computed the same way — live, via `useTodaysCentreStatus` in
`src/hooks/useFirestoreData.js`, which queries `centres` + today's `eod`
docs directly. This is cheap at Division/Region/Circle scale (tens to low
hundreds of centres) and gives DO/RO/CO an up-to-the-minute view of which
centres haven't reported yet today, including the actual centre IDs.
