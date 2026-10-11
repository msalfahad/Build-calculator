# Taqeem (taqeemkw.com) construction-cost calculator: findings

Source: your 3 screen recordings (10 Oct 2026, 6:00-6:02) and 3 screenshots (161,000 KD run).
Limits: no audio/OCR; frames read by eye. The site's formula is not shown anywhere, so the "how it works" part is inference.
Site blocks automated fetching, so I did not run any scenarios myself.

## Wizard (private residence, "Detailed cost")
1. Location: governorate, area (both "All" in the runs)
2. Area: land m2, accepts 250-1000 only
3. Floors: G, G+1/2 first, G+1, G+1+1/2 second, G+1+2; basement yes/no; height 4 (most common), 5, 6, 7 m
4. Services: shoring none/1/2/3/4 faces; dewatering none/2/3/4/5 months; insulation yes/no; pool yes/no
5. Elevator: yes/no; stops 3/4/5; origin local/Turkish/European
6. Trade origins: plumbing (local, European, Turkish, Chinese); electrical (local, Gulf, Middle East);
   A/C (local, American, Japanese); porcelain & flooring (local, Chinese, European, Indian);
   false ceilings (local, Gulf); aluminium; bath/kitchen accessories
7. Exterior: Sigma / Full stone / Sigma + stone; Sigma faces + stone faces always total 4 (stone field auto-fills)
8. Result: lump sum KD, "last update 09/2026", save/share, "Full details" (only echoes inputs, no cost breakdown),
   related listings, sponsored finishing ad, disclaimer (reference value only, not an official valuation)

## The two estimates
| | Estimate 1 (video) | Estimate 2 (screenshots) |
|---|---|---|
| Land / floors / height | 400 m2, G+1+2, 4 m | same |
| Basement | Yes | No |
| Shoring / dewatering | 2 faces / 3 months | none / none |
| Insulation / pool | Yes / No | No / No |
| Elevator | Yes, 4 stops, origin looked Turkish (uncertain) | Yes, 4 stops, European |
| Plumbing, electrical, A/C | Local | Local |
| Porcelain, flooring | Indian | Local |
| False ceilings | Local | Local |
| Aluminium | European | Local |
| Accessories | Chinese | Local |
| Exterior | Sigma 3 + Stone 1 (European) | Sigma 4 faces |
| **Result** | **270,000 KD** | **161,000 KD** |

Gap 109,000 KD comes from ~9 simultaneous changes, so no single variable's price can be isolated yet.

## Pricing logic (inferred, unconfirmed)
Likely: base rate x built-up area (from land + floors) adjusted by height, plus lump adders (basement, shoring per face,
dewatering per month, insulation, pool, elevator by stops/origin) and origin multipliers per trade.
Built-up area is never displayed, so KD/m2 cannot be derived from the site.

## Next step
Fill the yellow Result column in Taqeem_scenario_matrix.xlsx (65 one-at-a-time runs + walk to 270,000), send it back,
and the rates/multipliers can be fitted and tested against both estimates.
