/**
 * NASA Microgravity Combustion Science Dashboard & SI Harness
 * Core Domain Type Definitions & Interface Contracts
 *
 * All types strictly align with PROJECT.md Interface Contracts (§ 4.1, 4.2, 4.3).
 * Compatible with Node.js v24.19.0 native TypeScript type stripping (no TS enums,
 * pure types/interfaces, const dictionaries, and runtime type guards).
 */

// ============================================================================
// 1. LITERAL UNIONS & CATEGORICAL TYPES
// ============================================================================

/**
 * Risk tier classification for habitat environments and simulation results.
 */
export type RiskTier = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";

/**
 * Valid habitat environment identifiers across exploration regimes.
 */
export type HabitatId = "iss" | "artemis_lunar" | "mars_habitat" | "rover" | "terrestrial";

/**
 * Combustion flammability / extinction dynamic regime.
 */
export type ExtinctionRegime =
  | "flammable"
  | "quenched_radiation"
  | "blowoff_extinction"
  | "inert_hypoxic";

/**
 * Alias for ExtinctionRegime to support alternate domain naming conventions.
 */
export type FlammabilityRegime = ExtinctionRegime;

/**
 * Primary scientific category for NASA PSI investigations.
 */
export type InvestigationCategory =
  | "Solid Surface"
  | "Droplet / Mist"
  | "Gaseous Flame"
  | "Smoke Aerosol"
  | "Fluid Physics"
  | "Materials Science";

/**
 * Supported gravitational acceleration environment categories.
 */
export type GravityEnvironment = "microgravity" | "lunar" | "martian" | "terrestrial";

/**
 * Sample geometry classes for combustion modeling.
 */
export type SampleGeometryType =
  | "thin_fabric"
  | "thick_slab"
  | "cylinder_rod"
  | "droplet"
  | "gas_jet";

/**
 * Fire safety architectural pillars.
 */
export type SafetyPillar = "PREVENTION" | "DETECTION" | "SUPPRESSION" | "PARTIAL_G_PROXY";

// ============================================================================
// 2. RUNTIME CONSTANTS & DICTIONARIES
// ============================================================================

export const RISK_TIERS: readonly RiskTier[] = [
  "CRITICAL",
  "HIGH",
  "MODERATE",
  "LOW",
] as const;

export const HABITAT_IDS: readonly HabitatId[] = [
  "iss",
  "artemis_lunar",
  "mars_habitat",
  "rover",
  "terrestrial",
] as const;

export const EXTINCTION_REGIMES: readonly ExtinctionRegime[] = [
  "flammable",
  "quenched_radiation",
  "blowoff_extinction",
  "inert_hypoxic",
] as const;

export const INVESTIGATION_CATEGORIES: readonly InvestigationCategory[] = [
  "Solid Surface",
  "Droplet / Mist",
  "Gaseous Flame",
  "Smoke Aerosol",
  "Fluid Physics",
  "Materials Science",
] as const;

export const GRAVITY_ENVIRONMENTS: readonly GravityEnvironment[] = [
  "microgravity",
  "lunar",
  "martian",
  "terrestrial",
] as const;

export const SAMPLE_GEOMETRY_TYPES: readonly SampleGeometryType[] = [
  "thin_fabric",
  "thick_slab",
  "cylinder_rod",
  "droplet",
  "gas_jet",
] as const;

export const SAFETY_PILLARS: readonly SafetyPillar[] = [
  "PREVENTION",
  "DETECTION",
  "SUPPRESSION",
  "PARTIAL_G_PROXY",
] as const;

/**
 * Super Intelligence Combustion Risk Index (SCRI) component weights.
 * Total weight sum = 1.00
 */
export const SCRI_WEIGHTS = {
  atmospheric: 0.25,
  flammability: 0.30,
  geometry: 0.15,
  suppression: 0.15,
  toxicity: 0.15,
} as const;

/**
 * SCRI score threshold boundaries.
 */
export const SCRI_THRESHOLDS = {
  CRITICAL: 75.0,
  HIGH: 60.0,
  MODERATE: 40.0,
  LOW: 0.0,
} as const;

// ============================================================================
// 3. DATA PIPELINE CONTRACTS (PROJECT.md § 4.1)
// ============================================================================

/**
 * Raw row extracted directly from NASA_DATASET.xlsx sheet.
 */
