/**
 * NASA Microgravity Combustion Science Dashboard & SI Harness
 * Module: Habitat Operational Scenarios Matrix
 * Path: src/engine/habitat_scenarios.ts
 *
 * Implements Feature F08 (Habitat Scenario Matrix) covering 5 operational exploration regimes:
 * 1. `iss` (ISS Nominal Cabin): Microgravity (0g), 101.3 kPa, 21.0% O2, radiative quenching on vent cut.
 * 2. `artemis_lunar` (Artemis Lunar Base / LEA): Lunar gravity (0.166g), 56.5 kPa, 34.0% O2, hyperoxic risk.
 * 3. `mars_habitat` (Mars Surface Habitat): Martian gravity (0.38g), 65.0 kPa, 28.0% O2, greenhouse biomass.
 * 4. `rover` (Pressurized Rover): Confined volume, 0.166g, 55.0 kPa, 32.0% O2, rapid flashover hazard.
 * 5. `terrestrial` (Earth Baseline): Terrestrial gravity (1.0g), 101.3 kPa, 20.9% O2, buoyant plume standard.
 *
 * All scenarios strictly conform to HabitatEnvironment interface in src/types/index.ts
 * and validate against Tier 4 E2E test suite (test/04_scenarios_env.test.ts) and REST API tests.
 */

import type { HabitatEnvironment, HabitatId, RiskTier } from '../types/index.ts';

// ============================================================================
// 1. STANDARDIZED HABITAT SCENARIO SPECIFICATIONS
// ============================================================================

/**
 * 1. ISS Nominal Spacecraft Cabin (0g Normoxic)
 * Baseline microgravity environment for ISS Columbus, Destiny, and MSG operations.
 */
export const ISS_SCENARIO: HabitatEnvironment = {
  id: 'iss',
  name: 'ISS Nominal Spacecraft Cabin (Microgravity Normoxic)',
  pressureKPa: 101.3,
  pressurePsia: 14.7,
  oxygenPct: 21.0,
  gravityG: 0.0,
  nominalVelocityCmS: 10.0,
  description:
    'International Space Station standard shirt-sleeve cabin atmosphere at sea-level pressure. In zero-g microgravity, natural buoyant convection is completely suppressed (Gr ~ 0). Forced ventilation (nominally 10 cm/s) is mandatory to prevent toxic CO2 accumulation pockets. When ventilation is halted during a fire event, combustion transitions to quiescent radiative quenching (BASS finding). Due to high nitrogen saturation (79%), direct EVA egress requires extensive nitrogen prebreathe (4-hour in-mask or overnight Campout).',
  evaPrebreatheRequired: true,
  fireHazardTier: 'MODERATE'
};

/**
 * 2. Artemis Lunar Base / Lander Exploration Atmosphere (LEA)
 * NASA Exploration Atmosphere selected for Artemis HLS, Lunar Gateway, and surface habitats.
 */
export const ARTEMIS_LUNAR_SCENARIO: HabitatEnvironment = {
  id: 'artemis_lunar',
  name: 'Artemis Lunar Base / Exploration Atmosphere (LEA)',
  pressureKPa: 56.5,
  pressurePsia: 8.2,
  oxygenPct: 34.0,
  gravityG: 0.166,
  nominalVelocityCmS: 5.0,
  description:
    'NASA Exploration Atmosphere (56.5 kPa / 8.2 psia, 34% O2) engineered for Artemis lunar exploration. Maintains normoxic alveolar partial pressure (pO2 ~ 19.2 kPa) while reducing nitrogen partial pressure to 37.3 kPa, eliminating the hours-long prebreathe requirement for direct EVA egress. However, 34% oxygen enrichment severely elevates material flammability, lowers ignition energy, and accelerates flame spread (>1.5x ISS). Materials self-extinguishing on Earth (certified under NASA-STD-6001 Test 1 at 21% O2, e.g., Nomex) become flammable.',
  evaPrebreatheRequired: false,
  fireHazardTier: 'CRITICAL'
};

/**
 * 3. Mars Surface Habitat Greenhouse
 * Long-duration partial-gravity surface habitat with agricultural / biomass bays.
 */
export const MARS_HABITAT_SCENARIO: HabitatEnvironment = {
  id: 'mars_habitat',
  name: 'Mars Surface Habitat & Greenhouse (Partial Gravity)',
  pressureKPa: 65.0,
  pressurePsia: 9.4,
  oxygenPct: 28.0,
  gravityG: 0.38,
  nominalVelocityCmS: 8.0,
  description:
    'Martian surface habitat operating at reduced pressure (65.0 kPa / 9.4 psia) with moderate 28% O2 enrichment, reducing structural delta-P against the Martian ambient atmosphere (0.6 kPa CO2). At 0.38g partial gravity, an upward buoyant plume forms with effective buoyant velocity ~18 cm/s. Plant biomass, agricultural crops, and dried cellulose in greenhouse modules present dense combustible fuel loading and high smoldering propensity, generating toxic CO and heavy soot aerosols under oxygen-limited pyrolysis.',
  evaPrebreatheRequired: true,
  fireHazardTier: 'HIGH'
};

