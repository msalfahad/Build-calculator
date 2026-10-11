# Market Data Gaps: Evidence-Based Kuwait Villa Ratebook

## Method and limits

- **Follow-up check (main session, 2026-10-11):** the cause is the cloud environment's network policy. The outbound proxy returned `CONNECT tunnel failed, response 403` for every external host tested, including www.wikipedia.org and all the competitor and government sites. The sites themselves did not refuse access. To re-verify these findings, allow these domains in the environment's network settings and re-run the audit.

- **Compiled:** 2026-10-11. On that date `WebFetch` failed for every host, including example.com (`getaddrinfo ENOTFOUND`). No competitor or official page was opened.
- **Unreachable on 2026-10-11:** varnda.com, mfatah.com, ybnee.com, alhisba.com, taqeemkw.com, pricingkuwait.com, csb.gov.kw, rics.org, aljarida.com and example.com. The other sites (baladia.gov.kw, kff.gov.kw, mew.gov.kw, kcb.gov.kw, pahw.gov.kw, capt.gov.kw, foreign calculators) were reached only through `WebSearch` snippets.
- **Status of findings:** official-source findings below are search-snippet level (UNVERIFIED) unless stated otherwise. No formula was reverse-engineered.
- **Key conclusion:** no source found discloses the evidence behind its villa KWD/m² rates. Urban must generate its own evidence.

## 1. What exists vs what is missing

