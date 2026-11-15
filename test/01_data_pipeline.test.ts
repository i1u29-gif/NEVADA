import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { crc32 } from 'node:zlib';

import { 
  parseXlsx, 
  parseXlsxFile, 
  extractZipParts, 
  parseSharedStrings, 
  parseWorksheetXml 
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

import type { RawPsiRecord, EnrichedPsiInvestigation } from '../src/types/index.ts';

const V1_PATH = path.resolve(process.cwd(), 'NASA_DATASET.xlsx');
const V2_PATH = path.resolve(process.cwd(), 'NASA_DATASET_ANALYZED_V2.xlsx');

describe('Tier 1: Data Pipeline & Schema Validation', () => {

  // =========================================================================
  // Suite 1: Native OpenXML XLSX Parser & Dual String Strategy
  // =========================================================================
  describe('Suite 1: Native OpenXML XLSX Parser & Dual String Strategy', () => {
    it('1.1 should unpack PKZIP archive from NASA_DATASET.xlsx (V1) and verify all OpenXML parts', async () => {
      const buffer = fs.readFileSync(V1_PATH);
      const parts = await extractZipParts(buffer);
      
      assert.ok(parts.has('[Content_Types].xml'), 'Missing [Content_Types].xml in V1');
      assert.ok(parts.has('xl/workbook.xml'), 'Missing xl/workbook.xml in V1');
      assert.ok(parts.has('xl/worksheets/sheet1.xml'), 'Missing sheet1.xml in V1');
      assert.ok(parts.has('xl/sharedStrings.xml'), 'Missing sharedStrings.xml in V1');
      assert.ok(parts.has('xl/worksheets/_rels/sheet1.xml.rels'), 'Missing sheet1.xml.rels in V1');
    });

    it('1.2 should unpack PKZIP archive from NASA_DATASET_ANALYZED_V2.xlsx (V2) and verify 2 worksheets', async () => {
      const buffer = fs.readFileSync(V2_PATH);
      const parts = await extractZipParts(buffer);
      
      assert.ok(parts.has('[Content_Types].xml'), 'Missing [Content_Types].xml in V2');
      assert.ok(parts.has('xl/workbook.xml'), 'Missing xl/workbook.xml in V2');
      assert.ok(parts.has('xl/worksheets/sheet1.xml'), 'Missing sheet1.xml in V2');
      assert.ok(parts.has('xl/worksheets/sheet2.xml'), 'Missing sheet2.xml in V2');
      // Crucial invariant: V2 uses inline strings (<is><t>) and has NO sharedStrings.xml
      assert.equal(parts.has('xl/sharedStrings.xml'), false, 'V2 should NOT require sharedStrings.xml');
    });

    it('1.3 should dynamically discover localized sheet name "Trang tính1" in both V1 and V2', async () => {
      for (const filePath of [V1_PATH, V2_PATH]) {
        const buffer = fs.readFileSync(filePath);
        const parts = await extractZipParts(buffer);
        const wbXml = parts.get('xl/workbook.xml')!.toString('utf8');
        assert.match(wbXml, /name="Trang tính1"/, `${filePath} should contain sheet Trang tính1`);
      }
    });

    it('1.4 should parse Shared Strings Table (SST) in V1 (57 entries) and dereference cell values', async () => {
      const buffer = fs.readFileSync(V1_PATH);
      const parts = await extractZipParts(buffer);
      const strings = parseSharedStrings(parts.get('xl/sharedStrings.xml')!.toString('utf8'));

      assert.equal(strings.length, 57);
      assert.equal(strings[0], 'NASA SPACE APP CHALLENGE');
      assert.equal(strings[5], 'NASA PSI: PSI-47');
      assert.equal(strings[6], 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-47');
    });

    it('1.5 should parse Inline Strings (<is><t>) in V2 without requiring xl/sharedStrings.xml', async () => {
      const records = await parseXlsxFile(V2_PATH);
      assert.equal(records.length, 26);
      assert.equal(records[0].dataName, 'NASA PSI: PSI-47');
      assert.equal(records[0].dataLink, 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-47');
      assert.ok(records[0].dataMainPurpose.length > 10, 'V2 inline string purpose must be extracted');
    });

    it('1.6 should extract external hyperlink relationship targets from sheet1.xml.rels in both datasets', async () => {
      for (const filePath of [V1_PATH, V2_PATH]) {
        const buffer = fs.readFileSync(filePath);
        const parts = await extractZipParts(buffer);
        const relsXml = parts.get('xl/worksheets/_rels/sheet1.xml.rels')!.toString('utf8');
        const hyperlinkCount = (relsXml.match(/Type="http:\/\/schemas\.openxmlformats\.org\/officeDocument\/2006\/relationships\/hyperlink"/g) || []).length;
        assert.equal(hyperlinkCount, 26, `${filePath} must contain exactly 26 hyperlink relationships`);
      }
    });

    it('1.7 should parse both dataset buffers in under 500ms using zero external dependencies', async () => {
      for (const filePath of [V1_PATH, V2_PATH]) {
        const buffer = fs.readFileSync(filePath);
        const start = performance.now();
        const records = await parseXlsx(buffer);
        const duration = performance.now() - start;

        assert.equal(records.length, 26);
        assert.ok(duration < 500, `${filePath} parsed in ${duration.toFixed(2)}ms (must be < 500ms)`);
      }
    });
  });

  // =========================================================================
  // Suite 2: Dataset Schema Validation & Header Extraction
  // =========================================================================
  describe('Suite 2: Dataset Schema Validation & Header Extraction', () => {
    it('2.1 should validate 5-column header schema for NASA_DATASET.xlsx (Row 1)', async () => {
      const buffer = fs.readFileSync(V1_PATH);
      const parts = await extractZipParts(buffer);
      const sst = parseSharedStrings(parts.get('xl/sharedStrings.xml')!.toString('utf8'));
      const rawRows = parseWorksheetXml(parts.get('xl/worksheets/sheet1.xml')!.toString('utf8'), sst);
      
      const headerRow = rawRows[0];
      assert.equal(headerRow['A'], 'NASA SPACE APP CHALLENGE');
      assert.equal(headerRow['B'], 'DATA_NAME');
      assert.equal(headerRow['C'], 'DATA_LINK');
      assert.equal(headerRow['D'], 'DATA_MAINPURPOSE');
      assert.equal(headerRow['E'], 'DATA_MISSING_OPPORTUNITIES');
    });

    it('2.2 should validate 7-column header schema for NASA_DATASET_ANALYZED_V2.xlsx (including DOMAIN_TAG)', async () => {
      const buffer = fs.readFileSync(V2_PATH);
      const parts = await extractZipParts(buffer);
      const rawRows = parseWorksheetXml(parts.get('xl/worksheets/sheet1.xml')!.toString('utf8'), []);
      
      const headerRow = rawRows[0];
      assert.equal(headerRow['A'], 'NASA SPACE APP CHALLENGE');
      assert.equal(headerRow['B'], 'DATA_NAME');
      assert.equal(headerRow['C'], 'DATA_LINK');
      assert.equal(headerRow['D'], 'DATA_MAINPURPOSE');
      assert.equal(headerRow['E'], 'DATA_MISSING_OPPORTUNITIES');
      assert.equal(headerRow['F'], 'DOMAIN_TAG');
      assert.equal(headerRow['G'], 'EN_TECHNICAL_KEYWORDS');
    });

    it('2.3 should extract exactly 26 active data rows from both V1 (30 XML rows) and V2 (27 XML rows)', async () => {
      const recordsV1 = await parseXlsxFile(V1_PATH);
      const recordsV2 = await parseXlsxFile(V2_PATH);

      assert.equal(recordsV1.length, 26);
      assert.equal(recordsV2.length, 26);
    });

    it('2.4 should validate typed contract of RawPsiRecord for both datasets', async () => {
      for (const filePath of [V1_PATH, V2_PATH]) {
        const records = await parseXlsxFile(filePath);
        for (const rec of records) {
          assert.equal(typeof rec.rowNumber, 'number');
          assert.ok(rec.rowNumber >= 2 && rec.rowNumber <= 27);
          assert.equal(typeof rec.dataName, 'string');
          assert.ok(rec.dataName.startsWith('NASA PSI: PSI-'));
          assert.equal(typeof rec.dataLink, 'string');
          assert.ok(rec.dataLink.startsWith('https://psi.nasa.gov/'));
          assert.equal(typeof rec.dataMainPurpose, 'string');
          assert.equal(typeof rec.dataMissingOpportunities, 'string');
        }
      }
    });

    it('2.5 should accept case-insensitive / trimmed header aliases', () => {
      const aliasWorksheetXml = `
        <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
          <sheetData>
            <row r="1">
              <c r="A1"><is><t>  nasa space app challenge  </t></is></c>
              <c r="B1"><is><t>   data_name   </t></is></c>
              <c r="C1"><is><t> data_link </t></is></c>
              <c r="D1"><is><t>  Data_Mainpurpose  </t></is></c>
              <c r="E1"><is><t> data_missing_opportunities </t></is></c>
            </row>
            <row r="2">
              <c r="A2"/>
              <c r="B2"><is><t>NASA PSI: PSI-47</t></is></c>
              <c r="C2"><is><t>https://psi.nasa.gov/physci/repo/data/investigations/PSI-47</t></is></c>
              <c r="D2"><is><t>Solid fuel combustion extinction limits</t></is></c>
              <c r="E2"><is><t>Opportunities for microgravity research</t></is></c>
            </row>
          </sheetData>
        </worksheet>`;

      const rawRows = parseWorksheetXml(aliasWorksheetXml, []);
      assert.ok(rawRows.length >= 2, 'Worksheet with aliased headers must parse without SchemaValidationError');

      const headerRow = rawRows[0];
      assert.equal(headerRow['B']?.trim().toUpperCase(), 'DATA_NAME');
      assert.equal(headerRow['C']?.trim().toUpperCase(), 'DATA_LINK');
      assert.equal(headerRow['D']?.trim().toUpperCase(), 'DATA_MAINPURPOSE');
      assert.equal(headerRow['E']?.trim().toUpperCase(), 'DATA_MISSING_OPPORTUNITIES');

      const dataRow = rawRows[1];
      assert.equal(dataRow['B'], 'NASA PSI: PSI-47');
      assert.equal(dataRow['C'], 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-47');
      assert.equal(dataRow['D'], 'Solid fuel combustion extinction limits');
      assert.equal(dataRow['E'], 'Opportunities for microgravity research');
    });

    it('2.6 should throw SchemaValidationError when mandatory column DATA_NAME or DATA_LINK is missing', () => {
      const badHeaderXml = `<row r="1"><c r="A1"><is><t>NASA</t></is></c><c r="D1"><is><t>PURPOSE</t></is></c></row>`;
      assert.throws(() => {
        parseWorksheetXml(badHeaderXml, []);
      }, /SchemaValidationError|Missing mandatory column/);
    });

    it('2.7 should verify contiguous 1-based row numbering from row 2 to row 27 in both datasets', async () => {
      for (const filePath of [V1_PATH, V2_PATH]) {
        const records = await parseXlsxFile(filePath);
        records.forEach((rec, idx) => {
          assert.equal(rec.rowNumber, idx + 2, `${filePath}: rowNumber at ${idx} must be ${idx + 2}`);
        });
      }
    });
  });

  // =========================================================================
  // Suite 3: 26 PSI Investigation Catalog Taxonomy
  // =========================================================================
  describe('Suite 3: 26 PSI Investigation Catalog Taxonomy', () => {
    it('3.1 should extract and verify the identical 26 canonical PSI IDs in both V1 and V2', async () => {
      const expectedIds = [
        'PSI-47', 'PSI-26', 'PSI-69', 'PSI-23', 'PSI-22', 'PSI-68', 'PSI-20', 'PSI-25',
        'PSI-21', 'PSI-100', 'PSI-107', 'PSI-99', 'PSI-106', 'PSI-102', 'PSI-39', 'PSI-98',
        'PSI-115', 'PSI-101', 'PSI-108', 'PSI-142', 'PSI-181', 'PSI-60', 'PSI-62', 'PSI-10',
        'PSI-159', 'PSI-117'
      ];
      const recordsV1 = await parseXlsxFile(V1_PATH);
      const recordsV2 = await parseXlsxFile(V2_PATH);

      const idsV1 = recordsV1.map(r => r.dataName.replace('NASA PSI: ', '').trim());
      const idsV2 = recordsV2.map(r => r.dataName.replace('NASA PSI: ', '').trim());

      assert.deepEqual(idsV1, expectedIds);
      assert.deepEqual(idsV2, expectedIds);
    });

    it('3.2 should verify flagship combustion program distribution', () => {
      const bass = Object.values(PSI_CATALOG).filter(p => p.name?.includes('BASS'));
      const saffire = Object.values(PSI_CATALOG).filter(p => p.name?.includes('Saffire'));
      const flex = Object.values(PSI_CATALOG).filter(p => p.name?.includes('FLEX'));
      const acme = Object.values(PSI_CATALOG).filter(p => p.name?.includes('ACME'));
      const same = Object.values(PSI_CATALOG).filter(p => p.name?.includes('SAME'));
      const spice = Object.values(PSI_CATALOG).filter(p => p.name?.includes('SPICE'));

      assert.equal(bass.length, 7);
      assert.equal(saffire.length, 3);
      assert.ok(flex.length >= 3);
      assert.equal(acme.length, 2);
      assert.equal(same.length, 3);
      assert.equal(spice.length, 2);
    });

    it('3.3 should correctly classify combustion vs non-combustion records', () => {
      const nonCombustionIds = ['PSI-39', 'PSI-106', 'PSI-108', 'PSI-181'];
      for (const id of nonCombustionIds) {
        assert.equal(isCombustionInvestigation(id), false, `${id} must be non-combustion`);
      }
      const combustionCount = Object.values(PSI_CATALOG).filter(p => p.isCombustion).length;
      const nonCombustionCount = Object.values(PSI_CATALOG).filter(p => !p.isCombustion).length;
      assert.equal(combustionCount, 22);
      assert.equal(nonCombustionCount, 4);
    });

    it('3.4 should validate exact category distribution across 6 union types', () => {
      const solid = getInvestigationsByCategory('Solid Surface');
      const gaseous = getInvestigationsByCategory('Gaseous Flame');
      const droplet = getInvestigationsByCategory('Droplet / Mist');
      const smoke = getInvestigationsByCategory('Smoke Aerosol');
      const fluid = getInvestigationsByCategory('Fluid Physics');
      const materials = getInvestigationsByCategory('Materials Science');

      assert.equal(solid.length, 11);
      assert.equal(gaseous.length, 5);
      assert.equal(droplet.length, 3);
      assert.equal(smoke.length, 3);
      assert.equal(fluid.length, 2);
      assert.equal(materials.length, 2);
    });

    it('3.5 should map experimental facilities accurately', () => {
      const msg = getInvestigationsByFacility('ISS MSG');
      const cir = getInvestigationsByFacility('ISS CIR');
      const cygnus = getInvestigationsByFacility('Cygnus');

      assert.ok(msg.length >= 8);
      assert.ok(cir.length >= 6);
      assert.equal(cygnus.length, 3);
    });

    it('3.6 should extract correct numeric code matching ID string', () => {
      assert.equal(getPsiMetadata('PSI-100')?.code, 100);
      assert.equal(getPsiMetadata('PSI-10')?.code, 10);
      assert.equal(getPsiMetadata('PSI-47')?.code, 47);
    });

    it('3.7 should verify V2 Sheet 2 Domain_Summary clusters', async () => {
      const buffer = fs.readFileSync(V2_PATH);
      const parts = await extractZipParts(buffer);
      const sheet2Xml = parts.get('xl/worksheets/sheet2.xml')!.toString('utf8');
      
      assert.match(sheet2Xml, /Gaseous Flames, Electric Field & Cool Flames/);
      assert.match(sheet2Xml, /Solid Fuel Combustion & Large\/Benchtop Fire Safety/);
      assert.match(sheet2Xml, /Capillary Fluid Physics & Soft Matter/);
      assert.match(sheet2Xml, /Liquid Droplet & Spray Combustion/);
    });
  });

  // =========================================================================
  // Suite 4: Data Pipeline Normalization & Scientific Enrichment
  // =========================================================================
  describe('Suite 4: Data Pipeline Normalization & Scientific Enrichment', () => {
    it('4.1 should normalize raw records into EnrichedPsiInvestigation with all 18 properties populated', async () => {
      const rawRecords = await parseXlsxFile(V1_PATH);
      const enriched = normalizePsiDataset(rawRecords);

      assert.equal(enriched.length, 26);
      for (const item of enriched) {
        assert.ok(item.id.startsWith('PSI-'));
        assert.ok(typeof item.code === 'number');
        assert.ok(item.name.length > 0);
        assert.ok(item.fullName.length > 0);
        assert.ok(item.url.startsWith('https://psi.nasa.gov/'));
        assert.ok(Array.isArray(item.fuelTypes));
        assert.ok(typeof item.sampleGeometry === 'string');
        assert.ok(Array.isArray(item.oxygenRangePct) && item.oxygenRangePct.length === 2);
        assert.ok(Array.isArray(item.pressureRangeKPa) && item.pressureRangeKPa.length === 2);
        assert.ok(Array.isArray(item.flowVelocityRangeCmS) && item.flowVelocityRangeCmS.length === 2);
        assert.ok(Array.isArray(item.gravityEnvironments));
        assert.ok(item.flammabilityFindings.length > 10);
        assert.ok(item.fireSafetyRelevance.length > 10);
        assert.ok(item.terrestrialSpinOffs.length > 10);
        assert.ok(item.missingOpportunitiesAnalysis.length > 10);
      }
    });

    it('4.2 should enforce physical range sanity invariants across all 26 records', async () => {
      const rawRecords = await parseXlsxFile(V1_PATH);
      const enriched = normalizePsiDataset(rawRecords);

      for (const item of enriched) {
        assert.ok(item.oxygenRangePct[0] <= item.oxygenRangePct[1]);
        assert.ok(item.pressureRangeKPa[0] <= item.pressureRangeKPa[1]);
        assert.ok(item.flowVelocityRangeCmS[0] <= item.flowVelocityRangeCmS[1]);
      }
    });

    it('4.3 should populate fuel types and sample geometry for all solid, liquid, and gaseous combustion records', async () => {
      assert.ok(getPsiMetadata('PSI-20')?.fuelTypes.includes('PMMA'));
      assert.ok(getPsiMetadata('PSI-69')?.fuelTypes.some(f => f.toLowerCase().includes('heptane')));
      assert.ok(getPsiMetadata('PSI-10')?.fuelTypes.some(f => f.toLowerCase().includes('methane') || f.toLowerCase().includes('ethylene')));
    });

    it('4.4 should tag appropriate gravity environments for each investigation', async () => {
      const rawRecords = await parseXlsxFile(V1_PATH);
      const enriched = normalizePsiDataset(rawRecords);

      for (const item of enriched) {
        assert.ok(item.gravityEnvironments.includes('microgravity'));
      }
      assert.ok(getPsiMetadata('PSI-100')?.gravityEnvironments.includes('lunar'));
    });

    it('4.5 should populate missingOpportunitiesAnalysis resolving blank columns in V1 and ingesting V2', async () => {
      const recordsV1 = normalizePsiDataset(await parseXlsxFile(V1_PATH));
      const recordsV2 = normalizePsiDataset(await parseXlsxFile(V2_PATH));

      for (let i = 0; i < 26; i++) {
        assert.ok(recordsV1[i].missingOpportunitiesAnalysis.length >= 20);
        assert.ok(recordsV2[i].missingOpportunitiesAnalysis.length >= 20);
      }
    });

    it('4.6 should ensure terrestrialSpinOffs and fireSafetyRelevance contain rich scientific insights', async () => {
      const same = getPsiMetadata('PSI-101');
      assert.match(same!.terrestrialSpinOffs, /detector|smoke|aerosol|mine|building/i);
      assert.match(same!.fireSafetyRelevance, /false alarm|dust|detection/i);
    });

    it('4.7 should verify parity of normalized records between V1 and V2 ingestion pipelines', async () => {
      const datasetV1 = normalizePsiDataset(await parseXlsxFile(V1_PATH));
      const datasetV2 = normalizePsiDataset(await parseXlsxFile(V2_PATH));

      assert.equal(datasetV1.length, datasetV2.length);
      for (let i = 0; i < 26; i++) {
        assert.equal(datasetV1[i].id, datasetV2[i].id);
        assert.equal(datasetV1[i].category, datasetV2[i].category);
        assert.equal(datasetV1[i].isCombustion, datasetV2[i].isCombustion);
      }
    });
  });

  // =========================================================================
  // Suite 5: Edge Cases, Null Handling & Dual Dataset Ingestion
  // =========================================================================
  describe('Suite 5: Edge Cases, Null Handling & Dual Dataset Ingestion', () => {
    it('5.1 should cleanly filter out trailing blank rows 28, 29, and 30 in V1 yielding exactly 26 records', async () => {
      const records = await parseXlsxFile(V1_PATH);
      assert.equal(records.length, 26);
      assert.ok(!records.some(r => !r.dataName || r.dataName.trim() === ''));
    });

    it('5.2 should tolerate empty Column A without offsetting Column B/C cell coordinate mapping', async () => {
      const records = await parseXlsxFile(V1_PATH);
      assert.equal(records[0].dataName, 'NASA PSI: PSI-47');
      assert.equal(records[0].dataLink, 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-47');
    });

    it('5.3 should handle missing or empty optional attributes gracefully using deterministic fallback values', () => {
      const bareRecord: RawPsiRecord = {
        rowNumber: 99,
        dataName: 'NASA PSI: PSI-999',
        dataLink: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-999',
        dataMainPurpose: '',
        dataMissingOpportunities: ''
      };
      const enriched = normalizeRawPsiRecord(bareRecord);
      assert.equal(enriched.id, 'PSI-999');
      assert.equal(enriched.code, 999);
      assert.equal(typeof enriched.category, 'string');
    });

    it('5.4 should trim and sanitize leading/trailing whitespace from raw strings', () => {
      const dirtyRecord: RawPsiRecord = {
        rowNumber: 2,
        dataName: '   NASA PSI: PSI-47 \r\n',
        dataLink: '  https://psi.nasa.gov/physci/repo/data/investigations/PSI-47  ',
        dataMainPurpose: '   ',
        dataMissingOpportunities: ' \t '
      };
      const normalized = normalizeRawPsiRecord(dirtyRecord);
      assert.equal(normalized.id, 'PSI-47');
      assert.equal(normalized.url, 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-47');
    });

    it('5.5 should support filtered queries: isCombustion=true returns 22, category="Solid Surface" returns 11', async () => {
      const dataset = normalizePsiDataset(await parseXlsxFile(V1_PATH));
      assert.equal(dataset.filter(d => d.isCombustion).length, 22);
      assert.equal(dataset.filter(d => !d.isCombustion).length, 4);
      assert.equal(dataset.filter(d => d.category === 'Solid Surface').length, 11);
    });

    it('5.6 should safely ignore unexpected extra columns in worksheet without crashing or corrupting data', () => {
      const extraColumnRowXml = `
        <row r="2">
          <c r="A2"/>
          <c r="B2"><is><t>NASA PSI: PSI-47</t></is></c>
          <c r="C2"><is><t>https://psi.nasa.gov/test</t></is></c>
          <c r="H2"><is><t>UNKNOWN_EXTRA_COL</t></is></c>
        </row>`;
      const parsed = parseWorksheetXml(extraColumnRowXml, []);
      assert.equal(parsed.length, 1);
      assert.equal(parsed[0]['B'], 'NASA PSI: PSI-47');
    });
  });

  // =========================================================================
  // Suite 6: Corrupt File Rejection & Fault Injection
  // =========================================================================
  /**
   * Helper to construct a valid in-memory PKZIP archive (uncompressed stored entries)
   * to test parser fault injection when specific OpenXML parts are missing.
   */
  function createZipBuffer(entries: Array<{ name: string; content: Buffer | string }>): Buffer {
    const localParts: Buffer[] = [];
    const cdParts: Buffer[] = [];
    let offset = 0;

    for (const entry of entries) {
      const nameBuf = Buffer.from(entry.name, 'utf8');
      const dataBuf = Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content, 'utf8');
      const crc = crc32(dataBuf);

      const lh = Buffer.alloc(30 + nameBuf.length);
      lh.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
      lh.writeUInt16LE(20, 4);
      lh.writeUInt16LE(0, 6);
      lh.writeUInt16LE(0, 8);          // Store
      lh.writeUInt16LE(0, 10);
      lh.writeUInt16LE(0, 12);
      lh.writeUInt32LE(crc, 14);
      lh.writeUInt32LE(dataBuf.length, 18);
      lh.writeUInt32LE(dataBuf.length, 22);
      lh.writeUInt16LE(nameBuf.length, 26);
      lh.writeUInt16LE(0, 28);
      nameBuf.copy(lh, 30);

      localParts.push(lh, dataBuf);

      const cdh = Buffer.alloc(46 + nameBuf.length);
      cdh.writeUInt32LE(0x02014b50, 0); // PK\x01\x02
      cdh.writeUInt16LE(20, 4);
      cdh.writeUInt16LE(20, 6);
      cdh.writeUInt16LE(0, 8);
      cdh.writeUInt16LE(0, 10);         // Store
      cdh.writeUInt16LE(0, 12);
      cdh.writeUInt16LE(0, 14);
      cdh.writeUInt32LE(crc, 16);
      cdh.writeUInt32LE(dataBuf.length, 20);
      cdh.writeUInt32LE(dataBuf.length, 24);
      cdh.writeUInt16LE(nameBuf.length, 28);
      cdh.writeUInt16LE(0, 30);
      cdh.writeUInt16LE(0, 32);
      cdh.writeUInt16LE(0, 34);
      cdh.writeUInt16LE(0, 36);
      cdh.writeUInt32LE(0, 38);
      cdh.writeUInt32LE(offset, 42);
      nameBuf.copy(cdh, 46);

      cdParts.push(cdh);
      offset += lh.length + dataBuf.length;
    }

    const cdOffset = offset;
    const cdBuf = Buffer.concat(cdParts);
    const cdSize = cdBuf.length;

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // PK\x05\x06
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(entries.length, 8);
    eocd.writeUInt16LE(entries.length, 10);
    eocd.writeUInt32LE(cdSize, 12);
    eocd.writeUInt32LE(cdOffset, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([...localParts, cdBuf, eocd]);
  }

  describe('Suite 6: Corrupt File Rejection & Fault Injection', () => {
    it('6.1 should reject non-existent file path with descriptive ENOENT error', async () => {
      await assert.rejects(async () => {
        await parseXlsxFile(path.resolve(process.cwd(), 'missing.xlsx'));
      }, /ENOENT|no such file/);
    });

    it('6.2 should reject zero-byte buffer with InvalidArchiveError', async () => {
      await assert.rejects(async () => {
        await parseXlsx(Buffer.alloc(0));
      }, /InvalidArchiveError|corrupt|empty|unexpected end/i);
    });

    it('6.3 should reject non-ZIP random binary buffer with MissingPkzipSignatureError', async () => {
      const randomBuf = Buffer.from('DEADBEEFCAFEBABE0123456789ABCDEF', 'hex');
      await assert.rejects(async () => {
        await parseXlsx(randomBuf);
      }, /PKZIP|signature|invalid zip|corrupt/i);
    });

    it('6.4 should reject truncated ZIP archive with ArchiveTruncationError', async () => {
      const validBuffer = fs.readFileSync(V1_PATH);
      const truncated = validBuffer.subarray(0, 200);
      await assert.rejects(async () => {
        await parseXlsx(truncated);
      }, /truncated|premature end|corrupt|decompression/i);
    });

    it('6.5 should reject ZIP missing critical OpenXML parts with MissingPartError', async () => {
      const incompleteZipBuffer = createZipBuffer([
        {
          name: '[Content_Types].xml',
          content: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'
        },
        {
          name: 'xl/worksheets/sheet1.xml',
          content: '<?xml version="1.0" encoding="UTF-8"?><worksheet><sheetData/></worksheet>'
        }
      ]);

      await assert.rejects(async () => {
        await parseXlsx(incompleteZipBuffer);
      }, /Missing mandatory OpenXML part|MissingPartError/);
    });

    it('6.6 should reject malformed XML syntax within worksheet with XmlParseError', () => {
      const malformedXml = `<worksheet><sheetData><row r="1"><c r="A1"><unclosedTag></sheetData></worksheet>`;
      assert.throws(() => {
        parseWorksheetXml(malformedXml, []);
      }, /XmlParseError|unclosed|malformed|syntax/i);
    });
  });

});
