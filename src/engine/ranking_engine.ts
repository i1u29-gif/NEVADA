/**
 * NASA Microgravity Combustion Science Dashboard & SI Harness
 * Module: Super Intelligence Combustion Risk Index (SCRI) Engine
 * Path: src/engine/ranking_engine.ts
 *
 * Implements Feature F09 (Super Intelligence Risk Index Engine) conforming to PROJECT.md § 4.2
 * and src/types/index.ts.
 *
 * Multi-Factor Composite Formula:
 *   R_composite = 0.25 S_env + 0.30 S_flam + 0.15 S_geom + 0.15 S_ext + 0.15 S_tox
 *
 * Strict Properties:
 * 1. Bounded strictly in [0.0, 100.0]
 * 2. Strictly monotonic with respect to O2 (dR_composite / dO2 > 0)
 * 3. Risk Tiers: CRITICAL (>= 75.0), HIGH (>= 60.0), MODERATE (>= 40.0), LOW (< 40.0)
 * 4. Artemis Lunar LEA (34% O2) evaluates significantly higher risk than ISS Nominal (21% O2)
 */

import type {
  SimulationInput,
  SimulationResult,
  SubScores,
  RiskTier,
  SampleGeometryType,
  HabitatId,
  EnrichedPsiInvestigation,
  InvestigationRanking
} from '../types/index.ts';

import { HABITAT_SCENARIOS, getHabitatScenario } from './habitat_scenarios.ts';
import {
  calculateBuoyantVelocity,
  calculateEffectiveVelocity,
  calculateDynamicLoc,
  calculateDamkohlerProxy,
  determineExtinctionRegime,
  calculateFlameSpreadVelocity,
  getMaterial
} from './physics_models.ts';
import { generateRecommendations } from './recommender.ts';

// ============================================================================
// 1. CONSTANTS & PARAMETER DICTIONARIES
// ============================================================================

export const SCRI_WEIGHTS = {
  atmospheric: 0.25,
  flammability: 0.30,
  geometry: 0.15,
  suppression: 0.15,
  toxicity: 0.15
} as const;

export const SCRI_THRESHOLDS = {
  CRITICAL: 75.0,
  HIGH: 60.0,
  MODERATE: 40.0,
  LOW: 0.0
} as const;

export const BASE_FUEL_FLAMMABILITY: Record<string, number> = {
  cotton: 92.0,
  pmma: 84.0,
  polyethylene: 80.0,
  methane: 88.0,
  heptane: 86.0,
  delrin: 82.0,
  silicone: 65.0,
  nomex: 45.0,
  ultem: 35.0,
  ptfe: 12.0,
  teflon: 12.0
};

export const BASE_FUEL_TOXICITY: Record<string, number> = {
  ptfe: 90.0,
  teflon: 90.0,
  cotton: 48.0,
  pmma: 45.0,
  polyethylene: 42.0,
  nomex: 65.0,
  delrin: 75.0,
  silicone: 60.0,
  methane: 40.0,
  heptane: 40.0,
  ultem: 30.0
};

// Monotonic knots for Atmospheric O2 Response Curve B(O2)
const ATM_KNOTS: readonly { x: number; y: number }[] = [
  { x: 0.0, y: 0.0 },
  { x: 10.0, y: 5.5 },
  { x: 16.0, y: 13.0 },
  { x: 21.0, y: 22.0 },
  { x: 28.0, y: 49.0 },
  { x: 34.0, y: 72.0 },
  { x: 50.0, y: 88.0 },
  { x: 100.0, y: 100.0 }
] as const;

// ============================================================================
// 2. SUB-SCORE ALGORITHMS
// ============================================================================

/**
 * Gravitational modifier factor Psi(g).
 * Microgravity (0g) lacks natural buoyant convection (Psi = 0.90).
 * Partial Lunar gravity (0.166g) provides gentle buoyant feed without blowoff cooling (Psi = 1.15).
 * Martian gravity (0.38g) creates moderate buoyant plume (Psi = 1.10).
 * Terrestrial gravity (1.0g) baseline standard (Psi = 1.00).
 */
export function calculateGravityFactor(g: number): number {
  if (g <= 0.001) return 0.90;
  if (Math.abs(g - 0.166) < 0.05) return 1.15;
  if (Math.abs(g - 0.38) < 0.05) return 1.10;
  if (Math.abs(g - 1.0) < 0.05) return 1.00;
  const x = g / 0.166;
  return Math.min(1.20, Math.max(0.85, 1.0 + 0.15 * x * Math.exp(1 - x)));
}

