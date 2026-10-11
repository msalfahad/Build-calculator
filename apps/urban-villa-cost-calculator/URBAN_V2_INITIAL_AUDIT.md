# Urban Villa Cost Calculator — V2 Initial Audit

**Date:** 2026-10-11 · **Audited version:** V1, commit `7a0073a` (tag `v1-working-baseline`, branch `feature/urban-villa-cost-calculator`)
**V2 work branch:** `feature/urban-villa-v2` · **Git status before V2:** clean working tree

## Method

1. Read the repository, `URBAN_CALCULATOR_IMPLEMENTATION_REPORT.md`, the engine (`src/calculators/*`), the ratebook (`src/data/ratebook.json`) and the research data.
2. Ran the existing suites: **79/79 unit tests and 22/22 browser tests passed** (2 PDF tests skipped on iPhone by design).
3. Rebuilt and opened the app at 390 px (iPhone 13) and 1280 px, in both languages.
4. Regenerated both PDFs and inspected them as images. Also extracted their text with `pdftotext` to find untranslated strings.

Repository scope: the repo contains only this app. There is no BOQ/QTO engine, DWG/DXF reader or S8.7 code here to protect, and none was touched.

## Classification key

- **BUG** — confirmed defect.
- **MISSING** — planned functionality not built.
- **IMPROVE** — existing feature needs improvement.
- **RESEARCH** — research limitation.
- **WAIT-PRICING** — must wait for verified Kuwait pricing.

## Audit table

