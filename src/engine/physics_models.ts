/**
 * NASA Microgravity Combustion Science Dashboard & SI Harness
 * Module: Microgravity Combustion Physics & Mathematical Formulations
 * Path: src/engine/physics_models.ts
 *
 * Implements microgravity combustion physics models:
 * - Buoyancy suppression and dimensionless hydrodynamic regimes (Grashof, Reynolds, Richardson, Peclet)
 * - Induced buoyant velocity and effective oxidizer velocity
 * - Non-monotonic U-shaped flammability boundary and piecewise dynamic LOC
 * - Fernandez-Pello & Olson solid fuel flame spread models (thermally thin vs thick)
 * - Extinction regime arbitration (flammable, quenched_radiation, blowoff_extinction, inert_hypoxic)
 * - Droplet cool flame dynamics (NASA FLEX) and smoke agglomeration metrics (NASA SAME)
 * - Curated representative spacecraft materials database
 */

import type {
  MaterialProperty,
  SampleGeometryType,
  ExtinctionRegime,
  FlammabilityBoundaryPoint,
  SimulationInput,
  SimulationResult
} from '../types/index.ts';

// Forward simulation runner from ranking_engine
export {
  simulateCombustion,
  runSimulation,
  evaluateSimulation
} from './ranking_engine.ts';

// ============================================================================
// 1. REPRESENTATIVE SPACECRAFT MATERIALS CATALOG
// ============================================================================

export const SPACECRAFT_MATERIALS: readonly MaterialProperty[] = [
  {
    id: 'pmma',
    code: 'MAT-01',
    name: 'PMMA (Polymethyl Methacrylate / Acrylic)',
    category: 'Thermoplastic Viewports & Windows',
    baseLoc1g: 17.2,
    thermalInertia: 0.58,
    heatReleasePeak: 650,
    coToxicityIndex: 0.45,
    sootAgglomeration: 0.38,
    smolderTendency: 0.20,
    ignitionTempC: 310
  },
  {
    id: 'cotton',
    code: 'MAT-02',
    name: 'Cotton-Fiberglass SIBA Blend (Saffire Fabric)',
    category: 'Crew Clothing & Acoustic Textiles',
    baseLoc1g: 16.5,
    thermalInertia: 0.34,
    heatReleasePeak: 420,
    coToxicityIndex: 0.48,
    sootAgglomeration: 0.52,
    smolderTendency: 0.95,
    ignitionTempC: 260
  },
  {
    id: 'polyethylene',
    code: 'MAT-03',
    name: 'Polyethylene (HDPE / Radiation Shielding)',
    category: 'Polyolefin Shielding & Enclosures',
    baseLoc1g: 16.0,
    thermalInertia: 0.45,
    heatReleasePeak: 820,
    coToxicityIndex: 0.42,
    sootAgglomeration: 0.48,
    smolderTendency: 0.15,
    ignitionTempC: 340
  },
  {
    id: 'nomex',
    code: 'MAT-04',
    name: 'Nomex Meta-Aramid (Flight Suits & Stowage)',
    category: 'Flame-Resistant Meta-Aramid Fabric',
    baseLoc1g: 26.5,
    thermalInertia: 0.88,
    heatReleasePeak: 240,
    coToxicityIndex: 0.65,
    sootAgglomeration: 0.60,
    smolderTendency: 0.32,
    ignitionTempC: 445
  },
  {
    id: 'delrin',
    code: 'MAT-05',
    name: 'Delrin / Polyoxymethylene (POM)',
    category: 'Engineering Thermoplastic Gears & Latches',
    baseLoc1g: 15.0,
    thermalInertia: 0.52,
    heatReleasePeak: 580,
    coToxicityIndex: 0.75,
    sootAgglomeration: 0.22,
    smolderTendency: 0.10,
    ignitionTempC: 335
  },
  {
    id: 'mylar',
    code: 'MAT-06',
    name: 'Mylar BoPET (MLI Thermal Blankets)',
    category: 'Thin-Film Multi-Layer Insulation',
    baseLoc1g: 19.5,
    thermalInertia: 0.22,
    heatReleasePeak: 490,
    coToxicityIndex: 0.58,
    sootAgglomeration: 0.65,
    smolderTendency: 0.08,
    ignitionTempC: 380
  },
  {
    id: 'silicone',
    code: 'MAT-07',
    name: 'Silicone Elastomer (Wire Jacketing & Gaskets)',
    category: 'High-Temperature Silicone Sealant',
    baseLoc1g: 20.8,
    thermalInertia: 0.72,
    heatReleasePeak: 380,
    coToxicityIndex: 0.60,
    sootAgglomeration: 0.92,
    smolderTendency: 0.58,
    ignitionTempC: 395
  },
  {
    id: 'ultem',
    code: 'MAT-08',
    name: 'Ultem 1000 (PEI AMF 3D-Printing Polymer)',
    category: 'High-Performance Structural Polyetherimide',
    baseLoc1g: 30.5,
    thermalInertia: 1.15,
    heatReleasePeak: 165,
    coToxicityIndex: 0.30,
    sootAgglomeration: 0.26,
    smolderTendency: 0.12,
    ignitionTempC: 525
  },
  {
    id: 'kapton',
    code: 'MAT-09',
    name: 'Kapton Polyimide (Wiring Harness Insulation)',
    category: 'Aromatic Polyimide Dielectric Film',
    baseLoc1g: 36.5,
    thermalInertia: 1.25,
    heatReleasePeak: 140,
    coToxicityIndex: 0.74,
    sootAgglomeration: 0.40,
    smolderTendency: 0.25,
    ignitionTempC: 550
  },
  {
    id: 'ptfe',
    code: 'MAT-10',
    name: 'Teflon / PTFE (Fluoropolymer Seals & Plumbing)',
    category: 'Fluoropolymer High-Chemical Resistance',
    baseLoc1g: 95.0,
    thermalInertia: 1.50,
    heatReleasePeak: 50,
    coToxicityIndex: 0.90,
    sootAgglomeration: 0.15,
    smolderTendency: 0.05,
    ignitionTempC: 560
  },
  {
    id: 'heptane',
    code: 'MAT-11',
    name: 'n-Heptane Droplet / Fuel Simulant',
    category: 'Hydrocarbon Droplet Fuel',
    baseLoc1g: 15.0,
    thermalInertia: 0.20,
    heatReleasePeak: 900,
    coToxicityIndex: 0.40,
    sootAgglomeration: 0.45,
    smolderTendency: 0.00,
    ignitionTempC: 220
  },
  {
    id: 'methane',
    code: 'MAT-12',
    name: 'Methane Gas (ACME CFI Jet Fuel)',
    category: 'Gaseous Hydrocarbon',
    baseLoc1g: 14.5,
    thermalInertia: 0.15,
    heatReleasePeak: 850,
    coToxicityIndex: 0.40,
    sootAgglomeration: 0.30,
    smolderTendency: 0.00,
    ignitionTempC: 580
  }
] as const;