/**
 * Pressure scaling factor f_P(P).
 * Higher total pressure increases chemical collision frequency and radiant density.
 */
export function calculatePressureFactor(pressureKPa: number): number {
  return Math.pow(Math.max(10.0, pressureKPa) / 101.3, 0.18);
}

/**
 * Evaluates the Atmospheric Sub-score S_env [0.0, 100.0].
 * Strictly monotonic with respect to O2 (dS_env / dO2 > 0) and pressure P.
 */
export function calculateAtmosphericScore(
  oxygenPct: number,
  pressureKPa: number,
  gravityG: number,
  _velocityCmS?: number
): number {
  if (oxygenPct <= 0.0) return 0.0;
  if (oxygenPct >= 100.0 && pressureKPa >= 101.3) return 100.0;

  // Monotonic piecewise linear interpolation across calibrated combustion knots
  let base = oxygenPct;
  if (oxygenPct <= 0.0) {
    base = 0.0;
  } else if (oxygenPct >= 100.0) {
    base = 100.0;
  } else {
    for (let i = 0; i < ATM_KNOTS.length - 1; i++) {
      if (oxygenPct >= ATM_KNOTS[i].x && oxygenPct <= ATM_KNOTS[i + 1].x) {
        const t = (oxygenPct - ATM_KNOTS[i].x) / (ATM_KNOTS[i + 1].x - ATM_KNOTS[i].x);
        base = ATM_KNOTS[i].y + t * (ATM_KNOTS[i + 1].y - ATM_KNOTS[i].y);
        break;
      }
    }
  }

  const psi = calculateGravityFactor(gravityG);
  const fp = calculatePressureFactor(pressureKPa);
  const score = base * psi * fp;

  return Number(Math.min(100.0, Math.max(0.0, score)).toFixed(2));
}

/**
 * Evaluates the Material Flammability Sub-score S_flam [0.0, 100.0].
 * Follows hierarchy: Cotton (92) > PMMA (84) > Polyethylene (80) > Nomex (45) > PTFE (12).
 */
export function calculateFlammabilityScore(
  fuelType: string,
  oxygenPct: number = 21.0,
  pressureKPa?: number
): number {
  const key = fuelType.toLowerCase().replace(/[^a-z]/g, '');
  let base = 60.0;

  for (const [fuelKey, val] of Object.entries(BASE_FUEL_FLAMMABILITY)) {
    if (key.includes(fuelKey)) {
      base = val;
      break;
    }
  }

  // Exactly preserve base ratings at standard normoxic 21.0% O2 and normal pressure
  if (Math.abs(oxygenPct - 21.0) < 0.01 && (pressureKPa === undefined || pressureKPa >= 10.0)) {
    return base;
  }

  // PTFE (Teflon) flammability remains pinned at 12.0 for <=21% O2
  if (key.includes('ptfe') || key.includes('teflon')) {
    if (oxygenPct <= 21.0) return 12.0;
    return Math.min(100.0, 12.0 + (oxygenPct - 21.0) * 0.2);
  }

  // At zero or negative O2, combustion is physically impossible
  if (oxygenPct <= 0.0) return 0.0;

  // Linear flammability scaling with O2 concentration
  let score = base;
  const slope = base > 50 ? 0.6 : 0.4;
  if (oxygenPct < 15.0) {
    // Smooth monotonic drop towards 0 at 0% O2
    const val15 = base - 6.0 * slope;
    score = val15 * (oxygenPct / 15.0);
  } else {
    score = base + (oxygenPct - 21.0) * slope;
  }

  // Deep vacuum attenuation (< 10 kPa)
  if (pressureKPa !== undefined && pressureKPa < 10.0) {
    score *= Math.min(1.0, Math.pow(pressureKPa / 10.0, 2));
  }

  return Number(Math.min(100.0, Math.max(0.0, score)).toFixed(1));
}

/**
 * Evaluates the Sample Geometry Sub-score S_geom [0.0, 100.0].
 * Invariant order: thin_fabric (95) > gas_jet (85) > cylinder_rod (80) > droplet (70) > thick_slab (40).
 */
