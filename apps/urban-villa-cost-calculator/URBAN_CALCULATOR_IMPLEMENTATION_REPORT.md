# URBAN CALCULATOR — IMPLEMENTATION REPORT

**Project:** Urban Projects — Villa Cost Calculator · حاسبة تكلفة بناء القسيمة
**Location / currency:** Kuwait · KWD
**Engine version:** 1.0.0 · **Default ratebook:** v1 · **Date:** 2026-10-11
**Location in repo:** `apps/urban-villa-cost-calculator/` (standalone; the repository had no other code)

---

## 1. Summary

A working, bilingual, mobile-first React + TypeScript + Vite application with:

- a deterministic calculation engine, separate from the UI;
- an editable, version-controlled ratebook;
- partial-estimate handling and exact reconciliation;
- a print-to-PDF report in Arabic and English;
- a research module that keeps the evidence apart from Urban pricing.

**Test status:**

| Suite | Result |
|---|---|
| Unit tests (Vitest) | **79 / 79 passed** |
| End-to-end tests (Playwright, desktop + iPhone 13) | **22 / 22 passed** (2 skipped by design: PDF generation runs once, on desktop) |
| Package's original Python reference tests | **20 / 20 passed** (cross-check) |
| Strict TypeScript | clean |

**Isolation:** no BOQ engine, DWG/DXF/PDF extraction, S8.7 work, fixtures or production data were present or touched. There is no backend, no deployment and no external API.

## 2. Research package review (Phase 1)

I read all of the priority files: the README, handoff, findings, Alhisba JSON and matrix, published rates, competitor comparison, scope catalogue, Python model and tests, HTML prototype, the Taqeem findings ZIP and the master research ZIP. I also checked an Alhisba screenshot (`IMG_9704`, 122,000 KWD; Architect 1,000; Site preparation 1,000; Civil work 13,000) against the JSON. All research data used in the app was imported from the package unchanged.

The Python model was used as a verification reference. Where its invariants applied, they were ported:

- no basement default;
- A/B grade rates stay blocked;
- 80% coverage is an experimental assumption;
- upgrades are netted against the included allowance;
- missing values are flagged as unpriced, never treated as zero.

## 3. Exact formulas (as implemented)

All money uses decimal arithmetic (`decimal.js`, 40-digit precision, ROUND_HALF_UP). No binary floating point is used for money.

