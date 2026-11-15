import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { simulateCombustion } from '../src/engine/physics_models.ts';

import { determineRiskTier } from '../src/engine/ranking_engine.ts';

import type { SimulationInput, SimulationResult, SampleGeometryType } from '../src/types/index.ts';

describe('Tier 3: Super Intelligence Combustion Risk Index (SCRI) & Scoring Engine', () => {

  // =========================================================================
  // Section 1: Pairwise Combinations Matrix (56 Parameter Combinations)
  // =========================================================================
  describe('Section 1: Pairwise Combinations Matrix', () => {

    it('Matrix A: Oxygen Concentration x Gravity (4 x 4 = 16 combinations)', () => {
      const oxygenLevels = [16.0, 21.0, 34.0, 50.0];
      const gravityLevels = [0.0, 0.166, 0.38, 1.0];

      for (const g of gravityLevels) {
        let prevAtmScore = -1;
        for (const o2 of oxygenLevels) {
          const input: SimulationInput = {
            oxygenPct: o2,
            pressureKPa: 101.3,
            velocityCmS: 15.0,
            gravityG: g,
            fuelType: 'PMMA',
            geometryType: 'thick_slab'
          };
          const res = simulateCombustion(input);

          assert.ok(Number.isFinite(res.scriScore), `SCRI score must be finite for O2=${o2}, g=${g}`);
          assert.ok(res.scriScore >= 0.0 && res.scriScore <= 100.0, `SCRI ${res.scriScore} out of bounds [0, 100]`);
          assert.ok(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'].includes(res.riskTier));

          // At constant gravity, atmospheric subscore must increase strictly with oxygen
          assert.ok(res.subScores.atmospheric > prevAtmScore,
            `Atmospheric score failed strict monotonicity: prev=${prevAtmScore}, curr=${res.subScores.atmospheric} at O2=${o2}, g=${g}`);
          prevAtmScore = res.subScores.atmospheric;
        }
      }

      // Gravity modifier check at 34% O2: Lunar gravity (0.166g, Psi=1.15) produces higher atmospheric subscore
      // than microgravity (0.0g, Psi=0.90) and Earth (1.0g, Psi=1.00)
      const inputLunar: SimulationInput = {
        oxygenPct: 34.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 0.166,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const inputZeroG: SimulationInput = {
        oxygenPct: 34.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const inputEarth: SimulationInput = {
        oxygenPct: 34.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 1.0,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const resLunar = simulateCombustion(inputLunar);
      const resZeroG = simulateCombustion(inputZeroG);
      const resEarth = simulateCombustion(inputEarth);

      assert.ok(resLunar.subScores.atmospheric > resZeroG.subScores.atmospheric,
        `Lunar atm score ${resLunar.subScores.atmospheric} must exceed micro-g ${resZeroG.subScores.atmospheric}`);
      assert.ok(resLunar.subScores.atmospheric > resEarth.subScores.atmospheric,
        `Lunar atm score ${resLunar.subScores.atmospheric} must exceed Earth ${resEarth.subScores.atmospheric}`);
    });

    it('Matrix B: Pressure x Geometry (4 x 5 = 20 combinations)', () => {
      const pressures = [40.0, 56.5, 101.3, 150.0];
      const geometries: SampleGeometryType[] = ['thin_fabric', 'thick_slab', 'cylinder_rod', 'droplet', 'gas_jet'];

      for (const p of pressures) {
        const resultsByGeom: Record<string, SimulationResult> = {};
        for (const geom of geometries) {
          const input: SimulationInput = {
            oxygenPct: 25.0,
            pressureKPa: p,
            velocityCmS: 15.0,
            gravityG: 0.166,
            fuelType: 'Cotton',
            geometryType: geom
          };
          const res = simulateCombustion(input);
          resultsByGeom[geom] = res;

          assert.ok(res.scriScore >= 0.0 && res.scriScore <= 100.0, `SCRI out of bounds: ${res.scriScore}`);
          assert.ok(Number.isFinite(res.scriScore));
        }

        // Geometry subscore order invariant across all pressures:
        // thin_fabric (95) > gas_jet (85) > cylinder_rod (80) > droplet (70) > thick_slab (40)
        assert.strictEqual(resultsByGeom['thin_fabric'].subScores.geometry, 95.0);
        assert.strictEqual(resultsByGeom['gas_jet'].subScores.geometry, 85.0);
        assert.strictEqual(resultsByGeom['cylinder_rod'].subScores.geometry, 80.0);
        assert.strictEqual(resultsByGeom['droplet'].subScores.geometry, 70.0);
        assert.strictEqual(resultsByGeom['thick_slab'].subScores.geometry, 40.0);
      }

      // Atmospheric subscore increases with pressure
      let prevAtmScore = -1;
      for (const p of pressures) {
        const input: SimulationInput = {
          oxygenPct: 25.0,
          pressureKPa: p,
          velocityCmS: 15.0,
          gravityG: 0.166,
          fuelType: 'Cotton',
          geometryType: 'thin_fabric'
        };
        const res = simulateCombustion(input);
        assert.ok(res.subScores.atmospheric > prevAtmScore,
          `Atmospheric score failed increase with pressure: prev=${prevAtmScore}, curr=${res.subScores.atmospheric} at P=${p}`);
        prevAtmScore = res.subScores.atmospheric;
      }
    });

    it('Matrix C: Forced Flow Velocity x Fuel Type (4 x 5 = 20 combinations)', () => {
      const velocities = [0.0, 5.0, 20.0, 50.0];
      const fuels = ['Cotton', 'PMMA', 'Polyethylene', 'Nomex', 'PTFE'];

      for (const u of velocities) {
        const scoresByFuel: Record<string, number> = {};
        for (const fuel of fuels) {
          const input: SimulationInput = {
            oxygenPct: 21.0,
            pressureKPa: 101.3,
            velocityCmS: u,
            gravityG: 0.0,
            fuelType: fuel,
            geometryType: 'thick_slab'
          };
          const res = simulateCombustion(input);
          scoresByFuel[fuel] = res.subScores.flammability;

          // In microgravity (g=0) at u=0, radiative quenching extinguishes all fuels
          if (u === 0.0) {
            assert.strictEqual(res.isFlammable, false, `${fuel} must extinguish at u=0 in microgravity`);
            assert.strictEqual(res.extinctionRegime, 'quenched_radiation');
          }

          // At sweet spot u=5.0 cm/s, combustible fuels are active
          if (u === 5.0 && ['Cotton', 'PMMA', 'Polyethylene'].includes(fuel)) {
            assert.strictEqual(res.isFlammable, true, `${fuel} must be flammable at 5 cm/s flow`);
            assert.strictEqual(res.extinctionRegime, 'flammable');
          }

          // PTFE must exhibit lowest flammability (12.0) and highest toxicity (90.0)
          if (fuel === 'PTFE') {
            assert.strictEqual(res.subScores.flammability, 12.0);
            assert.strictEqual(res.subScores.toxicity, 90.0);
          }
        }

        // Flammability hierarchy: Cotton (92) > PMMA (84) > Polyethylene (80) > Nomex (45) > PTFE (12)
        assert.ok(scoresByFuel['Cotton'] > scoresByFuel['PMMA'], 'Cotton flam > PMMA flam');
        assert.ok(scoresByFuel['PMMA'] > scoresByFuel['Polyethylene'], 'PMMA flam > PE flam');
        assert.ok(scoresByFuel['Polyethylene'] > scoresByFuel['Nomex'], 'PE flam > Nomex flam');
        assert.ok(scoresByFuel['Nomex'] > scoresByFuel['PTFE'], 'Nomex flam > PTFE flam');
      }
    });

  });

  // =========================================================================
  // Section 2: Strict Score Bounds [0.0, 100.0] & Clamping Invariant
  // =========================================================================
  describe('Section 2: Strict Score Bounds [0.0, 100.0] & Clamping Invariant', () => {

    it('TC-SCORE-BOUNDS-01: Absolute Minimum Input Vector', () => {
      const minInput: SimulationInput = {
        oxygenPct: 0.0,
        pressureKPa: 40.0,
        velocityCmS: 0.0,
        gravityG: 0.0,
        fuelType: 'PTFE',
        geometryType: 'thick_slab'
      };
      const res = simulateCombustion(minInput);

      assert.strictEqual(res.riskTier, 'LOW');
      assert.ok(res.scriScore >= 0.0 && res.scriScore <= 25.0, `Min SCRI ${res.scriScore} must be <= 25.0`);
      assert.strictEqual(res.subScores.atmospheric, 0.0);
      assert.strictEqual(res.isFlammable, false);
    });

    it('TC-SCORE-BOUNDS-02: Absolute Maximum Input Vector', () => {
      const maxInput: SimulationInput = {
        oxygenPct: 100.0,
        pressureKPa: 150.0,
        velocityCmS: 15.0,
        gravityG: 0.166,
        fuelType: 'Cotton',
        geometryType: 'thin_fabric'
      };
      const res = simulateCombustion(maxInput);

      assert.strictEqual(res.riskTier, 'CRITICAL');
      assert.ok(res.scriScore >= 85.0 && res.scriScore <= 100.0, `Max SCRI ${res.scriScore} must be >= 85.0`);
      assert.strictEqual(res.subScores.atmospheric, 100.0);
      assert.strictEqual(res.isFlammable, true);
    });

    it('TC-SCORE-BOUNDS-03: Monte Carlo Randomized Stress Test (1,000 Iterations)', () => {
      // Deterministic Linear Congruential Generator (LCG) for reproducible stress testing
      let seed = 123456789;
      function nextRand(): number {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      }

      const fuels = ['Cotton', 'PMMA', 'Polyethylene', 'Nomex', 'PTFE', 'Unknown'];
      const geometries: SampleGeometryType[] = ['thin_fabric', 'thick_slab', 'cylinder_rod', 'droplet', 'gas_jet'];

      for (let i = 0; i < 1000; i++) {
        const input: SimulationInput = {
          oxygenPct: nextRand() * 100.0,
          pressureKPa: 10.0 + nextRand() * 190.0,
          velocityCmS: nextRand() * 100.0,
          gravityG: nextRand() * 2.0,
          fuelType: fuels[Math.floor(nextRand() * fuels.length)],
          geometryType: geometries[Math.floor(nextRand() * geometries.length)]
        };
        const res = simulateCombustion(input);

        assert.ok(Number.isFinite(res.scriScore), `scriScore must be finite at iter ${i}`);
        assert.ok(res.scriScore >= 0.0 && res.scriScore <= 100.0, `scriScore out of bounds: ${res.scriScore} at iter ${i}`);
        assert.ok(res.subScores.atmospheric >= 0.0 && res.subScores.atmospheric <= 100.0, `atm out of bounds at iter ${i}`);
        assert.ok(res.subScores.flammability >= 0.0 && res.subScores.flammability <= 100.0, `flam out of bounds at iter ${i}`);
        assert.ok(res.subScores.geometry >= 0.0 && res.subScores.geometry <= 100.0, `geom out of bounds at iter ${i}`);
        assert.ok(res.subScores.suppression >= 0.0 && res.subScores.suppression <= 100.0, `supp out of bounds at iter ${i}`);
        assert.ok(res.subScores.toxicity >= 0.0 && res.subScores.toxicity <= 100.0, `tox out of bounds at iter ${i}`);
        assert.ok(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'].includes(res.riskTier), `Invalid risk tier at iter ${i}: ${res.riskTier}`);
      }
    });

  });

  // =========================================================================
  // Section 3: Strict Monotonic Increase with Oxygen Concentration (O2)
  // =========================================================================
  describe('Section 3: Strict Monotonic Increase with Oxygen Concentration', () => {

    it('TC-SCORE-MONO-01: Cotton Thin Fabric O2 Sensitivity Sweep (15% to 50% in 1% steps)', () => {
      let prevScri = -1;
      let prevAtm = -1;
      let initialScri = -1;
      let finalScri = -1;

      for (let o2 = 15.0; o2 <= 50.0; o2 += 1.0) {
        const input: SimulationInput = {
          oxygenPct: o2,
          pressureKPa: 101.3,
          velocityCmS: 15.0,
          gravityG: 0.0,
          fuelType: 'Cotton',
          geometryType: 'thin_fabric'
        };
        const res = simulateCombustion(input);

        if (initialScri === -1) {
          initialScri = res.scriScore;
        }
        finalScri = res.scriScore;

        assert.ok(res.scriScore >= prevScri,
          `SCRI score dropped from ${prevScri} to ${res.scriScore} at O2=${o2}%`);
        assert.ok(res.subScores.atmospheric > prevAtm,
          `Atmospheric score failed strict increase: prev=${prevAtm}, curr=${res.subScores.atmospheric} at O2=${o2}%`);

        prevScri = res.scriScore;
        prevAtm = res.subScores.atmospheric;
      }

      assert.ok(finalScri > initialScri,
        `Final Cotton SCRI at 50% O2 (${finalScri}) must strictly exceed initial at 15% O2 (${initialScri})`);
    });

    it('TC-SCORE-MONO-02: PMMA Thick Slab Monotonicity Sweep in Microgravity (15% to 50%)', () => {
      let prevScri = -1;
      let prevAtm = -1;
      let initialScri = -1;
      let finalScri = -1;

      for (let o2 = 15.0; o2 <= 50.0; o2 += 2.0) {
        const input: SimulationInput = {
          oxygenPct: o2,
          pressureKPa: 101.3,
          velocityCmS: 10.0,
          gravityG: 0.0,
          fuelType: 'PMMA',
          geometryType: 'thick_slab'
        };
        const res = simulateCombustion(input);

        if (initialScri === -1) {
          initialScri = res.scriScore;
        }
        finalScri = res.scriScore;

        assert.ok(res.scriScore >= prevScri,
          `PMMA slab SCRI dropped from ${prevScri} to ${res.scriScore} at O2=${o2}%`);
        assert.ok(res.subScores.atmospheric > prevAtm,
          `PMMA slab atmospheric failed increase at O2=${o2}%`);

        prevScri = res.scriScore;
        prevAtm = res.subScores.atmospheric;
      }

      assert.ok(finalScri > initialScri,
        `Final PMMA SCRI at 50% O2 (${finalScri}) must strictly exceed initial at 15% O2 (${initialScri})`);
    });

    it('TC-SCORE-MONO-03: Nomex High-LOC Material Monotonicity Sweep (20% to 45%)', () => {
      let prevScri = -1;
      let prevAtm = -1;
      let initialScri = -1;
      let finalScri = -1;

      for (let o2 = 20.0; o2 <= 45.0; o2 += 2.5) {
        const input: SimulationInput = {
          oxygenPct: o2,
          pressureKPa: 101.3,
          velocityCmS: 15.0,
          gravityG: 0.0,
          fuelType: 'Nomex',
          geometryType: 'thick_slab'
        };
        const res = simulateCombustion(input);

        if (initialScri === -1) {
          initialScri = res.scriScore;
        }
        finalScri = res.scriScore;

        assert.ok(res.scriScore >= prevScri,
          `Nomex SCRI dropped from ${prevScri} to ${res.scriScore} at O2=${o2}%`);
        assert.ok(res.subScores.atmospheric > prevAtm,
          `Nomex atmospheric score failed strict increase: prev=${prevAtm}, curr=${res.subScores.atmospheric} at O2=${o2}%`);

        prevScri = res.scriScore;
        prevAtm = res.subScores.atmospheric;
      }

      assert.ok(finalScri > initialScri,
        `Final Nomex SCRI at 45% O2 (${finalScri}) must strictly exceed initial at 20% O2 (${initialScri})`);
    });

  });

  // =========================================================================
  // Section 4: Artemis LEA vs ISS Nominal Risk Delta
  // =========================================================================
  describe('Section 4: Artemis LEA (34% O2, 56.5 kPa) vs ISS Nominal (21% O2, 101.3 kPa) Risk Delta', () => {

    it('TC-SCORE-DELTA-01: Cotton Fabric Direct Habitat Delta', () => {
      const issInput: SimulationInput = {
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
      const resISS = simulateCombustion(issInput);
      const resArtemis = simulateCombustion(artemisInput);

      assert.ok(resArtemis.scriScore > resISS.scriScore,
        `Artemis SCRI ${resArtemis.scriScore} must exceed ISS ${resISS.scriScore}`);

      // Relative risk delta must be >= 15%
      const relativeIncrease = (resArtemis.scriScore - resISS.scriScore) / resISS.scriScore;
      assert.ok(relativeIncrease >= 0.15,
        `Relative risk delta ${relativeIncrease.toFixed(3)} must be >= 0.15 (+15%)`);

      // Atmospheric score ratio >= 2.0x
      assert.ok(resArtemis.subScores.atmospheric >= 2.0 * resISS.subScores.atmospheric,
        `Artemis atmospheric score ${resArtemis.subScores.atmospheric} must be >= 2x ISS ${resISS.subScores.atmospheric}`);

      // Artemis tier must be CRITICAL
      assert.strictEqual(resArtemis.riskTier, 'CRITICAL');
    });

    it('TC-SCORE-DELTA-02: PMMA Acrylic Viewport Habitat Delta', () => {
      const issInput: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const artemisInput: SimulationInput = {
        oxygenPct: 34.0,
        pressureKPa: 56.5,
        velocityCmS: 15.0,
        gravityG: 0.166,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      };
      const resISS = simulateCombustion(issInput);
      const resArtemis = simulateCombustion(artemisInput);

      assert.ok(resArtemis.scriScore > resISS.scriScore,
        `Artemis SCRI ${resArtemis.scriScore} must exceed ISS ${resISS.scriScore}`);

      // Relative risk delta must be >= 15%
      const relativeIncrease = (resArtemis.scriScore - resISS.scriScore) / resISS.scriScore;
      assert.ok(relativeIncrease >= 0.15,
        `PMMA relative risk delta ${relativeIncrease.toFixed(3)} must be >= 0.15 (+15%)`);

      assert.ok(resArtemis.flameSpreadVelocityMmS > resISS.flameSpreadVelocityMmS,
        `Artemis flame spread ${resArtemis.flameSpreadVelocityMmS} must exceed ISS ${resISS.flameSpreadVelocityMmS}`);
    });

    it('TC-SCORE-DELTA-03: Spacecraft Harness Insulation (Polyethylene) Delta', () => {
      const issInput: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 0.0,
        fuelType: 'Polyethylene',
        geometryType: 'cylinder_rod'
      };
      const artemisInput: SimulationInput = {
        oxygenPct: 34.0,
        pressureKPa: 56.5,
        velocityCmS: 15.0,
        gravityG: 0.166,
        fuelType: 'Polyethylene',
        geometryType: 'cylinder_rod'
      };
      const resISS = simulateCombustion(issInput);
      const resArtemis = simulateCombustion(artemisInput);

      const relativeIncrease = (resArtemis.scriScore - resISS.scriScore) / resISS.scriScore;
      assert.ok(relativeIncrease >= 0.15,
        `PE wire relative delta ${relativeIncrease.toFixed(3)} must be >= 0.15`);
      assert.ok(resArtemis.riskTier === 'HIGH' || resArtemis.riskTier === 'CRITICAL');
    });

  });

  // =========================================================================
  // Section 5: 5 Subscores Breakdown & Linearity Verification
  // =========================================================================
  describe('Section 5: 5 Subscores Breakdown & Linearity Verification', () => {

    it('TC-SCORE-SUBS-01: Exact Weights Check & Composite Linearity', () => {
      const input: SimulationInput = {
        oxygenPct: 28.0,
        pressureKPa: 80.0,
        velocityCmS: 12.0,
        gravityG: 0.166,
        fuelType: 'PMMA',
        geometryType: 'cylinder_rod'
      };
      const res = simulateCombustion(input);

      const expectedScri = 
        0.25 * res.subScores.atmospheric +
        0.30 * res.subScores.flammability +
        0.15 * res.subScores.geometry +
        0.15 * res.subScores.suppression +
        0.15 * res.subScores.toxicity;

      assert.ok(Math.abs(res.scriScore - expectedScri) < 0.05,
        `Linearity violation: got ${res.scriScore}, expected weighted sum ${expectedScri}`);
    });

    it('TC-SCORE-SUBS-02: Subscore Isolation Invariant', () => {
      const slabInput: SimulationInput = {
        oxygenPct: 25.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 0.0,
        fuelType: 'Cotton',
        geometryType: 'thick_slab'
      };
      const fabricInput: SimulationInput = {
        oxygenPct: 25.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 0.0,
        fuelType: 'Cotton',
        geometryType: 'thin_fabric'
      };
      const resSlab = simulateCombustion(slabInput);
      const resFabric = simulateCombustion(fabricInput);

      // Changing ONLY geometryType must alter ONLY geometry subscore and composite scriScore
      assert.strictEqual(resFabric.subScores.atmospheric, resSlab.subScores.atmospheric);
      assert.strictEqual(resFabric.subScores.flammability, resSlab.subScores.flammability);
      assert.strictEqual(resFabric.subScores.suppression, resSlab.subScores.suppression);
      assert.strictEqual(resFabric.subScores.toxicity, resSlab.subScores.toxicity);
      assert.ok(resFabric.subScores.geometry > resSlab.subScores.geometry);
      assert.ok(resFabric.scriScore > resSlab.scriScore);
    });

    it('TC-SCORE-SUBS-03: Deterministic Risk Tier Threshold Boundary Verification', () => {
      assert.strictEqual(determineRiskTier(75.0), 'CRITICAL');
      assert.strictEqual(determineRiskTier(74.9), 'HIGH');
      assert.strictEqual(determineRiskTier(60.0), 'HIGH');
      assert.strictEqual(determineRiskTier(59.9), 'MODERATE');
      assert.strictEqual(determineRiskTier(40.0), 'MODERATE');
      assert.strictEqual(determineRiskTier(39.9), 'LOW');
      assert.strictEqual(determineRiskTier(0.0), 'LOW');
    });

    it('TC-SCORE-SUBS-04: Toxicity Subscore Isolation (PTFE vs Cotton)', () => {
      const ptfeInput: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 0.0,
        fuelType: 'PTFE',
        geometryType: 'thick_slab'
      };
      const cottonInput: SimulationInput = {
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 0.0,
        fuelType: 'Cotton',
        geometryType: 'thick_slab'
      };
      const resPTFE = simulateCombustion(ptfeInput);
      const resCotton = simulateCombustion(cottonInput);

      assert.ok(resPTFE.subScores.toxicity >= 85.0, `PTFE toxicity ${resPTFE.subScores.toxicity} must be >= 85.0`);
      assert.ok(resPTFE.subScores.toxicity - resCotton.subScores.toxicity >= 30.0,
        `Toxicity gap ${resPTFE.subScores.toxicity - resCotton.subScores.toxicity} must be >= 30.0`);
      assert.ok(resPTFE.warnings.some(w => /toxic|fluoropolymer|HF|acid/i.test(w)),
        'PTFE must trigger fluoropolymer toxic gas warning');
    });

  });

});
