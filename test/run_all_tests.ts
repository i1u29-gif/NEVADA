/**
 * NASA Microgravity Combustion Science Dashboard & Super Intelligence Harness
 * Master Unified E2E Test Suite Runner
 * 
 * Orchestrates sequential execution of all 5 verification tiers:
 * - Tier 1: Data Pipeline & PSI Catalog Ingestion (01_data_pipeline.test.ts)
 * - Tier 2: Microgravity Physics & Flammability Limits (02_physics_engine.test.ts)
 * - Tier 3: SCRI Composite Scoring & Pairwise Interactions (03_ranking_scoring.test.ts)
 * - Tier 4: Mission Operational Habitat Scenarios (04_scenarios_env.test.ts)
 * - Tier 5: Web API Endpoints & Static Asset Delivery (05_api_web_e2e.test.ts)
 * 
 * Invocation:
 *   node test/run_all_tests.ts
 *   npm run test:all
 * 
 * Exit Code:
 *   0 = All executed suites and assertions passed cleanly with zero errors.
 *   1 = One or more test assertions failed, or required test files are missing.
 */

import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TierConfig {
  id: string;
  filename: string;
  title: string;
  scope: string;
}

const TIERS: TierConfig[] = [
  {
    id: '01',
    filename: '01_data_pipeline.test.ts',
    title: 'Tier 1: Data Pipeline & Schema Validator',
    scope: 'OpenXML Ingestion & 26 PSI Catalog'
  },
  {
    id: '02',
    filename: '02_physics_engine.test.ts',
    title: 'Tier 2: Microgravity Physics & Boundaries',
    scope: 'Low-Flow Sweet Spot & Quenching Limits'
  },
  {
    id: '03',
    filename: '03_ranking_scoring.test.ts',
    title: 'Tier 3: SCRI Scoring & Cross-Feature',
    scope: 'Composite Score & Pairwise Invariants'
  },
  {
    id: '04',
    filename: '04_scenarios_env.test.ts',
    title: 'Tier 4: Mission Operational Scenarios',
    scope: 'ISS, Artemis LEA, Mars, Rover, Terrestrial'
  },
  {
    id: '05',
    filename: '05_api_web_e2e.test.ts',
    title: 'Tier 5: Web API & Dashboard Telemetry',
    scope: 'REST Endpoints & Static Asset Delivery'
  }
];

interface TierStats {
  config: TierConfig;
  filePath: string;
  exists: boolean;
  passCount: number;
  failCount: number;
}

