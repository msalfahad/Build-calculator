# Competitor Source Audit: Kuwait Villa Construction-Cost Calculators

## Method and limits

- **Follow-up check (main session, 2026-10-11):** the cause is the cloud environment's network policy. The outbound proxy returned `CONNECT tunnel failed, response 403` for every external host tested, including www.wikipedia.org and all the competitor and government sites. The sites themselves did not refuse access. To re-verify these findings, allow these domains in the environment's network settings and re-run the audit.

- **Access date:** 2026-10-11.
- **Page access failed for every site.** Every `WebFetch` attempt on 2026-10-11 failed with `getaddrinfo ENOTFOUND`. That covers all 15 competitor sites, every official site tried (csb.gov.kw, rics.org, aljarida.com) and a control domain (example.com). So this is a failure in the research environment's name resolution. It does not mean the sites block access. **No page was opened on 2026-10-11.**
- **What did work:** only `WebSearch`. It returns result titles, URLs and a short summary of the snippets. Anything taken from search results below is labelled "search snippet, page not opened". Its status is UNVERIFIED unless the client package already holds it.
- **Client package data:** the competitor facts here come mostly from the client research package, recorded on 2026-08-06, 2026-10-07 and 2026-10-10. They are labelled "from client research package, not re-verified on 2026-10-11".
- **No reverse-engineering:** no formula was reverse-engineered. No app backend, API or proprietary code was accessed. Where this file mentions a ratio such as Alhisba's 80%, it is plain arithmetic on observed inputs and outputs, marked INFERRED.
- **Method vs evidence:** a calculator's *method* (how it multiplies) is kept separate from the *evidence* behind its rates (where its numbers come from).

## Summary verdict

None of the 15 calculators discloses the evidence behind its rates. None cites supplier quotations, completed-project data, BOQs or a price index as the origin of its KWD/m² or trade rates.

- Taqeem shows a "last update 09/2026" date and calls its result a "reference value only".
- The rest show no evidence basis at all, or none could be found.

**None is suitable as an approved rate source for Urban's production ratebook.** Their published figures can only be used as labelled benchmarks (BENCHMARK_ONLY). The only Kuwait figures with any stated basis are historical third-party reports, not calculators:

- Markaz, Oct 2022: KD 230/m² for medium-end private housing in Feb 2022.
- "Aksbir" (أكسبر), cited on alhisba.com: KD 162/m² from 2020 research.

---

## 1. Varnda (Kuwait page)

- **URLs tried (2026-10-11):**
  - `https://varnda.com/kw/حاسبة-تكلفة-البناء-للمتر-المربع`: ENOTFOUND (environment failure).
  - Search with `allowed_domains=varnda.com`: returned only Egypt and Saudi Varnda tools (e.g. `varnda.com/eg/...`, `smarttools.varnda.com/sa/...`). No Kuwait methodology, about or sources page appeared.
- **Data status:** from client research package (2026-08-06), not re-verified on 2026-10-11.

| # | Question | Answer |
|---|---|---|
| 1 | Inputs | GFA (built area), finishing tier, building/floor/structure factors, optional land (client package) |
| 2 | Formula disclosed | Yes: GFA × finishing base rate × building/floor/structure factors + fees + contingency (+ optional land) |
| 3 | Rates visible | Yes, KWD/m² low/mid/high: Basic 115/125/140; Medium 135/150/170; Good 160/175/195; Luxury 210/240/280; Ultra 300/360/430 |
| 4 | Land vs built-up basis | Built-up area (GFA) |
| 5 | KWD/m² | Yes |
| 6 | Trades priced independently | No (single blended rate) |
| 7 | Fixed percentages | Yes, in the example: design 8%, contingency 7%, plus permits 5,000 KWD lump sum |
| 8 | Structural coefficients | Named ("building/floor/structure factors"); values not in package |
| 9 | Finishing multipliers | Tier base rates act as finishing selector |
| 10 | Basement | Not recorded in package |
| 11 | Materials + labour | Not stated in package |
| 12 | Contractor OH&P | Not stated |
| 13 | Design/permits/contingency | Yes, added on top (8% / 5,000 / 7% in example) |
| 14 | Evidence basis | Not disclosed (none found) |
| 15 | Independently verifiable | No |
| 16 | Price update date | Not recorded (page recorded 2026-08-06) |
| 17 | Example reconciles | Yes, if contingency is applied to the base only (see COMPETITOR_FORMULA_COMPARISON.md) |
| 18 | Disclosed exclusions | Land excluded unless added; others not recorded |