| ID | Formula | Code |
|---|---|---|
| A | `AboveGroundGFA = Σ enabled {ground, first, second, roofAnnex} areas` · `TotalGFA = AboveGroundGFA + basementArea`. Plot area is never used as built-up area. | `buildingArea.ts` |
| A′ | Optional suggestion: `areaPerFloor = plot × coverage% ÷ 100` (default 80%, labelled experimental). The roof annex is never auto-filled. | `suggestFloorArea` |
| B | Uniform rate: `Base(low/mid/high) = AboveGroundGFA × rate(low/mid/high)`. Floor-specific: `Base = Σ floorArea × floorRate`, used only when the estimator enters a floor rate; no multipliers are invented. | `quickEstimate.ts` |
| C | `Basement = basementArea × basementRate` (from the library or a provisional entry) **or** a provisional package allowance. If neither is entered, it is reported as "Basement cost not yet priced". | `basementEstimate.ts` |
| D | `ItemCost = qty × unitRate` · If the baseline already includes the item: `Net = ItemCost − standardAllowance` (a negative result is a credit). A missing qty, rate or allowance makes the item unpriced. | `optionalItems.ts` |
| E | `Construction = Base + Basement + Σ Net additions` | `finalBudget.ts` |
| F | `OwnerTotal = Construction + OwnerDirect + Design% × B + FixedFees + Contingency% × B`. B is explicitly either `construction` (Urban default) or `above-ground base` (the Varnda example's convention). | `finalBudget.ts` |

Further rules:

- **Rounding:** each line is rounded once to whole KWD; every subtotal and total is the exact sum of the rounded lines. `assertReconciles()` runs on every completed estimate and throws if any line set does not sum to its total.
- **Typical KWD/m²** = Construction (mid) ÷ priced built-up area. An unpriced basement's area is excluded, so it cannot dilute the rate.
- **Fee defaults:** design, contingency and fixed fees all default to 0. Nothing is assumed to be a mandatory Kuwait charge.

## 4. Status model and safeguards

- **Blocked:** any invalid input, or no usable rate for the selected scope. No totals are shown; the app lists the blockers and offers to jump to the relevant step.
- **Partial:** at least one item is unpriced, for example:
  - a basement with no rate;
  - shoring or dewatering marked as needed but not included;
  - an addition without a rate, quantity or allowance.

  Totals are then labelled "Priced construction subtotal" and "Priced budget subtotal (partial)", and every unpriced item is listed on the results page and in the report. They are never labelled as the total villa cost.
- **Complete:** every selected item is priced.

The table maps the requested safeguards (§11) to what the app does.

| # | Safeguard | Implementation |
|---|---|---|
| 1–2 | Negative, NaN, Infinity or non-numeric input | `parseNonNegative` → error. Inline messages appear in the wizard and Next is blocked. |
| 3 | Missing required unit prices | `SCOPE_UNPRICED`, `MANUAL_RATE_REQUIRED` and `BASEMENT_RATE_REQUIRED` block the estimate; addition rates are reported as unpriced. |
| 4 | No assumed basement rate | The default ratebook has no basement rates and the above-ground rate is never reused. |
| 5 | Plot area vs GFA | Kept separate. A warning appears if the ground floor is larger than the plot or the roof annex looks too large. |
| 6 | Material-only rates | A `price_basis` field triggers a `MATERIAL_ONLY_RATE` (or labour-only) disclosure. |
| 7 | Double counting | Turnkey upgrades are netted against the included allowance. Included basement components are not re-added. |
| 8 | Owner-direct vs contractor | Owner-direct purchases are separate lines, outside construction and outside the percentage bases. |
| 9 | Percentage bases | Explicit selector, shown in every basis string (e.g. "8% × 144,000 KWD (above-ground base)"). |
| 10 | Rounding | Per-line rounding plus exact-sum totals, enforced by an assertion. |
| 11 | Unapproved or stale rates | Every non-approved rate gets a warning and a badge. Rates older than 365 days or past `valid_until` get a stale warning. Editing an approved price downgrades it to provisional. Inactive rates cannot be used. |
| 12 | No artificial precision | Whole-KWD lines; low / typical / high range; "not a quotation" notice everywhere. |
| 13 | Versions stored | Saved and exported estimates carry the inputs, result, engine version, ratebook version and a snapshot of the rates used. Reopening with a different ratebook version shows a warning. |
| 14–15 | Exclusions, incomplete scope | Unpriced panel, exclusions section in the report, partial labelling. |

## 5. Rate sources: approved vs experimental

| Rate | Values (KWD/m²) | Status in app |
|---|---|---|
| Varnda VR-01…05, turnkey, Urban grades Basic…Ultra | 115/125/140 · 135/150/170 · 160/175/195 · 210/240/280 · 300/360/430 | **Published competitor benchmark** (research/demo) |
| MFatah MF-01…03, turnkey, *MFatah grading* (Normal/Deluxe/Super Deluxe) | 120 · 150 · 190 (single value, no range) | **Published competitor benchmark**. Kept in its own grading system; never mapped to Urban grades. Using it shows a warning. |
| Structure-only, finishing-only, basement | none | **Unpriced** until Urban enters rates or the estimator enters a manual rate |
| Ybnee item ranges (elevator, aluminium, shoring) | shown as hints only | Never applied automatically |
| Alhisba 190.625 KWD/m² | observation | Research screen only; not in the ratebook |

**No Urban-approved rates exist yet.** Approval statuses available: published benchmark, experimental assumption, user-entered provisional, supplier/subcontractor quotation, Urban-approved, historical/completed project.

## 6. Reference calculations (verified by tests)

| Case | Result | Where |
|---|---|---|
| 960 × 150 | 144,000 KWD | unit + e2e |
| Varnda example: 144,000 + 11,520 (8%) + 10,080 (7%) + 5,000 | **170,600 KWD**, through the full engine and wizard | unit + e2e |
| MFatah Deluxe 960 × 150 | 144,000 KWD (construction only) | unit + e2e |
| Alhisba C: 122,000 ÷ 640 | 190.625 KWD/m² (observation, single case) | unit + e2e |
| Alhisba C categories | 119,000 visible; 3,000 unexplained | unit + e2e |
| Alhisba AL-001/002/003 gaps | 2,000 / 1,000 / 2,000; no normalised rate (area unknown) | unit |
| Taqeem 270,000 − 161,000 | 109,000 KWD, labelled multi-factor, **not** a basement premium | unit + e2e |
| Coverage hypothesis 400 × 80% × 2 | 640 m² | unit + e2e |

## 7. Assumptions

- Built-up areas are entered by the user. The 80% suggestion is optional and labelled experimental (inferred from one Alhisba case).
- Location and floor height are recorded but do not adjust price (no supported coefficients).
- Finishing grade changes only the rate profile, never quantities.
- Land cost is excluded.
- Investment property is not priced from villa rates; it requires a manual rate.

## 8. Missing information (needed before client quotations)

- Urban-approved turnkey, structure-only, finishing-only and basement rates, with their inclusions and exclusions.
- Supplier and subcontractor quotations for optional items (elevator, pool, kitchen, facade, smart home, landscaping, AC), and standard allowances included in turnkey scopes.
- Full Alhisba inputs for the 344k / 267k / 260k results, plus the 17 untested matrix scenarios.
- The Taqeem one-change-at-a-time matrix (65 runs).
- Any calibrated floor-height, location or floor-position coefficients (none are applied now).
- The Urban logo file. An original typographic and geometric placeholder mark is used.

## 9. Tests run

- `docs/test-results/unit-tests.txt`: 79 tests across benchmarks, area, pricing (scopes, grades, basement, additions, owner-direct, percentage bases, rounding sweep, reconciliation), validation, ratebook (versioning, change log, approval downgrade, import validation, JSON round-trip).
- `docs/test-results/e2e-tests.txt`: 22 runs (11 scenarios × desktop and iPhone):
  - full wizard to 170,600;
  - Next blocked on invalid input;
  - partial estimate for an unpriced basement;
  - blocked structure-only scope, then unblocked by a manual rate;
  - upgrade netting;
  - Arabic RTL and language toggle;
  - no horizontal scroll on 10 screens in both languages;
  - save / reopen / export / import;
  - admin approval flow and downgrade;
  - research labelling;
  - PDF in English and Arabic (A4, 3 pages each, in `docs/sample-reports/`).
- Visual review: screenshots in `docs/screenshots/` were inspected at iPhone (390 px) and desktop (1280 px), in Arabic and English. Bugs found by visual review and fixed:
  1. A `.num` utility broke table-cell layout in the rate library.
  2. A screen-reader-only label escaped its scroll container and widened the iPhone layout to 959 px, hiding the rate-editor modal. The overflow test was tightened to use the visual viewport so it now catches this.
  3. The Arabic report date suffered bidi scrambling.
  4. The PDF was captured mid fade-in animation.
  5. The typical KWD/m² was diluted by an unpriced basement's area.

## 10. Implemented vs deferred

**Implemented:**

- the full guided wizard;
- per-floor areas and the experimental suggestion;
- the separately priced basement with conditions and inclusions;
- three independent scopes;
- five grades with editable specifications;
- auto, library and manual rate selection;
- floor-specific rates;
- optional items with netting;
- owner-direct purchases;
- fees and contingency with an explicit base;
- low / typical / high results;
- the breakdown;
- the 15-section bilingual print/PDF report;
- save, reopen and JSON import/export;
- the admin ratebook (CRUD, activation, provenance, change log, import/export, grade editor);
- the research module (Alhisba, matrix, coverage tool, Taqeem, published rates, competitor methods, reference calculations);
- unit and e2e tests.

**Deferred:**

- Authentication and a server-side ratebook (Firebase or similar).
- Investment-property rates.
- Calibrated location, height and floor coefficients (blocked on data).
- Trade-level (structure / MEP / finishing) cost allocation. It is intentionally not shown, because there is no trade pricing to support it.
- A detailed trade estimator.
- A read-only adapter to approved BOQ quantities.
- Direct (non-print) PDF generation. Print-to-PDF was chosen because it renders Arabic shaping reliably.
- Deployment.

## 11. Known limitations

- Ratebook and saved estimates live in this browser's `localStorage` only, and the admin screen is unauthenticated.
- Published benchmark rates have unaudited scopes, and different providers' grades are not equivalent.
- Ranges are rate ranges, not statistical confidence intervals. No accuracy percentage is claimed.
- Single-value rates (MFatah, manual entries without low/high) produce identical low, typical and high figures, and the app says so.

## 12. Proposed next improvements

1. Load Urban-approved rates (turnkey, structure, finishing, basement) from real quotations and completed projects; record inclusions and validity dates.
2. Add authentication and a shared server ratebook with role-based approval (estimator proposes, manager approves).
3. Collect the controlled Alhisba and Taqeem matrices and only then consider calibrated adders.
4. Add a trade-level estimator using `scope_catalog` items with quantity and price provenance, and read-only use of approved BOQ quantities. Do not modify the BOQ engine.
5. Add the real Urban logo and brand assets; optionally a PWA for offline use on site.