export function calculateGeometryScore(geometryType: SampleGeometryType): number {
  switch (geometryType) {
    case 'thin_fabric':
      return 95.0;
    case 'gas_jet':
      return 85.0;
    case 'cylinder_rod':
      return 80.0;
    case 'droplet':
      return 70.0;
    case 'thick_slab':
      return 40.0;
    default:
      return 60.0;
  }
}

/**
 * Evaluates Suppression Difficulty Sub-score S_ext [0.0, 100.0].
 * Accounts for microgravity radiation quench limits, low-flow feeding, and agent dispersion.
 */
export function calculateSuppressionScore(
  oxygenPct: number,
  velocityCmS: number,
  gravityG: number,
  pressureKPa?: number
): number {
  if (oxygenPct <= 5.0 || (pressureKPa !== undefined && pressureKPa < 10.0)) {
    return 5.0;
  }

  let score = 25.0 + (oxygenPct / 100.0) * 50.0;

  // Flow velocity effects
  if (velocityCmS >= 1.5 && velocityCmS <= 15.0) {
    score += 15.0; // low-flow ventilative feeding zone
  } else if (velocityCmS < 1.0) {
    score -= 15.0; // quiescent radiative quenching assistance
  } else if (velocityCmS > 35.0) {
    score -= 10.0; // convective blowoff shear
  }

  // Microgravity penalty for suppression agent dispersion
  if (gravityG < 0.1) {
    score += 10.0;
  } else if (gravityG < 0.4) {
    score += 8.0;
  }

  // Confined cabin penalty (rover condition: P <= 60 kPa, O2 >= 30%, g <= 0.2)
  if (pressureKPa && pressureKPa <= 60.0 && oxygenPct >= 30.0 && gravityG <= 0.2) {
    score += 15.0;
  }

  return Number(Math.min(100.0, Math.max(0.0, score)).toFixed(1));
}

/**
 * Evaluates Toxicity & Smoke Hazard Sub-score S_tox [0.0, 100.0].
 * PTFE fluoropolymer toxicity (90.0) >> Cotton cellulose (48.0).
 */
export function calculateToxicityScore(
  fuelType: string,
  pressureKPa?: number,
  oxygenPct?: number,
  gravityG?: number
): number {
  const key = fuelType.toLowerCase().replace(/[^a-z]/g, '');
  let base = 50.0;

  if (key.includes('ptfe') || key.includes('teflon')) base = 90.0;
  else if (key.includes('cotton')) base = 48.0;
  else if (key.includes('pmma')) base = 45.0;
  else if (key.includes('polyethylene')) base = 42.0;
  else if (key.includes('nomex')) base = 65.0;
  else if (key.includes('delrin')) base = 75.0;
  else if (key.includes('silicone')) base = 60.0;
  else if (key.includes('methane')) base = 40.0;
  else if (key.includes('heptane')) base = 40.0;
  else if (key.includes('ultem')) base = 30.0;

  // Confined space smoke saturation penalty (rover: P <= 58 kPa, O2 >= 30%, g <= 0.2)
  if (
    pressureKPa &&
    pressureKPa <= 58.0 &&
    oxygenPct !== undefined &&
    oxygenPct >= 30.0 &&
    gravityG !== undefined &&
    gravityG <= 0.2 &&
    !key.includes('ptfe')
  ) {
    base += 20.0;
  }

  // In deep vacuum dump (< 10 kPa), smoke cannot hang or propagate
  if (pressureKPa !== undefined && pressureKPa < 10.0) {
    base = 15.0;
  }

  return Number(Math.min(100.0, Math.max(0.0, base)).toFixed(1));
}

// ============================================================================
// 3. COMPOSITE INDEX & RISK TIER ARBITRATION
// ============================================================================

/**
 * Calculates the Super Intelligence Combustion Risk Index (SCRI).
 * R_composite = 0.25 S_env + 0.30 S_flam + 0.15 S_geom + 0.15 S_ext + 0.15 S_tox
 */
export function calculateScriScore(subScores: SubScores): number {
  const raw =
    SCRI_WEIGHTS.atmospheric * subScores.atmospheric +
    SCRI_WEIGHTS.flammability * subScores.flammability +
    SCRI_WEIGHTS.geometry * subScores.geometry +
    SCRI_WEIGHTS.suppression * subScores.suppression +
    SCRI_WEIGHTS.toxicity * subScores.toxicity;

  return Number(Math.min(100.0, Math.max(0.0, raw)).toFixed(2));
}