export const REPRESENTATIVE_MATERIALS = SPACECRAFT_MATERIALS;

/**
 * Material lookup by ID, code, or name.
 */
export function getMaterial(idOrName: string): MaterialProperty | undefined {
  if (!idOrName) return undefined;
  const key = idOrName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return SPACECRAFT_MATERIALS.find((m) => {
    const mId = m.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const mName = m.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const mCode = m.code.toLowerCase().replace(/[^a-z0-9]/g, '');
    return mId.includes(key) || key.includes(mId) || mName.includes(key) || mCode.includes(key);
  });
}

// ============================================================================
// 2. HYDRODYNAMIC & DIMENSIONLESS NUMBERS
// ============================================================================

/**
 * Computes buoyant induced velocity u_buoy in cm/s.
 * u_buoy = 30.0 * sqrt(max(0, g_rel))
 */
export function calculateBuoyantVelocity(gravityG: number): number {
  return Number((30.0 * Math.sqrt(Math.max(0, gravityG))).toFixed(2));
}

/**
 * Computes total effective oxidizer velocity u_eff in cm/s.
 * u_eff = sqrt(u_forced^2 + u_buoy^2)
 */
export function calculateEffectiveVelocity(forcedVelocityCmS: number, gravityG: number): number {
  const uBuoy = calculateBuoyantVelocity(gravityG);
  const uForced = Math.max(0, forcedVelocityCmS);
  return Number(Math.sqrt(uForced * uForced + uBuoy * uBuoy).toFixed(2));
}

/**
 * Computes dimensionless Grashof number (Gr).
 * Gr = (g * beta * deltaT * L^3) / nu^2
 */
export function calculateGrashofNumber(
  gravityG: number,
  deltaTK: number = 1200,
  lengthScaleM: number = 0.05
): number {
  if (gravityG <= 0.0) return 0.0;
  const gAcc = gravityG * 9.80665; // m/s^2
  const beta = 1.0 / 298.15; // 1/K
  const nu = 1.55e-5; // m^2/s kinematic viscosity of air
  const gr = (gAcc * beta * deltaTK * Math.pow(lengthScaleM, 3)) / (nu * nu);
  return Number(gr.toFixed(1));
}

