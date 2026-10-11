import type { AdditionLine, ComponentGroup, EstimateInput, FloorKey, Lang, RefinedInput, ScopeStatus } from '../types';

let seq = 0;
export const newId = (p = 'id') => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export interface CatalogItem {
  key: string;
  en: string;
  ar: string;
  unit: string;
  group: ComponentGroup;
  /** 1 = offered in the quick estimate's "major extras"; 2 = refined estimate only. */
  level: 1 | 2;
  basementOnly?: boolean;
  /** Research hint only — never applied automatically. */
  hint?: string;
}

// No default prices: every component stays unpriced until the estimator enters a rate and its source.
export const COMPONENT_CATALOG: CatalogItem[] = [
  // structure / site
  { key: 'shoring', en: 'Basement shoring', ar: 'سند جوانب السرداب', unit: 'm²', group: 'structure', level: 1, basementOnly: true, hint: 'Ybnee published indicative range 35–75 KWD/m², area basis unclear (YB-05)' },
  { key: 'dewatering', en: 'Basement dewatering', ar: 'نزح المياه الجوفية', unit: 'month', group: 'structure', level: 1, basementOnly: true },
  { key: 'structural_features', en: 'Special structural features (cantilevers, large spans)', ar: 'عناصر إنشائية خاصة (بروزات، بحور كبيرة)', unit: 'lump', group: 'structure', level: 2 },
  { key: 'site_works', en: 'Site-condition allowances (access, neighbour protection, soil, demolition)', ar: 'مخصصات ظروف الموقع (المدخل، حماية الجوار، التربة، الهدم)', unit: 'lump', group: 'structure', level: 2 },
  { key: 'thermal_insulation', en: 'Roof & wall thermal insulation', ar: 'العزل الحراري للأسطح والجدران', unit: 'm²', group: 'structure', level: 2 },
  // architectural
  { key: 'flooring', en: 'Internal flooring', ar: 'الأرضيات الداخلية', unit: 'm²', group: 'architectural', level: 2 },
  { key: 'bathrooms', en: 'Bathrooms (fit-out)', ar: 'الحمامات (تجهيز كامل)', unit: 'no.', group: 'architectural', level: 2 },
  { key: 'kitchen', en: 'Kitchen', ar: 'المطبخ', unit: 'no.', group: 'architectural', level: 1 },
  { key: 'internal_doors', en: 'Internal doors', ar: 'الأبواب الداخلية', unit: 'no.', group: 'architectural', level: 2, hint: 'Ybnee published indicative range 80–1,500 KWD per door (YB-12, material varies)' },
  { key: 'external_doors', en: 'External doors', ar: 'الأبواب الخارجية', unit: 'no.', group: 'architectural', level: 2 },
  { key: 'aluminium', en: 'Aluminium windows', ar: 'نوافذ الألمنيوم', unit: 'm²', group: 'architectural', level: 1, hint: 'Ybnee published indicative range 35–200 KWD/m² (YB-10, glazing varies)' },
  { key: 'facade', en: 'Exterior cladding', ar: 'تكسية الواجهات', unit: 'm²', group: 'architectural', level: 1 },
  { key: 'gypsum', en: 'Gypsum ceilings', ar: 'الأسقف الجبسية', unit: 'm²', group: 'architectural', level: 2, hint: 'Ybnee published indicative range 6–25 KWD/m² (YB-09, scope unclear)' },
  { key: 'painting', en: 'Painting', ar: 'الدهانات', unit: 'm²', group: 'architectural', level: 2 },
  { key: 'stairs', en: 'Stair finishes', ar: 'تشطيب الدرج', unit: 'lump', group: 'architectural', level: 2 },
  { key: 'waterproofing', en: 'Waterproofing (wet areas & roof)', ar: 'العزل المائي (المناطق الرطبة والسطح)', unit: 'm²', group: 'architectural', level: 2 },
  // MEP
  { key: 'ac', en: 'Air conditioning (central / ducted)', ar: 'التكييف (مركزي / مخفي)', unit: 'lump', group: 'mep', level: 1 },
  { key: 'vrf', en: 'VRF air-conditioning system', ar: 'نظام تكييف VRF', unit: 'lump', group: 'mep', level: 2 },
  { key: 'ventilation', en: 'Ventilation', ar: 'التهوية', unit: 'lump', group: 'mep', level: 2 },
  { key: 'plumbing', en: 'Plumbing installation', ar: 'أعمال السباكة', unit: 'lump', group: 'mep', level: 2 },
  { key: 'electrical', en: 'Electrical installation', ar: 'الأعمال الكهربائية', unit: 'lump', group: 'mep', level: 2 },
  { key: 'smart_home', en: 'Smart home', ar: 'المنزل الذكي', unit: 'lump', group: 'mep', level: 1 },
  { key: 'elevator', en: 'Elevator', ar: 'المصعد', unit: 'no.', group: 'mep', level: 1, hint: 'Ybnee published indicative range 8,000–20,000 KWD per unit (YB-07, scope unverified)' },
  { key: 'pumps_tanks', en: 'Pumps & water tanks', ar: 'المضخات وخزانات المياه', unit: 'lump', group: 'mep', level: 2 },
  // external works
  { key: 'external_works', en: 'Boundary walls', ar: 'الأسوار', unit: 'm', group: 'external', level: 1 },
  { key: 'paving', en: 'Site paving', ar: 'تبليط الموقع', unit: 'm²', group: 'external', level: 2 },
  { key: 'interlock', en: 'Interlock', ar: 'الإنترلوك', unit: 'm²', group: 'external', level: 2 },
  { key: 'landscaping', en: 'Landscaping', ar: 'تنسيق الحدائق', unit: 'm²', group: 'external', level: 1 },
  { key: 'pool', en: 'Swimming pool', ar: 'المسبح', unit: 'no.', group: 'external', level: 1 },
  { key: 'external_lighting', en: 'External lighting', ar: 'الإنارة الخارجية', unit: 'lump', group: 'external', level: 2 },
];
/** @deprecated name kept for V1 imports. */
export const ADDITION_CATALOG = COMPONENT_CATALOG;

