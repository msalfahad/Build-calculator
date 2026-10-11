# Urban Villa Cost Calculator — V2 Implementation Report

**Date:** 2026-10-11 · **Branch:** `feature/urban-villa-v2` (from V1 `7a0073a`, tagged `v1-working-baseline`) · **Engine:** 2.0.0 · **Ratebook schema:** v2
**Not merged, not deployed, no pricing published.**

## 1. Outcome

V2 was built on the existing application; nothing was rebuilt from scratch, and all V1 functions and tests were preserved. Priorities:

1. Fix the reporting and calculation-presentation defects first.
2. Add traceable ratebook provenance.
3. Add the scope-ownership model.
4. Add the optional refined estimate.
5. Add the admin workflows.
6. Add calibration.

Each was verified by unit tests, browser tests, and visual inspection of the rendered UI and the actual PDFs.

| Area | Result |
|---|---|
| Unit tests | 122/122 (V1: 79) |
| Browser tests | 32/32 on desktop and iPhone, 2 skipped by design (V1: 22) |
| PDFs | English and Arabic, 3 A4 pages each, PDF text checked automatically |
| Competitor/Kuwait source research | Done from the research package and web-search snippets only. **Page access was blocked by this environment's network policy** (proxy HTTP 403 for every external host), so nothing could be re-verified on 2026-10-11. Everything is labelled accordingly. |

The separate Urban BOQ/QTO engine, structural logic, DWG/DXF readers and S8.7 work are **not in this repository and were not touched**.

## 2. Phase-by-phase

### Phase 1 — Audit

`URBAN_V2_INITIAL_AUDIT.md` contains 24 findings:

- 4 P0 bugs: scenario formulas, Arabic PDF English leftovers, construction/owner confusion, fake ranges.
- Missing functionality.
- Improvements.
- Research limits.
- Items waiting on verified pricing.

### Phase 2 — Calculation and reporting fixes

- **2.1 Per-scenario formulas.**
  - *Engine:* every budget line now carries `basisBy.low/mid/high` with that scenario's own rate, percentage base and result.
  - *Display:* results, breakdown (one row per scenario), English and Arabic PDFs, saved estimates and exported JSON all show e.g. `960 × 135 = 129,600 · 960 × 150 = 144,000 · 960 × 170 = 163,200`, and `8% × 129,600 = 10,368 … 8% × 163,200 = 13,056`.
  - *Verified in:* tests and the extracted PDF text.
- **2.2 Arabic PDF quality.**
  - Arabic fields were added for rate inclusions, exclusions and notes, and preset names and fee labels are localised.
  - Source names, identifiers, dates and formulas are bidi-isolated (`<bdi>`), and dates are ISO and bidi-safe.
  - The report was restructured; the rendered Arabic PDF was inspected page by page. The e2e test asserts that no English leftovers remain.
- **2.3 Construction vs owner budget.**
  - *Results:* two labelled card rows — estimated construction cost L/T/H and estimated total owner budget L/T/H.
  - *Breakdown and PDF:* split into "Construction cost — contractor work" and "Owner's additional expenditure" (owner-direct, design/supervision, permits/fees, contingency).
  - *Engine:* `ownerAdditional` is added and reconciled.
- **2.4 Completeness and accuracy honesty.**
  - "Partial estimate — unpriced items remain" appears on results, totals and the PDF.
  - Missing rates stay unpriced, never zero.
  - Single-value rates show "No published range" instead of three identical cards; `rangeAvailable:false` is exported.
  - Exact reconciliation is preserved and asserted.

### Phase 3 — Competitor and Kuwait source investigation

Files in `docs/research/`:

- `COMPETITOR_SOURCE_AUDIT.md`
- `KUWAIT_PRICE_SOURCE_REGISTER.csv` (62 records, 14 required columns)
- `COMPETITOR_FORMULA_COMPARISON.md`
- `MARKET_DATA_GAPS.md`

Evidence screenshots are preserved in `docs/research/evidence/` with SHA-256 sums.

Key findings, all caveated as above:

- **Rate evidence:** none of the 15 calculators discloses the evidence behind its rates (no supplier quotations, project data or indices cited). The calculator *method* and the rate *evidence* are evaluated separately.
- **Arithmetic:** Varnda's published example reconciles (170,600).
- **Official Kuwait data:** none provides a turnkey villa rate.
  - CSB publishes general CPI and Wholesale Price Index data, but no confirmed construction-cost index.
  - Kuwait Credit Bank's 70,000 KWD loan is financing, not a cost.
