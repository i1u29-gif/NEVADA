/**
 * NASA Microgravity Combustion Science Dashboard & SI Harness
 * Native OpenXML XLSX Parser (Zero External Dependencies)
 *
 * Implements PKZIP inflation via node:zlib.inflateRawSync, XML Shared Strings dereferencing,
 * inline string (<is><t>) extraction, and robust fault-injection error handling.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import type { RawPsiRecord } from '../types/index.ts';

// ============================================================================
// Custom Domain Error Hierarchy
// ============================================================================

export class InvalidArchiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidArchiveError';
  }
}

export class MissingPkzipSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingPkzipSignatureError';
  }
}

export class ArchiveTruncationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArchiveTruncationError';
  }
}

export class MissingPartError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingPartError';
  }
}

export class SchemaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

export class XmlParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XmlParseError';
  }
}

// ============================================================================
// XML Helper Utilities
// ============================================================================

/**
 * Decodes standard XML entity references.
 */
export function decodeXml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Validates basic XML tag nesting and detects unclosed or mismatched tags.
 */
export function validateXmlWellFormed(xml: string): void {
  const stack: string[] = [];
  const tagRegex = /<\/?([a-zA-Z0-9:_]+)(?:\s+[^>]*?)?(\/?)>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(xml)) !== null) {
    const fullTag = match[0];
    const tagName = match[1];
    const selfClosing = match[2] === '/';
    const isClosing = fullTag.startsWith('</');

    if (fullTag.startsWith('<?') || fullTag.startsWith('<!')) {
      continue;
    }

    if (selfClosing) {
      continue;
    }

    if (isClosing) {
      if (stack.length === 0) {
        throw new XmlParseError(`Unexpected closing tag: </${tagName}>`);
      }
      const top = stack.pop();
      if (top !== tagName) {
        throw new XmlParseError(`Mismatched closing tag: expected </${top}>, found </${tagName}>`);
      }
    } else {
      stack.push(tagName);
    }
  }

  if (stack.length > 0) {
    throw new XmlParseError(`Unclosed XML tag: <${stack[stack.length - 1]}>`);
  }
}

// ============================================================================
// PKZIP Decompressor (Zero Third-Party Dependencies)
// ============================================================================

/**
 * Decompresses all parts from an OpenXML PKZIP buffer into a filename -> Buffer map.
 */
export async function extractZipParts(buffer: Buffer): Promise<Map<string, Buffer>> {
  if (!buffer || buffer.length === 0) {
    throw new InvalidArchiveError('Archive buffer is empty (zero-byte)');
  }

  if (buffer.length < 22) {
    if (buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50) {
      throw new ArchiveTruncationError('Truncated ZIP archive');
    }
    throw new InvalidArchiveError('Corrupt or invalid ZIP archive buffer');
  }

  const startsWithPk = buffer.readUInt32LE(0) === 0x04034b50;

  // Search backwards for End of Central Directory Record (0x06054b50)
  let eocdOffset = -1;
  const searchLimit = Math.max(0, buffer.length - 65557);
  for (let i = buffer.length - 22; i >= searchLimit; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    if (startsWithPk) {
      throw new ArchiveTruncationError('Truncated ZIP archive: missing End of Central Directory record');
    }
    throw new MissingPkzipSignatureError('Missing PKZIP signature in binary archive buffer');
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
  const cdSize = buffer.readUInt32LE(eocdOffset + 12);

  if (cdOffset > buffer.length || cdOffset + cdSize > buffer.length) {
    throw new ArchiveTruncationError('Central directory bounds exceed archive buffer length');
  }

  let p = cdOffset;
  const parts = new Map<string, Buffer>();

  for (let i = 0; i < totalEntries; i++) {
    if (p + 46 > buffer.length) {
      throw new ArchiveTruncationError('Unexpected EOF inside Central Directory header');
    }
    if (buffer.readUInt32LE(p) !== 0x02014b50) {
      break;
    }

    const compression = buffer.readUInt16LE(p + 10);
    const compSize = buffer.readUInt32LE(p + 20);
    const fnLen = buffer.readUInt16LE(p + 28);
    const extraLen = buffer.readUInt16LE(p + 30);
    const commentLen = buffer.readUInt16LE(p + 32);
    const localHeaderOffset = buffer.readUInt32LE(p + 42);

    if (p + 46 + fnLen > buffer.length) {
      throw new ArchiveTruncationError('Filename extends beyond archive buffer');
    }
    const name = buffer.toString('utf8', p + 46, p + 46 + fnLen);

    if (localHeaderOffset + 30 > buffer.length) {
      throw new ArchiveTruncationError(`Local header offset for "${name}" exceeds buffer length`);
    }
    if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      throw new ArchiveTruncationError(`Invalid local file header signature for "${name}"`);
    }

    const localFnLen = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localFnLen + localExtraLen;

    if (dataOffset + compSize > buffer.length) {
      throw new ArchiveTruncationError(`Compressed payload for "${name}" exceeds archive buffer`);
    }

    const compData = buffer.subarray(dataOffset, dataOffset + compSize);
    let decompressed: Buffer;

    if (compression === 0) {
      decompressed = compData;
    } else if (compression === 8) {
      try {
        decompressed = zlib.inflateRawSync(compData);
      } catch (err: any) {
        throw new ArchiveTruncationError(`Decompression failed for "${name}": ${err.message}`);
      }
    } else {
      throw new InvalidArchiveError(`Unsupported compression method ${compression} in "${name}"`);
    }

    // Normalize entity references in XML files for direct string matching
    if (name.endsWith('.xml')) {
      const text = decompressed.toString('utf8').replace(/&amp;/g, '&');
      decompressed = Buffer.from(text, 'utf8');
    }

    parts.set(name, decompressed);
    p += 46 + fnLen + extraLen + commentLen;
  }

  return parts;
}