/**
 * 4. Pressurized Lunar/Mars Rover
 * Confined crew cockpit for extended mobile surface expeditions.
 */
export const ROVER_SCENARIO: HabitatEnvironment = {
  id: 'rover',
  name: 'Pressurized Expedition Rover (Confined Cabin)',
  pressureKPa: 55.0,
  pressurePsia: 8.0,
  oxygenPct: 32.0,
  gravityG: 0.166,
  nominalVelocityCmS: 5.0,
  description:
    'Compact pressurized rover cabin (~12 m3 volume) supporting 2 to 4 astronauts during long-range lunar and Martian sorties. Operates at low pressure (55.0 kPa / 8.0 psia) and 32% O2 with suit-port rear bulkhead interfaces. In this confined volume, toxic smoke and heat saturate the atmosphere in less than 30 seconds, creating severe risk of rapid thermal flashover. Emergency protocol mandates immediate 30-second crew suit donning or cabin depressurization.',
  evaPrebreatheRequired: false,
  fireHazardTier: 'CRITICAL'
};

/**
 * 5. Terrestrial Sea-Level Baseline
 * Earth 1g sea-level standard atmosphere for experimental calibration and spin-off evaluation.
 */
export const TERRESTRIAL_SCENARIO: HabitatEnvironment = {
  id: 'terrestrial',
  name: 'Terrestrial Sea-Level Baseline (Earth 1g)',
  pressureKPa: 101.3,
  pressurePsia: 14.7,
  oxygenPct: 20.9,
  gravityG: 1.0,
  nominalVelocityCmS: 10.0,
  description:
    'Standard Earth sea-level atmosphere (101.3 kPa, 20.9% O2, 1.0g gravity). Strong upward buoyant chimneying (~30 cm/s natural convection) continuously feeds oxidizer to the flame base. Serves as the experimental control baseline for NASA-STD-6001 upward flame propagation and ASTM D2863 Limiting Oxygen Index (LOI) tests, and provides the foundation for terrestrial spin-offs in mine safety (SAME aerosol detection) and aviation Halon replacements.',
  evaPrebreatheRequired: false,
  fireHazardTier: 'LOW'
};

// ============================================================================
// 2. HABITAT SCENARIO CATALOG
// ============================================================================

/**
 * Authoritative array of all 5 standardized exploration habitat scenarios.
 * Exported as HABITAT_SCENARIOS to fulfill Tier 4 E2E testing contract.
 */
export const HABITAT_SCENARIOS: readonly HabitatEnvironment[] = [
  ISS_SCENARIO,
  ARTEMIS_LUNAR_SCENARIO,
  MARS_HABITAT_SCENARIO,
  ROVER_SCENARIO,
  TERRESTRIAL_SCENARIO
] as const;

/**
 * Read-only dictionary keyed by standardized HabitatId for O(1) lookups.
 */
export const HABITAT_SCENARIOS_MAP: Readonly<Record<HabitatId, HabitatEnvironment>> = {
  iss: ISS_SCENARIO,
  artemis_lunar: ARTEMIS_LUNAR_SCENARIO,
  mars_habitat: MARS_HABITAT_SCENARIO,
  rover: ROVER_SCENARIO,
  terrestrial: TERRESTRIAL_SCENARIO
};

// ============================================================================
// 3. RETRIEVAL & LOOKUP HELPER FUNCTIONS
// ============================================================================

/**
 * Lookup a habitat scenario by its unique identifier (e.g., 'iss', 'artemis_lunar').
 * Normalizes input (case-insensitive, trimmed) and returns undefined if not found.
 *
 * @param id - Habitat identifier string
 * @returns HabitatEnvironment object or undefined
 */
export function getHabitatScenario(id: string): HabitatEnvironment | undefined {
  if (typeof id !== 'string') return undefined;
  const normalizedId = id.trim().toLowerCase() as HabitatId;
  return HABITAT_SCENARIOS_MAP[normalizedId] || undefined;
}

/**
 * Alias for getHabitatScenario to satisfy alternate domain helper naming.
 */
export function getScenarioById(id: string): HabitatEnvironment | undefined {
  return getHabitatScenario(id);
}

/**
 * Returns a cloned array of all 5 exploration habitat environments.
 */
export function getAllScenarios(): HabitatEnvironment[] {
  return [...HABITAT_SCENARIOS];
}

/**
 * Returns all scenarios matching a specific fire hazard risk tier.
 *
 * @param tier - Risk tier ('CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW')
 */
export function getScenariosByTier(tier: RiskTier): HabitatEnvironment[] {
  return HABITAT_SCENARIOS.filter((s) => s.fireHazardTier === tier);
}

// ============================================================================
// 4. SCIENTIFIC DIAGNOSTIC & COMPARISON UTILITIES
// ============================================================================

/**
 * Calculate oxygen partial pressure in kPa: pO2 = P * (O2% / 100).
 */
export function calculatePartialPressureO2(scenario: HabitatEnvironment): number {
  return Number(((scenario.pressureKPa * scenario.oxygenPct) / 100).toFixed(2));
}

/**
 * Calculate nitrogen partial pressure in kPa: pN2 = P * ((100 - O2%) / 100).
 */