| Need | What exists (status) | Gap |
|---|---|---|
| Current turnkey villa KWD/m² by finish grade | Competitor published claims (Varnda, MFatah) as VERIFIED PUBLISHED CLAIM, evidence undisclosed. Markaz KD 230/m² (Feb 2022) and Aksbir KD 162/m² (2020), both HISTORICAL | No current, scope-defined, evidence-backed rate |
| Trade unit rates (supply + install) | Ybnee min/max ranges (very wide, basis unclear) | No scope-matched quotations per trade |
| Basement (excavation, shoring, dewatering, waterproofing) | Ybnee ranges; Taqeem treats these as inputs (black box) | No Kuwait project data by depth, faces or water table |
| Contractor preliminaries and OH&P | Not disclosed by any competitor | No Kuwait benchmark at all |
| Design fees, permits, utility connections | Varnda 8% / 5,000 KWD; Ybnee 800–3,500 KWD (claims only). No official Municipality permit-fee schedule found. No MEW connection-fee schedule found. KCB's 2,000 KWD electricity tranche is a loan payment, not a fee | Official fee schedules unverified |
| Built-area rules (to derive GFA from plot) | News reports: "210% or 960 m², whichever greater" for plots >400 m² (committee draft, UNVERIFIED); one basement on full plot, 20 m height (UNVERIFIED); 2007 rule 210% + 120 m² for 350–400 m² plots (HISTORICAL) | Consolidated current text of Ministerial Resolution 206/2009 as amended (288/2024, 791/2024, 2025/601, 333/2026) not opened. **No official 80% per-floor coverage rule found** (Alhisba's 80% stays INFERRED/UNVERIFIED) |
| Escalation index for construction inputs | CSB Wholesale Price Index, base 2007=100 (June 2024 = 149.2; Dec 2025 = 150.6 per aggregator). CSB CPI (2.19% y/y June 2026). MOCI building-material price lists (rebar 244 KWD/t, Aug 2021, via secondary site) | No Kuwait construction cost index or building-materials sub-index confirmed |
| International cost survey with Kuwait villa rate | Spon's Middle East handbook covers Kuwait but is 2005 (HISTORICAL). Turner & Townsend ICMS and Arcadis ICC: Kuwait not seen in results. Currie & Brown, AECOM, Linesight: nothing for Kuwait found (paywalled or not indexed) | No current third-party Kuwait villa benchmark |
| Public tender/award data | CAPT aggregate award values (2021); PAHW bundled contract totals | Not itemised per m². PAHW per-unit division is unreliable |

## 2. Prioritised collection actions

**P1: Urban's own completed-project final accounts (highest value)**

- Collect 5–10 recent Urban villas (completed 2024–2026). For each, record:
  - final account by trade;
  - GFA per floor and basement area/depth;
  - finish grade;
  - start and completion dates;
  - variations.
- Normalise to KWD/m² GFA, both by trade and in total, with an NRM-style split: building works / preliminaries / OH&P / fees / contingency used.
- Status once signed off by Urban management: URBAN-APPROVED (none exist yet).

**P2: Scope-matched subcontractor and supplier quotations**

- For each major trade, obtain at least 3 written quotations (ideally 5) against one standard Urban scope sheet and drawing set. Record date, validity, supply vs supply-and-install, and exclusions.
- Trades to cover:
  - excavation and shoring;
  - dewatering;
  - concrete frame (rate per m³ and per m² GFA);
  - blockwork;
  - plaster;
  - waterproofing and insulation;
  - MEP (electrical, plumbing, HVAC/AC);
  - elevator;
  - aluminium/glazing;
  - gypsum ceilings;
  - flooring (porcelain/marble, supply + lay);
  - joinery;
  - external cladding (Sigma/stone);
  - paint;
  - pool;
  - external works.
- Re-quote each trade every 6 months, or when material indices move more than 5%.

**P3: Alhisba controlled matrix (benchmark only)**

- Run a one-factor-at-a-time matrix across:
  - plot area (e.g. 300 / 375 / 400 / 500 / 750 / 1000 m²);
  - storeys (1–3);
  - basement yes/no;
  - grade A/B/C.
- Record the displayed built area and all 8 category outputs, with screenshots and timestamps.
- Purpose: to understand its sensitivities, not to copy rates. Do not access the backend.

**P4: Taqeem one-change runs (benchmark only)**

- Start from a fixed base case. Change exactly one input per run (basement, height, shoring faces, dewatering months, pool, elevator origin, cladding type).
- Record the lump sum and the "last update" stamp each time.
- The earlier observations (270,000 vs 161,000 KWD) changed about 9 inputs at once, so they are not interpretable.
- The site blocks automated fetching, so runs must be manual.

**P5: Official rules (to define GFA and fees, not rates)**

- Obtain the current consolidated private-housing table (Ministerial Resolution 206/2009 as amended) directly from Kuwait Municipality (baladia.gov.kw) or Kuwait Al-Youm (the official gazette).
- Confirm:
  - building ratio by plot size;
  - ground-floor coverage, if any;
  - basement count, footprint and exclusion from the ratio;
  - roof annex;
  - height limit.
- Obtain the Municipality permit-fee schedule and the MEW connection requirements and fees for private housing. Note that the e.gov.kw cable/meter relocation page lists a variable fee based on cable cost.
- Confirm whether Kuwait Fire Force requirements now apply to private villas. An undated report said private housing is exempt; Executive Regulation 13/2020 may have changed this.

**P6: Purchase or request third-party reports**

- Markaz "Cost of Construction in Kuwait and its Components" (Oct 2022): open the PDF and record the method and component split. Historical context only.
- Consider current paid editions of regional cost handbooks, or a direct request to quantity-surveying firms' Kuwait offices. Record only figures actually received, with edition and date.

**P7: Material price tracking**

- Monthly snapshot of MOCI building-material price announcements (rebar, cement, block, timber) and 3 supplier price lists. Keep a dated archive.

## 3. Official sources usable for escalation monitoring (with caveats)

| Source | Use | Caveats |
|---|---|---|
| CSB Wholesale Price Index (2007=100) and its sectoral sub-indices (e.g. mining & quarrying: sand, gravel, crushed stone) | Directional input-cost escalation | General index, not a construction cost index. No building-materials sub-index confirmed. Aggregators disagree on the latest month. csb.gov.kw unreachable on 2026-10-11 |
| CSB CPI | Macro inflation context only | Consumer basket; not construction |
| MOCI building-material price lists | Rebar, cement and similar price levels and changes | Only historical (2021) reproductions seen; check currency of data; ex-shop, excludes transport |
| KCB loan cap (70,000 KWD) | Client affordability context | Financing, not a cost; commitment is reduced by land value |
| Municipality building ratios | Derive maximum GFA from plot | Regulation, not a rate; multiple recent amendments; draft vs adopted status unclear |

**Recommended escalation approach:**

- Use a weighted basket built from Urban's own trade split, taken from P1 final accounts.
- Index each trade to the best available series: MOCI rebar and cement, CSB WPI sub-indices, supplier price lists, and labour day-rates from quotations.
- Re-base with fresh quotations rather than relying on an index alone.

## 4. Rules for the ratebook

1. No competitor rate enters the production ratebook. Competitor rates are BENCHMARK_ONLY and labelled with source and date.
2. Foreign figures (Saudi, UAE, Qatar) are "foreign market — methodology reference only" and are never converted to KWD.
3. Every production rate needs: source (quotation, final account), date, scope and inclusions, unit, and an approver. The status becomes YES_AFTER_URBAN_APPROVAL only after sign-off.
4. Show preliminaries, OH&P, design fees, permits, contingency and escalation as separate lines (RICS NRM 1 structure).
5. Re-run this source audit with a working fetch environment, to re-verify the client-package claims and to open the official pages listed here.
