# Urban V2 — Test Results

**Date:** 2026-10-11 · **Branch:** `feature/urban-villa-v2` · **Engine:** 2.0.0
**Raw logs:** `docs/test-results/unit-tests.txt`, `docs/test-results/e2e-tests.txt`, `docs/test-results/public-build-gate.txt`

## Summary

| Suite | Result | V1 baseline |
|---|---|---|
| Unit tests (Vitest, deterministic) | **122 / 122 passed** | 79 (all 79 retained, adapted to the V2 data model; no assertion removed) |
| Browser tests (Playwright; desktop 1280 px + iPhone 13) | **32 passed**, 2 skipped by design (PDF generation runs once, on desktop) | 22 |
| Strict TypeScript (`tsc --noEmit`) | clean | clean |
| Production build | OK | OK |
| Public read-only build gate (`VITE_PUBLIC_BUILD=true`) | Verified: no rate-library nav, admin shows read-only notice, tampered localStorage ratebook ignored (170,600 unchanged) | n/a |
| Research package Python reference tests (cross-check) | 20 / 20 OK | 20 / 20 |

## Unit test coverage (tests/unit)

| File | Tests | Covers |
|---|---|---|
| `benchmarks.test.ts` | 10 | 960 × 150 = 144,000; Varnda 170,600; MFatah 144,000; Alhisba C 190.625, 119,000, 3,000 gap; other runs' gaps; 18-run matrix; Taqeem 109,000; 640 m² coverage hypothesis |
| `area.test.ts` | 9 | Area suggestion; roof annex independent; basement separate; manual override; plot ≠ GFA; warnings |
| `pricing.test.ts` | 33 | Grade → rate; low/mid/high; scopes; no turnkey reuse; manual rates; inactive/stale/material-only; floor rates; basement (unpriced, provisional, allowance, shoring/dewatering); additions; owner-direct; % bases; rounding sweep; reconciliation |
| `validation.test.ts` | 19 | Negative, NaN, Infinity, text, Arabic digits, required fields, % > 100, location/height not priced, version metadata |
| `ratebook.test.ts` | 8 | Default ratebook research-only; exact published values; versioning; approval downgrade; deactivate log; invalid rates; JSON round-trip |
| `v2.test.ts` | 43 | Listed below |

The 43 tests in `v2.test.ts` cover:

- **Per-scenario formulas:** low, mid and high (EN and AR strings), and their survival through JSON export.
- **Budget structure:** construction vs owner budget; no invented range; line kinds.
- **Scope matrix:** upgrade 1,800, documented allowance, baseline, owner-direct, excluded, quote-required, missing source.
- **Freshness:** expired, old quote, no date, foreign, material-only, unverified, incompatible unit; confidence.
- **Approval security:** named approver, validation, downgrade.
- **Refined estimate:** structure, site, heights, level 1 ignores refined answers.
- **Building types:** different floors and areas, roof annex, zero area; currency formatting.
- **Traceability and migration:** traceability; snapshot reproducibility; V1 input/ratebook migration; Alhisba never in the ratebook.
- **Calibration and building ratio:** calibration APE, stats and CSV; building-ratio info (incl. the 960 m² cap).

## Browser tests (tests/e2e, each run on desktop and iPhone)

1. Full wizard → 170,600, with design 11,520 and contingency 10,080 in the breakdown.
2. Next is blocked on negative or invalid areas.
3. Basement without a rate → partial ("Partial estimate — unpriced items remain"); never priced at the above-ground rate.
4. Structure-only scope blocked; a manual rate unblocks it (67,200).
5. Upgrade nets the included allowance (kitchen 15,000 − 6,000 → 153,000).
6. Arabic RTL, language toggle, translated result labels.
7. No horizontal page scroll on 11 screens × 2 languages, measured against the visual viewport. This test caught a V2 report-table overflow on iPhone, now fixed.
8. Save, reopen, export JSON (includes per-scenario `basisBy`), re-import into a clean browser.
9. Admin: new rate → approve requires a name → auto-selected as Urban-approved (94,800) → a price edit downgrades it.
10. Research screen labels (190.625, 3,000, 640, 170,600, 144,000, 122,000 "not a reproduced formula", 109,000).
11. PDF, English and Arabic: A4, 3 pages, generated with Chromium. **The PDF text is extracted with `pdftotext`** and must contain:
    - the scenario amounts (129,600 / 144,000 / 163,200 / 10,368 / 13,056 / 9,072 / 11,424 / 154,040 / 170,600 / 192,680);
    - the English scenario formulas.

    The Arabic PDF must contain no leftover English strings ("Permits & fees", "Turnkey building per m").
12. Breakdown shows separate low/typical/high formulas.
13. MFatah: "No published range"; evidence badge; "why this amount"; base-rate exclusions shown.
14. Refined estimate:
    - cantilever and narrow-access answers produce quotation flags;
    - aluminium upgrade nets 1,800;
    - pool excluded;
    - kitchen owner-direct without a rate → unpriced;
    - typical 145,800.
15. Reopened estimate reproduced from its snapshot (170,600) after a rate edit; with the snapshot off → 181,640.
16. Calibration: "accuracy is not yet measured" → APE 10% → "fewer than 10 projects".

## Visual inspection (rendered UI, not just code)

Screenshots in `docs/screenshots/` (19 files, iPhone 13 and 1280 px, EN and AR) and the actual exported PDFs (`docs/sample-reports/urban-estimate-{en,ar}.pdf`, rendered to images and inspected) were reviewed. Defects found and fixed during review:

1. The report spilled onto a 4th page, and its footer hardcoded "/ 3". Print tables were tightened and the footer now names the page section.
2. The informational building-ratio note fired for the 960 m² example. It ignored the reported "or 960 m², whichever is greater" cap; corrected and tested.
3. The on-screen report overflowed horizontally on iPhone; wide tables now scroll inside the report.

## What these tests do NOT show

- They do not validate Kuwait market prices or the accuracy of any estimate.
- They do not verify competitor source claims; the web was unreachable from this environment (see `docs/research/`).
- Arabic PDF wording is verified visually. Automated text extraction cannot reliably read shaped Arabic glyphs, so the automated check uses numbers, identifiers and the absence of English leftovers.