// ============================================================================
// OpenXML Worksheet & Shared String Table Parsers
// ============================================================================

/**
 * Extracts and dereferences strings from xl/sharedStrings.xml (SST).
 */
export function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match: RegExpExecArray | null;

  while ((match = siRegex.exec(xml)) !== null) {
    const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let tMatch: RegExpExecArray | null;
    let combined = '';
    while ((tMatch = tRegex.exec(match[1])) !== null) {
      combined += tMatch[1];
    }
    strings.push(decodeXml(combined));
  }

  return strings;
}

/**
 * Parses worksheet XML into an array of column -> value cell mappings.
 * Supports both SST references (t="s") and inline strings (<is><t>).
 */
export function parseWorksheetXml(xml: string, sharedStrings: string[] = []): Record<string, string>[] {
  validateXmlWellFormed(xml);

  const rows: Record<string, string>[] = [];
  const rowRegex = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  let rMatch: RegExpExecArray | null;
  let hasRow1 = false;
  let row1Headers: string[] = [];

  while ((rMatch = rowRegex.exec(xml)) !== null) {
    const rowAttrs = rMatch[1];
    const rowBody = rMatch[2];
    const rNumMatch = /r="(\d+)"/.exec(rowAttrs);
    const rowNum = rNumMatch ? parseInt(rNumMatch[1], 10) : rows.length + 1;

    const cells: Record<string, string> = {};
    const cRegex = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cMatch: RegExpExecArray | null;

    while ((cMatch = cRegex.exec(rowBody)) !== null) {
      const cAttrs = cMatch[1];
      const cBody = cMatch[2] || '';
      const rAttrMatch = /r="([A-Z]+)\d+"/.exec(cAttrs);
      if (!rAttrMatch) continue;
      const colLetter = rAttrMatch[1];
      const tAttrMatch = /t="([^"]+)"/.exec(cAttrs);
      const cellType = tAttrMatch ? tAttrMatch[1] : '';

      let cellValue = '';
      if (cellType === 's') {
        const vMatch = /<v>(\d+)<\/v>/.exec(cBody);
        if (vMatch) {
          const idx = parseInt(vMatch[1], 10);
          cellValue = sharedStrings[idx] !== undefined ? sharedStrings[idx] : '';
        }
      } else if (cellType === 'inlineStr' || cBody.includes('<is>')) {
        const tMatches = cBody.match(/<t\b[^>]*>([\s\S]*?)<\/t>/g) || [];
        cellValue = tMatches.map(t => decodeXml(t.replace(/<[^>]+>/g, ''))).join('');
      } else if (cellType === 'str') {
        const vMatch = /<v>([\s\S]*?)<\/v>/.exec(cBody);
        if (vMatch) cellValue = decodeXml(vMatch[1]);
      } else {
        const vMatch = /<v>([\s\S]*?)<\/v>/.exec(cBody);
        if (vMatch) cellValue = decodeXml(vMatch[1]);
      }
      cells[colLetter] = cellValue;
    }

    if (rowNum === 1) {
      hasRow1 = true;
      row1Headers = Object.values(cells).map(v => (v || '').trim().toUpperCase());
    }

    rows.push(cells);
  }

  if (hasRow1) {
    const hasDataName = row1Headers.includes('DATA_NAME');
    const hasDataLink = row1Headers.includes('DATA_LINK');
    if (!hasDataName || !hasDataLink) {
      throw new SchemaValidationError('Missing mandatory column: DATA_NAME or DATA_LINK in header row');
    }
  }

  return rows;
}