- **Method vs evidence:** the method is clear and parametric. The evidence is absent.
- **Observation (INFERRED, coincidence not confirmed):** the worked example uses 960 m². A Kuwait Municipality committee draft reported by Al-Rai sets a cap of "210% or 960 m², whichever is greater" for private-housing plots over 400 m² (search snippet, page not opened).
- **Verdict:** BENCHMARK_ONLY.

## 2. MFatah

- **URLs tried:**
  - `https://mfatah.com/house-building-cost-kuwait/`: ENOTFOUND.
  - `https://mfatah.com/building-contractor-kuwait/`: not attempted separately (same host).
  - Search: no mfatah pages indexed.
- **Data status:** from client research package (page dated 7 Oct 2026), not re-verified.

| # | Answer |
|---|---|
| 1 | Total built m², finish tier |
| 2 | Yes: total built m² × tier rate |
| 3 | Normal 120, Deluxe 150, Super Deluxe 190 KWD/m² |
| 4 | Built-up area |
| 5 | Yes |
| 6 | No |
| 7 | None recorded |
| 8 | None |
| 9 | Tier rate only |
| 10 | Not recorded |
| 11 | Scope advertised as "structure, finishes, AC, electrical" (contractor advertisement) |
| 12 | Not stated; implicitly a contractor selling price |
| 13 | Not recorded |
| 14 | Contractor's own advertised price; no further evidence |
| 15 | No |
| 16 | Page dated 7 Oct 2026 (per client package) |
| 17 | No worked example recorded |
| 18 | Not recorded |

- **Method vs evidence:** a single multiplier. The rate is a contractor's marketing claim.
- **Verdict:** BENCHMARK_ONLY. This is an advertised contractor price, not a cost.

## 3. Ybnee

- **URLs tried:**
  - `https://ybnee.com/calculator`: ENOTFOUND.
  - Search: no ybnee pages indexed.
- **Data status:** from client research package, not re-verified.

| # | Answer |
|---|---|
| 1 | Trade-unit quantities |
| 2 | Partly: quantity × published min/max range |
| 3 | Examples: elevator 8,000–20,000 KWD/unit; aluminium 35–200/m²; gypsum ceiling 6–25/m²; basement shoring 35–75/m²; excavation 12–28/m³; design & permits 800–3,500/project; porcelain 60x60 0.95–8.95/m² (product only) |
| 4 | Element quantities (neither land nor GFA rate) |
| 5 | Per trade unit (m², m³, unit, project) |
| 6 | **Yes**, the only Kuwait calculator in the set that does this |
| 7 | None recorded |
| 8 | None |
| 9 | Min/max range acts as specification spread |
| 10 | Shoring and excavation priced as separate trades |
| 11 | Mixed: porcelain is product-only; others not stated |
| 12 | Not stated |
| 13 | Design & permits lump range 800–3,500 KWD |
| 14 | Not disclosed |
| 15 | No |
| 16 | Not recorded |
| 17 | No worked example recorded |
| 18 | Porcelain product-only (excludes laying) |

- **Method vs evidence:** a trade-based structure, which is the closest to what Urban needs. The evidence is undisclosed and the ranges are very wide (aluminium varies 5.7×).
- **Verdict:** BENCHMARK_ONLY. Useful as a checklist of trades, not as a source of rates.

## 4. Alhisba (CCE)

