/**
 * E2E Test Suite — Tier 4: Mission Operational Scenarios & Habitat Environments
 * 
 * Tests 5 space exploration and terrestrial application scenarios:
 * 1. ISS Nominal Spacecraft Cabin (0g, 21% O2, radiative quenching upon ventilation shutdown)
 * 2. Artemis Lunar Base Habitat LEA (0.166g, 34% O2 hyperoxic risk, invalidation of Earth 1g certification)
 * 3. Mars Surface Habitat Greenhouse (0.38g partial buoyancy plume, biomass aerosol toxicity)
 * 4. Pressurized Lunar/Mars Rover (confined geometry, rapid thermal flashover, 30s suit donning alert)
 * 5. Terrestrial Mine & Industrial Spin-offs (1g baseline, SAME dual-wavelength smoke detection, Halon replacements)
 * 
 * Plus:
 * - Autonomous Actionable Recommender deterministic output
 * - Suppression Agent selection rules (strictly prohibiting dry chemical powder in 0g microgravity)
 * 
 * Framework: Native Node.js node:test and node:assert/strict
 * Requirements Covered: F08 (Habitat Scenarios), F10 (Actionable Recommender), F17 (Terrestrial Spin-offs), §R2, §R3
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import type {
  HabitatEnvironment,
  SimulationInput,
  SimulationResult,
  RiskTier
} from '../src/types/index.ts';

interface EngineModules {
  HABITAT_SCENARIOS: HabitatEnvironment[];
  getHabitatScenario: (id: string) => HabitatEnvironment | undefined;
  runSimulation: (input: SimulationInput) => SimulationResult;
  generateRecommendations: (input: SimulationInput, result?: Partial<SimulationResult>) => string[];
  getSuppressionProtocol: (habitatId: string) => string[];
  getTerrestrialSpinOffs: () => any[];
}

let engine: EngineModules;

before(async () => {
  // Dynamically import engine modules to evaluate real implementations
  const [habitatScenariosMod, rankingEngineMod, recommenderMod] = await Promise.all([
    import('../src/engine/habitat_scenarios.ts'),
    import('../src/engine/ranking_engine.ts'),
    import('../src/engine/recommender.ts')
  ]);

  engine = {
    HABITAT_SCENARIOS: (habitatScenariosMod.HABITAT_SCENARIOS || habitatScenariosMod.default?.HABITAT_SCENARIOS) as HabitatEnvironment[],
    getHabitatScenario: (habitatScenariosMod.getHabitatScenario || habitatScenariosMod.default?.getHabitatScenario) as (id: string) => HabitatEnvironment | undefined,
    runSimulation: (rankingEngineMod.runSimulation || rankingEngineMod.evaluateSimulation || rankingEngineMod.default?.runSimulation) as (input: SimulationInput) => SimulationResult,
    generateRecommendations: (recommenderMod.generateRecommendations || recommenderMod.default?.generateRecommendations) as (input: SimulationInput, result?: Partial<SimulationResult>) => string[],
    getSuppressionProtocol: (recommenderMod.getSuppressionProtocol || recommenderMod.default?.getSuppressionProtocol) as (habitatId: string) => string[],
    getTerrestrialSpinOffs: (recommenderMod.getTerrestrialSpinOffs || recommenderMod.default?.getTerrestrialSpinOffs) as () => any[]
  };

  assert.ok(engine.HABITAT_SCENARIOS, 'HABITAT_SCENARIOS catalog must be exported');
  assert.equal(typeof engine.getHabitatScenario, 'function', 'getHabitatScenario lookup function must be exported');
  assert.equal(typeof engine.runSimulation, 'function', 'runSimulation analytical function must be exported');
  assert.equal(typeof engine.generateRecommendations, 'function', 'generateRecommendations function must be exported');
  assert.equal(typeof engine.getSuppressionProtocol, 'function', 'getSuppressionProtocol function must be exported');
});

describe('Tier 4: Mission Operational Scenarios & Habitat Environments (F08, F10, F17)', () => {

  // ==========================================================================
  // Suite 4.1: Habitat Scenarios Catalog Completeness & Physical Consistency
  // ==========================================================================
  describe('4.1 Habitat Scenarios Catalog Completeness & Integrity', () => {

    it('4.1.1 should define exactly 5 standardized exploration environments', () => {
      const scenarios = engine.HABITAT_SCENARIOS;
      assert.ok(Array.isArray(scenarios), 'HABITAT_SCENARIOS must be an array');
      assert.equal(scenarios.length, 5, 'Must contain exactly 5 habitat operational environments');

      const ids = scenarios.map((s) => s.id);
      const expectedIds = ['iss', 'artemis_lunar', 'mars_habitat', 'rover', 'terrestrial'];
      for (const expectedId of expectedIds) {
        assert.ok(ids.includes(expectedId as any), `Scenario array must include ID: ${expectedId}`);
      }
    });

    it('4.1.2 should ensure all scenario parameters obey physical unit consistency', () => {
      const scenarios = engine.HABITAT_SCENARIOS;
      for (const s of scenarios) {
        assert.ok(typeof s.name === 'string' && s.name.length > 0, `Scenario ${s.id} must have a name`);
        assert.ok(s.pressureKPa > 0 && s.pressureKPa <= 200, `Scenario ${s.id} pressureKPa (${s.pressureKPa}) out of physical bounds`);
        assert.ok(s.pressurePsia > 0 && s.pressurePsia <= 30, `Scenario ${s.id} pressurePsia (${s.pressurePsia}) out of physical bounds`);

        // Check pressure unit equivalence (1 psi = 6.89476 kPa)
        const expectedKPa = s.pressurePsia * 6.89476;
        const pressureDelta = Math.abs(expectedKPa - s.pressureKPa);
        assert.ok(
          pressureDelta < 2.0,
          `Pressure unit conversion mismatch for ${s.id}: ${s.pressurePsia} psia -> ${expectedKPa.toFixed(1)} kPa vs actual ${s.pressureKPa} kPa`
        );

        assert.ok(s.oxygenPct >= 15.0 && s.oxygenPct <= 50.0, `Scenario ${s.id} O2% (${s.oxygenPct}) must be within habitable range`);
        assert.ok(s.gravityG >= 0.0 && s.gravityG <= 1.0, `Scenario ${s.id} gravityG (${s.gravityG}) must be in [0.0, 1.0]`);
        assert.ok(s.nominalVelocityCmS >= 0, `Scenario ${s.id} nominalVelocityCmS (${s.nominalVelocityCmS}) must be >= 0`);
        assert.ok(
          ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'].includes(s.fireHazardTier),
          `Scenario ${s.id} has invalid fireHazardTier: ${s.fireHazardTier}`
        );
      }
    });

    it('4.1.3 should correctly lookup scenarios via getHabitatScenario utility', () => {
      const iss = engine.getHabitatScenario('iss');
      assert.ok(iss, 'getHabitatScenario("iss") should return a valid object');
      assert.equal(iss?.id, 'iss');
      assert.equal(iss?.gravityG, 0.0);

      const artemis = engine.getHabitatScenario('artemis_lunar');
      assert.ok(artemis, 'getHabitatScenario("artemis_lunar") should return a valid object');
      assert.equal(artemis?.id, 'artemis_lunar');
      assert.equal(artemis?.oxygenPct, 34.0);

      const invalid = engine.getHabitatScenario('unknown_habitat_id');
      assert.equal(invalid, undefined, 'Looking up unknown scenario ID should return undefined');
    });
  });

  // ==========================================================================
  // Suite 4.2: Scenario 1 — ISS Nominal Cabin Microgravity Environment
  // ==========================================================================
  describe('4.2 Scenario 1: ISS Nominal Spacecraft Cabin (0g Quiescent Quenching)', () => {

    it('4.2.1 should verify ISS nominal atmospheric and operational parameters', () => {
      const iss = engine.getHabitatScenario('iss')!;
      assert.equal(iss.pressureKPa, 101.3, 'ISS pressure must be 101.3 kPa');
      assert.equal(iss.pressurePsia, 14.7, 'ISS pressure must be 14.7 psia');
      assert.equal(iss.oxygenPct, 21.0, 'ISS oxygen must be nominal 21.0%');
      assert.equal(iss.gravityG, 0.0, 'ISS gravity must be 0.0g (microgravity)');
      assert.equal(iss.evaPrebreatheRequired, true, 'ISS requires extensive prebreathe before EVA');
      assert.equal(iss.fireHazardTier, 'MODERATE', 'ISS nominal hazard tier is MODERATE');
    });

    it('4.2.2 should demonstrate active HVAC flammability vs quiescent radiative extinction in 0g', () => {
      // 1. ISS with active forced ventilation (15 cm/s)
      const activeHvacResult = engine.runSimulation({
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thin_fabric'
      });

      assert.equal(activeHvacResult.isFlammable, true, 'PMMA thin fabric should be flammable under ISS forced ventilation');
      assert.equal(activeHvacResult.extinctionRegime, 'flammable', 'Regime should be flammable with active 15 cm/s flow');
      assert.ok(activeHvacResult.flameSpreadVelocityMmS > 0, 'Flame spread velocity must be positive under ventilation');
      assert.ok(
        activeHvacResult.scriScore >= 40 && activeHvacResult.scriScore < 65,
        `ISS nominal SCRI score (${activeHvacResult.scriScore}) should fall in MODERATE band [40, 65)`
      );

      // 2. ISS with emergency ventilation shutdown (0.5 cm/s quiescent flow)
      const ventCutResult = engine.runSimulation({
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 0.5,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thin_fabric'
      });

      // In 0g microgravity with no buoyancy and near-zero flow, flame starves in its own combustion products (radiative quenching)
      assert.equal(
        ventCutResult.extinctionRegime,
        'quenched_radiation',
        'Cutting ventilation in 0g must induce radiative extinction (BASS finding)'
      );
      assert.ok(
        ventCutResult.flameSpreadVelocityMmS <= 0.2,
        `Flame spread under quiescent microgravity should be near zero (got ${ventCutResult.flameSpreadVelocityMmS})`
      );

      const hasQuenchNotice = ventCutResult.warnings.some(
        (w) => w.toLowerCase().includes('quench') || w.toLowerCase().includes('radiative') || w.toLowerCase().includes('starv')
      );
      assert.ok(hasQuenchNotice, 'Warnings must note radiative quenching upon ventilation shutdown');
    });

    it('4.2.3 should alert to smolder persistence hazard in charring fabrics (Cotton/SIBAL)', () => {
      const smolderResult = engine.runSimulation({
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 2.0,
        gravityG: 0.0,
        fuelType: 'Cotton',
        geometryType: 'thin_fabric'
      });

      const warningsJoined = smolderResult.warnings.join(' ').toLowerCase();
      const hasSmolderAlert = warningsJoined.includes('smolder') || warningsJoined.includes('char') || warningsJoined.includes('flameless');
      assert.ok(hasSmolderAlert, 'Cotton under low-flow 0g must trigger a smolder persistence warning');

      const recsJoined = smolderResult.recommendations.join(' ').toLowerCase();
      const hasAirflowReactivationCaution = recsJoined.includes('ventilat') || recsJoined.includes('airflow') || recsJoined.includes('draft');
      assert.ok(hasAirflowReactivationCaution, 'Recommendations must caution against restoring airflow drafts that could re-ignite char');
    });
  });

  // ==========================================================================
  // Suite 4.3: Scenario 2 — Artemis Lunar Base Habitat (LEA Hyperoxic Hazard)
  // ==========================================================================
  describe('4.3 Scenario 2: Artemis Lunar Base Habitat (34% O2 Hyperoxic Hazard)', () => {

    it('4.3.1 should verify Artemis Lunar Exploration Atmosphere (LEA) parameters', () => {
      const artemis = engine.getHabitatScenario('artemis_lunar')!;
      assert.equal(artemis.pressureKPa, 56.5, 'Artemis LEA pressure must be 56.5 kPa');
      assert.equal(artemis.pressurePsia, 8.2, 'Artemis LEA pressure must be 8.2 psia');
      assert.equal(artemis.oxygenPct, 34.0, 'Artemis LEA oxygen must be 34.0% O2');
      assert.equal(artemis.gravityG, 0.166, 'Artemis gravity must be 0.166g (lunar surface)');
      assert.equal(artemis.evaPrebreatheRequired, false, 'LEA eliminates EVA prebreathe protocols');
      assert.equal(artemis.fireHazardTier, 'CRITICAL', 'Artemis LEA must be classified as CRITICAL fire hazard');
    });

    it('4.3.2 should compute elevated SCRI and accelerated flame spread under LEA 34% O2', () => {
      const issSim = engine.runSimulation({
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thin_fabric'
      });

      const artemisSim = engine.runSimulation({
        oxygenPct: 34.0,
        pressureKPa: 56.5,
        velocityCmS: 15.0,
        gravityG: 0.166,
        fuelType: 'PMMA',
        geometryType: 'thin_fabric'
      });

      // Artemis SCRI must be elevated into CRITICAL tier
      assert.equal(artemisSim.riskTier, 'CRITICAL', 'Artemis LEA risk tier must be CRITICAL');
      assert.ok(
        artemisSim.scriScore >= 75.0,
        `Artemis LEA SCRI score (${artemisSim.scriScore}) must be >= 75.0`
      );

      // Elevated by at least 15 points over ISS
      assert.ok(
        artemisSim.scriScore - issSim.scriScore >= 15.0,
        `Artemis SCRI (${artemisSim.scriScore}) should be >= ISS (${issSim.scriScore}) + 15`
      );

      // Flame spread acceleration due to high oxidizer mole fraction
      assert.ok(
        artemisSim.flameSpreadVelocityMmS > 1.5 * issSim.flameSpreadVelocityMmS,
        `Artemis flame spread (${artemisSim.flameSpreadVelocityMmS}) should be > 1.5x ISS (${issSim.flameSpreadVelocityMmS})`
      );
    });

    it('4.3.3 should invalidate Earth 1g flammability certifications (NASA STD-6001 Test 1) at 34% O2', () => {
      // Nomex or fire-retardant material with Earth 1g LOC around 26-28%
      const issNomex = engine.runSimulation({
        oxygenPct: 21.0,
        pressureKPa: 101.3,
        velocityCmS: 15.0,
        gravityG: 0.0,
        fuelType: 'Nomex',
        geometryType: 'thin_fabric'
      });

      const artemisNomex = engine.runSimulation({
        oxygenPct: 34.0,
        pressureKPa: 56.5,
        velocityCmS: 15.0,
        gravityG: 0.166,
        fuelType: 'Nomex',
        geometryType: 'thin_fabric'
      });

      // In ISS (21% O2), Nomex does not sustain flame
      assert.equal(issNomex.isFlammable, false, 'Nomex must NOT be flammable in ISS 21% O2');

      // In Artemis LEA (34% O2), Nomex exceeds its LOC and ignites
      assert.equal(artemisNomex.isFlammable, true, 'Nomex becomes flammable in Artemis LEA 34% O2');

      const warningsJoined = artemisNomex.warnings.join(' ').toLowerCase();
      const hasCertWarning = warningsJoined.includes('std-6001') ||
        warningsJoined.includes('earth') ||
        warningsJoined.includes('certif') ||
        warningsJoined.includes('loc') ||
        warningsJoined.includes('hyperox');
      assert.ok(hasCertWarning, 'Warnings must note invalidation of standard Earth flammability ratings in 34% O2');
    });
  });

  // ==========================================================================
  // Suite 4.4: Scenario 3 — Mars Surface Habitat Greenhouse
  // ==========================================================================
  describe('4.4 Scenario 3: Mars Surface Habitat Greenhouse (Partial Gravity Buoyancy)', () => {

    it('4.4.1 should verify Mars surface habitat environmental parameters', () => {
      const mars = engine.getHabitatScenario('mars_habitat')!;
      assert.equal(mars.pressureKPa, 65.0, 'Mars pressure must be 65.0 kPa');
      assert.equal(mars.pressurePsia, 9.4, 'Mars pressure must be 9.4 psia');
      assert.equal(mars.oxygenPct, 28.0, 'Mars oxygen must be 28.0% O2');
      assert.equal(mars.gravityG, 0.38, 'Mars gravity must be 0.38g');
      assert.equal(mars.fireHazardTier, 'HIGH', 'Mars surface habitat hazard tier must be HIGH');
    });

    it('4.4.2 should model partial gravity upward buoyant plume dynamics', () => {
      const marsSim = engine.runSimulation({
        oxygenPct: 28.0,
        pressureKPa: 65.0,
        velocityCmS: 10.0,
        gravityG: 0.38,
        fuelType: 'PMMA',
        geometryType: 'thick_slab'
      });

      assert.equal(marsSim.riskTier, 'HIGH', 'Mars habitat with 28% O2 should evaluate to HIGH risk');
      assert.ok(marsSim.subScores.atmospheric >= 45, 'Atmospheric subscore must reflect partial gravity buoyancy');
      assert.ok(marsSim.flameSpreadVelocityMmS > 0, 'Flame spread must be positive under Mars partial gravity');
    });

    it('4.4.3 should evaluate greenhouse biomass combustible loading and particulate hazards', () => {
      const biomassSim = engine.runSimulation({
        oxygenPct: 28.0,
        pressureKPa: 65.0,
        velocityCmS: 10.0,
        gravityG: 0.38,
        fuelType: 'Cotton', // plant biomass surrogate
        geometryType: 'thin_fabric'
      });

      assert.ok(
        biomassSim.subScores.toxicity >= 40,
        `Greenhouse biomass toxicity subscore (${biomassSim.subScores.toxicity}) should be >= 40`
      );

      const recsJoined = biomassSim.recommendations.join(' ').toLowerCase();
      const hasParticulateNotice = recsJoined.includes('particul') ||
        recsJoined.includes('smoke') ||
        recsJoined.includes('sensor') ||
        recsJoined.includes('filter') ||
        recsJoined.includes('aerosol');
      assert.ok(hasParticulateNotice, 'Greenhouse biomass recommendations must address smoke/particulate management');
    });
  });

  // ==========================================================================
  // Suite 4.5: Scenario 4 — Pressurized Lunar/Mars Rover Confined Flashover
  // ==========================================================================
  describe('4.5 Scenario 4: Pressurized Rover Confined Space Flashover Hazard', () => {

    it('4.5.1 should verify rover cabin operational constraints', () => {
      const rover = engine.getHabitatScenario('rover')!;
      assert.equal(rover.pressureKPa, 55.0, 'Rover pressure must be 55.0 kPa');
      assert.equal(rover.pressurePsia, 8.0, 'Rover pressure must be 8.0 psia');
      assert.equal(rover.oxygenPct, 32.0, 'Rover oxygen must be 32.0% O2');
      assert.equal(rover.gravityG, 0.166, 'Rover lunar/martian surface gravity');
      assert.equal(rover.fireHazardTier, 'CRITICAL', 'Confined rover cabin must be CRITICAL hazard tier');
    });

    it('4.5.2 should issue flashover warning and urgent crew suit donning protocol for confined volume', () => {
      const roverSim = engine.runSimulation({
        oxygenPct: 32.0,
        pressureKPa: 55.0,
        velocityCmS: 8.0,
        gravityG: 0.166,
        fuelType: 'Polyethylene',
        geometryType: 'thin_fabric'
      });

      assert.equal(roverSim.riskTier, 'CRITICAL', 'Rover confined fire must evaluate to CRITICAL risk');

      const warningsJoined = roverSim.warnings.join(' ').toLowerCase();
      const hasConfinedWarning = warningsJoined.includes('confined') ||
        warningsJoined.includes('flashover') ||
        warningsJoined.includes('volume') ||
        warningsJoined.includes('thermal runaway') ||
        warningsJoined.includes('rapid');
      assert.ok(hasConfinedWarning, 'Warnings must alert to confined volume flashover or smoke saturation');

      const recsJoined = roverSim.recommendations.join(' ').toLowerCase();
      const hasSuitDonningAlert = recsJoined.includes('suit') ||
        recsJoined.includes('mask') ||
        recsJoined.includes('eva') ||
        recsJoined.includes('breathing') ||
        recsJoined.includes('depressur');
      assert.ok(hasSuitDonningAlert, 'Rover recommendations must mandate emergency suit donning or cabin depressurization');
    });
  });

  // ==========================================================================
  // Suite 4.6: Scenario 5 — Terrestrial Industrial & Mine Safety Spin-offs
  // ==========================================================================
  describe('4.6 Scenario 5: Terrestrial Mine & Industrial Spin-offs (Feature F17)', () => {

    it('4.6.1 should verify terrestrial baseline 1g environmental parameters', () => {
      const terrestrial = engine.getHabitatScenario('terrestrial')!;
      assert.equal(terrestrial.pressureKPa, 101.3, 'Terrestrial baseline pressure must be 101.3 kPa');
      assert.equal(terrestrial.pressurePsia, 14.7, 'Terrestrial baseline pressure must be 14.7 psia');
      assert.equal(terrestrial.oxygenPct, 20.9, 'Terrestrial baseline oxygen must be 20.9% O2');
      assert.equal(terrestrial.gravityG, 1.0, 'Terrestrial gravity must be 1.0g');
    });

    it('4.6.2 should deliver actionable spin-off intel for coal mining (SAME dual-wavelength detection)', () => {
      const spinOffs = engine.getTerrestrialSpinOffs();
      assert.ok(Array.isArray(spinOffs) && spinOffs.length >= 3, 'Must provide at least 3 terrestrial spin-off insights');

      const mineSpinOff = spinOffs.find(
        (s) => s.domain?.toLowerCase().includes('mine') || s.title?.toLowerCase().includes('mine')
      );
      assert.ok(mineSpinOff, 'Must include a dedicated coal mine / underground industrial spin-off insight');

      const mineText = (mineSpinOff.description + ' ' + (mineSpinOff.nasaPrecedent || '')).toLowerCase();
      const hasDualWavelengthOrSame = mineText.includes('same') ||
        mineText.includes('wavelength') ||
        mineText.includes('dust') ||
        mineText.includes('smoke') ||
        mineText.includes('aerosol');
      assert.ok(hasDualWavelengthOrSame, 'Mine safety insight must reference dual-wavelength aerosol detection (SAME)');
    });

    it('4.6.3 should deliver actionable spin-off intel for aviation/submarines (Halon 1301 replacements)', () => {
      const spinOffs = engine.getTerrestrialSpinOffs();
      const cleanAgentSpinOff = spinOffs.find(
        (s) => s.domain?.toLowerCase().includes('halon') ||
          s.domain?.toLowerCase().includes('aviation') ||
          s.domain?.toLowerCase().includes('submarine') ||
          s.title?.toLowerCase().includes('halon') ||
          s.title?.toLowerCase().includes('mist')
      );
      assert.ok(cleanAgentSpinOff, 'Must include clean agent / water-mist Halon replacement spin-off');

      const text = (cleanAgentSpinOff.description + ' ' + cleanAgentSpinOff.title).toLowerCase();
      const mentionsSuppression = text.includes('halon') || text.includes('mist') || text.includes('purge') || text.includes('clean agent');
      assert.ok(mentionsSuppression, 'Spin-off must detail clean agent or fine water-mist suppression');
    });
  });

  // ==========================================================================
  // Suite 4.7: Autonomous Suppression Protocol & Recommender Validation
  // ==========================================================================
  describe('4.7 Autonomous Suppression Protocols & Actionable Recommender (F10)', () => {

    it('4.7.1 should generate non-empty, actionable recommendation strings for all simulation inputs', () => {
      const input: SimulationInput = {
        oxygenPct: 25.0,
        pressureKPa: 80.0,
        velocityCmS: 5.0,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thin_fabric'
      };

      const recs = engine.generateRecommendations(input);
      assert.ok(Array.isArray(recs), 'generateRecommendations must return an array');
      assert.ok(recs.length >= 2, 'Must generate at least 2 actionable recommendations');

      for (const rec of recs) {
        assert.equal(typeof rec, 'string', 'Recommendation item must be a string');
        assert.ok(rec.trim().length > 10, 'Recommendation must be a substantive sentence');
      }
    });

    it('4.7.2 should PROHIBIT dry chemical powder suppression in microgravity (0g ISS)', () => {
      const issProtocol = engine.getSuppressionProtocol('iss');
      assert.ok(Array.isArray(issProtocol) && issProtocol.length > 0, 'ISS suppression protocol must be non-empty');

      // In microgravity (0g ISS), dry powders create suspended particulate clouds that clog life-support HEPA filters
      // and cause acute astronaut respiratory distress. Gaseous CO2 or fine water mist must be specified.
      // Prohibited agents: dry chemical, dry powder, ABC powder/chemical, Purple-K, monoammonium phosphate, sodium/potassium bicarbonate.
      const HAZARDOUS_AGENT_REGEX = /\b(dry\s*(?:chemical|powder)|abc\s*(?:powder|dry\s*chemical)|purple[- ]?k|monoammonium\s*phosphate|sodium\s*bicarbonate|potassium\s*bicarbonate|bicarbonate\s*powder)\b/i;
      const PROHIBITION_BEFORE_REGEX = /\b(prohibit(?:ed|ion)?|forbid(?:den)?|never(?:\s+use|\s+deploy|\s+discharge|\s+apply)?|do\s+not(?:\s+use|\s+deploy|\s+discharge|\s+apply)?|don't(?:\s+use|\s+deploy|\s+discharge)?|avoid(?:\s+use|\s+using)?|contraindicated|strictly\s+prohibited)\b[^.!?\n]{0,60}\b(dry\s*(?:chemical|powder)|abc\s*(?:powder|dry\s*chemical)|purple[- ]?k|monoammonium\s*phosphate|sodium\s*bicarbonate|potassium\s*bicarbonate|bicarbonate\s*powder)\b/i;
      const PROHIBITION_AFTER_REGEX = /\b(dry\s*(?:chemical|powder)|abc\s*(?:powder|dry\s*chemical)|purple[- ]?k|monoammonium\s*phosphate|sodium\s*bicarbonate|potassium\s*bicarbonate|bicarbonate\s*powder)\b[^.!?\n]{0,60}\b(?:is|are)?\s*(?:strictly\s+)?(prohibited|forbidden|contraindicated|banned|unsafe|not\s+permitted|not\s+recommended|unacceptable)\b/i;

      // Detect active recommendations of hazardous powder agents while safely allowing explanatory prohibition warnings
      const hasHazardousPowderRecommendation = issProtocol.some((protocolItem) => {
        const sentences = protocolItem.split(/[.!?\n]+/).map((s) => s.trim()).filter(Boolean);
        return sentences.some((sentence) => {
          if (!HAZARDOUS_AGENT_REGEX.test(sentence)) return false;
          const isProhibitionContext = PROHIBITION_BEFORE_REGEX.test(sentence) || PROHIBITION_AFTER_REGEX.test(sentence);
          return !isProhibitionContext;
        });
      });

      assert.ok(
        !hasHazardousPowderRecommendation,
        'Dry chemical powder / particulate extinguishing agents (dry chemical, dry powder, Purple-K, monoammonium phosphate, bicarbonate) MUST be strictly prohibited in 0g microgravity'
      );

      const joined = issProtocol.join(' ').toLowerCase();
      const hasApprovedAgent = joined.includes('co2') || joined.includes('water mist') || joined.includes('nitrogen') || joined.includes('inert');
      assert.ok(hasApprovedAgent, '0g suppression protocol must recommend gaseous CO2, fine water mist, or inert purge');
    });

    it('4.7.3 should mandate gaseous N2 purge or FK-5-1-12 clean agent for Artemis LEA hyperoxic atmosphere', () => {
      const artemisProtocol = engine.getSuppressionProtocol('artemis_lunar');
      assert.ok(Array.isArray(artemisProtocol) && artemisProtocol.length > 0, 'Artemis suppression protocol must be non-empty');

      const joined = artemisProtocol.join(' ').toLowerCase();
      const hasHyperoxicMitigation = joined.includes('nitrogen') ||
        joined.includes('fk-5-1-12') ||
        joined.includes('purge') ||
        joined.includes('inert') ||
        joined.includes('hypox');
      assert.ok(hasHyperoxicMitigation, 'Artemis LEA suppression must recommend nitrogen dilution or clean agent flooding');
    });

    it('4.7.4 should recommend automated total flooding and emergency depressurization for rovers', () => {
      const roverProtocol = engine.getSuppressionProtocol('rover');
      assert.ok(Array.isArray(roverProtocol) && roverProtocol.length > 0, 'Rover suppression protocol must be non-empty');

      const joined = roverProtocol.join(' ').toLowerCase();
      const hasAutomatedAction = joined.includes('auto') ||
        joined.includes('flooding') ||
        joined.includes('depressur') ||
        joined.includes('clean agent');
      assert.ok(hasAutomatedAction, 'Rover protocol must recommend automated flooding or rapid depressurization');
    });
  });
});
