# Urban Scope-Inclusions Matrix

**Implements:** Phase 6 (double-counting prevention) · `src/calculators/optionalItems.ts` · catalogue in `src/lib/defaults.ts`

Every component in an estimate has exactly one ownership status. The engine applies it consistently in the quick estimate (major extras), the refined estimate (all components), the results screen, the breakdown and the PDF.

## 1. Statuses and how they are costed

| Status | Construction cost | Owner budget | Shown as | Rule |
|---|---|---|---|---|
| **Included in base rate** (`baseline`) | 0 (covered by the base rate) | — | "What is included" | Warns `BASELINE_INCLUSION_UNDOCUMENTED` unless the selected base rate lists the component in `included_components` |
| **Extra** (`extra`) | qty × rate | — | Calculated cost | Not in the base rate; full price added once |
| **Upgrade** (`upgrade`) | qty × upgrade rate − standard allowance | — | Calculated cost | See section 2. Allowance missing → **unpriced** (never full price, never zero). |
| **Provisional allowance** (`provisional`) | qty × rate | — | Estimated allowance | Labelled provisional; warning `PROVISIONAL_ALLOWANCE` |
| **Owner-direct** (`owner_direct`) | — | qty × rate | Owner-direct | Never in construction or in % bases |
| **Not included** (`excluded`) | 0 | — | "What is not included" | Listed explicitly |
| **Needs quotation** (`quote_required`) | unpriced | — | Unpriced list | Estimate becomes **Partial** |

## 2. Upgrade netting (the brief's example)

```
Standard allowance  = 30 m² × 60 KWD/m²  = 1,800 KWD
Upgraded aluminium  = 30 m² × 120 KWD/m² = 3,600 KWD
Net additional cost = 3,600 − 1,800      = 1,800 KWD
```

The allowance comes from, in order:

1. a standard rate entered per unit (qty × standard rate);
2. a total standard allowance entered;
3. the allowance rate documented on the selected base rate (`included_components`).

If none exists, the item is unpriced. If the base rate does not document the component, the app warns that the allowance is the estimator's assumption (`UPGRADE_BASELINE_UNDOCUMENTED`).

A negative net (downgrade below the standard) is shown as a credit. Unit test: `v2.test.ts` › "upgrade via standard unit rate"; e2e: refined estimate test (net 1,800).

## 3. Default baseline data

**No default rate documents any included component.** The Varnda and MFatah tiers publish only a broad scope statement ("turnkey building per m²"; "structure, finishes, AC, electrical"), not a component list or allowances.

Consequences:

- **No assumed inclusions:** V2 defaults new items to *Extra* and never assumes the baseline includes a standard version. This corrects V1 audit finding #7.
- **Turnkey wording is not enough:** marking a component *Included in base rate* with these benchmarks always produces a warning.
- **Where real allowances come from:** once Urban has its own turnkey packages, record each package's included components and standard allowances on the rate (**Rate library → Edit → Components documented as included**). Upgrades will then net automatically.

## 4. Component catalogue and typical ownership questions

| Group | Component | Unit | Quick estimate | Typical question to settle |
|---|---|---|---|---|
| Structure & site | Basement shoring | m² | ✓ (basement) | Included in the basement package or separate? |
| | Basement dewatering | month | ✓ (basement) | Groundwater concerns → quotation |
| | Special structural features | lump | refined | Cantilevers / spans → engineering quotation |
| | Site-condition allowances | lump | refined | Access, neighbour protection, soil, demolition |
| | Thermal insulation | m² | refined | Included in turnkey? |
| Architectural | Internal flooring | m² | refined | Standard allowance per m² in package? |
| | Bathrooms | no. | refined | Fixture allowance per bathroom |
| | Kitchen | no. | ✓ | Often owner-direct or allowance |
| | Internal / external doors | no. | refined | Allowance per door |
| | Aluminium windows | m² | ✓ | Standard system vs upgrade |
| | Exterior cladding | m² | ✓ | Paint vs stone/porcelain |
| | Gypsum ceilings, painting, stairs, waterproofing | m² / lump | refined | Included in turnkey? |
| MEP | AC (central/ducted), VRF, ventilation | lump | ✓ (AC) / refined | Often separate subcontract |
| | Plumbing, electrical | lump | refined | Normally in turnkey; confirm |
| | Smart home | lump | ✓ | Usually extra |
| | Elevator | no. | ✓ | Usually extra or owner-direct |
| | Pumps & tanks | lump | refined | Confirm |
| External works | Boundary walls | m | ✓ | Usually outside the building rate |
| | Paving, interlock, landscaping, external lighting | m² / lump | ✓ (landscaping) / refined | Usually outside the building rate |
| | Swimming pool | no. | ✓ | Always separate |

The catalogue carries **no prices**. Ybnee ranges appear only as research hints and are never applied.

## 5. Basement package inclusions

The basement step separately records what a basement price includes:

- excavation
- shoring
- dewatering
- reinforced concrete
- waterproofing
- internal finishes
- MEP

Unticked components are listed as exclusions. If shoring is required, or groundwater concerns exist, and the item is neither included in the package nor priced as a scope item, it becomes unpriced. Included components are never re-added.

## 6. Where the matrix appears

- **Results:** "What is included" (base-rate scope, included items, extras/upgrades, owner-direct) and "What is not included" (unpriced, not included, base-rate exclusions, land).
- **Breakdown:** additions table with a status column.
- **PDF page 3:** Included / Not included columns.