| # | Feature | Existing behaviour | Expected behaviour | Problem | Class | Priority | Proposed fix |
|---|---|---|---|---|---|---|---|
| 1 | Formula descriptions (breakdown, report, JSON) | One `basis` string per line, built from the **mid** values, e.g. "960 m² × 150 KWD/m²", shown beside low 129,600 and high 163,200 | Each scenario shows its own formula: 960 × 135 = 129,600 · 960 × 150 = 144,000 · 960 × 170 = 163,200. Design/contingency show their own scenario base. | The displayed maths contradicts the low/high amounts | BUG | **P0** | Engine emits per-scenario basis params (`basisBy.low/mid/high`). UI, PDF and JSON render them per scenario. Tests assert all three formulas. |
| 2 | Arabic PDF language | Preset project name, fixed-fee label "Permits & fees (illustrative)", rate inclusions/exclusions and some notes print in English. "(VR-02:)" punctuation misplaced by bidi. | App-defined text in Arabic. Source names and identifiers in English but bidi-isolated. | Mixed-language sentences and broken punctuation | BUG | **P0** | Arabic fields for rate inclusions, exclusions and notes. Localised preset names and fee labels. `<bdi>` around identifiers, dates and formulas. Re-verify the actual PDF. |
| 3 | Construction vs owner budget | Results cards show construction low/typical/high; the owner budget appears only as a small "low – high" line | Two clear rows: construction cost L/T/H and total owner budget L/T/H, each defined | Owner budget range under-presented, so the two can be confused | IMPROVE | **P0** | Two labelled card rows. The breakdown separates "Construction cost" from "Owner's additional expenditure". |
| 4 | Partial estimate wording | "Partial estimate. Some items are not yet priced…" | "Partial estimate — unpriced items remain", repeated next to every total | Mostly correct; wording not explicit enough on totals | IMPROVE | P1 | Standard label on cards, totals and PDF. |
| 5 | Single-value rates (MFatah, manual) | Low = typical = high shown in three identical cards | Show "no published range"; do not imply measured uncertainty | Implies a range or uncertainty that does not exist | BUG | **P0** | When the range is unavailable, the low/high cards read "No published range". The report and JSON flag `rangeAvailable:false`. |
| 6 | Typical KWD/m² with unpriced basement | Fixed at the end of V1 (excludes unpriced basement area) | — | — | (fixed) | — | Keep the test. |
| 7 | Default "included in baseline" flag on upgrades | Kitchen, aluminium, facade and AC default to "included in baseline" for turnkey, although the default rates have no scope data | Assume no included allowance without supporting scope data | Default asserts an inclusion that the published rates do not document | BUG | P1 | Default to "extra" unless the selected rate declares the component included. Scope-ownership matrix (#12). |
| 8 | Rate metadata | No trade category, work description, location/country, approver, last-reviewed date or evidence status (only approval status) | Full provenance fields (Phase 4.2) and the 8-value evidence-status system | Insufficient traceability | MISSING | P1 | Ratebook schema v2 with migration from v1. |
| 9 | Freshness warnings | Stale only by age (>365 days) or past `valid_until` | Also: missing dates, unverified method, incompatible units, other countries, excludes installation, expired quotation | Incomplete warnings | IMPROVE | P1 | A `rateQualityIssues` extension, shown in the admin and in results. |
| 10 | Admin security | localStorage, no authentication; anyone can approve | Approval needs a named approver. A public build must be read-only, and production needs backend auth. | Unsafe if deployed | IMPROVE (gate) | P1 | `VITE_PUBLIC_BUILD=true` disables the admin and editing. Approval requires an approver name and is logged. Backend auth is documented as a pre-deployment requirement. |
| 11 | Refined estimate (Level 2) | Not present | Optional 3–8 minute specification step: structure, architectural, MEP, external | Not built | MISSING | P1 | New optional wizard step driven by a component catalogue. Each answer changes a calculation, sets inclusion/exclusion, or flags an item for quotation. |
| 12 | Scope-ownership matrix | Additions only know "included in baseline" | Each component is: included in baseline / not included / owner-direct / provisional allowance / upgrade / needs quotation | No consistent ownership model | MISSING | P1 | `status` on each scope item, applied by the engine; matrix shown in results and the report. |
| 13 | Upgrade allowance as a unit rate | Allowance only as a lump sum | Also `qty × standard rate` (e.g. 30 m² × 60 = 1,800) | Less convenient; example in brief not directly enterable | IMPROVE | P2 | `standardRate` field; allowance = qty × standardRate. |
| 14 | Cost-type labels | Lines unlabelled | Distinguish calculated trade cost (qty × rate), estimated allowance, area-rate estimate, percentage, budget allocation | Reader cannot tell measured from assumed | IMPROVE | P1 | A `kind` on each line, shown as a badge. No budget allocations are produced (none are supported). |
| 15 | Saved-estimate reproducibility | Reopen recalculates with the **current** ratebook; the stored rate snapshot is not used | Can reproduce the saved figures exactly from the saved inputs and rate snapshot | Not reproducible after rate edits | BUG | P1 | "Recalculate with saved rates" builds a ratebook overlay from the snapshot. Test that it reproduces exactly. |
| 16 | PDF structure | One long flow (3 pages) | Page 1 executive summary · page 2 calculations · page 3 specifications and limitations (more pages if needed) | Hard to read; key numbers not up front | IMPROVE | P1 | Restructure with page breaks; per-scenario calculation table; matrix of inclusions/exclusions. |
| 17 | Admin quotation comparison, approval, history, calibration | Rates table, editor, log only | Compare quotations for the same item, approve, per-rate history, completed-project comparison | Missing workflows | MISSING | P2 | New admin tabs: Compare, History filter, Calibration (APE per project; blank until real data). |
| 18 | Calibration against real projects | None | Template plus APE calculation with scope normalisation; no accuracy claims without data | Missing | MISSING | P2 | `CALIBRATION_TEMPLATE.csv` and an in-app calibration tab. |
| 19 | Research evidence screenshots | Stored in the package but not referenced in the app or repo | Preserved with the observations | Evidence trail incomplete | IMPROVE | P2 | Copy them to `docs/research/evidence/` and list filenames per observation. |
| 20 | Competitor source evidence | Rates recorded from competitor pages; their underlying evidence never investigated | Source audit with evidence status per claim | Unknown provenance | RESEARCH | P1 | Phase 3 research documents. |
| 21 | Urban-approved rates | None exist | Urban quotations / final accounts | Cannot produce approved estimates | WAIT-PRICING | — | Ratebook method and data-gap register; app already prefers approved rates once entered. |
| 22 | Structure-only, finishing-only and basement rates | None (blocked or unpriced by design) | Scope-matched Kuwait rates | Cannot price these scopes without manual entry | WAIT-PRICING | — | Keep blocking; collect quotations. |
| 23 | Location, floor-height and floor-position coefficients | Recorded, not applied | Applied only if calibrated | No data | WAIT-PRICING | — | Keep disclosed as not applied. |
| 24 | Mobile usability | Good after V1 fixes; long wizard steps on iPhone | Same, plus the new step | — | IMPROVE | P2 | Collapsible groups in the refined step. |

## Preserved functionality (must not regress)

- Quick estimate (Level 1) wizard and the 170,600 reference.
- Blocked/partial/complete status model.
- Exact reconciliation assertion.
- Separately priced basement.
- Bilingual RTL/LTR.
- Saved estimates and JSON import/export.
- Rate library CRUD and change log.
- Research screen.
- All 79 unit and 22 e2e tests.
