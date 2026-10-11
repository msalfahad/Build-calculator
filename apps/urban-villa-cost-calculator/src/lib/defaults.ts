import type { AdditionLine, EstimateInput, Scope } from '../types';

let seq = 0;
export const newId = (p = 'id') => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export interface CatalogItem {
  key: string;
  en: string;
  ar: string;
  unit: string;
  /** True when a standard version is usually part of a turnkey baseline, so only the net upgrade should be added. */
  upgradeOfTurnkey: boolean;
  basementOnly?: boolean;
  /** Research hint only — never applied automatically. */
  hint?: string;
}

// No default prices: every optional item is unpriced until the estimator enters a rate and its source.
export const ADDITION_CATALOG: CatalogItem[] = [
  { key: 'elevator', en: 'Elevator', ar: 'مصعد', unit: 'no.', upgradeOfTurnkey: false, hint: 'Ybnee published indicative range 8,000–20,000 KWD per unit (YB-07, scope unverified)' },
  { key: 'pool', en: 'Swimming pool', ar: 'مسبح', unit: 'no.', upgradeOfTurnkey: false },
  { key: 'facade', en: 'Special facade cladding', ar: 'تكسية واجهة خاصة', unit: 'm²', upgradeOfTurnkey: true },
  { key: 'aluminium', en: 'Upgraded aluminium', ar: 'ألمنيوم مطوّر', unit: 'm²', upgradeOfTurnkey: true, hint: 'Ybnee published indicative range 35–200 KWD/m² (YB-10, glazing varies)' },
  { key: 'kitchen', en: 'Premium kitchen', ar: 'مطبخ فاخر', unit: 'no.', upgradeOfTurnkey: true },
  { key: 'smart_home', en: 'Smart home', ar: 'منزل ذكي', unit: 'lump', upgradeOfTurnkey: false },
  { key: 'landscaping', en: 'Landscaping', ar: 'تنسيق الحدائق', unit: 'm²', upgradeOfTurnkey: false },
  { key: 'external_works', en: 'Boundary wall / external works', ar: 'سور / أعمال خارجية', unit: 'm', upgradeOfTurnkey: false },
  { key: 'ac', en: 'Additional AC / ventilation', ar: 'تكييف / تهوية إضافية', unit: 'lump', upgradeOfTurnkey: true },
  { key: 'shoring', en: 'Basement shoring', ar: 'سند جوانب القبو', unit: 'm²', upgradeOfTurnkey: false, basementOnly: true, hint: 'Ybnee published indicative range 35–75 KWD/m², area basis unclear (YB-05)' },
  { key: 'dewatering', en: 'Basement dewatering', ar: 'نزح المياه الجوفية', unit: 'month', upgradeOfTurnkey: false, basementOnly: true },
];

export function newAddition(key: string, scope: Scope, lang: 'en' | 'ar' = 'en'): AdditionLine {
  const cat = ADDITION_CATALOG.find((c) => c.key === key);
  return {
    id: newId('add'),
    key,
    description: cat ? (lang === 'ar' ? cat.ar : cat.en) : '',
    unit: cat?.unit ?? 'lump',
    quantity: cat && (cat.unit === 'no.' || cat.unit === 'lump') ? '1' : '',
    rate: '',
    includedInBaseline: !!cat?.upgradeOfTurnkey && scope === 'turnkey',
    standardAllowance: '',
    source: '',
    enabled: true,
  };
}

export function defaultInput(): EstimateInput {
  return {
    projectName: '',
    propertyType: 'private_villa',
    plotArea: '400',
    location: '',
    siteNotes: '',
    coverage: '80',
    floors: {
      ground: { enabled: true, area: '', rateOverride: '' },
      first: { enabled: true, area: '', rateOverride: '' },
      second: { enabled: false, area: '', rateOverride: '' },
      roofAnnex: { enabled: false, area: '', rateOverride: '' },
    },
    basement: {
      enabled: false,
      area: '',
      depth: '',
      finish: 'unfinished',
      groundwater: 'unknown',
      shoring: 'unknown',
      pricingMode: 'none',
      rateId: '',
      rate: '',
      allowance: '',
      priceSource: '',
      includes: [],
    },
    scope: 'turnkey',
    grade: 'medium',
    rateSelection: { mode: 'auto', rateId: '', manualLow: '', manualMid: '', manualHigh: '', manualSource: '' },
    floorHeight: '',
    additions: [],
    ownerDirect: [],
    fees: { designPct: '0', contingencyPct: '0', fixedFees: '0', fixedFeesLabel: '', percentBase: 'construction' },
  };
}

/** Varnda's published illustrative example (Section 10). Reproduces 170,600 KWD — not an Urban quotation. */
export function varndaExampleInput(): EstimateInput {
  const d = defaultInput();
  return {
    ...d,
    projectName: 'Varnda published example (960 m², Medium)',
    plotArea: '400',
    floors: {
      ground: { enabled: true, area: '320', rateOverride: '' },
      first: { enabled: true, area: '320', rateOverride: '' },
      second: { enabled: true, area: '320', rateOverride: '' },
      roofAnnex: { enabled: false, area: '', rateOverride: '' },
    },
    scope: 'turnkey',
    grade: 'medium',
    rateSelection: { ...d.rateSelection, mode: 'library', rateId: 'VR-02' },
    fees: { designPct: '8', contingencyPct: '7', fixedFees: '5000', fixedFeesLabel: 'Permits & fees (illustrative)', percentBase: 'above_ground_base' },
  };
}

/** MFatah advertised Deluxe rate × 960 m² = 144,000 KWD construction only. */
export function mfatahExampleInput(): EstimateInput {
  const v = varndaExampleInput();
  return {
    ...v,
    projectName: 'MFatah advertised Deluxe (960 m²)',
    rateSelection: { ...v.rateSelection, mode: 'library', rateId: 'MF-02' },
    fees: { designPct: '0', contingencyPct: '0', fixedFees: '0', fixedFeesLabel: '', percentBase: 'construction' },
  };
}