export interface RawPsiRecord {
  rowNumber: number;
  dataName: string;      // e.g. "NASA PSI: PSI-47"
  dataLink: string;      // e.g. "https://psi.nasa.gov/physci/repo/data/investigations/PSI-47"
  dataMainPurpose: string;
  dataMissingOpportunities: string;
}

/**
 * Normalized and fully enriched NASA PSI investigation record.
 */
export interface EnrichedPsiInvestigation {
  id: string;            // e.g. "PSI-47"
  code: number;          // 47
  name: string;          // e.g. "BASS"
  fullName: string;      // "Burning and Suppression of Solids"
  url: string;
  category: InvestigationCategory;
  isCombustion: boolean;
  facility: string;      // e.g. "ISS MSG" or "Cygnus"
  fuelTypes: string[];
  sampleGeometry: string;
  oxygenRangePct: [number, number];
  pressureRangeKPa: [number, number];
  flowVelocityRangeCmS: [number, number];
  gravityEnvironments: GravityEnvironment[];
  flammabilityFindings: string;
  fireSafetyRelevance: string;
  terrestrialSpinOffs: string;
  missingOpportunitiesAnalysis: string;
  safetyPillar?: SafetyPillar;
}

/**
 * Result of dataset parsing from binary XLSX workbook.
 */
export interface DatasetParseResult {
  sheetName: string;
  totalRows: number;
  headers: string[];
  rawRecords: RawPsiRecord[];
  skippedRowsCount: number;
  errors: string[];
}

// ============================================================================
// 4. SI ENGINE & SIMULATION CONTRACTS (PROJECT.md § 4.2)
// ============================================================================

/**
 * Standard or exploration habitat atmospheric definition.
 */
export interface HabitatEnvironment {
  id: HabitatId;
  name: string;
  pressureKPa: number;
  pressurePsia: number;
  oxygenPct: number;
  gravityG: number;
  nominalVelocityCmS: number;
  description: string;
  evaPrebreatheRequired: boolean;
  fireHazardTier: RiskTier;
}

/**
 * Environmental parameters passed into physics simulation engine.
 */
export interface SimulationInput {
  oxygenPct: number;         // 15 - 50%
  pressureKPa: number;       // 40 - 150 kPa
  velocityCmS: number;       // 0 - 50 cm/s
  gravityG: number;          // 0.0 - 1.0 g
  fuelType: string;          // e.g. "PMMA", "Cotton", "Polyethylene", "Nomex"
  geometryType: SampleGeometryType;
}

/**
 * Component sub-scores comprising the composite SCRI score.
 */
export interface SubScores {
  atmospheric: number;       // 0 - 100
  flammability: number;      // 0 - 100
  geometry: number;          // 0 - 100
  suppression: number;       // 0 - 100
  toxicity: number;          // 0 - 100
}

/**
 * Physical calculation diagnostics and intermediate variables.
 */
export interface PhysicsCalculationDetail {
  dynamicLOC: number;
  o2Margin: number;
  uEffCmS: number;
  buoyantVelocityCmS: number;
  damkohlerProxy: number;
  heatReleaseWatts: number;
}

/**
 * Comprehensive physics simulation and risk evaluation outcome.
 */
export interface SimulationResult {
  scriScore: number;         // 0.0 - 100.0
  riskTier: RiskTier;
  isFlammable: boolean;
  flameSpreadVelocityMmS: number;
  extinctionRegime: ExtinctionRegime;
  subScores: SubScores;
  warnings: string[];
  recommendations: string[];
  physicsDetails?: PhysicsCalculationDetail;
}

/**
 * Thermophysical and combustion parameters for spacecraft materials.
 */
export interface MaterialProperty {
  id: string;
  code: string;
  name: string;
  category: string;
  baseLoc1g: number;          // % O2 at 1g, 101.3 kPa
  thermalInertia: number;     // relative (lower ignites faster)
  heatReleasePeak: number;    // kW/m2
  coToxicityIndex: number;    // 0..1 relative
  sootAgglomeration: number;  // 0..1 relative
  smolderTendency: number;    // 0..1 relative
  ignitionTempC: number;
}

// ============================================================================
// 5. REST API & DASHBOARD PAYLOAD CONTRACTS (PROJECT.md § 4.3)
// ============================================================================

/**
 * Response payload for GET /api/health
 */
