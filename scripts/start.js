#!/usr/bin/env node
/**
 * NASA Microgravity Combustion Science Dashboard & SI Harness
 * CLI Startup Launcher (`scripts/start.js`)
 */

import { startServer } from '../src/server/server.ts';

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';

startServer(port, host)
  .then((srv) => {
    const addr = srv.address();
    const boundPort = typeof addr === 'object' && addr ? addr.port : port;
    console.log('========================================================================');
    console.log('🚀 NASA SPACE APPS CHALLENGE — AETHER-SI MICROGRAVITY COMBUSTION');
    console.log(`🌐 Mission Control Web HUD : http://${host}:${boundPort}`);
    console.log(`📡 REST API Health Check   : http://${host}:${boundPort}/api/health`);
    console.log('📊 Datasets Ingested       : NASA_DATASET.xlsx + NASA_DATASET_ANALYZED_V2.xlsx (26 PSI)');
    console.log('🧠 Active SI Engine        : 4-Algorithm Ensemble (Physics + TOPSIS + iForest + DBN)');
    console.log('========================================================================');
  })
  .catch((err) => {
    console.error('❌ Failed to launch AETHER-SI server:', err);
    process.exit(1);
  });