async function main() {
  console.log('='.repeat(80));
  console.log('🚀 NASA SPACE APPS CHALLENGE — MICROGRAVITY COMBUSTION SCIENCE');
  console.log('🛸 SUPER INTELLIGENCE (SI) UNIFIED E2E VERIFICATION TEST RUNNER');
  console.log('='.repeat(80));
  console.log(`Node.js Runtime : ${process.version} (${process.arch}-${process.platform})`);
  console.log(`Execution Mode  : Pure TypeScript Native Strip-Types Zero-Dependency Harness`);
  console.log(`Timestamp       : ${new Date().toISOString()}`);
  console.log(`Directory       : ${__dirname}`);
  console.log('='.repeat(80));
  console.log('');

  const statsMap = new Map<string, TierStats>();
  const filesToExecute: string[] = [];

  for (const tier of TIERS) {
    const fullPath = path.join(__dirname, tier.filename);
    const exists = fs.existsSync(fullPath);
    const stats: TierStats = {
      config: tier,
      filePath: fullPath,
      exists,
      passCount: 0,
      failCount: 0
    };
    statsMap.set(tier.filename, stats);

    if (exists) {
      filesToExecute.push(fullPath);
    }
  }

  if (filesToExecute.length === 0) {
    console.error('❌ FATAL: No test tier files found to execute in:', __dirname);
    process.exit(1);
  }

  console.log(`Discovered ${filesToExecute.length} of ${TIERS.length} test tier files for sequential execution.\n`);

  const startTime = Date.now();
  let totalTestsPassed = 0;
  let totalTestsFailed = 0;
  let unhandledErrors = 0;

  // Process-level unhandled rejection / uncaught exception traps
  process.on('unhandledRejection', (reason) => {
    unhandledErrors++;
    console.error('❌ UNHANDLED REJECTION IN TEST RUNNER:', reason);
  });

  process.on('uncaughtException', (err) => {
    unhandledErrors++;
    console.error('❌ UNCAUGHT EXCEPTION IN TEST RUNNER:', err);
  });

  // Run test suites sequentially (concurrency 1) to prevent port collisions in Tier 5
  const runner = run({
    files: filesToExecute,
    concurrency: 1
  });

  // Track per-test events
  runner.on('test:pass', (data: any) => {
    // Avoid double-counting root suite file completions
    const baseName = data.file ? path.basename(data.file) : '';
    if (data.name !== baseName) {
      totalTestsPassed++;
      const stats = statsMap.get(baseName);
      if (stats) stats.passCount++;
    }
  });

  runner.on('test:fail', (data: any) => {
    totalTestsFailed++;
    const baseName = data.file ? path.basename(data.file) : '';
    const stats = statsMap.get(baseName);
    if (stats) stats.failCount++;
  });

  runner.on('error', (err: any) => {
    unhandledErrors++;
    console.error('❌ RUNNER STREAM ERROR:', err);
  });

  // Pipe real-time spec reporter output to stdout
  runner.compose(new spec()).pipe(process.stdout);

  // Await completion of all test execution
  await new Promise<void>((resolve) => {
    runner.on('end', () => resolve());
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print Mission Control Summary Table
  console.log('\n' + '='.repeat(80));
  console.log('📊 NASA MISSION CONTROL — E2E VERIFICATION SUITE BREAKDOWN');
  console.log('='.repeat(80));
  console.log(
    ' Tier | Test Suite File              | Pass | Fail | Status'
  );
  console.log('-'.repeat(80));

  let missingCount = 0;
  let zeroAssertionTiers = 0;
  for (const tier of TIERS) {
    const stats = statsMap.get(tier.filename)!;
    const tierCol = `  ${tier.id}  `;
    const fileCol = tier.filename.padEnd(28);
    const passCol = String(stats.passCount).padStart(4);
    const failCol = String(stats.failCount).padStart(4);

    let statusCol = '';
    if (!stats.exists) {
      statusCol = ' [MISSING / PENDING]';
      missingCount++;
    } else if (stats.failCount > 0) {
      statusCol = ' ✖ FAIL [REGRESSION]';
    } else if (stats.passCount > 0) {
      statusCol = ' ✔ PASS [VERIFIED]';
    } else {
      statusCol = ' ⚠ ZERO ASSERTIONS';
      zeroAssertionTiers++;
    }

    console.log(`${tierCol}| ${fileCol} | ${passCol} | ${failCol} |${statusCol}`);
  }

  console.log('-'.repeat(80));
  console.log(`Total Test Assertions Passed : ${totalTestsPassed}`);
  console.log(`Total Test Assertions Failed : ${totalTestsFailed}`);
  console.log(`Suites Missing on Disk       : ${missingCount}`);
  console.log(`Suites with Zero Assertions  : ${zeroAssertionTiers}`);
  console.log(`Unhandled Runner Errors      : ${unhandledErrors}`);
  console.log(`Total Execution Wall-Time    : ${durationSec}s`);
  console.log('='.repeat(80));

  // Strict NASA Mission Flight-Ready gate criteria:
  // Must have 0 failures, 0 missing suites, >0 total passing assertions, 0 hollow tiers, and 0 unhandled errors.
  const isAllPassed = 
    totalTestsFailed === 0 && 
    missingCount === 0 && 
    totalTestsPassed > 0 && 
    zeroAssertionTiers === 0 && 
    unhandledErrors === 0;

  if (isAllPassed) {
    console.log('🏆 VERIFICATION VERDICT       : ALL 5 TIERS PASSED [MISSION FLIGHT READY]');
    console.log('='.repeat(80));
    process.exit(0);
  } else {
    // Under NO circumstances can runner fall through to exit code 0 on an incomplete, failed, or zero-assertion run
    if (totalTestsFailed > 0) {
      console.log(`❌ VERIFICATION VERDICT       : ${totalTestsFailed} FAILURE(S) DETECTED [ACTION REQUIRED]`);
    } else if (missingCount > 0) {
      console.log(`❌ VERIFICATION VERDICT       : INCOMPLETE SUITE (${missingCount} TIER(S) MISSING FROM DISK) [GATE REJECTED]`);
    } else if (totalTestsPassed === 0) {
      console.log(`❌ VERIFICATION VERDICT       : ZERO ASSERTIONS EXECUTED (${totalTestsPassed} PASSED) [GATE REJECTED]`);
    } else if (zeroAssertionTiers > 0) {
      console.log(`❌ VERIFICATION VERDICT       : ${zeroAssertionTiers} TIER(S) HAD ZERO PASSING ASSERTIONS [GATE REJECTED]`);
    } else if (unhandledErrors > 0) {
      console.log(`❌ VERIFICATION VERDICT       : ${unhandledErrors} UNHANDLED RUNNER ERROR(S) [GATE REJECTED]`);
    } else {
      console.log('❌ VERIFICATION VERDICT       : VERIFICATION GATE CRITERIA NOT MET [GATE REJECTED]');
    }
    console.log('='.repeat(80));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n❌ Uncaught error during E2E master test run:', err);
  process.exit(1);
});