- **URLs tried:**
  - `https://alhisba.com/evaluation/cce`: ENOTFOUND.
  - Search with `allowed_domains=alhisba.com`: found the alhisba.com home page and news articles, e.g. `alhisba.com/news-details.php?m=519` («أكسبر»: 4 عقبات تعترض مشاريع السكن الخاص) and `?m=296` (نار الأسعار... حرقت بيت العمر!). No methodology page appeared.
- **Data status:** calculator facts are from client research package (screenshots), not re-verified.

| # | Answer |
|---|---|
| 1 | Land area, storeys, basement, built area, finish grade A/B/C |
| 2 | No |
| 3 | No unit rates shown; total + 8 categories |
| 4 | Both entered; displayed built area 640 m² for a 400 m² plot × 2 floors |
| 5 | Not shown |
| 6 | Output split into 8 categories; inputs not by trade |
| 7 | Undisclosed |
| 8 | Undisclosed |
| 9 | Grade A/B/C (values undisclosed) |
| 10 | Basement is an input; treatment undisclosed |
| 11–13 | Undisclosed |
| 14 | Not disclosed for the calculator |
| 15 | No |
| 16 | Not recorded |
| 17 | No published example. Observed results 344,000; 267,000; 260,000; 122,000 KWD |
| 18 | Not recorded |

- **INFERRED:** 640 / (400 × 2) = 0.80, so the displayed built area equals 80% of the plot per floor. 122,000 / 640 = 190.6 KWD/m² of displayed area (grade C, no basement).
- **Official 80% rule? No.** No authoritative Kuwait Municipality text giving 80% per-floor coverage for private housing was found. The only "80%" seen was in an old, unofficial copy of municipal conditions (Tumblr, search snippet): it allowed a *basement* of up to 80% of plot area, excluded from the building ratio. Newer news reports describe a basement on the full plot. So the 80% link is **UNVERIFIED**.
- **Related site content (search snippet, page not opened):** an alhisba.com news item cites the consultancy "Aksbir" (أكسبر): «سعر بناء وتشطيب المتر المربع بدولة الكويت قد بلغ معدل 162 دينارا حسب نتائج وابحاث عام 2020». It also reports the black structure (الهيكل الأسود) at about 29.4% of total budget. That is a third-party historical claim; there is nothing to show the calculator uses it.
- **Verdict:** BENCHMARK_ONLY. Its observed outputs are black-box results.

## 5. Taqeem

- **URLs tried:**
  - `https://taqeemkw.com/Frontend/Home/Construction`: ENOTFOUND. Automated fetching was also blocked earlier, per the client package.
  - Search found the `https://taqeemkw.com/` home page. The search summary describes «تقييم تكلفة البناء الاسترشادي» split into private and investment housing, with "structure cost" and "detailed cost" options (search snippet, page not opened).
- **Data status:** from client research package, not re-verified.

| # | Answer |
|---|---|
| 1 | Location, land 250–1000 m², floors G…G+1+2, basement, height 4–7 m, shoring faces, dewatering months, insulation, pool, elevator stops/origin, trade origins, exterior Sigma/stone |
| 2 | No |
| 3 | No unit rates; lump-sum result |
| 4 | Land area input; built area derivation undisclosed |
| 5 | Not shown |
| 6 | Trade origins selectable; prices not shown |
| 7–9 | Undisclosed |
| 10 | Basement, shoring faces and dewatering months are explicit inputs |
| 11–13 | Undisclosed |
| 14 | Not disclosed; "reference value only" |
| 15 | No |
| 16 | "last update 09/2026" |
| 17 | No published example. Observed 270,000 and 161,000 KWD (~9 inputs changed between runs) |
| 18 | Disclaimer only |

- **Method vs evidence:** it has the richest input model among the Kuwait calculators. Its update date suggests the rates are maintained, but the source is not stated.
- **Verdict:** BENCHMARK_ONLY.

## 6. Pricing Kuwait

- **URLs tried:**
  - `https://pricingkuwait.com/`: ENOTFOUND.
  - Search: not indexed.
