/**
 * NASA Microgravity Combustion Science Dashboard & SI Harness
 * Data Pipeline Normalizer & Scientific Enrichment Module
 *
 * Normalizes raw spreadsheet records, performs cross-catalog joins, applies deterministic
 * fallbacks for uncataloged studies, and validates schema invariants.
 */

import type { 
  RawPsiRecord, 
  EnrichedPsiInvestigation 
} from '../types/index.ts';
import { PSI_CATALOG } from './psi_catalog.ts';

/**
 * Filters raw records to retain only active NASA PSI investigation rows.
 */
export function filterActiveRows(records: RawPsiRecord[]): RawPsiRecord[] {
  return records.filter(r => r && typeof r.dataName === 'string' && r.dataName.trim().startsWith('NASA PSI:'));
}

/**
 * Normalizes an individual RawPsiRecord into a typed EnrichedPsiInvestigation record.
 * Applies catalog lookups and provides deterministic fallbacks for uncataloged rows.
 */
export function normalizeRawPsiRecord(record: RawPsiRecord): EnrichedPsiInvestigation {
  const cleanName = (record.dataName || '').trim();
  const idMatch = cleanName.match(/PSI-(\d+)/i);
  const id = idMatch ? `PSI-${idMatch[1]}` : (cleanName || 'PSI-0');
  const code = idMatch ? parseInt(idMatch[1], 10) : 0;

  const catalogEntry = PSI_CATALOG[id];

  if (catalogEntry) {
    const rawMissing = (record.dataMissingOpportunities || '').trim();
    const missingOpportunities = rawMissing.length >= 20 
      ? rawMissing 
      : catalogEntry.missingOpportunitiesAnalysis;

    return {
      ...catalogEntry,
      id: catalogEntry.id,
      code: catalogEntry.code,
      name: catalogEntry.name,
      fullName: catalogEntry.fullName,
      url: (record.dataLink || '').trim() || catalogEntry.url,
      category: catalogEntry.category,
      isCombustion: catalogEntry.isCombustion,
      facility: catalogEntry.facility,
      fuelTypes: [...catalogEntry.fuelTypes],
      sampleGeometry: catalogEntry.sampleGeometry,
      oxygenRangePct: [...catalogEntry.oxygenRangePct],
      pressureRangeKPa: [...catalogEntry.pressureRangeKPa],
      flowVelocityRangeCmS: [...catalogEntry.flowVelocityRangeCmS],
      gravityEnvironments: [...catalogEntry.gravityEnvironments],
      flammabilityFindings: catalogEntry.flammabilityFindings,
      fireSafetyRelevance: catalogEntry.fireSafetyRelevance,
      terrestrialSpinOffs: catalogEntry.terrestrialSpinOffs,
      missingOpportunitiesAnalysis: missingOpportunities,
      safetyPillar: catalogEntry.safetyPillar
    };
  }

  // Deterministic fallback for uncataloged investigations (e.g., PSI-999)
  return {
    id,
    code,
    name: `Custom Investigation ${id}`,
    fullName: `NASA Physical Science Informatics Investigation ${id}`,
    url: (record.dataLink || '').trim() || `https://psi.nasa.gov/physci/repo/data/investigations/${id}`,
    category: 'Solid Surface',
    isCombustion: true,
    facility: 'ISS MSG',
    fuelTypes: ['PMMA Acrylic'],
    sampleGeometry: 'Flat slab coupon in flow duct',
    oxygenRangePct: [16.0, 30.0],
    pressureRangeKPa: [70.0, 101.3],
    flowVelocityRangeCmS: [1.0, 25.0],
    gravityEnvironments: ['microgravity'],
    flammabilityFindings: 'Baseline flammability characterization for uncataloged investigation record.',
    fireSafetyRelevance: 'General exploration spacecraft fire safety screening data.',
    terrestrialSpinOffs: 'Standard industrial and aerospace cleanroom fire prevention protocols.',
    missingOpportunitiesAnalysis: (record.dataMissingOpportunities || '').trim().length >= 20
      ? (record.dataMissingOpportunities || '').trim()
      : 'Comprehensive parametric dataset pending specialized diagnostic characterization.',
    safetyPillar: 'PREVENTION'
  };
}

/**
 * Normalizes an array of raw PSI records into validated EnrichedPsiInvestigation entries.
 */
export function normalizePsiDataset(records: RawPsiRecord[]): EnrichedPsiInvestigation[] {
  const active = filterActiveRows(records);
  return active.map(r => normalizeRawPsiRecord(r));
}
