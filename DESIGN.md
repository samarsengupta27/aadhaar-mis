# Visual Design Rationale

This app is an internal government MIS, not a consumer product — the design
choices below optimize for daily legibility on low-end Android phones and
trustworthiness of numeric data, not visual flash.

## Palette

| Token | Hex | Used for |
|---|---|---|
| `--maroon` | `#7A1F2B` | Brand/primary actions, sidebar, headers |
| `--cream` | `#F6F1E7` | Page background (warm "ledger paper" tone) |
| `--ink` | `#1F2D24` | Body text (deep ink-green, not pure black) |
| `--ochre` | `#C98A2C` | Targets, achievement, pending states |
| `--teal` | `#2E6B5E` | Positive/approved/functioning states |
| `--flag` | `#A8323D` | Variance, non-functioning, rejected states |

Rationale: maroon is the closest match to India Post's own visual identity
without copying a protected mark exactly. Cream-over-ink (rather than
white-over-black) was chosen because the whole app is fundamentally a
digitized paper register — operators are translating a familiar physical
form (see the original "Division Wise Aadhaar Transaction Summary" sheet)
into this tool, so the visual language echoes that register/ledger feel
rather than a generic SaaS dashboard.

## Type

- **Source Serif 4** for headings — gives the "gazette/register" character
  appropriate to a government reporting tool.
- **Inter** for body and form text — clean, highly legible at small sizes on
  cheap phone screens, wide language support.
- **JetBrains Mono** for IDs, currency, and counts — `font-variant-numeric:
  tabular-nums` is applied so columns of numbers align vertically, which
  matters when an operator or DO is scanning a table of figures.

## Signature elements

- **Ledger-row EoD form**: the daily entry form is laid out as numbered
  rows (1–5) mirroring the paper form's particulars/number structure,
  with a bold total row pinned at the bottom — so operators who already
  know the paper form recognize the digital one immediately.
- **Postal-stamp status badges** (`.stamp` class): circular-bordered,
  monospace, uppercase badges for Submitted / Pending Approval / Approved /
  Flagged — a small nod to a real postal-department visual object (the
  date stamp) used sparingly for entry/correction status only.

## Layout

- Fixed maroon sidebar + cream content area, consistent across all roles —
  navigation items differ by role (see `AppLayout.jsx`) but the shell stays
  the same so switching roles (e.g. a DO checking an operator's view) feels
  like the same app, not a different product.
- Cards (`.card`) are the only container pattern used for grouped content —
  no nested panels, no shadows-on-shadows — to keep the page calm and easy
  to scan at a glance on a small screen.