- **80% coverage:** no official rule was found. Press reports cite **210% of plot or 960 m², whichever is greater** (unverified). The app now shows an *information-only* note above that figure; it never changes price.
- **Historical third-party figures:** Markaz (Feb 2022, KD 230/m² medium-end) and "Aksbir" (2020, KD 162/m²) were found as search snippets only. They are recorded as HISTORICAL/UNVERIFIED and not added to the ratebook.

### Phase 4 — Ratebook

Method: `URBAN_RATEBOOK_METHOD.md`.

- **Schema v2 provenance fields:** trade category, work description, location/country, evidence status (8 values), source category (hierarchy 1–7), qualitative confidence factors (no percentages), approver, approval time, last reviewed, Arabic inclusions/exclusions/notes, documented included components with allowances.
- **Migration:** automatic v1 → v2, prices unchanged and logged.
- **Freshness warnings:** expired, old quotation, stale, no date, unverified method, incompatible unit (blocks), non-KWD (blocks), foreign country, material-/labour-only, approval incomplete.
- **No escalation:** none is applied automatically.
- **Security:**
  - Approval requires a named approver and is logged.
  - Editing an approved price without re-approval downgrades it.
  - `VITE_PUBLIC_BUILD=true` gives a read-only public build (verified).
  - localStorage is documented as **not** a secure production store; backend authentication is required before deployment.

### Phase 5 — Two estimation levels

- **Level 1 (quick, 30–60 s):** preserved.
- **Level 2 (refined, optional, 3–8 min):** a new wizard step.
  - *Structure and site:* floor heights per floor (recorded, not priced, and disclosed), cantilevers, special structure, structural drawings available, site difficulties. **No concrete or steel quantities are derived from floor area.** Structural and site answers flag quotation items unless a priced allowance is entered.
  - *Components:* 30 components across architectural, MEP, external and structure/site groups, each with an ownership status.
  - *Rule:* every question either changes a calculation, sets an inclusion/exclusion, or flags a quotation. Recorded-only answers say so.

### Phase 6 — Double counting

`URBAN_SCOPE_INCLUSIONS_MATRIX.md` documents the seven statuses:

- included in base rate
- extra
- upgrade
- provisional allowance
- owner-direct
- not included
- needs quotation

How they behave:

- **Upgrade netting:** net = qty × upgrade rate − standard allowance. In the brief's example: 30 × 120 − 30 × 60 = **1,800**.
- **No assumed allowance:** an allowance is never assumed without scope data, and V2 defaults new items to *Extra* (correcting V1).
- **Applied everywhere:** in the engine, results, breakdown and PDF.

### Phase 7 — Alhisba / Taqeem

All records, observed totals, categories, unknowns, the matrix and the hypotheses are preserved.

- The 3,000 KWD Alhisba gap stays unresolved.
- 80% stays an inference.
- Taqeem's 109,000 difference is not attributed to the basement.
- Screenshots are now in the repository and listed per observation on the research screen.
- None of it is in the pricing engine (tested).

### Phase 8 — Customer experience

The results page answers the five questions:

1. **How much:** two card rows (construction cost, owner budget).
2. **What area:** the area KPI.
3. **What scope:** scope, grade and estimate level.
4. **Why this amount:** "960 m² above ground × 150 KWD/m² (VR-02) + …".
5. **What is excluded:** "What is not included" and "Needs quotation / unpriced".

The page also shows a completeness KPI and a price-source card with approval status, evidence status and confidence.

- **Breakdown:** cost-type badges (area-rate estimate, calculated cost, estimated allowance, percentage, fixed, owner-direct). No budget allocations are produced, and the page says so.
- **Admin:** rates with warnings, Compare quotations, Approve dialog, history filter, finishing-grade editor, import/export, and a calibration tab.
- **Brand:** the navy, white and gold theme is unchanged.

### Phase 9 — PDF

- **Page 1, Executive summary:** project, areas, scope, grade, level, construction range, owner range, price source and evidence, key assumptions, unpriced items.
- **Page 2, Detailed calculations:** areas by floor, the formula for every scenario, owner items, reconciliation, additions.
- **Page 3, Specifications and limitations:** included/excluded, grade specification, rate source/date/approval/evidence/confidence, refined answers, assumptions, disclaimer.

Both languages print to exactly 3 A4 pages (checked with `pdfinfo`).

### Phase 10 — Testing

See `URBAN_V2_TEST_RESULTS.md`. No safety check was removed or weakened. Every V1 assertion is retained, with only the changes required by the new data model (e.g. the explicit `upgrade` status, and ratebook version 2).

### Phase 11 — Calibration