/**
 * Computes dimensionless Reynolds number (Re).
 * Re = (u_eff * L) / nu
 */
export function calculateReynoldsNumber(velocityCmS: number, lengthScaleM: number = 0.05): number {
  const uMS = Math.max(0, velocityCmS) / 100.0;
  const nu = 1.55e-5;
  return Number(((uMS * lengthScaleM) / nu).toFixed(1));
}

/**
 * Computes dimensionless Richardson number (Ri = Gr / Re^2).
 */
export function calculateRichardsonNumber(
  gravityG: number,
  velocityCmS: number,
  deltaTK: number = 1200,
  lengthScaleM: number = 0.05
): number {
  const gr = calculateGrashofNumber(gravityG, deltaTK, lengthScaleM);
  const re = calculateReynoldsNumber(velocityCmS, lengthScaleM);
  if (re < 0.01) return gr > 0 ? 9999.0 : 0.0;
  return Number((gr / (re * re)).toFixed(2));
}

/**
 * Computes dimensionless Peclet number (Pe = u * L / alpha).
 */
export function calculatePecletNumber(velocityCmS: number, lengthScaleM: number = 0.05): number {
  const uMS = Math.max(0, velocityCmS) / 100.0;
  const alpha = 2.2e-5; // m^2/s thermal diffusivity of air
  return Number(((uMS * lengthScaleM) / alpha).toFixed(1));
}

// ============================================================================
// 3. DYNAMIC LOC & EXTINCTION REGIMES
// ============================================================================

/**
 * Computes dynamic Limiting Oxygen Concentration (LOC) taking into account
 * pressure scaling and non-monotonic forced flow effects.
 *
 * Formula:
 *   f_press = (101.3 / max(20.0, P))^0.22
 *   u_eff < 1.5 cm/s  => delta_flow = 4.5 * (1.5 - u_eff)   [Radiative quench]
 *   1.5 <= u_eff <= 18 => delta_flow = -2.2 * sin(((u_eff - 1.5)/16.5) * pi) [Sweet spot]
 *   u_eff > 18 cm/s   => delta_flow = 0.05 * (u_eff - 18.0) [Convective blowoff]
 *   LOC = clamp(10.0, 45.0, baseLoc * f_press + delta_flow)
 */
export function calculateDynamicLoc(
  material: MaterialProperty,
  pressureKPa: number,
  uEffCmS: number,
  geometryType?: SampleGeometryType
): number {
  const fPress = Math.pow(101.3 / Math.max(20.0, pressureKPa), 0.22);
  let deltaFlow = 0.0;

  if (geometryType === 'droplet') {
    // Droplet combustion in microgravity is governed by spherical diffusion (d2-law)
    // and does not experience planar convective heat loss quenching.
    deltaFlow = 0.0;
  } else if (uEffCmS < 1.5) {
    deltaFlow = 4.5 * (1.5 - uEffCmS);
  } else if (uEffCmS <= 18.0) {
    deltaFlow = -2.2 * Math.sin(((uEffCmS - 1.5) / 16.5) * Math.PI);
  } else {
    deltaFlow = 0.05 * (uEffCmS - 18.0);
  }

  const loc = material.baseLoc1g * fPress + deltaFlow;
  return Number(Math.min(45.0, Math.max(10.0, loc)).toFixed(2));
}

/**
 * Computes Damköhler Proxy number (Da).
 * Da = (O2 / dynamicLOC) * (15.0 / max(1.0, u_eff)) * sqrt(P / 101.3)
 */
export function calculateDamkohlerProxy(
  oxygenPct: number,
  dynamicLOC: number,
  uEffCmS: number,
  pressureKPa: number
): number {
  const pRatio = Math.max(0.01, pressureKPa / 101.3);
  const da =
    (oxygenPct / Math.max(1.0, dynamicLOC)) *
    (15.0 / Math.max(1.0, uEffCmS)) *
    Math.sqrt(pRatio);
  return Number(Math.min(10.0, Math.max(0.1, da)).toFixed(2));
}

/**
 * Determines combustion flammability / extinction regime.
 */