/**
 * Alias for calculateScriScore matching alternate naming conventions.
 */
export const computeScriScore = calculateScriScore;

/**
 * Determines categorical Risk Tier from continuous SCRI score.
 * CRITICAL (>= 75.0), HIGH (>= 60.0), MODERATE (>= 40.0), LOW (< 40.0).
 */
export function determineRiskTier(score: number): RiskTier {
  if (score >= SCRI_THRESHOLDS.CRITICAL) return 'CRITICAL';
  if (score >= SCRI_THRESHOLDS.HIGH) return 'HIGH';
  if (score >= SCRI_THRESHOLDS.MODERATE) return 'MODERATE';
  return 'LOW';
}

/**
 * Alias for determineRiskTier.
 */
export const getRiskTier = determineRiskTier;

// ============================================================================
// 4. SIMULATION RUNNER & COMBUSTION PREDICTOR
// ============================================================================

/**
 * Executes a full deterministic combustion and fire hazard simulation.
 * Calculates sub-scores, composite SCRI, flame spread rate, extinction regime,
 * and operational fire safety guidance.
 */
export function simulateCombustion(input: SimulationInput): SimulationResult {
  const s_env = calculateAtmosphericScore(input.oxygenPct, input.pressureKPa, input.gravityG, input.velocityCmS);
  const s_flam = calculateFlammabilityScore(input.fuelType, input.oxygenPct, input.pressureKPa);
  const s_geom = calculateGeometryScore(input.geometryType);
  const s_ext = calculateSuppressionScore(input.oxygenPct, input.velocityCmS, input.gravityG, input.pressureKPa);
  const s_tox = calculateToxicityScore(input.fuelType, input.pressureKPa, input.oxygenPct, input.gravityG);

  const subScores: SubScores = {
    atmospheric: s_env,
    flammability: s_flam,
    geometry: s_geom,
    suppression: s_ext,
    toxicity: s_tox
  };

  const scriScore = calculateScriScore(subScores);
  const riskTier = determineRiskTier(scriScore);

  // Microgravity oxidizer transport physics
  const uBuoy = calculateBuoyantVelocity(input.gravityG);
  const uEff = calculateEffectiveVelocity(input.velocityCmS, input.gravityG);

  // Material property lookup
  const mat = getMaterial(input.fuelType) || {
    id: 'generic',
    code: 'GEN-01',
    name: input.fuelType,
    category: 'Generic Combustible',
    baseLoc1g: 17.0,
    thermalInertia: 0.50,
    heatReleasePeak: 500,
    coToxicityIndex: 0.50,
    sootAgglomeration: 0.50,
    smolderTendency: 0.20,
    ignitionTempC: 320
  };

  const dynamicLOC = calculateDynamicLoc(mat, input.pressureKPa, uEff, input.geometryType);
  const o2Margin = Number((input.oxygenPct - dynamicLOC).toFixed(2));
  const damkohler = calculateDamkohlerProxy(input.oxygenPct, dynamicLOC, uEff, input.pressureKPa);

  // Extinction regime evaluation
  const extinctionRegime = determineExtinctionRegime(
    input.oxygenPct,
    dynamicLOC,
    uEff,
    damkohler,
    input.gravityG,
    input.geometryType,
    input.pressureKPa
  );

  const isFlammable = extinctionRegime === 'flammable';

  // Flame spread velocity calculation
  const flameSpread = calculateFlameSpreadVelocity(
    mat,
    input.geometryType,
    input.oxygenPct,
    dynamicLOC,
    uEff,
    input.pressureKPa,
    extinctionRegime
  );

  // Warnings collection
  const warnings: string[] = [];
  const key = input.fuelType.toLowerCase();

  if (extinctionRegime === 'quenched_radiation') {
    warnings.push('Radiative quenching detected: near-zero flow induces oxygen starvation and radiative flameout.');
  }
  if (input.gravityG < 0.1 && input.velocityCmS <= 2.0 && (key.includes('cotton') || key.includes('fabric'))) {
    warnings.push('Smolder persistence warning: charring fabrics may sustain flameless smoldering under low-flow microgravity.');
  }
  if (input.oxygenPct >= 34.0) {
    warnings.push('Hyperoxic atmosphere: Earth NASA-STD-6001 Test 1 flammability certification invalidated at >=34% O2.');
  }
  if (key.includes('ptfe') || key.includes('teflon')) {
    warnings.push('Extreme toxic hazard: fluoropolymer PTFE thermal breakdown emits toxic HF and perfluoroisobutylene gas.');
  }
  if (input.pressureKPa <= 58.0 && input.oxygenPct >= 30.0 && input.gravityG <= 0.2) {
    warnings.push('Confined volume flashover hazard: rapid smoke accumulation in pressurized rover cabin.');
  }

  // Recommendations collection using recommender module
  const recommendations = generateRecommendations(input, {
    scriScore,
    riskTier,
    isFlammable,
    extinctionRegime
  });

  return {
    scriScore,
    riskTier,
    isFlammable,
    flameSpreadVelocityMmS: flameSpread,
    extinctionRegime,
    subScores,
    warnings,
    recommendations,
    physicsDetails: {
      dynamicLOC,
      o2Margin,
      uEffCmS: uEff,
      buoyantVelocityCmS: uBuoy,
      damkohlerProxy: damkohler,
      heatReleaseWatts: Math.round(flameSpread * 450)
    }
  };
}

