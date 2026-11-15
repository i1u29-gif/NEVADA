#!/usr/bin/env node
/**
 * NASA Microgravity Combustion Science Dashboard & SI Harness
 * Full-System Verification Runner (`scripts/verify.js`)
 *
 * Verifies:
 * 1. Repository Harness & Directory Structure
 * 2. Dual Excel Dataset Presence (`NASA_DATASET.xlsx` & `NASA_DATASET_ANALYZED_V2.xlsx`)
 * 3. Core Subsystem Modules (`src/types`, `src/pipeline`, `src/engine`, `src/server`, `public`, `pitch`)
 * 4. Master 5-Tier Unified E2E Test Suite (`test/run_all_tests.ts`)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REQUIRED_FILES = [
  'package.json',
  'tsconfig.json',
  'README.md',
  'NASA_DATASET.xlsx',
  'NASA_DATASET_ANALYZED_V2.xlsx',
  'src/index.ts',
  'src/types/index.ts',
  'src/pipeline/xlsx_parser.ts',
  'src/pipeline/psi_catalog.ts',
  'src/pipeline/normalizer.ts',
  'src/engine/physics_models.ts',
  'src/engine/habitat_scenarios.ts',
  'src/engine/ranking_engine.ts',
  'src/engine/recommender.ts',
  'src/engine/si_ensemble.ts',
  'src/server/server.ts',
  'src/server/router.ts',
  'src/server/static_handler.ts',
  'public/index.html',
  'public/styles.css',
  'public/app.js',
  'public/visualizer.js',
  'pitch/pitch_deck.md',
  'pitch/executive_summary.md',
  'pitch/demo_script.md',
  'test/run_all_tests.ts'
];

console.log('========================================================================');
console.log('🚀 NASA SPACE APPS CHALLENGE: FULL-SYSTEM HARNESS VERIFICATION');
console.log('========================================================================\n');

let failed = false;

console.log('[1/2] Checking Required Repository Artifacts & Modules...');
for (const rel of REQUIRED_FILES) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    console.error(`  ✖ MISSING: ${rel}`);
    failed = true;
  } else {
    console.log(`  ✔ PRESENT: ${rel}`);
  }
}

console.log('\n[2/2] Executing 5-Tier Master E2E Verification Suite (`test/run_all_tests.ts`)...\n');
try {
  execSync('node test/run_all_tests.ts', {
    cwd: ROOT,
    stdio: 'inherit'
  });
} catch {
  failed = true;
}

if (failed) {
  console.error('\n❌ VERIFICATION FAILED: One or more checks did not pass.');
  process.exit(1);
} else {
  console.log('\n✅ ALL HARNESS & E2E VERIFICATION CHECKS PASSED (100% MISSION READY).');
  process.exit(0);
}
