import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import { crc32 } from 'node:zlib';

import {
  parseXlsx,
  parseXlsxFile,
  extractZipParts,
  parseSharedStrings,
  parseWorksheetXml,
  decodeXml,
  validateXmlWellFormed,
  InvalidArchiveError,
  MissingPkzipSignatureError,
  ArchiveTruncationError,
  MissingPartError,
  SchemaValidationError,
  XmlParseError
} from '../src/pipeline/xlsx_parser.ts';

const V1_PATH = path.resolve(process.cwd(), 'NASA_DATASET.xlsx');
const V2_PATH = path.resolve(process.cwd(), 'NASA_DATASET_ANALYZED_V2.xlsx');

/**
 * Low-level utility to synthesize arbitrary ZIP archives for adversarial fault injection.
 */
function synthesizeZip(
  entries: {
    name: string;
    content: Buffer;
    compressionMethod?: number; // 0 = store, 8 = deflate, or invalid e.g. 99
    corruptDeflate?: boolean;
    corruptLocalHeaderSig?: boolean;
    localHeaderOffsetOverride?: number;
    compressedSizeOverride?: number;
  }[],
  options?: {
    truncateBytes?: number;
    corruptCdSig?: boolean;
    cdOffsetOverride?: number;
    cdSizeOverride?: number;
  }
): Buffer {
  const localParts: Buffer[] = [];
  const cdParts: Buffer[] = [];
  let currentOffset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const compMethod = entry.compressionMethod ?? 0;
    let payload: Buffer;

    if (compMethod === 8) {
      if (entry.corruptDeflate) {
        // Corrupted deflate stream
        payload = Buffer.from('NOT_A_VALID_DEFLATE_STREAM_CORRUPT_BYTES');
      } else {
        payload = zlib.deflateRawSync(entry.content);
      }
    } else {
      payload = entry.content;
    }

    const uncompCrc = crc32(entry.content);
    const compSize = entry.compressedSizeOverride ?? payload.length;

    // Local file header (30 bytes + name)
    const lh = Buffer.alloc(30 + nameBuf.length);
    const lhSig = entry.corruptLocalHeaderSig ? 0xdeadbeef : 0x04034b50;
    lh.writeUInt32LE(lhSig, 0);
    lh.writeUInt16LE(20, 4);  // version needed
    lh.writeUInt16LE(0, 6);   // flags
    lh.writeUInt16LE(compMethod, 8);
    lh.writeUInt16LE(0, 10);  // time
    lh.writeUInt16LE(0, 12);  // date
    lh.writeUInt32LE(uncompCrc, 14);
    lh.writeUInt32LE(compSize, 18);
    lh.writeUInt32LE(entry.content.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);  // extra len
    nameBuf.copy(lh, 30);

    const localOffsetForCd = entry.localHeaderOffsetOverride ?? currentOffset;
    localParts.push(lh, payload);

    // Central Directory Header (46 bytes + name)
    const cdh = Buffer.alloc(46 + nameBuf.length);
    const cdSig = options?.corruptCdSig ? 0xbad0cafe : 0x02014b50;
    cdh.writeUInt32LE(cdSig, 0);
    cdh.writeUInt16LE(20, 4);
    cdh.writeUInt16LE(20, 6);
    cdh.writeUInt16LE(0, 8);
    cdh.writeUInt16LE(compMethod, 10);
    cdh.writeUInt16LE(0, 12);
    cdh.writeUInt16LE(0, 14);
    cdh.writeUInt32LE(uncompCrc, 16);
    cdh.writeUInt32LE(compSize, 20);
    cdh.writeUInt32LE(entry.content.length, 24);
    cdh.writeUInt16LE(nameBuf.length, 28);
    cdh.writeUInt16LE(0, 30);
    cdh.writeUInt16LE(0, 32);
    cdh.writeUInt16LE(0, 34);
    cdh.writeUInt16LE(0, 36);
    cdh.writeUInt32LE(0, 38);
    cdh.writeUInt32LE(localOffsetForCd, 42);
    nameBuf.copy(cdh, 46);

    cdParts.push(cdh);
    currentOffset += lh.length + payload.length;
  }

  const cdBuf = Buffer.concat(cdParts);
  const cdOffset = options?.cdOffsetOverride ?? currentOffset;
  const cdSize = options?.cdSizeOverride ?? cdBuf.length;

  // EOCD (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  let fullArchive = Buffer.concat([...localParts, cdBuf, eocd]);

  if (options?.truncateBytes && options.truncateBytes > 0) {
    fullArchive = fullArchive.subarray(0, fullArchive.length - options.truncateBytes);
  }

  return fullArchive;
}

