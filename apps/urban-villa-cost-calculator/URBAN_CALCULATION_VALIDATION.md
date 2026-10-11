# Urban Calculation Validation

**Engine:** 2.0.0 · **Date:** 2026-10-11

Validation has two separate meanings, and this document keeps them apart.

1. **Arithmetic validation (done).** The engine computes what its formulas say, every displayed formula matches its amount, and every total reconciles exactly. This is proven by automated tests.
2. **Market validation (not done).** Do the estimates match real Kuwait construction costs? This requires completed-project data, which has not been supplied. **No accuracy figure is claimed.** Passing software tests says nothing about market accuracy.

## 1. Documented example calculations (all asserted by tests)

### A. Varnda published example — 960 m², Medium (VR-02: 135 / 150 / 170 KWD/m²), 8% design, 7% contingency on the above-ground base, 5,000 KWD fees

| Line | Low | Typical | High |
|---|---|---|---|
| Above-ground construction | 960 × 135 = **129,600** | 960 × 150 = **144,000** | 960 × 170 = **163,200** |
| Design & supervision 8% | 8% × 129,600 = **10,368** | 8% × 144,000 = **11,520** | 8% × 163,200 = **13,056** |
| Permits & fixed fees | 5,000 | 5,000 | 5,000 |
| Contingency 7% | 7% × 129,600 = **9,072** | 7% × 144,000 = **10,080** | 7% × 163,200 = **11,424** |
| **Construction cost** | 129,600 | 144,000 | 163,200 |
| **Owner's additional expenditure** | 24,440 | 26,600 | 29,480 |
| **Total owner budget** | **154,040** | **170,600** | **192,680** |

Checked at three levels:

- **Engine:** `v2.test.ts` › Per-scenario formulas.
- **On screen:** the breakdown, in an e2e test.
- **Exported PDF text:** English and Arabic, via `pdftotext`, in the e2e PDF tests.

The English PDF prints `960 m² × 135 KWD/m² = 129,600` and `8% × 129,600 (above-ground base) = 10,368`.

**Publisher label:** Varnda's 170,600 is the published illustrative example. It is not an Urban quotation.

### B. MFatah advertised Deluxe — 960 × 150 = **144,000 KWD** (construction only)

This is a single reference value. Low and high are flagged *no published range*: the results cards show "No published range" and `rangeAvailable:false` is exported.

### C. Upgrade netting — aluminium

30 m² × 120 KWD/m² − 30 m² × 60 KWD/m² = 3,600 − 1,800 = **1,800 KWD** net.

### D. Separately priced basement

300 m² × 230 KWD/m² (provisional) = **69,000 KWD**. With no basement price entered, the estimate is **Partial** and the basement is listed as unpriced. The above-ground rate is never applied to it.

### E. Saved-estimate reproducibility

1. Save the Varnda example (170,600).
2. Edit VR-02 to 160 KWD/m².
3. Reopening with the saved snapshot reproduces **170,600** exactly.
4. Switching the snapshot off recalculates on the current ratebook: 960 × 160 = 153,600 + 12,288 + 10,752 + 5,000 = **181,640**.

### F. Calibration arithmetic

- Estimate 180,000; final 210,000; unrelated variations 10,000.
- Normalised actual = 210,000 − 10,000 = 200,000.
- APE = |180,000 − 200,000| / 200,000 × 100 = **10%**.

## 2. Alhisba observations (research data, never a formula)

AL-004 (400 m² plot, 2 floors, no basement, grade C, displayed 640 m²):

| Item | Value |
|---|---|
| Observed total | **122,000 KWD** |
| Sum of 8 displayed categories | **119,000 KWD** |
| Unexplained difference | **3,000 KWD**, kept as an unresolved reconciliation gap and not assigned to any cost item |
| 122,000 ÷ 640 | 190.625 KWD/m², an observed average for this one case only |

Tests also confirm that this observation never enters the ratebook, and that the A/B grades remain uninferred.

Two related points:

- **80% coverage:** it fits this single case only. No official 80% rule was found (`docs/research/COMPETITOR_SOURCE_AUDIT.md`).
- **210% building ratio:** press reports cite 210% of the plot or 960 m², whichever is greater (unverified). The app shows this only as an information note when exceeded; it never changes the price.

**Taqeem:** 270,000 − 161,000 = **109,000 KWD** across about nine simultaneous changes. It is not a basement premium.

## 3. Reconciliation guarantees

- Every line is rounded once to whole KWD (half-up).
- Every subtotal and total is the exact sum of its rounded lines.
- `assertReconciles()` runs on every completed estimate. It checks, for each scenario:
  - construction lines = construction;
  - owner lines = owner's additional expenditure;
  - all lines = total owner budget.
- A sweep test over grades × percentages, and a tampered-total test, confirm this.

## 4. Market calibration workflow (ready, awaiting data)

**Template:** `docs/calibration/CALIBRATION_TEMPLATE.csv`. Columns:

- project ID, location, built-up area, floors, basement, specification, contractor scope;
- initial estimate, awarded value, final cost;
- unrelated variations, scope adjustment, price sources.

**In-app:** Rate library → Calibration.

Procedure:

1. Enter completed Urban projects, anonymised where needed.
2. **Normalise scope.** Subtract owner variations unrelated to the estimated scope. Apply a ± scope adjustment where the built scope differs from the estimated scope (e.g. a pool built but not estimated).
3. **Per project:** APE = |estimate − normalised actual| / normalised actual × 100.
4. Where data permits, record structural, finishing, MEP, basement and optional-work subtotals separately and compare each one. This is not yet automated; see Deferred.
5. **Summary:** mean and median APE, shown only when at least one complete project exists, and flagged *insufficient* below 10 projects.
6. **Do not calibrate rates** from final costs that include unadjusted variations.

**Current accuracy statistics: blank (no project data supplied).**