export function determineExtinctionRegime(
  oxygenPct: number,
  dynamicLOC: number,
  uEffCmS: number,
  damkohlerProxy: number,
  gravityG: number,
  geometryType?: SampleGeometryType,
  pressureKPa?: number
): ExtinctionRegime {
  // Deep vacuum dump or absolute zero oxygen
  if (oxygenPct <= 0.0 || (pressureKPa !== undefined && pressureKPa < 10.0)) {
    return 'inert_hypoxic';
  }

  // Quiescent microgravity radiative quenching (except isolated droplets)
  if (gravityG < 0.1 && uEffCmS < 1.0 && geometryType !== 'droplet') {
    return 'quenched_radiation';
  }

  // Sub-LOC oxygen starvation
  const o2Margin = oxygenPct - dynamicLOC;
  if (o2Margin <= 0.0) {
    return 'inert_hypoxic';
  }

  // Convective blowoff shear extinction
  if (
    uEffCmS >= 35.0 &&
    (damkohlerProxy < 0.85 || o2Margin <= 1.0 || (uEffCmS >= 55.0 && oxygenPct <= 25.0))
  ) {
    return 'blowoff_extinction';
  }

  return 'flammable';
}

// ============================================================================
// 4. FERNANDEZ-PELLO & OLSON FLAME SPREAD MODEL
// ============================================================================

/**
 * Computes flame spread velocity (mm/s) based on Fernandez-Pello & Olson formulations.
 */
export function calculateFlameSpreadVelocity(
  material: MaterialProperty,
  geometryType: SampleGeometryType,
  oxygenPct: number,
  dynamicLOC: number,
  uEffCmS: number,
  pressureKPa: number,
  regime: ExtinctionRegime
): number {
  if (regime !== 'flammable' || pressureKPa < 10.0) {
    return 0.0;
  }

  const o2Margin = Math.max(0, oxygenPct - dynamicLOC);
  if (o2Margin <= 0) return 0.0;

  // Geometry modifiers and thermal inertia scaling
  let fGeom = 1.0;
  let fFlow = 1.0;

  switch (geometryType) {
    case 'thin_fabric':
      fGeom = 1.60 / material.thermalInertia;
      fFlow = Math.pow(uEffCmS / 10.0, 0.25) * Math.exp(-uEffCmS / 75.0);
      break;

    case 'thick_slab':
      fGeom = 0.70 / material.thermalInertia;
      fFlow = Math.pow(uEffCmS / 10.0, 0.55) * Math.exp(-uEffCmS / 85.0);
      break;

    case 'cylinder_rod':
      fGeom = 1.10 / material.thermalInertia;
      fFlow = Math.pow(uEffCmS / 10.0, 0.40) * Math.exp(-uEffCmS / 80.0);
      break;

    case 'droplet':
      fGeom = 2.00;
      fFlow = 1.0;
      break;

    case 'gas_jet':
      fGeom = 2.50;
      fFlow = 1.0;
      break;
  }

  // Aerodynamic shear cooling at high convective flow
  if (uEffCmS > 30.0 && geometryType !== 'droplet' && geometryType !== 'gas_jet') {
    fFlow *= Math.exp(-(uEffCmS - 30.0) / 35.0);
  }

  const o2Factor = Math.pow(o2Margin / 10.0, 1.35);
  const pFactor = Math.pow(pressureKPa / 101.3, 0.4);

  const rawVelocity = 1.85 * fGeom * o2Factor * fFlow * pFactor;
  return Number(Math.min(25.0, Math.max(0.05, rawVelocity)).toFixed(2));
}

// ============================================================================
// 5. FLAMMABILITY BOUNDARY CURVE GENERATION
// ============================================================================

/**
 * Generates discrete points for plotting the U-shaped flammability boundary curve.
 */
export function generateFlammabilityBoundary(
  material: MaterialProperty,
  pressureKPa: number,
  gravityG: number
): FlammabilityBoundaryPoint[] {
  const points: FlammabilityBoundaryPoint[] = [];
  const velocities = [0.0, 0.5, 1.0, 2.0, 5.0, 10.0, 15.0, 20.0, 30.0, 40.0, 50.0];

  for (const u of velocities) {
    const uEff = calculateEffectiveVelocity(u, gravityG);
    const loc = calculateDynamicLoc(material, pressureKPa, uEff);
    let regime: ExtinctionRegime = 'flammable';

    if (gravityG < 0.1 && uEff < 1.0) {
      regime = 'quenched_radiation';
    } else if (uEff > 35.0) {
      regime = 'blowoff_extinction';
    }

    points.push({
      velocityCmS: u,
      limitingOxygenPct: loc,
      regime
    });
  }

  return points;
}

export default {
  SPACECRAFT_MATERIALS,
  REPRESENTATIVE_MATERIALS,
  getMaterial,
  calculateBuoyantVelocity,
  calculateEffectiveVelocity,
  calculateGrashofNumber,
  calculateReynoldsNumber,
  calculateRichardsonNumber,
  calculatePecletNumber,
  calculateDynamicLoc,
  calculateDamkohlerProxy,
  determineExtinctionRegime,
  calculateFlameSpreadVelocity,
  generateFlammabilityBoundary
};