export const catalogItem = (key: string) => COMPONENT_CATALOG.find((c) => c.key === key);

export function newAddition(key: string, _scope: unknown, lang: Lang = 'en', status: ScopeStatus = 'extra'): AdditionLine {
  const cat = catalogItem(key);
  return {
    id: newId('add'),
    key,
    description: cat ? (lang === 'ar' ? cat.ar : cat.en) : '',
    unit: cat?.unit ?? 'lump',
    quantity: cat && (cat.unit === 'no.' || cat.unit === 'lump') ? '1' : '',
    rate: '',
    // V2: never assume the baseline includes a standard version without documented scope data.
    status,
    standardRate: '',
    standardAllowance: '',
    source: '',
    enabled: true,
  };
}

const emptyHeights = (): Record<FloorKey, string> => ({ ground: '', first: '', second: '', roofAnnex: '' });

export const defaultRefined = (): RefinedInput => ({
  enabled: false,
  floorHeights: emptyHeights(),
  cantilevers: 'unknown',
  specialStructure: 'unknown',
  siteDifficulties: [],
  structuralDrawings: 'unknown',
});

export function defaultInput(): EstimateInput {
  return {
    projectName: '',
    level: 1,
    refined: defaultRefined(),
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

/** Bring a V1 (or partial) input object up to the current shape. Never changes numbers the user entered. */
export function migrateInput(raw: unknown): EstimateInput {
  const d = defaultInput();
  const i = (raw ?? {}) as Partial<EstimateInput> & Record<string, unknown>;
  const additions = (Array.isArray(i.additions) ? i.additions : []).map((a: AdditionLine) => {
    const status: ScopeStatus = a.status ?? (a.includedInBaseline ? 'upgrade' : 'extra');
    const { includedInBaseline: _drop, ...rest } = a;
    return { ...rest, status, standardRate: a.standardRate ?? '', standardAllowance: a.standardAllowance ?? '' };
  });
  return {
    ...d,
    ...i,
    level: i.level === 2 ? 2 : 1,
    refined: { ...d.refined, ...(i.refined ?? {}), floorHeights: { ...d.refined.floorHeights, ...(i.refined?.floorHeights ?? {}) } },
    floors: { ...d.floors, ...(i.floors ?? {}) },
    basement: { ...d.basement, ...(i.basement ?? {}) },
    rateSelection: { ...d.rateSelection, ...(i.rateSelection ?? {}) },
    fees: { ...d.fees, ...(i.fees ?? {}) },
    additions,
    ownerDirect: Array.isArray(i.ownerDirect) ? i.ownerDirect : [],
  } as EstimateInput;
}

/** Varnda's published illustrative example (Section 10). Reproduces 170,600 KWD — not an Urban quotation. */
export function varndaExampleInput(lang: Lang = 'en'): EstimateInput {
  const d = defaultInput();
  return {
    ...d,
    projectName: lang === 'ar' ? 'مثال فارندا المنشور (960 م²، متوسط)' : 'Varnda published example (960 m², Medium)',
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
    fees: {
      designPct: '8',
      contingencyPct: '7',
      fixedFees: '5000',
      fixedFeesLabel: lang === 'ar' ? 'تراخيص ورسوم (توضيحية)' : 'Permits & fees (illustrative)',
      percentBase: 'above_ground_base',
    },
  };
}

/** MFatah advertised Deluxe rate × 960 m² = 144,000 KWD construction only. */
export function mfatahExampleInput(lang: Lang = 'en'): EstimateInput {
  const v = varndaExampleInput(lang);
  return {
    ...v,
    projectName: lang === 'ar' ? 'سعر مفتاح المُعلن — ديلوكس (960 م²)' : 'MFatah advertised Deluxe (960 m²)',
    rateSelection: { ...v.rateSelection, mode: 'library', rateId: 'MF-02' },
    fees: { designPct: '0', contingencyPct: '0', fixedFees: '0', fixedFeesLabel: '', percentBase: 'construction' },
  };
}
