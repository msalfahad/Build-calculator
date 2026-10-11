// Shared domain types for the Urban Villa Cost Calculator.
// The calculation engine (src/calculators) depends only on these types, never on UI code.

export type Lang = 'en' | 'ar';

export type PropertyType = 'private_villa' | 'investment';

/** Construction scope. Each scope has its own independent rate set. */
export type Scope = 'turnkey' | 'structure' | 'finishing';

/** Customer-facing finishing grades (Urban's own grading system). */
export type Grade = 'basic' | 'medium' | 'good' | 'luxury' | 'ultra';
export const GRADES: Grade[] = ['basic', 'medium', 'good', 'luxury', 'ultra'];
export const SCOPES: Scope[] = ['structure', 'finishing', 'turnkey'];

export type ApprovalStatus =
  | 'published_benchmark'
  | 'experimental'
  | 'user_provisional'
  | 'supplier_quotation'
  | 'urban_approved'
  | 'historical';

export const APPROVAL_STATUSES: ApprovalStatus[] = [
  'urban_approved',
  'supplier_quotation',
  'historical',
  'user_provisional',
  'published_benchmark',
  'experimental',
];

export type RateCategory = 'building' | 'basement' | 'addition';

/** What a price covers. Material-only prices must never be silently treated as installed work. */
export type PriceBasis = 'supply_install' | 'material_only' | 'labour_only' | 'unknown';

/**
 * Which grading system `grade` belongs to. Competitor grades (e.g. MFatah "Deluxe") are kept in their own
 * system and are never mapped onto Urban grades automatically.
 */
export type GradeSystem = 'urban' | 'mfatah' | 'none';

export interface Rate {
  rate_id: string;
  category: RateCategory;
  /** For building rates: the scope. For basement / addition rates: 'basement' / 'addition'. */
  scope: Scope | 'basement' | 'addition';
  grade: string;
  grade_system: GradeSystem;
  label_en: string;
  label_ar: string;
  unit: string;
  price_low: number | null;
  price_mid: number | null;
  price_high: number | null;
  currency: 'KWD';
  price_basis: PriceBasis;
  source: string;
  source_url: string;
  source_date: string; // ISO date
  valid_until: string; // ISO date or ''
  quote_ref: string;
  approval_status: ApprovalStatus;
  inclusions: string;
  exclusions: string;
  notes: string;
  version: number;
  active: boolean;
}

export interface GradeSpecItem {
  key: string;
  en: string;
  ar: string;
}

export interface GradeSpec {
  grade: Grade;
  name_en: string;
  name_ar: string;
  summary_en: string;
  summary_ar: string;
  items: GradeSpecItem[];
}

export interface RateChange {
  at: string; // ISO datetime
  rate_id: string;
  action: 'create' | 'update' | 'activate' | 'deactivate' | 'import' | 'reset';
  field?: string;
  from?: string;
  to?: string;
  ratebook_version: number;
}

export interface Ratebook {
  schema: 'urban-ratebook';
  schema_version: 1;
  ratebook_version: number;
  updated_at: string;
  rates: Rate[];
  grades: GradeSpec[];
  changelog: RateChange[];
}

/** Numeric inputs are kept as strings (what the user typed) and parsed/validated by the engine. */
export type NumInput = string;

export type FloorKey = 'ground' | 'first' | 'second' | 'roofAnnex';
export const FLOOR_KEYS: FloorKey[] = ['ground', 'first', 'second', 'roofAnnex'];

export interface FloorInput {
  enabled: boolean;
  area: NumInput;
  /** Optional floor-specific rate (KWD/m²). Blank = use the selected building rate. */
  rateOverride: NumInput;
}

export type BasementFinish = 'unfinished' | 'parking' | 'habitable';
export type Tristate = 'unknown' | 'yes' | 'no';
export type BasementComponent =
  | 'excavation'
  | 'shoring'
  | 'dewatering'
  | 'structure'
  | 'waterproofing'
  | 'finishes'
  | 'mep';
export const BASEMENT_COMPONENTS: BasementComponent[] = [
  'excavation',
  'shoring',
  'dewatering',
  'structure',
  'waterproofing',
  'finishes',
  'mep',
];

export interface BasementInput {
  enabled: boolean;
  area: NumInput;
  depth: NumInput;
  finish: BasementFinish;
  groundwater: 'unknown' | 'none' | 'concerns';
  shoring: Tristate;
  pricingMode: 'none' | 'library' | 'rate' | 'allowance';
  rateId: string;
  rate: NumInput;
  allowance: NumInput;
  priceSource: string;
  includes: BasementComponent[];
}

