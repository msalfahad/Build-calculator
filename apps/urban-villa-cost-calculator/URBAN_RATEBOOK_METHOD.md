# Urban Ratebook Method

**Applies to:** ratebook schema v2 (`src/data/ratebook.json`, `src/lib/ratebookStore.ts`) · engine 2.0.0 · 2026-10-11

The ratebook is the foundation of every estimate. This document defines:

- what a rate must record;
- how evidence is classified;
- how freshness is checked;
- how a rate becomes Urban-approved.

## 1. Current contents (honest status)

| Rates | Status | Use |
|---|---|---|
| VR-01…VR-05 (Varnda tiers) | `published_benchmark` · evidence `verified_published_claim` · category 6 (competitor calculator estimate) · confidence **low** | Labelled research/demo benchmark only |
| MF-01…MF-03 (MFatah rate card) | `published_benchmark` · evidence `verified_published_claim` · category 5 (competitor contractor rate card) · confidence **low** · own grading system | Labelled benchmark only |
| Structure-only, finishing-only, basement, trade/addition rates | **none** | These scopes stay unpriced or blocked until Urban enters rates |
| Urban-approved rates | **none** | — |

Two caveats on the benchmarks:

- **Underlying evidence:** none of the competitors discloses the evidence behind its rates (`docs/research/COMPETITOR_SOURCE_AUDIT.md`).
- **Re-verification:** these values have not been re-verified since the client research package (2026-08-06 / 2026-10-07). The 2026-10-11 re-check was impossible because the environment blocks web access.

## 2. Required fields per rate

| Field | Meaning |
|---|---|
| `rate_id`, `version` | Stable identifier; version increments on every change |
| `category`, `scope` | building (turnkey / structure / finishing), basement, addition. **A rate is only ever used for its own scope.** |
| `trade_category`, `work_description` | What work the price covers |
| `unit` | Building and basement rates must be `KWD/m2`; anything else is blocked |
| `price_basis` | `supply_install` / `material_only` / `labour_only` / `unknown`. Material-only is never silently treated as installed. |
| `price_low / mid / high` | Low and high only where the source supports a range. Otherwise null, and the app shows "no published range". |
| `location`, `country` | Kuwait / `KW`. Other countries trigger a warning; foreign prices are never calibration data. |
| `grade_system`, `grade` | Urban grades, or the source's own grading (never auto-mapped) |
| `source`, `source_url`, `quote_ref` | Where the number comes from (URL or stored quotation reference) |
| `source_date`, `valid_until`, `last_reviewed` | Freshness |
| `approval_status`, `approver`, `approved_at` | Urban workflow state |
| `evidence_status`, `evidence_category`, `confidence` | Evidence classification (sections 3–5) |
| `inclusions`, `exclusions` (+ `_ar`) | Published scope, in English and Arabic |
| `included_components` | Components the base rate **documents** as included, optionally with a standard allowance per unit (used for upgrade netting) |

## 3. Evidence status (nature of the evidence)

| Status | Meaning |
|---|---|
| VERIFIED PRIMARY SOURCE | Original document directly states the number (e.g. a signed quotation) |
| VERIFIED PUBLISHED CLAIM | The claim is verified to exist on the publisher's site. **The market price behind it is not verified.** |
| OBSERVED CALCULATOR RESULT | A real input→output observation |
| RECONSTRUCTED FORMULA | Independently recomputed from a published formula |
| INFERRED | Analytical hypothesis |
| UNVERIFIED | Evidence insufficient |
| HISTORICAL | Dated; not approved as current |
| URBAN-APPROVED | Passed Urban's approval process (section 6) |

## 4. Source hierarchy (starting order, not an automatic ranking)

1. Urban completed-project final costs.
2. Current, scope-matched subcontractor quotations.
3. Current, scope-matched supplier quotations.
4. Relevant published supplier prices.
5. Competitor contractor quotations / advertised rate cards.
6. Competitor calculator estimates.
7. Historical data and experimental assumptions.

Auto-selection prefers by approval status (Urban-approved → supplier quotation → historical → provisional → published benchmark → experimental), then by newest date. Category alone never decides: relevance, scope match, date, completeness and whether costs were actually incurred also count (section 5).

## 5. Confidence (qualitative, no percentages)

Five factors are assessed `high / medium / low / unknown`:

- Kuwait-villa relevance
- scope documented
- recency
- completeness
- actually incurred

**Overall = the weakest factor.**

- Any unknown factor gives *Not rated*.
- Inferred or unverified evidence is capped at *Low*.

No numerical accuracy is ever attached to a rate.

## 6. Approval workflow

1. Enter or import the rate with its source, date, scope, inclusions/exclusions and evidence classification.
2. Compare it with other rates for the same item (**Rate library → Compare quotations**): source, date, basis, evidence, confidence.
3. **Approve** requires a named approver. It records the approver, time and review date, sets `urban_approved`, and logs the change.
4. Changing the price, unit, scope, basis, country or inclusions of an approved rate without re-approving in the same edit downgrades it to *User-entered provisional* and clears the approver.
5. Every change is logged (field, from → to, ratebook version) and can be filtered per rate (price history).

### Security gate

- **Local admin:** this build stores the ratebook in `localStorage`, and anyone with the admin screen can approve. That is acceptable for internal development only. **localStorage is not a secure production database.**
- **Public build:** a build with `VITE_PUBLIC_BUILD=true` hides the rate library, refuses edits and always uses the bundled ratebook. This was verified: `docs/test-results/public-build-gate.txt`.
- **Before production:** move the ratebook to a backend (e.g. Firestore) with authenticated, role-checked writes. Only administrators may approve shared rates; customers get read-only access.

## 7. Freshness warnings (implemented)

| Code | Trigger |
|---|---|
| RATE_EXPIRED | `valid_until` is in the past |
| QUOTE_OLD | Supplier quotation older than 90 days with no validity date |
| RATE_STALE | Source date older than 365 days |
| RATE_NO_DATE | Missing or invalid source date |
| RATE_UNVERIFIED_METHOD | Evidence is a published claim, reconstructed, inferred or unverified |
| RATE_UNIT_INCOMPATIBLE | Building/basement rate not in KWD/m² (**blocks**) |
| RATE_CURRENCY | Not KWD (**blocks**) |
| RATE_FOREIGN | `country` ≠ KW |
| MATERIAL_ONLY_RATE / LABOUR_ONLY_RATE | Excludes installation / materials |
| RATE_NOT_APPROVED / RATE_APPROVAL_INCOMPLETE | Not Urban-approved, or approved without a named approver |

**No escalation is applied automatically.** Inflation or index adjustment requires an approved, documented escalation model; none exists. Kuwait CSB wholesale/CPI indices are general indices, not construction-cost indices (see `docs/research/MARKET_DATA_GAPS.md`).

## 8. Import / export / migration

- **JSON:** export/import of the ratebook; every rate is validated on import.
- **Older files:** v1 files are migrated to v2 automatically. Prices are never changed, and the migration is logged.
- **Saved estimates:** they keep a snapshot of the rates they used. Reopening reproduces the original figures from that snapshot, with a toggle to recalculate on the current ratebook instead.