export interface HealthResponse {
  status: "online" | "degraded" | "error";
  timestamp: string;
  uptime: number;
  recordsCount: number;
  version: string;
  nodeVersion?: string;
  memoryUsageMb?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
}

/**
 * Analytical metrics summarizing a multi-investigation comparison.
 */
export interface ComparativeMetrics {
  investigationCount: number;
  fuelTypesCommon: string[];
  fuelTypesAll: string[];
  oxygenRangeOverlap: [number, number] | null;
  pressureRangeOverlapKPa: [number, number] | null;
  flowVelocityRangeOverlapCmS: [number, number] | null;
  highestRiskId: string;
  highestRiskTier: RiskTier;
  combustionRegimesPresent: InvestigationCategory[];
  crossInvestigationInsights: string[];
}

/**
 * Response payload for GET /api/compare?ids=PSI-47,PSI-69,PSI-68
 */
export interface ComparisonResponse {
  items: EnrichedPsiInvestigation[];
  comparativeMetrics: ComparativeMetrics;
}

/**
 * Ranked investigation entry.
 */
export interface InvestigationRanking {
  investigationId: string;
  code: number;
  name: string;
  fullName: string;
  category: InvestigationCategory;
  scriScore: number;
  riskTier: RiskTier;
  criticalFinding: string;
  limitingOxygenIndexPct?: number;
}

/**
 * Response payload for GET /api/rankings?scenario=artemis_lunar
 */
export interface RankingsResponse {
  scenarioId: HabitatId;
  scenarioName: string;
  totalCount: number;
  rankings: InvestigationRanking[];
}

/**
 * Full JSON export payload for GET /api/export
 */
export interface ExportData {
  generatedAt: string;
  version: string;
  totalInvestigations: number;
  investigations: EnrichedPsiInvestigation[];
  scenarios: HabitatEnvironment[];
  scenarioRankings?: Record<HabitatId, Array<{
    investigationId: string;
    investigationName: string;
    scriScore: number;
    riskTier: RiskTier;
  }>>;
  metadata: {
    datasetSource: string;
    totalRecords: number;
    combustionRecords: number;
    scriVersion: string;
    integrityMode: string;
    zeroDependencies: boolean;
  };
}

// ============================================================================
// 6. ACTIONABLE INSIGHTS, VISUALIZATION & SPIN-OFF CONTRACTS
// ============================================================================

/**
 * Fire safety operational mitigation guideline.
 */
export interface FireSafetyGuideline {
  id: string;
  title: string;
  severity: RiskTier;
  triggerCondition: string;
  protocol: string;
  scientificBasis: string;
}

/**
 * Earth-based spin-off application derived from microgravity combustion data.
 */
export interface SpinOffInsight {
  id: string;
  title: string;
  domain: "Mine Safety" | "Submarine Life Support" | "Aviation Cabins" | "Clean Agent Halon Replacements" | "Industrial Chemical Facilities";
  nasaPrecedent: string;
  description: string;
  impactMetric: string;
}

/**
 * Point coordinate on U-shaped flammability boundary curve.
 */
export interface FlammabilityBoundaryPoint {
  velocityCmS: number;
  limitingOxygenPct: number;
  regime: ExtinctionRegime;
}

// ============================================================================
// 7. TYPE GUARD HELPERS
// ============================================================================

export function isRiskTier(val: unknown): val is RiskTier {
  return typeof val === "string" && (RISK_TIERS as readonly string[]).includes(val);
}

export function isHabitatId(val: unknown): val is HabitatId {
  return typeof val === "string" && (HABITAT_IDS as readonly string[]).includes(val);
}

export function isExtinctionRegime(val: unknown): val is ExtinctionRegime {
  return typeof val === "string" && (EXTINCTION_REGIMES as readonly string[]).includes(val);
}

export function isInvestigationCategory(val: unknown): val is InvestigationCategory {
  return typeof val === "string" && (INVESTIGATION_CATEGORIES as readonly string[]).includes(val);
}

export function isSampleGeometryType(val: unknown): val is SampleGeometryType {
  return typeof val === "string" && (SAMPLE_GEOMETRY_TYPES as readonly string[]).includes(val);
}

export function isSafetyPillar(val: unknown): val is SafetyPillar {
  return typeof val === "string" && (SAFETY_PILLARS as readonly string[]).includes(val);
}