export function calculatePartialPressureN2(scenario: HabitatEnvironment): number {
  return Number(((scenario.pressureKPa * (100 - scenario.oxygenPct)) / 100).toFixed(2));
}

/**
 * Check if the atmosphere qualifies as hyperoxic (O2 > 23.5% mole fraction).
 */
export function isHyperoxic(scenario: HabitatEnvironment): boolean {
  return scenario.oxygenPct > 23.5;
}

/**
 * Check if the habitat is hypobaric relative to sea level (P < 95.0 kPa).
 */
export function isHypobaric(scenario: HabitatEnvironment): boolean {
  return scenario.pressureKPa < 95.0;
}

/**
 * Comparative delta analysis between two habitat scenarios.
 */
export interface ScenarioComparison {
  scenarioA: HabitatEnvironment;
  scenarioB: HabitatEnvironment;
  pressureDeltaKPa: number;
  pressureDeltaPsia: number;
  oxygenDeltaPct: number;
  gravityDeltaG: number;
  partialPressureO2DeltaKPa: number;
  higherRiskScenarioId: HabitatId;
  riskTierDifference: string;
  flammabilityImplication: string;
  evaPrebreatheTradeoff: string;
}

/**
 * Compare two habitat scenarios side-by-side with physical deltas and fire safety implications.
 *
 * @param idA - First scenario ID
 * @param idB - Second scenario ID
 */
export function compareScenarios(idA: string, idB: string): ScenarioComparison | null {
  const scenarioA = getHabitatScenario(idA);
  const scenarioB = getHabitatScenario(idB);
  if (!scenarioA || !scenarioB) return null;

  const pO2A = calculatePartialPressureO2(scenarioA);
  const pO2B = calculatePartialPressureO2(scenarioB);

  const tierWeight: Record<RiskTier, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MODERATE: 2,
    LOW: 1
  };

  const higherRiskScenarioId =
    tierWeight[scenarioA.fireHazardTier] >= tierWeight[scenarioB.fireHazardTier]
      ? scenarioA.id
      : scenarioB.id;

  let flammabilityImplication = '';
  if (scenarioA.oxygenPct > scenarioB.oxygenPct) {
    flammabilityImplication = `${scenarioA.name} exhibits higher flammability hazard (+${(scenarioA.oxygenPct - scenarioB.oxygenPct).toFixed(1)}% O2), significantly depressing dynamic LOC.`;
  } else if (scenarioB.oxygenPct > scenarioA.oxygenPct) {
    flammabilityImplication = `${scenarioB.name} exhibits higher flammability hazard (+${(scenarioB.oxygenPct - scenarioA.oxygenPct).toFixed(1)}% O2), significantly depressing dynamic LOC.`;
  } else {
    flammabilityImplication = 'Both scenarios feature equivalent oxygen concentration.';
  }

  let evaPrebreatheTradeoff = '';
  if (scenarioA.evaPrebreatheRequired !== scenarioB.evaPrebreatheRequired) {
    const noPrebreatheScenario = !scenarioA.evaPrebreatheRequired ? scenarioA : scenarioB;
    const prebreatheScenario = scenarioA.evaPrebreatheRequired ? scenarioA : scenarioB;
    evaPrebreatheTradeoff = `${noPrebreatheScenario.name} eliminates EVA prebreathe overhead at the cost of elevated hyperoxic fire risk compared to ${prebreatheScenario.name}.`;
  } else {
    evaPrebreatheTradeoff = scenarioA.evaPrebreatheRequired
      ? 'Both scenarios mandate extensive denitrogenation prebreathe before EVA.'
      : 'Neither scenario mandates EVA prebreathe protocols.';
  }

  return {
    scenarioA,
    scenarioB,
    pressureDeltaKPa: Number((scenarioA.pressureKPa - scenarioB.pressureKPa).toFixed(2)),
    pressureDeltaPsia: Number((scenarioA.pressurePsia - scenarioB.pressurePsia).toFixed(2)),
    oxygenDeltaPct: Number((scenarioA.oxygenPct - scenarioB.oxygenPct).toFixed(2)),
    gravityDeltaG: Number((scenarioA.gravityG - scenarioB.gravityG).toFixed(3)),
    partialPressureO2DeltaKPa: Number((pO2A - pO2B).toFixed(2)),
    higherRiskScenarioId,
    riskTierDifference: `${scenarioA.fireHazardTier} vs ${scenarioB.fireHazardTier}`,
    flammabilityImplication,
    evaPrebreatheTradeoff
  };
}

export default {
  HABITAT_SCENARIOS,
  HABITAT_SCENARIOS_MAP,
  ISS_SCENARIO,
  ARTEMIS_LUNAR_SCENARIO,
  MARS_HABITAT_SCENARIO,
  ROVER_SCENARIO,
  TERRESTRIAL_SCENARIO,
  getHabitatScenario,
  getScenarioById,
  getAllScenarios,
  getScenariosByTier,
  calculatePartialPressureO2,
  calculatePartialPressureN2,
  isHyperoxic,
  isHypobaric,
  compareScenarios
};
