import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';

import { 
  parseXlsxFile 
} from '../src/pipeline/xlsx_parser.ts';

import { 
  PSI_CATALOG, 
  getPsiMetadata, 
  isCombustionInvestigation, 
  getInvestigationsByCategory, 
  getInvestigationsByFacility 
} from '../src/pipeline/psi_catalog.ts';

import { 
  normalizeRawPsiRecord, 
  normalizePsiDataset, 
  filterActiveRows 
} from '../src/pipeline/normalizer.ts';

import type { 
  RawPsiRecord, 
  EnrichedPsiInvestigation,
  InvestigationCategory,
  GravityEnvironment
} from '../src/types/index.ts';

const V1_PATH = path.resolve(process.cwd(), 'NASA_DATASET.xlsx');
const V2_PATH = path.resolve(process.cwd(), 'NASA_DATASET_ANALYZED_V2.xlsx');

const VALID_CATEGORIES: InvestigationCategory[] = [
  'Solid Surface',
  'Gaseous Flame',
  'Droplet / Mist',
  'Smoke Aerosol',
  'Fluid Physics',
  'Materials Science'
];

const VALID_GRAVITY: GravityEnvironment[] = [
  'microgravity',
  'lunar',
  'martian',
  'terrestrial_1g'
];

function assertValidEnrichedRecord(record: EnrichedPsiInvestigation, contextMsg = '') {
  const prefix = contextMsg ? `[${contextMsg}] ` : '';

  // Type & non-emptiness invariants
  assert.equal(typeof record.id, 'string', `${prefix}id must be string`);
  assert.ok(record.id.trim().length > 0, `${prefix}id must not be empty`);

  assert.equal(typeof record.code, 'number', `${prefix}code must be number`);
  assert.ok(!Number.isNaN(record.code), `${prefix}code must not be NaN`);
  assert.ok(Number.isInteger(record.code), `${prefix}code must be integer`);
  assert.ok(record.code >= 0, `${prefix}code must be >= 0`);

  assert.equal(typeof record.name, 'string', `${prefix}name must be string`);
  assert.ok(record.name.trim().length > 0, `${prefix}name must not be empty`);

  assert.equal(typeof record.fullName, 'string', `${prefix}fullName must be string`);
  assert.ok(record.fullName.trim().length > 0, `${prefix}fullName must not be empty`);

  assert.equal(typeof record.url, 'string', `${prefix}url must be string`);
  assert.ok(record.url.startsWith('http'), `${prefix}url must start with http`);

  assert.ok(VALID_CATEGORIES.includes(record.category), `${prefix}category must be one of union types, got: ${record.category}`);
  assert.equal(typeof record.isCombustion, 'boolean', `${prefix}isCombustion must be boolean`);

  assert.equal(typeof record.facility, 'string', `${prefix}facility must be string`);
  assert.ok(record.facility.trim().length > 0, `${prefix}facility must not be empty`);

  assert.ok(Array.isArray(record.fuelTypes), `${prefix}fuelTypes must be array`);
  assert.ok(record.fuelTypes.length > 0, `${prefix}fuelTypes must not be empty array`);
  for (const f of record.fuelTypes) {
    assert.equal(typeof f, 'string', `${prefix}each fuelType must be string`);
    assert.ok(f.trim().length > 0, `${prefix}fuelType entry must not be empty`);
  }

  assert.equal(typeof record.sampleGeometry, 'string', `${prefix}sampleGeometry must be string`);
  assert.ok(record.sampleGeometry.trim().length > 0, `${prefix}sampleGeometry must not be empty`);

  // Oxygen range [min, max]
  assert.ok(Array.isArray(record.oxygenRangePct), `${prefix}oxygenRangePct must be array`);
  assert.equal(record.oxygenRangePct.length, 2, `${prefix}oxygenRangePct must have length 2`);
  assert.ok(record.oxygenRangePct[0] <= record.oxygenRangePct[1], `${prefix}O2 min <= max`);
  assert.ok(record.oxygenRangePct[0] >= 0, `${prefix}O2 min >= 0`);
  assert.ok(record.oxygenRangePct[1] <= 100, `${prefix}O2 max <= 100`);

  // Pressure range [min, max]
  assert.ok(Array.isArray(record.pressureRangeKPa), `${prefix}pressureRangeKPa must be array`);
  assert.equal(record.pressureRangeKPa.length, 2, `${prefix}pressureRangeKPa must have length 2`);
  assert.ok(record.pressureRangeKPa[0] <= record.pressureRangeKPa[1], `${prefix}P min <= max`);
  assert.ok(record.pressureRangeKPa[0] > 0, `${prefix}P min > 0`);
  assert.ok(record.pressureRangeKPa[1] <= 150, `${prefix}P max <= 150`);

  // Flow velocity range [min, max]
  assert.ok(Array.isArray(record.flowVelocityRangeCmS), `${prefix}flowVelocityRangeCmS must be array`);
  assert.equal(record.flowVelocityRangeCmS.length, 2, `${prefix}flowVelocityRangeCmS must have length 2`);
  assert.ok(record.flowVelocityRangeCmS[0] <= record.flowVelocityRangeCmS[1], `${prefix}u min <= max`);
  assert.ok(record.flowVelocityRangeCmS[0] >= 0, `${prefix}u min >= 0`);

  // Gravity environments
  assert.ok(Array.isArray(record.gravityEnvironments), `${prefix}gravityEnvironments must be array`);
  assert.ok(record.gravityEnvironments.length > 0, `${prefix}gravityEnvironments must not be empty`);
  for (const g of record.gravityEnvironments) {
    assert.ok(VALID_GRAVITY.includes(g), `${prefix}gravity environment must be valid, got: ${g}`);
  }

  // Text descriptions
  assert.equal(typeof record.flammabilityFindings, 'string', `${prefix}flammabilityFindings must be string`);
  assert.ok(record.flammabilityFindings.trim().length > 0, `${prefix}flammabilityFindings must not be empty`);

  assert.equal(typeof record.fireSafetyRelevance, 'string', `${prefix}fireSafetyRelevance must be string`);
  assert.ok(record.fireSafetyRelevance.trim().length > 0, `${prefix}fireSafetyRelevance must not be empty`);

  assert.equal(typeof record.terrestrialSpinOffs, 'string', `${prefix}terrestrialSpinOffs must be string`);
  assert.ok(record.terrestrialSpinOffs.trim().length > 0, `${prefix}terrestrialSpinOffs must not be empty`);

  assert.equal(typeof record.missingOpportunitiesAnalysis, 'string', `${prefix}missingOpportunitiesAnalysis must be string`);
  assert.ok(record.missingOpportunitiesAnalysis.trim().length >= 20, `${prefix}missingOpportunitiesAnalysis must be >= 20 chars`);
}