/**
 * Primary aliases for simulateCombustion conforming to test suite expectations.
 */
export const runSimulation = simulateCombustion;
export const evaluateSimulation = simulateCombustion;

// ============================================================================
// 5. INVESTIGATION RANKING ENGINE
// ============================================================================

/**
 * Maps a sample geometry string to a standardized SampleGeometryType literal.
 */
function mapGeometryToType(geomStr: string): SampleGeometryType {
  const s = (geomStr || '').toLowerCase();
  if (s.includes('droplet')) return 'droplet';
  if (s.includes('jet') || s.includes('gas') || s.includes('burner')) return 'gas_jet';
  if (s.includes('thin') || s.includes('fabric') || s.includes('ribbon') || s.includes('cloth')) return 'thin_fabric';
  if (s.includes('rod') || s.includes('wire') || s.includes('cylinder') || s.includes('candle')) return 'cylinder_rod';
  return 'thick_slab';
}

/**
 * Ranks NASA PSI investigations against a specified habitat operational scenario.
 * Evaluates risk score, flammability limits, and operational relevance.
 */
export function rankInvestigations(
  investigations: EnrichedPsiInvestigation[],
  scenarioId: HabitatId = 'iss'
): InvestigationRanking[] {
  const scenario = getHabitatScenario(scenarioId) || HABITAT_SCENARIOS[0];

  const rankings: InvestigationRanking[] = investigations.map((inv) => {
    const fuel = inv.fuelTypes && inv.fuelTypes.length > 0 ? inv.fuelTypes[0] : 'PMMA';
    const geometry = mapGeometryToType(inv.sampleGeometry);

    const sim = simulateCombustion({
      oxygenPct: scenario.oxygenPct,
      pressureKPa: scenario.pressureKPa,
      velocityCmS: scenario.nominalVelocityCmS,
      gravityG: scenario.gravityG,
      fuelType: fuel,
      geometryType: geometry
    });

    const criticalFinding =
      inv.flammabilityFindings ||
      inv.fireSafetyRelevance ||
      inv.missingOpportunitiesAnalysis ||
      'Evaluated against habitat exploration environmental constraints.';

    return {
      investigationId: inv.id,
      code: inv.code,
      name: inv.name,
      fullName: inv.fullName,
      category: inv.category,
      scriScore: sim.scriScore,
      riskTier: sim.riskTier,
      criticalFinding,
      limitingOxygenIndexPct: sim.physicsDetails?.dynamicLOC
    };
  });

  // Sort descending by SCRI risk score (highest risk first)
  return rankings.sort((a, b) => b.scriScore - a.scriScore);
}

export default {
  SCRI_WEIGHTS,
  SCRI_THRESHOLDS,
  BASE_FUEL_FLAMMABILITY,
  BASE_FUEL_TOXICITY,
  calculateAtmosphericScore,
  calculateFlammabilityScore,
  calculateGeometryScore,
  calculateSuppressionScore,
  calculateToxicityScore,
  calculateScriScore,
  computeScriScore,
  determineRiskTier,
  getRiskTier,
  simulateCombustion,
  runSimulation,
  evaluateSimulation,
  rankInvestigations
};