export interface RateSelection {
  mode: 'auto' | 'library' | 'manual';
  rateId: string;
  manualLow: NumInput;
  manualMid: NumInput;
  manualHigh: NumInput;
  manualSource: string;
}

export interface AdditionLine {
  id: string;
  key: string; // catalog key or 'custom'
  description: string;
  unit: string;
  quantity: NumInput;
  rate: NumInput;
  /** True when the baseline scope already includes a standard version of this item. */
  includedInBaseline: boolean;
  /** Total KWD value of the standard version already included in the baseline (for net upgrade pricing). */
  standardAllowance: NumInput;
  source: string;
  enabled: boolean;
}

export interface OwnerDirectLine {
  id: string;
  description: string;
  amount: NumInput;
}

export type PercentBase = 'construction' | 'above_ground_base';

export interface FeesInput {
  designPct: NumInput;
  contingencyPct: NumInput;
  fixedFees: NumInput;
  fixedFeesLabel: string;
  percentBase: PercentBase;
}

export interface EstimateInput {
  projectName: string;
  propertyType: PropertyType;
  plotArea: NumInput;
  location: string;
  siteNotes: string;
  coverage: NumInput; // % used only for the optional area-suggestion tool
  floors: Record<FloorKey, FloorInput>;
  basement: BasementInput;
  scope: Scope;
  grade: Grade;
  rateSelection: RateSelection;
  floorHeight: NumInput;
  additions: AdditionLine[];
  ownerDirect: OwnerDirectLine[];
  fees: FeesInput;
}

export type Severity = 'error' | 'warning' | 'info';

export interface Issue {
  code: string;
  severity: Severity;
  field?: string;
  /** Values interpolated into the translated message. */
  params?: Record<string, string | number>;
}

export interface Triple {
  low: number;
  mid: number;
  high: number;
}

export type LineGroup = 'construction' | 'owner';

export type LineKey =
  | 'above_ground'
  | 'basement'
  | 'additions'
  | 'owner_direct'
  | 'design'
  | 'fixed_fees'
  | 'contingency';

export interface BudgetLine {
  key: LineKey;
  group: LineGroup;
  amount: Triple;
  /** Human-checkable formula, e.g. "960 m² × 150 KWD/m²". Language-neutral numerals. */
  basis: string;
  basisParams?: Record<string, string | number>;
}

export interface AdditionResult {
  id: string;
  description: string;
  unit: string;
  quantity: number | null;
  rate: number | null;
  gross: number | null;
  allowance: number | null;
  net: number | null;
  includedInBaseline: boolean;
  priced: boolean;
  source: string;
}

export interface FloorAreaResult {
  key: FloorKey;
  area: number;
  rate: Triple | null;
  cost: Triple | null;
  rateSource: 'selected' | 'override';
}

export interface AreaSummary {
  perFloor: { key: FloorKey; area: number }[];
  aboveGround: number;
  basement: number;
  total: number;
}

export interface SelectedRate {
  rate_id: string;
  label_en: string;
  label_ar: string;
  low: number;
  mid: number;
  high: number;
  approval_status: ApprovalStatus;
  source: string;
  source_date: string;
  scope: Scope;
  price_basis: PriceBasis;
  inclusions: string;
  exclusions: string;
  rangeAvailable: boolean;
}

export type EstimateStatus = 'complete' | 'partial' | 'blocked';

export interface UnpricedItem {
  code: string;
  params?: Record<string, string | number>;
}

export interface EstimateResult {
  status: EstimateStatus;
  issues: Issue[];
  unpriced: UnpricedItem[];
  areas: AreaSummary;
  floors: FloorAreaResult[];
  rate: SelectedRate | null;
  basementCost: Triple | null;
  basementMode: BasementInput['pricingMode'] | 'not_applicable';
  additions: AdditionResult[];
  lines: BudgetLine[];
  /** Above-ground base + basement + net additions (priced portion only when partial). */
  construction: Triple | null;
  feesAndContingency: Triple | null;
  ownerTotal: Triple | null;
  /** Construction (mid) ÷ priced built-up area (an unpriced basement's area is excluded). */
  typicalRatePerM2: number | null;
  meta: {
    engineVersion: string;
    ratebookVersion: number;
    calculatedAt: string;
    rounding: string;
  };
}

export interface SavedEstimate {
  kind: 'urban-villa-estimate';
  id: string;
  name: string;
  savedAt: string;
  engineVersion: string;
  ratebookVersion: number;
  input: EstimateInput;
  result: EstimateResult;
  ratesUsed: Rate[];
}