// ============================================================================
// Public Entry Points
// ============================================================================

/**
 * Parses raw XLSX buffer into an array of RawPsiRecord entries.
 */
export async function parseXlsx(buffer: Buffer): Promise<RawPsiRecord[]> {
  const parts = await extractZipParts(buffer);

  if (!parts.has('xl/workbook.xml')) {
    throw new MissingPartError("Missing mandatory OpenXML part: 'xl/workbook.xml'");
  }

  let sheetPath = 'xl/worksheets/sheet1.xml';
  if (!parts.has(sheetPath)) {
    for (const key of parts.keys()) {
      if (key.startsWith('xl/worksheets/sheet') && key.endsWith('.xml')) {
        sheetPath = key;
        break;
      }
    }
  }

  if (!parts.has(sheetPath)) {
    throw new MissingPartError(`Missing mandatory worksheet: ${sheetPath}`);
  }

  let sst: string[] = [];
  if (parts.has('xl/sharedStrings.xml')) {
    sst = parseSharedStrings(parts.get('xl/sharedStrings.xml')!.toString('utf8'));
  }

  const sheetXml = parts.get(sheetPath)!.toString('utf8');
  const rows = parseWorksheetXml(sheetXml, sst);

  let colMap = {
    dataName: 'B',
    dataLink: 'C',
    dataMainPurpose: 'D',
    dataMissingOpportunities: 'E'
  };

  if (rows.length > 0) {
    const headerCells = rows[0];
    for (const [col, val] of Object.entries(headerCells)) {
      const v = (val || '').trim().toUpperCase();
      if (v === 'DATA_NAME') colMap.dataName = col;
      if (v === 'DATA_LINK') colMap.dataLink = col;
      if (v === 'DATA_MAINPURPOSE') colMap.dataMainPurpose = col;
      if (v === 'DATA_MISSING_OPPORTUNITIES') colMap.dataMissingOpportunities = col;
    }
  }

  const records: RawPsiRecord[] = [];
  for (let i = 1; i < rows.length; i++) {
    const c = rows[i];
    const dataName = (c[colMap.dataName] || '').trim();
    if (!dataName || !dataName.startsWith('NASA PSI:')) {
      continue;
    }
    const dataLink = (c[colMap.dataLink] || '').trim();
    const dataMainPurpose = (c[colMap.dataMainPurpose] || '').trim();
    const dataMissingOpportunities = (c[colMap.dataMissingOpportunities] || '').trim();

    records.push({
      rowNumber: records.length + 2,
      dataName,
      dataLink,
      dataMainPurpose,
      dataMissingOpportunities
    });
  }

  return records;
}

/**
 * Reads and parses an XLSX file from disk into RawPsiRecord entries.
 */
export async function parseXlsxFile(filePath: string): Promise<RawPsiRecord[]> {
  const resolved = path.resolve(filePath);
  const buffer = await fs.promises.readFile(resolved);
  return parseXlsx(buffer);
}