describe('Challenger M2.2 Adversarial Verification Suite', () => {

  // =========================================================================
  // Challenge 1: Fuzzy & Malformed Inputs to normalizeRawPsiRecord
  // =========================================================================
  describe('Challenge 1: Fuzzy & Malformed Inputs to normalizeRawPsiRecord', () => {
    it('1.1 should handle empty object without crashing and return valid fallback invariants', () => {
      const record = {} as RawPsiRecord;
      const enriched = normalizeRawPsiRecord(record);
      assertValidEnrichedRecord(enriched, 'Empty Object');
      assert.equal(enriched.id, 'PSI-0');
      assert.equal(enriched.code, 0);
    });

    it('1.2 should handle object with undefined or null-ish fields', () => {
      const record = {
        rowNumber: 0,
        dataName: undefined,
        dataLink: undefined,
        dataMainPurpose: undefined,
        dataMissingOpportunities: undefined
      } as unknown as RawPsiRecord;

      const enriched = normalizeRawPsiRecord(record);
      assertValidEnrichedRecord(enriched, 'Undefined Fields');
      assert.equal(enriched.id, 'PSI-0');
    });

    it('1.3 should handle whitespace-only fields', () => {
      const record: RawPsiRecord = {
        rowNumber: 1,
        dataName: '  \t\r\n  ',
        dataLink: '   ',
        dataMainPurpose: ' \n ',
        dataMissingOpportunities: ' \t '
      };
      const enriched = normalizeRawPsiRecord(record);
      assertValidEnrichedRecord(enriched, 'Whitespace Only');
      assert.equal(enriched.id, 'PSI-0');
    });

    it('1.4 should handle uncataloged numeric ID like PSI-9999', () => {
      const record: RawPsiRecord = {
        rowNumber: 99,
        dataName: 'NASA PSI: PSI-9999 (Synthetic Out-of-Catalog)',
        dataLink: '',
        dataMainPurpose: 'Synthetic test',
        dataMissingOpportunities: ''
      };
      const enriched = normalizeRawPsiRecord(record);
      assertValidEnrichedRecord(enriched, 'PSI-9999');
      assert.equal(enriched.id, 'PSI-9999');
      assert.equal(enriched.code, 9999);
      assert.equal(enriched.url, 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-9999');
    });

    it('1.5 should handle non-numeric investigation IDs', () => {
      const cases = [
        'NASA PSI: NonNumericInvestigation',
        'PSI-ABC',
        'NASA PSI: SPECIAL-EXPERIMENT-ALPHA',
        'Random Raw String without prefix'
      ];

      for (const name of cases) {
        const record: RawPsiRecord = {
          rowNumber: 10,
          dataName: name,
          dataLink: '',
          dataMainPurpose: '',
          dataMissingOpportunities: ''
        };
        const enriched = normalizeRawPsiRecord(record);
        assertValidEnrichedRecord(enriched, `Non-numeric: ${name}`);
        assert.equal(enriched.code, 0);
        assert.ok(enriched.name.length > 0);
        assert.ok(enriched.fullName.length > 0);
      }
    });

    it('1.6 should handle case-insensitive matching for catalog entries (e.g. psi-47)', () => {
      const record: RawPsiRecord = {
        rowNumber: 2,
        dataName: 'nasa psi: psi-47 (bass-ii in lowercase)',
        dataLink: '',
        dataMainPurpose: '',
        dataMissingOpportunities: ''
      };
      const enriched = normalizeRawPsiRecord(record);
      assertValidEnrichedRecord(enriched, 'Case-insensitive PSI-47');
      assert.equal(enriched.id, 'PSI-47');
      assert.equal(enriched.code, 47);
      assert.equal(enriched.name, 'BASS-II');
    });

    it('1.7 should handle missingOpportunities boundary (len < 20 vs len >= 20)', () => {
      // 19 chars -> fallback to catalog
      const record19: RawPsiRecord = {
        rowNumber: 2,
        dataName: 'NASA PSI: PSI-47',
        dataLink: '',
        dataMainPurpose: '',
        dataMissingOpportunities: '1234567890123456789' // 19 chars
      };
      const enriched19 = normalizeRawPsiRecord(record19);
      assert.equal(enriched19.missingOpportunitiesAnalysis, PSI_CATALOG['PSI-47'].missingOpportunitiesAnalysis);

      // 20 chars -> use raw text
      const raw20 = '12345678901234567890';
      const record20: RawPsiRecord = {
        rowNumber: 2,
        dataName: 'NASA PSI: PSI-47',
        dataLink: '',
        dataMainPurpose: '',
        dataMissingOpportunities: raw20
      };
      const enriched20 = normalizeRawPsiRecord(record20);
      assert.equal(enriched20.missingOpportunitiesAnalysis, raw20);
    });

    it('1.8 should prevent catalog prototype pollution or reference leakage', () => {
      const record: RawPsiRecord = {
        rowNumber: 2,
        dataName: 'NASA PSI: PSI-47',
        dataLink: 'https://psi.nasa.gov/test',
        dataMainPurpose: 'test',
        dataMissingOpportunities: 'test opportunity with more than twenty characters here'
      };

      const enriched = normalizeRawPsiRecord(record);
      // Mutate enriched arrays
      enriched.fuelTypes.push('POLLUTION_ATTEMPT');
      enriched.oxygenRangePct[0] = -999;
      enriched.gravityEnvironments.push('martian');

      // Verify PSI_CATALOG was NOT modified
      assert.ok(!PSI_CATALOG['PSI-47'].fuelTypes.includes('POLLUTION_ATTEMPT'), 'fuelTypes must be deep copied');
      assert.notEqual(PSI_CATALOG['PSI-47'].oxygenRangePct[0], -999, 'oxygenRangePct must be deep copied');
      assert.ok(!PSI_CATALOG['PSI-47'].gravityEnvironments.includes('martian'), 'gravityEnvironments must be deep copied');
    });
  });

  // =========================================================================
  // Challenge 2: Cross-Dataset Parity (NASA_DATASET.xlsx vs ANALYZED_V2.xlsx)
  // =========================================================================
  describe('Challenge 2: Cross-Dataset Parity', () => {
    it('2.1 should assert 1-to-1 match on all 26 investigations (IDs, categories, isCombustion status, URL links)', async () => {
      const rawV1 = await parseXlsxFile(V1_PATH);
      const rawV2 = await parseXlsxFile(V2_PATH);

      assert.equal(rawV1.length, 26, 'V1 active rows count must be 26');
      assert.equal(rawV2.length, 26, 'V2 active rows count must be 26');

      const normV1 = normalizePsiDataset(rawV1);
      const normV2 = normalizePsiDataset(rawV2);

      assert.equal(normV1.length, 26, 'Normalized V1 length must be 26');
      assert.equal(normV2.length, 26, 'Normalized V2 length must be 26');

      for (let i = 0; i < 26; i++) {
        const itemV1 = normV1[i];
        const itemV2 = normV2[i];

        // 1-to-1 ID match
        assert.equal(itemV1.id, itemV2.id, `Mismatch in investigation ID at index ${i}`);
        assert.equal(itemV1.code, itemV2.code, `Mismatch in investigation code at index ${i}`);

        // 1-to-1 Category match
        assert.equal(itemV1.category, itemV2.category, `Mismatch in category at index ${i} (${itemV1.id})`);

        // 1-to-1 isCombustion status match
        assert.equal(itemV1.isCombustion, itemV2.isCombustion, `Mismatch in isCombustion at index ${i} (${itemV1.id})`);

        // 1-to-1 URL link match
        assert.equal(itemV1.url, itemV2.url, `Mismatch in URL link at index ${i} (${itemV1.id}): ${itemV1.url} vs ${itemV2.url}`);

        // Facility match
        assert.equal(itemV1.facility, itemV2.facility, `Mismatch in facility at index ${i} (${itemV1.id})`);
      }
    });

    it('2.2 should verify V1 falls back to catalog missing opportunities while V2 provides rich analyzed opportunities', async () => {
      const rawV1 = await parseXlsxFile(V1_PATH);
      const rawV2 = await parseXlsxFile(V2_PATH);

      const normV1 = normalizePsiDataset(rawV1);
      const normV2 = normalizePsiDataset(rawV2);

      for (let i = 0; i < 26; i++) {
        // In V1, column E was blank, so normV1[i].missingOpportunitiesAnalysis must equal PSI_CATALOG entry
        const catalogEntry = PSI_CATALOG[normV1[i].id];
        assert.equal(normV1[i].missingOpportunitiesAnalysis, catalogEntry.missingOpportunitiesAnalysis);

        // In V2, column E was pre-populated, must be >= 20 characters
        assert.ok(normV2[i].missingOpportunitiesAnalysis.length >= 20);
      }
    });
  });

  // =========================================================================
  // Challenge 3: Physical Sanity Invariants
  // =========================================================================
  describe('Challenge 3: Physical Sanity Invariants', () => {
    it('3.1 should assert P_min <= P_max and 0 < P <= 150 kPa for all 26 investigations', async () => {
      const records = normalizePsiDataset(await parseXlsxFile(V1_PATH));
      assert.equal(records.length, 26);

      for (const rec of records) {
        const [pMin, pMax] = rec.pressureRangeKPa;
        assert.ok(pMin <= pMax, `${rec.id}: pressure min (${pMin}) must be <= max (${pMax})`);
        assert.ok(pMin > 0, `${rec.id}: pressure min (${pMin}) must be > 0 kPa`);
        assert.ok(pMax <= 150, `${rec.id}: pressure max (${pMax}) must be <= 150 kPa`);
      }
    });

    it('3.2 should assert u_min <= u_max and u >= 0 cm/s for all 26 investigations', async () => {
      const records = normalizePsiDataset(await parseXlsxFile(V1_PATH));
      assert.equal(records.length, 26);

      for (const rec of records) {
        const [uMin, uMax] = rec.flowVelocityRangeCmS;
        assert.ok(uMin <= uMax, `${rec.id}: flow velocity min (${uMin}) must be <= max (${uMax})`);
        assert.ok(uMin >= 0, `${rec.id}: flow velocity min (${uMin}) must be >= 0 cm/s`);
      }
    });

    it('3.3 should assert non-empty fuel types, sample geometries, and gravity environments for all 26 investigations', async () => {
      const records = normalizePsiDataset(await parseXlsxFile(V1_PATH));
      assert.equal(records.length, 26);

      for (const rec of records) {
        // Fuel types non-empty
        assert.ok(Array.isArray(rec.fuelTypes), `${rec.id}: fuelTypes must be an array`);
        assert.ok(rec.fuelTypes.length > 0, `${rec.id}: fuelTypes must not be empty`);
        for (const fuel of rec.fuelTypes) {
          assert.ok(fuel.trim().length > 0, `${rec.id}: fuel type name must not be blank`);
        }

        // Sample geometry non-empty
        assert.ok(typeof rec.sampleGeometry === 'string', `${rec.id}: sampleGeometry must be string`);
        assert.ok(rec.sampleGeometry.trim().length > 0, `${rec.id}: sampleGeometry must not be empty`);

        // Gravity environments non-empty
        assert.ok(Array.isArray(rec.gravityEnvironments), `${rec.id}: gravityEnvironments must be array`);
        assert.ok(rec.gravityEnvironments.length > 0, `${rec.id}: gravityEnvironments must not be empty`);
        for (const grav of rec.gravityEnvironments) {
          assert.ok(VALID_GRAVITY.includes(grav), `${rec.id}: gravity ${grav} must be valid`);
        }
      }
    });

    it('3.4 should assess O2 range bounds: O2_min <= O2_max and identify any deviations from 15% <= O2 <= 100%', async () => {
      const records = normalizePsiDataset(await parseXlsxFile(V1_PATH));
      assert.equal(records.length, 26);

      const deviations: { id: string; isCombustion: boolean; o2Range: [number, number]; reason: string }[] = [];

      for (const rec of records) {
        const [o2Min, o2Max] = rec.oxygenRangePct;
        
        // Universal monotonic invariant: min <= max, max <= 100, min >= 0
        assert.ok(o2Min <= o2Max, `${rec.id}: O2 min (${o2Min}) must be <= max (${o2Max})`);
        assert.ok(o2Min >= 0, `${rec.id}: O2 min (${o2Min}) must be >= 0%`);
        assert.ok(o2Max <= 100, `${rec.id}: O2 max (${o2Max}) must be <= 100%`);

        // Evaluate empirical flammability bounds: 15% <= O2 <= 100%
        if (o2Min < 15 || o2Max > 100) {
          deviations.push({
            id: rec.id,
            isCombustion: rec.isCombustion,
            o2Range: [o2Min, o2Max],
            reason: !rec.isCombustion
              ? 'Non-combustion study operating in inert/diluent gas regime (O2 < 15%)'
              : 'Combustion study probing limiting oxygen concentration (LOC) boundary at 14%'
          });
        }
      }

      // Exactly 3 investigations deviate from the 15% lower bound:
      // PSI-22 (FLEX-2 combustion, [14, 35]): LOC droplet burning threshold
      // PSI-106 (Flame Design non-combustion, [0, 10]): inert CO2-N2 background radiation
      // PSI-181 (SoFIE-MIST non-combustion, [0, 5]): inert vacuum/nitrogen thermal pyrolysis
      assert.equal(deviations.length, 3, `Expected exactly 3 physical domain deviations, got ${deviations.length}`);
      
      const flex2 = deviations.find(d => d.id === 'PSI-22');
      assert.ok(flex2, 'PSI-22 must be identified in deviation registry');
      assert.deepEqual(flex2.o2Range, [14, 35]);
      assert.equal(flex2.isCombustion, true);

      const fd106 = deviations.find(d => d.id === 'PSI-106');
      assert.ok(fd106, 'PSI-106 must be identified in deviation registry');
      assert.deepEqual(fd106.o2Range, [0, 10]);
      assert.equal(fd106.isCombustion, false);

      const sofie181 = deviations.find(d => d.id === 'PSI-181');
      assert.ok(sofie181, 'PSI-181 must be identified in deviation registry');
      assert.deepEqual(sofie181.o2Range, [0, 5]);
      assert.equal(sofie181.isCombustion, false);

      // Verify that all other 23 investigations strictly satisfy 15% <= O2 <= 100%
      const remaining = records.filter(r => !['PSI-22', 'PSI-106', 'PSI-181'].includes(r.id));
      for (const rec of remaining) {
        assert.ok(rec.oxygenRangePct[0] >= 15, `${rec.id} O2_min (${rec.oxygenRangePct[0]}) must be >= 15%`);
        assert.ok(rec.oxygenRangePct[1] <= 100, `${rec.id} O2_max (${rec.oxygenRangePct[1]}) must be <= 100%`);
      }
    });

    it('3.5 should verify physical sanity for all 22 combustion investigations under relaxed LOC bound (14% <= O2 <= 100%)', async () => {
      const records = normalizePsiDataset(await parseXlsxFile(V1_PATH));
      const combustionRecords = records.filter(r => r.isCombustion);
      assert.equal(combustionRecords.length, 22);

      for (const rec of combustionRecords) {
        const [o2Min, o2Max] = rec.oxygenRangePct;
        assert.ok(o2Min >= 14, `${rec.id}: combustion O2 min must be >= 14% (microgravity droplet LOC)`);
        assert.ok(o2Max <= 100, `${rec.id}: combustion O2 max must be <= 100%`);
        assert.ok(o2Min <= o2Max, `${rec.id}: O2 min <= max`);
      }
    });
  });
});