- **Data status:** from client research package, not re-verified.
- **Claims:** per-floor areas and heights, finish grade, categories (shell/plaster/MEP/finishes), "live prices" and CAD extraction. No outputs were tested.
- **Answers to the 18 questions:**
  - Q2 (formula) and Q14 (evidence): not disclosed. "Live prices" is an unsubstantiated claim.
  - Q15: no.
  - Q16 and Q17: unknown.
- **Verdict:** NO for now. Not even a benchmark until outputs are observed.

## 7. Hasebi (Kuwait-labelled)

- **URLs tried:**
  - `https://hasebi.com/calculator/construction-cost-kuwait/`: not reachable (same DNS failure).
  - Search with `allowed_domains=hasebi.com`: returned only other hasebi tools (Egypt electricity, SMSA shipping, Bank Muscat loans). The Kuwait construction page was not indexed.
- **Client package note:** currency inconsistency.
- **Verdict:** NO. The currency is inconsistent and nothing could be verified.

## 8–15. Non-Kuwait calculators (foreign market — methodology reference only)

None of these may be used for Kuwait prices. All pages failed to open (ENOTFOUND). Search found some home and blog pages, listed below; all were search snippets only.

| Calculator | Search-visible facts (snippet, not opened) | Method note | Evidence disclosed | Verdict |
|---|---|---|---|---|
| Mawsouq (mawsouq.com, Saudi) | Inputs: land area, floors, building type, finish level; output split structural/finishing/foundation/extras; indicative SAR 900–1,250/m² economy to SAR 2,000–3,500+/m² high spec (blog "Construction Cost per m² in Saudi Arabia (2026)"); notes that a cost index "measures change in inputs; it does not publish a universal house-building rate" | Component split | Not disclosed | Foreign market, methodology reference only |
| Hasbati (hasbati.com/construction-cost-calculator/) | Estimates structure and finishing separately plus material quantities (concrete, steel, block, sand, aggregate); user enters local material prices | Quantity × user price | User-supplied | Methodology reference only |
| Etimadco (etimadco.com/tools/cost-calculator) | Client package: area × base × finishing factor × city factor, ±15% | Parametric with city factor and accuracy band | Not disclosed | Methodology reference only |
| Nmo Walsafwa (nmowalsafwa.com/project-calculator/) | Not indexed | Unknown | Unknown | UNVERIFIED |
| Ihsabha (ihsabha.com/...) | Not indexed | Unknown | Unknown | UNVERIFIED |
| Mihsab (mihsabtools.com/calculators/construction) | Not indexed | Unknown | Unknown | UNVERIFIED |
| Kulfa (kulfa.app) | Country-specific BOQ-style pages (Iraq, Syria); e.g. 150 m² Iraq US$36,000–48,500 excl. land | BOQ from inputs | Not disclosed | Methodology reference only |
| Bilad Tibah (biladtibah.com/quotation) | Not indexed | Unknown (quotation form) | Unknown | UNVERIFIED |

---

## Cross-competitor findings

1. **Rate evidence disclosed:** none of the 15. No supplier quotes, project final accounts, BOQs or indices are cited as the source of rates (Q14 = "not disclosed" for all).
2. **Disclosed formulas:**
   - Varnda (full parametric formula with percentages).
   - MFatah (area × tier).
   - Ybnee (quantity × range).
   - Etimadco (foreign).
   - Alhisba, Taqeem and Pricing Kuwait are black boxes.
3. **Basis:** all area-based tools use built-up area, not land area. Alhisba and Taqeem take land area as an input and derive built area internally (undisclosed).
4. **Fees and contingency:** only Varnda (8% design, 7% contingency, 5,000 permits) and Ybnee (design & permits 800–3,500 lump) show them. Nobody discloses contractor overhead and profit separately.
5. **Basement:** only Taqeem (shoring faces, dewatering) and Ybnee (shoring, excavation trades) treat it explicitly.
6. **Update dates:**
   - Taqeem: "last update 09/2026".
   - MFatah: page dated 7 Oct 2026, but that is a page date, not a price date.
   - Others: none.