describe('Adversarial Stress Harness: xlsx_parser.ts', () => {

  // =========================================================================
  // Dimension 1: Malformed and Corrupted Archive Injection
  // =========================================================================
  describe('Dimension 1: Malformed & Corrupted Archive Stress', () => {

    it('1.1 should reject zero-length buffer with InvalidArchiveError', async () => {
      await assert.rejects(
        async () => { await extractZipParts(Buffer.alloc(0)); },
        (err: any) => {
          assert.ok(err instanceof InvalidArchiveError);
          assert.match(err.message, /empty|zero-byte/i);
          return true;
        }
      );
    });

    it('1.2 should reject sub-22-byte non-ZIP buffer with InvalidArchiveError', async () => {
      const smallJunk = Buffer.from('NOT_A_ZIP_BUFFER'); // 16 bytes
      await assert.rejects(
        async () => { await extractZipParts(smallJunk); },
        (err: any) => {
          assert.ok(err instanceof InvalidArchiveError);
          assert.match(err.message, /corrupt or invalid/i);
          return true;
        }
      );
    });

    it('1.3 should reject sub-22-byte buffer starting with PK signature with ArchiveTruncationError', async () => {
      const truncatedPk = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00]); // 7 bytes
      await assert.rejects(
        async () => { await extractZipParts(truncatedPk); },
        (err: any) => {
          assert.ok(err instanceof ArchiveTruncationError);
          assert.match(err.message, /truncated/i);
          return true;
        }
      );
    });

    it('1.4 should reject >=22-byte buffer with no PK signature with MissingPkzipSignatureError', async () => {
      const largeJunk = Buffer.alloc(100, 0xaa);
      await assert.rejects(
        async () => { await extractZipParts(largeJunk); },
        (err: any) => {
          assert.ok(err instanceof MissingPkzipSignatureError);
          assert.match(err.message, /Missing PKZIP signature/i);
          return true;
        }
      );
    });

    it('1.5 should reject valid PK header truncated before EOCD with ArchiveTruncationError', async () => {
      const v1Buf = fs.readFileSync(V1_PATH);
      const truncated = v1Buf.subarray(0, 150); // Truncated mid-stream
      await assert.rejects(
        async () => { await extractZipParts(truncated); },
        (err: any) => {
          assert.ok(err instanceof ArchiveTruncationError);
          assert.match(err.message, /truncated/i);
          return true;
        }
      );
    });

    it('1.6 should reject archive when Central Directory bounds exceed buffer with ArchiveTruncationError', async () => {
      const badArchive = synthesizeZip(
        [{ name: 'test.xml', content: Buffer.from('<root/>') }],
        { cdOffsetOverride: 999999 }
      );
      await assert.rejects(
        async () => { await extractZipParts(badArchive); },
        (err: any) => {
          assert.ok(err instanceof ArchiveTruncationError);
          assert.match(err.message, /Central directory bounds exceed/i);
          return true;
        }
      );
    });

    it('1.7 should reject archive with corrupt local file header signature with ArchiveTruncationError', async () => {
      const badArchive = synthesizeZip([
        {
          name: 'xl/workbook.xml',
          content: Buffer.from('<root/>'),
          corruptLocalHeaderSig: true
        }
      ]);
      await assert.rejects(
        async () => { await extractZipParts(badArchive); },
        (err: any) => {
          assert.ok(err instanceof ArchiveTruncationError);
          assert.match(err.message, /Invalid local file header signature/i);
          return true;
        }
      );
    });

    it('1.8 should reject archive with corrupted Deflate payload with ArchiveTruncationError', async () => {
      const badArchive = synthesizeZip([
        {
          name: 'xl/workbook.xml',
          content: Buffer.from('<root>content</root>'),
          compressionMethod: 8,
          corruptDeflate: true
        }
      ]);
      await assert.rejects(
        async () => { await extractZipParts(badArchive); },
        (err: any) => {
          assert.ok(err instanceof ArchiveTruncationError);
          assert.match(err.message, /Decompression failed/i);
          return true;
        }
      );
    });

    it('1.9 should reject archive with unsupported compression method with InvalidArchiveError', async () => {
      const badArchive = synthesizeZip([
        {
          name: 'xl/workbook.xml',
          content: Buffer.from('<root/>'),
          compressionMethod: 99 // Unsupported
        }
      ]);
      await assert.rejects(
        async () => { await extractZipParts(badArchive); },
        (err: any) => {
          assert.ok(err instanceof InvalidArchiveError);
          assert.match(err.message, /Unsupported compression method 99/i);
          return true;
        }
      );
    });

    it('1.10 should reject archive where compressed payload extends past EOF with ArchiveTruncationError', async () => {
      const badArchive = synthesizeZip([
        {
          name: 'xl/workbook.xml',
          content: Buffer.from('<root/>'),
          compressedSizeOverride: 50000 // Claims payload is 50KB when file is ~200B
        }
      ]);
      await assert.rejects(
        async () => { await extractZipParts(badArchive); },
        (err: any) => {
          assert.ok(err instanceof ArchiveTruncationError);
          assert.match(err.message, /Compressed payload .* exceeds archive buffer/i);
          return true;
        }
      );
    });

    it('1.11 should reject archive missing xl/workbook.xml with MissingPartError', async () => {
      const noWorkbookArchive = synthesizeZip([
        {
          name: 'xl/worksheets/sheet1.xml',
          content: Buffer.from('<worksheet><sheetData/></worksheet>')
        }
      ]);
      await assert.rejects(
        async () => { await parseXlsx(noWorkbookArchive); },
        (err: any) => {
          assert.ok(err instanceof MissingPartError);
          assert.match(err.message, /Missing mandatory OpenXML part: 'xl\/workbook\.xml'/i);
          return true;
        }
      );
    });

    it('1.12 should reject archive missing worksheet with MissingPartError', async () => {
      const noSheetArchive = synthesizeZip([
        {
          name: 'xl/workbook.xml',
          content: Buffer.from('<workbook><sheets/></workbook>')
        }
      ]);
      await assert.rejects(
        async () => { await parseXlsx(noSheetArchive); },
        (err: any) => {
          assert.ok(err instanceof MissingPartError);
          assert.match(err.message, /Missing mandatory worksheet/i);
          return true;
        }
      );
    });

    it('1.13 should reject worksheet missing mandatory DATA_NAME or DATA_LINK header with SchemaValidationError', () => {
      const invalidHeaderXml = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="str"><v>NASA SPACE APP CHALLENGE</v></c>
      <c r="B1" t="str"><v>SOME_OTHER_COL</v></c>
      <c r="C1" t="str"><v>ANOTHER_COL</v></c>
    </row>
    <row r="2">
      <c r="B2" t="str"><v>NASA PSI: PSI-47</v></c>
    </row>
  </sheetData>
</worksheet>`;

      assert.throws(
        () => { parseWorksheetXml(invalidHeaderXml, []); },
        (err: any) => {
          assert.ok(err instanceof SchemaValidationError);
          assert.match(err.message, /Missing mandatory column: DATA_NAME or DATA_LINK/i);
          return true;
        }
      );
    });
  });

  // =========================================================================
  // Dimension 2: XML Edge Cases & Resiliency
  // =========================================================================
  describe('Dimension 2: XML Edge Cases & Resiliency', () => {

    it('2.1 should correctly decode all standard XML entities (&amp;, &lt;, &gt;, &quot;, &apos;)', () => {
      const raw = 'Flame &amp; Combustion &lt;High&gt; &quot;Microgravity&quot; &apos;ISS&apos;';
      const decoded = decodeXml(raw);
      assert.equal(decoded, 'Flame & Combustion <High> "Microgravity" \'ISS\'');
    });

    it('2.2 should decode decimal entities like &#8211; (en dash) and &#160; (NBSP)', () => {
      const raw = 'Phase 1 &#8211; Ignition&#160;Confirmed';
      const decoded = decodeXml(raw);
      assert.equal(decoded, 'Phase 1 \u2013 Ignition\u00A0Confirmed');
      assert.equal(decoded.includes('\u2013'), true);
    });

    it('2.3 should decode hexadecimal entities like &#x2013; and &#x41;', () => {
      const raw = '&#x41;CME &#x2013; Test &#x2F; Run';
      const decoded = decodeXml(raw);
      assert.equal(decoded, 'ACME \u2013 Test / Run');
    });

    it('2.4 should accurately parse multi-letter column coordinates (AA1, AB1, BA1, ZZ1, AAA1)', () => {
      const multiLetterXml = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="str"><v>NASA SPACE APP CHALLENGE</v></c>
      <c r="B1" t="str"><v>DATA_NAME</v></c>
      <c r="C1" t="str"><v>DATA_LINK</v></c>
      <c r="Z1" t="str"><v>COL_Z</v></c>
      <c r="AA1" t="str"><v>COL_AA</v></c>
      <c r="AB1" t="str"><v>COL_AB</v></c>
      <c r="BA1" t="str"><v>COL_BA</v></c>
      <c r="ZZ1" t="str"><v>COL_ZZ</v></c>
      <c r="AAA1" t="str"><v>COL_AAA</v></c>
    </row>
    <row r="2">
      <c r="B2" t="str"><v>NASA PSI: PSI-47</v></c>
      <c r="C2" t="str"><v>https://psi.nasa.gov</v></c>
      <c r="AA2" t="str"><v>Value_at_AA</v></c>
      <c r="ZZ2" t="str"><v>Value_at_ZZ</v></c>
      <c r="AAA2" t="str"><v>Value_at_AAA</v></c>
    </row>
  </sheetData>
</worksheet>`;

      const rows = parseWorksheetXml(multiLetterXml, []);
      assert.equal(rows.length, 2);
      assert.equal(rows[0]['AA'], 'COL_AA');
      assert.equal(rows[0]['AB'], 'COL_AB');
      assert.equal(rows[0]['BA'], 'COL_BA');
      assert.equal(rows[0]['ZZ'], 'COL_ZZ');
      assert.equal(rows[0]['AAA'], 'COL_AAA');

      assert.equal(rows[1]['AA'], 'Value_at_AA');
      assert.equal(rows[1]['ZZ'], 'Value_at_ZZ');
      assert.equal(rows[1]['AAA'], 'Value_at_AAA');
    });

    it('2.5 should tolerate self-closing tags and empty values without crashing or producing undefined', () => {
      const selfClosingXml = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="str"><v>NASA SPACE APP CHALLENGE</v></c>
      <c r="B1" t="str"><v>DATA_NAME</v></c>
      <c r="C1" t="str"><v>DATA_LINK</v></c>
      <c r="D1"/>
      <c r="E1" />
      <c r="F1"><v/></c>
      <c r="G1"><v></v></c>
      <c r="H1" t="inlineStr"><is><t/></is></c>
    </row>
    <row r="2">
      <c r="B2" t="str"><v>NASA PSI: PSI-47</v></c>
      <c r="C2" t="str"><v>https://psi.nasa.gov</v></c>
      <c r="D2"/>
      <c r="E2" />
    </row>
  </sheetData>
</worksheet>`;

      const rows = parseWorksheetXml(selfClosingXml, []);
      assert.equal(rows.length, 2);
      assert.equal(rows[0]['D'], '');
      assert.equal(rows[0]['E'], '');
      assert.equal(rows[0]['F'], '');
      assert.equal(rows[0]['G'], '');
      assert.equal(rows[0]['H'], '');
      assert.equal(rows[1]['D'], '');
      assert.equal(rows[1]['E'], '');
    });

    it('2.6 should detect unclosed XML tags with XmlParseError', () => {
      const unclosedXml = '<worksheet><sheetData><row r="1"><c r="A1"><v>123</v></c></row></sheetData>'; // missing </worksheet>
      assert.throws(
        () => { validateXmlWellFormed(unclosedXml); },
        (err: any) => {
          assert.ok(err instanceof XmlParseError);
          assert.match(err.message, /Unclosed XML tag: <worksheet>/i);
          return true;
        }
      );
    });

    it('2.7 should detect mismatched XML closing tags with XmlParseError', () => {
      const mismatchedXml = '<worksheet><sheetData></wrongTag></worksheet>';
      assert.throws(
        () => { validateXmlWellFormed(mismatchedXml); },
        (err: any) => {
          assert.ok(err instanceof XmlParseError);
          assert.match(err.message, /Mismatched closing tag/i);
          return true;
        }
      );
    });

    it('2.8 should detect unexpected closing tag at top level with XmlParseError', () => {
      const extraClosing = '</orphanTag><worksheet></worksheet>';
      assert.throws(
        () => { validateXmlWellFormed(extraClosing); },
        (err: any) => {
          assert.ok(err instanceof XmlParseError);
          assert.match(err.message, /Unexpected closing tag/i);
          return true;
        }
      );
    });

    it('2.9 should handle XML comments and processing instructions', () => {
      const xmlWithComments = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet>
  <!-- Standard OpenXML comment header -->
  <sheetData>
    <row r="1">
      <c r="A1" t="str"><v>NASA SPACE APP CHALLENGE</v></c>
      <c r="B1" t="str"><v>DATA_NAME</v></c>
      <c r="C1" t="str"><v>DATA_LINK</v></c>
    </row>
  </sheetData>
</worksheet>`;

      assert.doesNotThrow(() => {
        validateXmlWellFormed(xmlWithComments);
      });
      const rows = parseWorksheetXml(xmlWithComments, []);
      assert.equal(rows.length, 1);
      assert.equal(rows[0]['B'], 'DATA_NAME');
    });
  });

  // =========================================================================
  // Dimension 3: Performance Benchmark & Memory Leak Profiling
  // =========================================================================
  describe('Dimension 3: Performance Benchmark & Memory Leak Profiling', () => {
    const ITERATIONS = 50;

    it(`3.1 should parse NASA_DATASET.xlsx (V1) across ${ITERATIONS} iterations with avg latency << 500ms`, async () => {
      const v1Buf = fs.readFileSync(V1_PATH);
      const durations: number[] = [];

      for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();
        const records = await parseXlsx(v1Buf);
        const elapsed = performance.now() - start;
        durations.push(elapsed);
        assert.equal(records.length, 26, `Iteration ${i} must return exactly 26 records`);
      }

      const sum = durations.reduce((a, b) => a + b, 0);
      const avg = sum / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      const sorted = [...durations].sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)];

      // console.log(`[V1 Benchmark] Avg: ${avg.toFixed(2)}ms | Min: ${min.toFixed(2)}ms | Max: ${max.toFixed(2)}ms | P95: ${p95.toFixed(2)}ms`);

      assert.ok(avg < 50, `V1 average latency (${avg.toFixed(2)}ms) must be < 50ms`);
      assert.ok(max < 500, `V1 max latency (${max.toFixed(2)}ms) must be < 500ms`);
    });

    it(`3.2 should parse NASA_DATASET_ANALYZED_V2.xlsx (V2) across ${ITERATIONS} iterations with avg latency << 500ms`, async () => {
      const v2Buf = fs.readFileSync(V2_PATH);
      const durations: number[] = [];

      for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();
        const records = await parseXlsx(v2Buf);
        const elapsed = performance.now() - start;
        durations.push(elapsed);
        assert.equal(records.length, 26, `Iteration ${i} must return exactly 26 records`);
      }

      const sum = durations.reduce((a, b) => a + b, 0);
      const avg = sum / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      const sorted = [...durations].sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)];

      // console.log(`[V2 Benchmark] Avg: ${avg.toFixed(2)}ms | Min: ${min.toFixed(2)}ms | Max: ${max.toFixed(2)}ms | P95: ${p95.toFixed(2)}ms`);

      assert.ok(avg < 100, `V2 average latency (${avg.toFixed(2)}ms) must be < 100ms`);
      assert.ok(max < 500, `V2 max latency (${max.toFixed(2)}ms) must be < 500ms`);
    });

    it(`3.3 should verify bounded heap growth across ${ITERATIONS} parse cycles (no memory leak)`, async () => {
      const v1Buf = fs.readFileSync(V1_PATH);
      const v2Buf = fs.readFileSync(V2_PATH);

      // Warm-up
      for (let i = 0; i < 5; i++) {
        await parseXlsx(v1Buf);
        await parseXlsx(v2Buf);
      }

      const initialHeap = process.memoryUsage().heapUsed;

      for (let i = 0; i < ITERATIONS; i++) {
        await parseXlsx(v1Buf);
        await parseXlsx(v2Buf);
      }

      const finalHeap = process.memoryUsage().heapUsed;
      const heapGrowthMB = (finalHeap - initialHeap) / (1024 * 1024);

      // Bounded heap growth: 50 iterations of parsing 30KB archives must not accumulate unbounded retained memory
      assert.ok(heapGrowthMB < 25, `Heap growth must be bounded: observed ${heapGrowthMB.toFixed(2)} MB`);
    });
  });

  // =========================================================================
  // Dimension 4: Full Dataset Integrity & Invariant Preservation
  // =========================================================================
  describe('Dimension 4: Full Dataset Invariants & Error Typings', () => {
    it('4.1 should correctly identify all 6 custom error prototypes in hierarchy', () => {
      const invArch = new InvalidArchiveError('test');
      const misPk = new MissingPkzipSignatureError('test');
      const arcTrunc = new ArchiveTruncationError('test');
      const misPart = new MissingPartError('test');
      const schVal = new SchemaValidationError('test');
      const xmlErr = new XmlParseError('test');

      assert.equal(invArch.name, 'InvalidArchiveError');
      assert.equal(misPk.name, 'MissingPkzipSignatureError');
      assert.equal(arcTrunc.name, 'ArchiveTruncationError');
      assert.equal(misPart.name, 'MissingPartError');
      assert.equal(schVal.name, 'SchemaValidationError');
      assert.equal(xmlErr.name, 'XmlParseError');

      assert.ok(invArch instanceof Error);
      assert.ok(misPk instanceof Error);
      assert.ok(arcTrunc instanceof Error);
      assert.ok(misPart instanceof Error);
      assert.ok(schVal instanceof Error);
      assert.ok(xmlErr instanceof Error);
    });

    it('4.2 should maintain rowNumber consistency between 2 and 27 on parsed records', async () => {
      const recordsV1 = await parseXlsxFile(V1_PATH);
      const recordsV2 = await parseXlsxFile(V2_PATH);

      for (let i = 0; i < 26; i++) {
        assert.equal(recordsV1[i].rowNumber, i + 2);
        assert.equal(recordsV2[i].rowNumber, i + 2);
        assert.equal(recordsV1[i].dataName, recordsV2[i].dataName);
        assert.equal(recordsV1[i].dataLink, recordsV2[i].dataLink);
      }
    });
  });

});
