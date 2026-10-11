# Competitor Formula Comparison

## Method and limits

- **Follow-up check (main session, 2026-10-11):** the cause is the cloud environment's network policy. The outbound proxy returned `CONNECT tunnel failed, response 403` for every external host tested, including www.wikipedia.org and all the competitor and government sites. The sites themselves did not refuse access. To re-verify these findings, allow these domains in the environment's network settings and re-run the audit.

- **Access date:** 2026-10-11. On that date `WebFetch` failed for every host, including example.com, with `getaddrinfo ENOTFOUND`. So no competitor or official page was opened.
- **Sources:**
  - Formulas and worked examples come from the client research package (2026-08-06 / 2026-10-07 / 2026-10-10) and are **not re-verified on 2026-10-11**.
  - The Markaz figures come from `WebSearch` result summaries only (page not opened).
- **No formula was reverse-engineered.** "Observed" ratios below are simple arithmetic on visible inputs and outputs and are labelled INFERRED.
- **Separation kept throughout:** the method (how numbers combine) is separate from the evidence (where the rates come from).

## 1. Method comparison table

Kuwait calculators:

| Calculator | Basis | Formula disclosed | Multipliers | Fixed % | Trades priced separately | Basement | Fees/permits/contingency | Rate evidence disclosed |
|---|---|---|---|---|---|---|---|---|
| Varnda (KW) | Built-up GFA, KWD/m² | Yes | Tier base rate × building/floor/structure factors (factor values not in package) | Design 8%, contingency 7% (worked example) | No | Not recorded | Yes: 8% design, 7% contingency, 5,000 permits | No |
| MFatah | Built-up m², KWD/m² | Yes (area × tier) | Tier only (120/150/190) | None | No | Not recorded | Not recorded | No (contractor's advertised price) |
| Ybnee | Trade quantities (m², m³, unit, project) | Partly (qty × min/max) | Min/max spread | None | **Yes** | Shoring 35–75/m², excavation 12–28/m³ as trades | Design & permits 800–3,500 KWD/project | No |
| Alhisba CCE | Land + storeys + built area; grade A/B/C | No | Grade (undisclosed) | Undisclosed | Output in 8 categories | Input; treatment undisclosed | Undisclosed | No |
| Taqeem | Land 250–1000 m², floors, height, many options | No | Undisclosed | Undisclosed | Trade origins selectable | Explicit: basement, shoring faces, dewatering months | Undisclosed | No ("reference value only"; "last update 09/2026") |
| Pricing Kuwait | Per-floor areas/heights, grade | No (claims only) | Claimed | Unknown | Claimed categories: shell/plaster/MEP/finishes | Unknown | Unknown | No ("live prices" claim, unsubstantiated) |
| Hasebi (KW label) | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | No; currency inconsistent |

Foreign calculators (methodology reference only, no prices to be imported):

| Calculator | Basis | Formula disclosed | Multipliers | Fixed % | Trades priced separately | Basement | Fees/permits/contingency | Rate evidence disclosed |
|---|---|---|---|---|---|---|---|---|
| Etimadco (SA) | Area | Yes | Base × finishing factor × city factor; ±15% band | — | No | — | — | No |
| Mawsouq (SA) | Land area, floors, type, finish | Partial | Finish level | — | Component split (structure/finishing/foundation/extras) | — | — | No |
| Hasbati | Quantities | Yes | User prices | — | Materials | — | — | User-supplied |
| Kulfa | BOQ from inputs | Partial | Country | — | BOQ | — | Excludes land | No |

**Reference method (not a calculator): RICS NRM 1, 2nd edition.** The PDF URL found by search (not opened) is https://www.rics.org/content/dam/ricsglobal/documents/standards/nrm_1_order_of_cost_estimating_and_cost_planning_2nd_edition_rics.pdf.

NRM 1 defines the order of cost estimate as:

1. **Building works estimate:** either floor area (GIFA) × cost/m² from benchmark data, or elemental rates.
2. **Main contractor's preliminaries:** group element 9.
3. **Main contractor's overheads and profit:** group element 10.
4. **Project/design team fees and other development costs.**
5. **Risk allowances:** group element 13.
6. **Inflation:** group element 14.

The search snippet places the order-of-cost-estimate rules in Part 2, measurement rules 2.11–2.16. **None of the Kuwait calculators separates elements 2, 3, 5 and 6.** Varnda comes closest, showing design and contingency, but has no preliminaries, OH&P or inflation line.

## 2. Arithmetic check of published worked examples

### 2.1 Varnda worked example (client package, recorded 2026-08-06)

Published: 960 m² × 150 = 144,000; + 8% design 11,520; + 7% contingency 10,080; + 5,000 permits = 170,600.

Check:

- 960 × 150 = 144,000 ✔
- 0.08 × 144,000 = 11,520 ✔
- 0.07 × 144,000 = 10,080 ✔
- 144,000 + 11,520 + 10,080 + 5,000 = 170,600 ✔

**Reconciles.**

The example applies contingency to the construction base only, not to base + design + permits:

- If contingency were applied to base + design, it would be 0.07 × 155,520 = 10,886.40, giving 171,406.40.
- If applied to base + design + permits, it would be 0.07 × 160,520 = 11,236.40, giving 171,756.40.

So the published 170,600 implies "contingency on construction base only" (INFERRED from arithmetic). Effective all-in rate: 170,600 / 960 = 177.71 KWD/m².

Rate 150 = Varnda "Medium" mid. Building/floor/structure factors are evidently 1.0 in this example (INFERRED). Otherwise 960 × 150 would not equal the base.

### 2.2 Markaz, "Cost of Construction in Kuwait and its Components" (Oct 2022)

URL: https://www.markaz.com/getmedia/661eb37e-9bff-451f-a12b-cb2d959d1a7a/Markaz-Construction-Cost-Report_En_20-10-2022.pdf. Search snippet only, not opened. This is a historical third-party report, not a calculator.

Search snippets give: medium-end private housing KD 170/m² pre-pandemic and KD 230/m² as of Feb 2022 (~35% rise). The example unit is 1,240 m², KD 210,800 rising to KD 285,200; one press version reportedly says 210,000. Also quoted: USD 741/m².

Check:

- 1,240 × 170 = 210,800 ✔. The "210,000" press version does not reconcile.
- 1,240 × 230 = 285,200 ✔
- 230 / 170 = 1.3529, i.e. +35.3% ✔ ("~35%")
- 741 / 230 = 3.222 USD per KWD implied. Plausible order of magnitude, but the exchange rate used was not seen; flagged UNVERIFIED.

### 2.3 Alhisba observed result (client package screenshot), not a published example

Inputs: 400 m² plot, 2 floors, no basement, grade C. Displayed built area 640 m², result 122,000 KWD.

- 640 / 400 = 1.60 → 0.80 per floor across 2 floors (INFERRED).
- 122,000 / 640 = 190.63 KWD/m² of displayed built area (INFERRED).

This sits between Varnda "Good" mid (175) and "Good" high (195). It is also slightly above MFatah "Super Deluxe" (190), despite being grade C. The comparison is indicative only, since scope is undisclosed.

The other observed Alhisba results (344,000; 267,000; 260,000) cannot be analysed: built area was not recorded with them in the package.

### 2.4 Taqeem observed results (client package)

270,000 and 161,000 KWD, with about 9 inputs changed between the two runs. No per-m² figure can be derived, because built area is not displayed. **Cannot be reconciled.**

### 2.5 "Aksbir" figure on alhisba.com (search snippet, not opened)

KD 162/m² "construction and finishing" average from 2020 research. Black structure ~29.4% of budget; "المساحة" and ceramic installation 9.9% and 9.5%. An example budget of KD 120,000 is mentioned, but its full arithmetic was not visible. **Cannot be checked.**

## 3. What Urban's calculator should and should not learn from each

**Varnda**
- *Learn:* show the formula. Present design, permits and contingency as separate visible lines. Give tiers as low/mid/high bands, not a single point. State clearly what the contingency is applied to.
- *Avoid:* using its KWD/m² tiers as rates (no evidence). Hidden factor values. Applying contingency only to the base without saying so.

**MFatah**
- *Learn:* buyers expect a simple "finish tier × built m²" headline. State scope inclusions plainly (structure, finishes, AC, electrical).
- *Avoid:* treating a contractor's advertised price as a cost. Showing no exclusions.

**Ybnee**
- *Learn:* a trade-by-trade structure with units per trade (m², m³, unit, project). Show basement shoring and excavation separately. Mark product-only vs supply-and-install rates.
- *Avoid:* very wide unexplained ranges. Mixing product-only and installed rates in one total.

**Alhisba**
- *Learn:* take land area plus storeys as inputs and show the derived built area to the user. A category breakdown of the output (8 categories) builds trust.
- *Avoid:* undisclosed coverage assumptions (the inferred 80% per floor matches no confirmed official rule). Opaque grades.

**Taqeem**
- *Learn:* model the basement drivers explicitly (shoring faces, dewatering months, height). Offer origin choices for lifts and trades, insulation and pool. Show a "last update" date and a "reference value only" disclaimer.
- *Avoid:* lump-sum output with no breakdown or rates. That gives users no way to audit the figure.

**Pricing Kuwait**
- *Learn:* per-floor area and height inputs. Category split into shell/plaster/MEP/finishes.
- *Avoid:* "live prices" or CAD claims without a disclosed source.

**Hasebi**
- *Avoid:* currency inconsistency. Always label KWD and units explicitly.

**Foreign tools** (methodology reference only, never their prices)
- Etimadco: show a ±% accuracy band. Use a location factor.
- Mawsouq: split structure/finishing/foundation/extras. Note that an index measures change, not absolute cost.
- Hasbati: a quantities-first approach.
- Kulfa: state the land exclusion.

**RICS NRM 1**
- Adopt its stack: building works (elemental or GIFA × rate) → preliminaries → OH&P → fees → risk → inflation, each as a visible line with its own approval status.
