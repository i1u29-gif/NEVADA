import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { simulateCombustion } from '../src/engine/physics_models.ts';

import type { SimulationInput } from '../src/types/index.ts';

describe('Tier 2: Microgravity Combustion Physics Engine', () => {

  // =========================================================================
  // Feature 1: Oxygen Concentration Boundary Limits (0% to 100% O2)
  // =========================================================================
  describe('Feature 1: Oxygen Concentration Boundary Limits (0% to 100% O2)', () => {
    it('TC-PHYS-01: Absolute Zero Oxygen (0.0% O2 - Pure Inert / Vacuum Analogue)', () => {
      const input: SimulationInput = {
        oxygenPct: 0.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const res = simulateCombustion(input);

      assert.strictEqual(res.isFlammable, false, 'Combustion must be impossible at 0% O2');
      assert.strictEqual(res.extinctionRegime, 'inert_hypoxic', 'Regime must be inert_hypoxic');
      assert.strictEqual(res.flameSpreadVelocityMmS, 0.0, 'Flame spread must be 0 mm/s');
      assert.strictEqual(res.subScores.atmospheric, 0.0, 'Atmospheric subscore must be 0');
      assert.strictEqual(res.riskTier, 'LOW', 'Risk tier must be LOW at 0% O2');
      assert.ok(res.scriScore < 30.0, `SCRI score ${res.scriScore} must be < 30.0`);
    });

    it('TC-PHYS-02: Deep Sub-LOC Hypoxic Atmosphere (10.0% O2 - Fire Suppression Blanket)', () => {
      const input: SimulationInput = {
        oxygenPct: 10.0,
        pressureKPa: 101.3,
        velocityCmS: 10.0,
        gravityG: 0.0,
        fuelType: 'Cotton',
        geometryType: 'thin_fabric'
      };
      const res = simulateCombustion(input);

      assert.strictEqual(res.isFlammable, false, '10% O2 must extinguish cotton');
      assert.strictEqual(res.extinctionRegime, 'inert_hypoxic');
      assert.strictEqual(res.flameSpreadVelocityMmS, 0.0);
      assert.ok(res.subScores.atmospheric <= 10.0, `Atmospheric score ${res.subScores.atmospheric} must be <= 10.0`);
    });

    it('TC-PHYS-03: Marginal Sub-Threshold Atmosphere (15.5% O2 - PMMA Near-LOC Extinction)', () => {
      const input: SimulationInput = {
        oxygenPct: 15.5,
        pressureKPa: 101.3,
        velocityCmS: 5.0,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const res = simulateCombustion(input);

      assert.strictEqual(res.isFlammable, false, 'PMMA must extinguish below ~17% LOC');
      assert.strictEqual(res.extinctionRegime, 'inert_hypoxic');
      assert.strictEqual(res.flameSpreadVelocityMmS, 0.0);
    });

    it('TC-PHYS-04: Nominal Standard Atmosphere (21.0% O2 - Baseline ISS/Terrestrial)', () => {
      const input: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 0.0,
        fuelType: 'Cotton',
        geometryType: 'thin_fabric'
      };
      const res = simulateCombustion(input);

      assert.strictEqual(res.isFlammable, true, 'Cotton must burn at nominal 21% O2');
      assert.strictEqual(res.extinctionRegime, 'flammable');
      assert.ok(res.flameSpreadVelocityMmS > 0.5 && res.flameSpreadVelocityMmS < 5.0,
        `Velocity ${res.flameSpreadVelocityMmS} must be between 0.5 and 5.0 mm/s`);
      assert.ok(res.scriScore >= 40.0, `SCRI score ${res.scriScore} must be >= 40.0`);
    });

    it('TC-PHYS-05: Artemis Lunar Exploration Atmosphere (34.0% O2 - High Flammability)', () => {
      const nominalInput: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 0.0,
        fuelType: 'Cotton',
        geometryType: 'thin_fabric'
      };
      const artemisInput: SimulationInput = {
        oxygenPct: 34.0,
        pressureKPa: 56.5,
        velocityCmS: 15.0,
        gravityG: 0.166,
        fuelType: 'Cotton',
        geometryType: 'thin_fabric'
      };
      const resNominal = simulateCombustion(nominalInput);
      const resArtemis = simulateCombustion(artemisInput);

      assert.strictEqual(resArtemis.isFlammable, true);
      assert.strictEqual(resArtemis.extinctionRegime, 'flammable');
      assert.ok(resArtemis.flameSpreadVelocityMmS >= 1.5 * resNominal.flameSpreadVelocityMmS,
        `Artemis velocity ${resArtemis.flameSpreadVelocityMmS} must be >= 1.5x nominal ${resNominal.flameSpreadVelocityMmS}`);
      assert.strictEqual(resArtemis.riskTier, 'CRITICAL', 'Artemis 34% O2 cotton must trigger CRITICAL risk');
      assert.ok(resArtemis.scriScore >= 75.0, `Artemis SCRI score ${resArtemis.scriScore} must be >= 75.0`);
    });

    it('TC-PHYS-06: Hyperoxic Pure Oxygen Boundary (100.0% O2 - Extreme Apollo 1 Analog)', () => {
      const input: SimulationInput = {
        oxygenPct: 100.0,
        pressureKPa: 101.3,
        velocityCmS: 10.0,
        gravityG: 1.0,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const res = simulateCombustion(input);

      assert.strictEqual(res.isFlammable, true);
      assert.strictEqual(res.subScores.atmospheric, 100.0, 'Atmospheric score must be saturated at 100.0');
      assert.strictEqual(res.riskTier, 'CRITICAL');
      assert.ok(res.scriScore >= 80.0, `SCRI score ${res.scriScore} must be >= 80.0`);
      assert.ok(res.flameSpreadVelocityMmS >= 4.0, `Velocity ${res.flameSpreadVelocityMmS} must be >= 4.0 mm/s`);
    });
  });

  // =========================================================================
  // Feature 2: Low-Flow Hazard & Radiative Quenching
  // =========================================================================
  describe('Feature 2: Low-Flow Hazard & Radiative Quenching (0 cm/s vs 5 cm/s vs Forced Flow)', () => {
    it('TC-PHYS-07: Quiescent Microgravity (u = 0.0 cm/s, g = 0.0 - Radiative Quenching)', () => {
      const input: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 0.0,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const res = simulateCombustion(input);

      assert.strictEqual(res.isFlammable, false, 'Quiescent microgravity must quench thick solid slab');
      assert.strictEqual(res.extinctionRegime, 'quenched_radiation');
      assert.strictEqual(res.flameSpreadVelocityMmS, 0.0);
    });

    it('TC-PHYS-08: Sub-Critical Drift (u = 0.8 cm/s, g = 0.0 - Near-Quench Boundary)', () => {
      const input: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 0.8,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const res = simulateCombustion(input);

      assert.strictEqual(res.isFlammable, false, 'Drift < 1.0 cm/s in microgravity must quench');
      assert.strictEqual(res.extinctionRegime, 'quenched_radiation');
      assert.strictEqual(res.flameSpreadVelocityMmS, 0.0);
    });

    it('TC-PHYS-09: Low-Flow Flammability Hazard Sweet Spot (u = 5.0 cm/s, g = 0.0 - Maximum Flammability)', () => {
      const quenchedInput: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 0.0,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const sweetSpotInput: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 5.0,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const resQuenched = simulateCombustion(quenchedInput);
      const resSweetSpot = simulateCombustion(sweetSpotInput);

      assert.strictEqual(resSweetSpot.isFlammable, true, '5 cm/s flow must sustain flame in microgravity');
      assert.strictEqual(resSweetSpot.extinctionRegime, 'flammable');
      assert.ok(resSweetSpot.flameSpreadVelocityMmS > 0.0);
      assert.ok(resSweetSpot.scriScore > resQuenched.scriScore,
        `Sweet spot score ${resSweetSpot.scriScore} must exceed quenched score ${resQuenched.scriScore}`);
    });

    it('TC-PHYS-10: Nominal Forced Ventilation Flow (u = 20.0 cm/s, g = 0.0 - ISS Cabin Ducting)', () => {
      const input: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 20.0,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const res = simulateCombustion(input);

      assert.strictEqual(res.isFlammable, true);
      assert.strictEqual(res.extinctionRegime, 'flammable');
      assert.ok(res.flameSpreadVelocityMmS > 0.0);
    });

    it('TC-PHYS-11: Quiescent Earth 1g Contrast (u = 0.0 cm/s, g = 1.0 - Buoyant Updraft Domination)', () => {
      const zeroGInput: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 0.0,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const oneGInput: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 0.0,
        gravityG: 1.0,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const resZeroG = simulateCombustion(zeroGInput);
      const resOneG = simulateCombustion(oneGInput);

      assert.strictEqual(resOneG.isFlammable, true, 'In 1g, natural buoyancy prevents extinction at u=0');
      assert.notStrictEqual(resOneG.extinctionRegime, 'quenched_radiation');
      assert.strictEqual(resOneG.extinctionRegime, 'flammable');
      assert.ok(resOneG.flameSpreadVelocityMmS > 0.0);
      assert.strictEqual(resOneG.isFlammable !== resZeroG.isFlammable, true,
        'Buoyancy in 1g must yield different flammability outcome than microgravity');
    });
  });

  // =========================================================================
  // Feature 3: Chamber Pressure Boundaries (40 to 150 kPa)
  // =========================================================================
  describe('Feature 3: Chamber Pressure Boundaries (40 to 150 kPa)', () => {
    it('TC-PHYS-12: Operational Hypobaric Limit (40.0 kPa / 5.8 psia - Minimum Exploration Pressure)', () => {
      const stdAtmInput: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 10.0,
        gravityG: 0.166,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const hypobaricInput: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 40.0,
        velocityCmS: 10.0,
        gravityG: 0.166,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const resStd = simulateCombustion(stdAtmInput);
      const resHypo = simulateCombustion(hypobaricInput);

      assert.ok(resHypo.subScores.atmospheric < resStd.subScores.atmospheric,
        `Hypobaric atmospheric score ${resHypo.subScores.atmospheric} must be < standard ${resStd.subScores.atmospheric}`);
      assert.ok(resHypo.flameSpreadVelocityMmS < resStd.flameSpreadVelocityMmS,
        `Hypobaric spread rate ${resHypo.flameSpreadVelocityMmS} must be < standard ${resStd.flameSpreadVelocityMmS}`);
    });

    it('TC-PHYS-13: Artemis Exploration Pressure (56.5 kPa / 8.2 psia - Normoxic Equivalent)', () => {
      const input: SimulationInput = {
        oxygenPct: 34.0,
        pressureKPa: 56.5,
        velocityCmS: 15.0,
        gravityG: 0.166,
        fuelType: 'Polyethylene',
        geometryType: 'cylinder_rod'
      };
      const res = simulateCombustion(input);

      assert.strictEqual(res.isFlammable, true);
      assert.ok(res.scriScore >= 70.0, `Artemis PE rod SCRI ${res.scriScore} must be >= 70.0`);
      assert.ok(res.riskTier === 'HIGH' || res.riskTier === 'CRITICAL');
    });

    it('TC-PHYS-14: Standard Terrestrial / ISS Pressure (101.3 kPa / 14.7 psia - Standard Baseline)', () => {
      const input: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 0.0,
        fuelType: 'Polyethylene',
        geometryType: 'cylinder_rod'
      };
      const res = simulateCombustion(input);

      assert.strictEqual(res.extinctionRegime, 'flammable');
      assert.ok(Number.isFinite(res.scriScore));
      assert.ok(res.scriScore >= 0.0 && res.scriScore <= 100.0);
    });

    it('TC-PHYS-15: Hyperbaric Combustion Limit (150.0 kPa / 21.8 psia - High Pressure Boundary)', () => {
      const stdInput: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 1.0,
        fuelType: 'Cotton',
        geometryType: 'thin_fabric'
      };
      const hyperbaricInput: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 150.0,
        velocityCmS: 15.0,
        gravityG: 1.0,
        fuelType: 'Cotton',
        geometryType: 'thin_fabric'
      };
      const resStd = simulateCombustion(stdInput);
      const resHyper = simulateCombustion(hyperbaricInput);

      assert.strictEqual(resHyper.isFlammable, true);
      assert.ok(resHyper.flameSpreadVelocityMmS > resStd.flameSpreadVelocityMmS,
        `Hyperbaric velocity ${resHyper.flameSpreadVelocityMmS} must exceed standard ${resStd.flameSpreadVelocityMmS}`);
      assert.ok(resHyper.subScores.atmospheric > resStd.subScores.atmospheric,
        `Hyperbaric atmospheric score ${resHyper.subScores.atmospheric} must exceed standard ${resStd.subScores.atmospheric}`);
    });

    it('TC-PHYS-16: Extreme Sub-Atmospheric Depressurization (< 10.0 kPa - Vacuum Extinction)', () => {
      const input: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 5.0,
        velocityCmS: 10.0,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const res = simulateCombustion(input);

      assert.strictEqual(res.isFlammable, false, 'Combustion must extinguish under deep vacuum dump');
      assert.strictEqual(res.extinctionRegime, 'inert_hypoxic');
      assert.strictEqual(res.flameSpreadVelocityMmS, 0.0);
      assert.ok(res.scriScore < 25.0, `SCRI ${res.scriScore} must be < 25.0 in vacuum`);
    });
  });

  // =========================================================================
  // Feature 4: Damköhler Blowoff Limits (Flow Velocity vs Kinetics)
  // =========================================================================
  describe('Feature 4: Damköhler Blowoff Limits (Flow Velocity vs Kinetics)', () => {
    it('TC-PHYS-17: High Residence Time Regime (u = 3.0 cm/s - Large Da, Stable Kinetics)', () => {
      const input: SimulationInput = {
        oxygenPct: 25.0,
        pressureKPa: 101.3,
        velocityCmS: 3.0,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const res = simulateCombustion(input);

      assert.strictEqual(res.isFlammable, true);
      assert.strictEqual(res.extinctionRegime, 'flammable');
    });

    it('TC-PHYS-18: Balanced Convection Regime (u = 20.0 cm/s - Optimal Steady State)', () => {
      const input: SimulationInput = {
        oxygenPct: 25.0,
        pressureKPa: 101.3,
        velocityCmS: 20.0,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const res = simulateCombustion(input);

      assert.strictEqual(res.isFlammable, true);
      assert.strictEqual(res.extinctionRegime, 'flammable');
    });

    it('TC-PHYS-19: Incipient Blowoff Velocity (u = 45.0 cm/s, 21% O2 - High Shear Deceleration)', () => {
      const optimalInput: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const shearInput: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 45.0,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const resOpt = simulateCombustion(optimalInput);
      const resShear = simulateCombustion(shearInput);

      assert.ok(resShear.flameSpreadVelocityMmS <= resOpt.flameSpreadVelocityMmS || resShear.extinctionRegime === 'blowoff_extinction',
        'Convective shear at 45 cm/s must decelerate flame spread or trigger blowoff');
    });

    it('TC-PHYS-20: Forced Convective Blowoff Extinction (u = 60.0 cm/s, 21% O2 - Da < Da_crit)', () => {
      const input: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 60.0,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const res = simulateCombustion(input);

      assert.strictEqual(res.isFlammable, false, '60 cm/s forced flow in microgravity must blow off PMMA slab');
      assert.strictEqual(res.extinctionRegime, 'blowoff_extinction');
      assert.strictEqual(res.flameSpreadVelocityMmS, 0.0);
    });

    it('TC-PHYS-21: Blowoff Threshold Dependency on Oxygen Concentration', () => {
      const subNominalInput: SimulationInput = {
        oxygenPct: 18.0,
        pressureKPa: 101.3,
        velocityCmS: 35.0,
        gravityG: 0.0,
        fuelType: 'Cotton',
        geometryType: 'thin_fabric'
      };
      const elevatedInput: SimulationInput = {
        oxygenPct: 40.0,
        pressureKPa: 101.3,
        velocityCmS: 35.0,
        gravityG: 0.0,
        fuelType: 'Cotton',
        geometryType: 'thin_fabric'
      };
      const resSub = simulateCombustion(subNominalInput);
      const resElev = simulateCombustion(elevatedInput);

      assert.strictEqual(resSub.isFlammable, false, 'At 18% O2, 35 cm/s flow must quench/blow off cotton');
      assert.strictEqual(resElev.isFlammable, true, 'At 40% O2, fast chemical kinetics must withstand 35 cm/s flow');
    });
  });

  // =========================================================================
  // Feature 5: Droplet vs Solid Geometry Physics
  // =========================================================================
  describe('Feature 5: Droplet vs Solid Geometry Physics', () => {
    it('TC-PHYS-22: Droplet Combustion d^2-Law in Microgravity (FLEX/FLEX-2 Analogue)', () => {
      const input: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 0.0,
        gravityG: 0.0,
        fuelType: 'Heptane',
        geometryType: 'droplet'
      };
      const res = simulateCombustion(input);

      assert.strictEqual(res.isFlammable, true, 'Isolated droplet must burn in microgravity');
      assert.strictEqual(res.subScores.geometry, 70.0, 'Droplet geometry subscore must be exactly 70.0');
      assert.ok(res.scriScore >= 40.0 && res.scriScore <= 80.0,
        `Droplet SCRI ${res.scriScore} must be within [40.0, 80.0]`);
    });

    it('TC-PHYS-23: Thermally Thin Fabric Rapid Flame Spread (Saffire SIBAL / Cotton Fabric)', () => {
      const thinInput: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 0.0,
        fuelType: 'Cotton',
        geometryType: 'thin_fabric'
      };
      const thickInput: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 0.0,
        fuelType: 'Cotton',
        geometryType: 'thick_slab'
      };
      const resThin = simulateCombustion(thinInput);
      const resThick = simulateCombustion(thickInput);

      assert.strictEqual(resThin.subScores.geometry, 95.0, 'Thin fabric geometry subscore must be 95.0');
      assert.ok(resThin.flameSpreadVelocityMmS > resThick.flameSpreadVelocityMmS,
        `Thin fabric velocity ${resThin.flameSpreadVelocityMmS} must exceed thick slab ${resThick.flameSpreadVelocityMmS}`);
    });

    it('TC-PHYS-24: Thermally Thick Solid Slab Flame Spread (BASS PMMA Slab)', () => {
      const slabInput: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const fabricInput: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thin_fabric'
      };
      const resSlab = simulateCombustion(slabInput);
      const resFabric = simulateCombustion(fabricInput);

      assert.strictEqual(resSlab.subScores.geometry, 40.0, 'Thick slab geometry score must be 40.0');
      assert.ok(resSlab.flameSpreadVelocityMmS < 0.6 * resFabric.flameSpreadVelocityMmS,
        `Thick slab velocity ${resSlab.flameSpreadVelocityMmS} must be significantly lower than thin fabric ${resFabric.flameSpreadVelocityMmS}`);
    });

    it('TC-PHYS-25: Cylindrical Wire Insulation (Spacecraft Harnessing)', () => {
      const input: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 0.0,
        fuelType: 'Polyethylene',
        geometryType: 'cylinder_rod'
      };
      const res = simulateCombustion(input);

      assert.strictEqual(res.subScores.geometry, 80.0, 'Cylinder rod geometry score must be 80.0');
      // Verify geometry score hierarchy: thick_slab (40) < droplet (70) < cylinder_rod (80) < gas_jet (85) < thin_fabric (95)
      assert.ok(40.0 < res.subScores.geometry && res.subScores.geometry < 95.0);
    });

    it('TC-PHYS-26: Continuous Gas Jet Diffusion Flame (ACME CFI-G Analogue)', () => {
      const input: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 10.0,
        gravityG: 0.0,
        fuelType: 'Methane',
        geometryType: 'gas_jet'
      };
      const res = simulateCombustion(input);

      assert.strictEqual(res.subScores.geometry, 85.0, 'Gas jet geometry score must be 85.0');
      assert.strictEqual(res.isFlammable, true);
      assert.strictEqual(res.extinctionRegime, 'flammable');
    });
  });

});
