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

/** Nature of the evidence behind a number (independent of Urban's approval workflow). */
export type EvidenceStatus =
  | 'verified_primary'
  | 'verified_published_claim'
  | 'observed_result'
  | 'reconstructed_formula'
  | 'inferred'
  | 'unverified'
  | 'historical'
  | 'urban_approved';
export const EVIDENCE_STATUSES: EvidenceStatus[] = [
  'urban_approved', 'verified_primary', 'verified_published_claim', 'observed_result',
  'reconstructed_formula', 'historical', 'inferred', 'unverified',
];

/**
 * Source hierarchy (general starting order, not an automatic ranking):
 * 1 Urban final costs · 2 subcontractor quotation · 3 supplier quotation · 4 published supplier price ·
 * 5 competitor contractor rate card · 6 competitor calculator estimate · 7 historical / experimental.
 */
export type EvidenceCategory = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type FactorLevel = 'high' | 'medium' | 'low' | 'unknown';
export interface ConfidenceFactors {
  relevance: FactorLevel; // Kuwait villa relevance
  scope_match: FactorLevel; // how well inclusions are documented / match
  recency: FactorLevel;
  completeness: FactorLevel;
  incurred: FactorLevel; // actually incurred / contracted vs advertised
}
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unrated';

/** A component the baseline rate documents as included, optionally with its standard allowance per unit. */
export interface IncludedComponent {
  key: string;
  allowance_rate: number | null;
  allowance_unit: string;
}

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
  // ---- schema v2 provenance fields ----
  trade_category: string;
  work_description: string;
  location: string;
  country: string; // ISO code; Kuwait = 'KW'
  evidence_status: EvidenceStatus;
  evidence_category: EvidenceCategory | null;
  confidence: ConfidenceFactors;
  approver: string;
  approved_at: string;
  last_reviewed: string;
  inclusions_ar: string;
  exclusions_ar: string;
  notes_ar: string;
  included_components: IncludedComponent[];
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
  action: 'create' | 'update' | 'activate' | 'deactivate' | 'import' | 'reset' | 'approve' | 'migrate';
  by?: string;
  field?: string;
  from?: string;
  to?: string;
  ratebook_version: number;
}

export interface Ratebook {
  schema: 'urban-ratebook';
  schema_version: 2;
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

/**
 * Scope-ownership status of a component:
 *  baseline       – covered by the selected base rate (no extra cost)
 *  extra          – not in the baseline; added at quantity × rate
 *  upgrade        – baseline includes a standard version; only (upgrade − standard allowance) is added
 *  provisional    – provisional allowance entered by the estimator
 *  owner_direct   – bought by the owner directly (owner budget, not construction)
 *  excluded       – explicitly not included anywhere (listed as an exclusion)
 *  quote_required – needs a quotation; unpriced
 */
export type ScopeStatus = 'baseline' | 'extra' | 'upgrade' | 'provisional' | 'owner_direct' | 'excluded' | 'quote_required';
export const SCOPE_STATUSES: ScopeStatus[] = ['baseline', 'extra', 'upgrade', 'provisional', 'owner_direct', 'excluded', 'quote_required'];

export type ComponentGroup = 'structure' | 'architectural' | 'mep' | 'external' | 'other';

export interface AdditionLine {
  id: string;
  key: string; // catalog key or 'custom'
  description: string;
  unit: string;
  quantity: NumInput;
  rate: NumInput;
  status: ScopeStatus;
  /** Standard allowance as a unit rate (allowance = quantity × standardRate). Takes precedence over standardAllowance. */
  standardRate: NumInput;
  /** Total KWD value of the standard version already included in the baseline. */
  standardAllowance: NumInput;
  source: string;
  enabled: boolean;
  /** @deprecated V1 field, migrated to status. */
  includedInBaseline?: boolean;
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

export type SiteDifficulty = 'narrow_access' | 'adjacent_buildings' | 'poor_soil' | 'high_water_table' | 'demolition';
export const SITE_DIFFICULTIES: SiteDifficulty[] = ['narrow_access', 'adjacent_buildings', 'poor_soil', 'high_water_table', 'demolition'];

/** Level 2 (refined) structural/site answers. They never invent quantities; they set exclusions or flag quotations. */
export interface RefinedInput {
  enabled: boolean;
  floorHeights: Record<FloorKey, NumInput>;
  cantilevers: Tristate;
  specialStructure: Tristate; // large spans, double-height voids, transfer beams…
  siteDifficulties: SiteDifficulty[];
  structuralDrawings: Tristate; // do structural drawings / quantities exist?
}

export interface EstimateInput {
  projectName: string;
  level: 1 | 2;
  refined: RefinedInput;
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
  | 'allowances'
  | 'owner_direct'
  | 'design'
  | 'fixed_fees'
  | 'contingency';

/**
 * What kind of number a line is:
 *  area_rate  – built-up area × KWD/m² rate (whole-building estimate)
 *  calculated – quantity × unit rate (trade/item cost)
 *  allowance  – provisional allowance / assumption
 *  percentage – % of an explicit base
 *  fixed      – fixed amount entered by the estimator
 *  owner      – owner-direct expenditure
 * ('allocation' — a percentage split of a total — is never produced by this engine.)
 */
export type LineKind = 'area_rate' | 'calculated' | 'allowance' | 'percentage' | 'fixed' | 'owner';
export type Scenario = 'low' | 'mid' | 'high';
export const SCENARIOS: Scenario[] = ['low', 'mid', 'high'];
export type BasisParams = Record<string, string | number>;

export interface BudgetLine {
  key: LineKey;
  group: LineGroup;
  kind: LineKind;
  amount: Triple;
  /** Formula template key (see i18n `basis.*`). */
  basis: string;
  /** Formula parameters for EACH scenario — the displayed maths always matches that scenario's amount. */
  basisBy: Record<Scenario, BasisParams>;
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
  status: ScopeStatus;
  /** True when the selected base rate documents this component as included. */
  baselineDocumented: boolean;
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
  evidence_status: EvidenceStatus;
  confidence: ConfidenceLevel;
  inclusions_ar: string;
  exclusions_ar: string;
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
  /** False when the low/high figures are not a published or entered range (single reference value). */
  rangeAvailable: boolean;
  basementCost: Triple | null;
  basementMode: BasementInput['pricingMode'] | 'not_applicable';
  additions: AdditionResult[];
  lines: BudgetLine[];
  /** Above-ground base + basement + net additions + provisional allowances (priced portion only when partial). */
  construction: Triple | null;
  /** Owner-direct + design/supervision + fixed fees + contingency. */
  ownerAdditional: Triple | null;
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

/** Completed-project record for calibration (Phase 11). Amounts in KWD; blanks allowed. */
export interface CalibrationProject {
  id: string;
  name: string;
  location: string;
  date: string;
  builtUpArea: NumInput;
  floors: NumInput;
  basement: boolean;
  specification: string;
  contractorScope: Scope;
  initialEstimate: NumInput;
  awardedValue: NumInput;
  finalCost: NumInput;
  /** Variations / change orders unrelated to the estimated scope — removed before comparison. */
  unrelatedVariations: NumInput;
  /** Other scope normalisation (+/-) to make actual cost match the estimated scope. */
  scopeAdjustment: NumInput;
  priceSources: string;
  notes: string;
}
