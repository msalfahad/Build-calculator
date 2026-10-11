# Urban Projects — Villa Cost Calculator · حاسبة تكلفة بناء القسيمة

A standalone, bilingual (Arabic RTL / English LTR), mobile-first web app that produces a **preliminary construction budget** for a private residential villa in Kuwait in 30–60 seconds, in Kuwaiti Dinar (KWD).

> Preliminary planning estimate only. Not a contractor quotation, not a priced BOQ, not structural design.
> The default rates are **published third-party research/demo benchmarks** (Varnda, MFatah). None of them is an Urban-approved rate.

This app is fully isolated. It does **not** touch, import or depend on the Urban BOQ / quantity-takeoff engine, DWG/DXF/PDF extraction, S8.7 work, benchmark fixtures or any production database.

## V2 (branch `feature/urban-villa-v2`)

- **Reports:** formulas are shown separately for low, typical and high, and construction cost is kept separate from the owner's additional expenditure.
- **Estimate levels:** an optional refined estimate (Level 2) sits on top of the quick estimate (Level 1).
- **Scope ownership:** every component is marked as included, extra, upgrade, provisional, owner-direct, not included, or needs quotation. This prevents double counting.
- **Ratebook:** schema v2 with evidence status, a qualitative confidence rating, freshness warnings, a named-approver workflow, quotation comparison, and a calibration tab.
- **PDF:** the report is three A4 pages in English and Arabic.
- **Public build:** a read-only build is available with `VITE_PUBLIC_BUILD=true`.

Start with `URBAN_V2_IMPLEMENTATION_REPORT.md`. The research files are in `docs/research/`.

## Web app (claude.ai Artifact)

Published privately at https://claude.ai/artifact/CRrtTLa6dkCfTWyNW7ENe7 (only the owner can open it until it is shared from the page's Share menu).

- Rebuild the single-file page with `npm run build:artifact` (writes `artifact/index.html`), then republish it.
- **Download PDF** builds the 3-page A4 report in the browser. Inside the claude.ai viewer, files are saved through the viewer's download prompt.
- **Account sync:** saved estimates, the rate library, calibration projects and the current draft sync to the signed-in user's private storage (`data/users/<id>/…`), with a copy kept in the browser. Nobody the page is shared with can read another person's data.

## Run locally

Requirements: Node 18+ (tested on Node 22).

```bash
cd apps/urban-villa-cost-calculator
npm install
npm run dev          # http://localhost:5173
```

Production build (static files, works from any static host or file server):

```bash
npm run build        # outputs dist/
npm run preview      # http://localhost:4173
```

## Tests

```bash
npm test             # 122 deterministic Vitest unit tests
npm run typecheck    # strict TypeScript
npm run build && npm run test:e2e
                     # 32 Playwright runs (desktop + iPhone 13), incl. Arabic/English PDF text checks
```

If Playwright cannot find a browser, point it at an installed Chromium:
`PW_CHROMIUM=/path/to/chrome npm run test:e2e`.

Latest results are saved in `docs/test-results/`. Sample PDFs are in `docs/sample-reports/` and screenshots in `docs/screenshots/`.

## What's inside

| Path | Purpose |
|---|---|
| `src/calculators/` | **Deterministic calculation engine** (no UI imports): `buildingArea.ts`, `rateSelection.ts`, `quickEstimate.ts`, `basementEstimate.ts`, `optionalItems.ts`, `finalBudget.ts`; research arithmetic isolated in `research.ts` |
| `src/validation/parse.ts` | Number parsing: rejects NaN, Infinity, negatives and text; accepts Arabic-Indic digits |
| `src/data/ratebook.json` | Default version-controlled ratebook (research/demo benchmarks + finishing-grade specifications) |
| `src/data/alhisbaObservations.json`, `benchmarkSources.json` | Alhisba, Taqeem, published-rate and competitor research data (from the research package) |
| `src/i18n/en.json`, `ar.json` | Complete English and Arabic dictionaries (same keys) |
| `src/pages/` | Home, Wizard (5 steps), Results, Breakdown, Report (print/PDF), Saved, Admin ratebook, Research |
| `src/lib/` | Defaults and presets, ratebook store (validation, change log, approval protection), saved estimates |
| `tests/unit`, `tests/e2e` | Vitest and Playwright suites |

## Using it

1. **Start estimate** → property → floors (with optional, clearly-labelled 80% area suggestion) → basement → scope and finishing grade → additions, owner purchases and fees → **Results**.
2. **Results** show low / typical / high construction cost, the total built-up area, the typical KWD/m², fees and contingency, and the total owner budget. Every figure is labelled with its rate source and approval status.
3. **View breakdown**: every line shows its formula. Lines always reconcile exactly to the totals.
4. **Report / PDF**: a 15-section A4 report in Arabic or English. Use the browser's *Print → Save as PDF*.
5. **Save** (this browser), **Export JSON**, re-import from **Saved estimates**.
6. **Rate library**: add or edit rates (low / typical / high, scope, grade, price basis, source, date, quotation reference, approval status, inclusions and exclusions), activate or deactivate them, view the change log, and import or export the ratebook as JSON.
7. **Research benchmarks**: Alhisba observations and their reconciliation gaps, the 18-scenario matrix, Taqeem, published rates, and the reference calculations (170,600 / 144,000 / 122,000).

### Entering Urban's own prices

Open **Rate library → Add rate**. Choose category *Building*, the scope (turnkey / structure only / finishing only), the Urban grade, and the prices. Set the status to **Urban-approved rate** and record the source and date. When estimating, the app automatically prefers an Urban-approved rate over a published benchmark for the same scope and grade. If you later change the price of an approved rate, it drops back to *provisional* unless you approve it again in the same edit.

## Security note

Version 1 stores the ratebook and saved estimates in the browser's `localStorage`. The admin screen has **no authentication**. Do not deploy it publicly with editable admin pricing. If you integrate it into the Urban Firebase environment, put the ratebook behind authenticated, role-checked writes.

See `URBAN_CALCULATOR_IMPLEMENTATION_REPORT.md` for formulas, sources, assumptions, limitations and next steps.