- **Template:** `docs/calibration/CALIBRATION_TEMPLATE.csv`.
- **In-app:** a calibration tab with scope normalisation (removes unrelated variations, applies a ± scope adjustment), APE per project, mean/median shown only with data, an "insufficient" flag below 10 projects, and CSV export.
- **Accuracy statistics: blank — no project data supplied.**

## 3. Deliverables index

| # | Deliverable | Location |
|---|---|---|
| 1 | Initial audit | `URBAN_V2_INITIAL_AUDIT.md` |
| 2 | Implementation report | this file |
| 3 | Competitor source audit | `docs/research/COMPETITOR_SOURCE_AUDIT.md` |
| 4 | Kuwait price source register | `docs/research/KUWAIT_PRICE_SOURCE_REGISTER.csv` |
| 5 | Competitor formula comparison | `docs/research/COMPETITOR_FORMULA_COMPARISON.md` |
| 6 | Market data gaps | `docs/research/MARKET_DATA_GAPS.md` |
| 7 | Ratebook method | `URBAN_RATEBOOK_METHOD.md` |
| 8 | Scope inclusions matrix | `URBAN_SCOPE_INCLUSIONS_MATRIX.md` |
| 9 | Calculation validation and worked examples | `URBAN_CALCULATION_VALIDATION.md` |
| 10 | Test results | `URBAN_V2_TEST_RESULTS.md` + `docs/test-results/` |
| — | Screenshots (19, mobile and desktop, EN/AR) | `docs/screenshots/` |
| — | Sample PDFs | `docs/sample-reports/urban-estimate-en.pdf`, `urban-estimate-ar.pdf` |
| — | Evidence screenshots | `docs/research/evidence/` |
| — | Calibration template | `docs/calibration/CALIBRATION_TEMPLATE.csv` |

## 4. Completed vs deferred

**Completed:** everything listed in section 2.

**Deferred (with reason):**

| Item | Reason |
|---|---|
| Re-verification of competitor and official sources | Network policy blocks web access here. Allow the domains in the environment's network settings, then re-run the research. |
| Backend ratebook with authenticated, role-based approval | Needs an Urban backend (e.g. the existing Firebase project) and a decision on roles. The public read-only gate is in place meanwhile. |
| Urban-approved, structure-only, finishing-only, basement and trade rates | No verified Kuwait pricing yet (see section 5) |
| Location, floor-height and floor-position coefficients | No calibrated data; recorded and disclosed as not applied |
| Trade-level subtotal comparison in calibration (structure, finishing, MEP, basement) | Needs project data with trade breakdowns; template fields can be extended once the format is agreed |
| Investment-property pricing | No rates; a manual rate is still required |
| Direct (non-print) PDF generation | Browser print-to-PDF remains the reliable route for Arabic shaping |
| Deployment, merge into main | Not authorised |

## 5. Unresolved pricing questions (for Urban)

1. What are Urban's turnkey KWD/m² rates per grade, and what exactly does each package include? Need a component list with standard allowances (e.g. aluminium KWD/m², doors KWD/door, kitchen lump sum, sanitary per bathroom).
2. Structure-only (black works) and finishing-only rates per grade, with their scope boundaries.
3. Basement packages: KWD/m² by finish (unfinished / parking / habitable), and what each includes — excavation, shoring, dewatering, waterproofing, MEP.
4. Current scope-matched quotations for the major extras: elevator by stops, pool, VRF/central AC, cladding systems, smart home, landscaping/interlock. Each needs a date, validity and supply-and-install basis.
5. Which percentages Urban uses for design/supervision and contingency, applied to which base.
6. Do Urban rates include contractor overhead and profit? Is VAT relevant? (Kuwait has no VAT at present; confirm the treatment of any levies.)
7. Do roof-annex areas carry the same rate as typical floors? Urban data would be needed to justify any difference.
8. At least 10 completed Urban villa projects with estimate, awarded value and final account, normalised for variations, to start calibration.
9. Should Varnda/MFatah benchmarks remain visible to customers once Urban rates exist, or be restricted to the internal research screen?
10. Competitor research:
    - Alhisba: obtain the controlled 18-run matrix.
    - Taqeem: run one change at a time.
    - Confirm the actual Municipality building-ratio rules from an official source.

## 6. How to run

```bash
cd apps/urban-villa-cost-calculator
npm install
npm run dev                                   # internal build (admin enabled)
npm test                                      # 122 unit tests
npm run build && npm run test:e2e             # 32 browser tests (+ PDFs)
VITE_PUBLIC_BUILD=true npm run build          # public read-only build
```
