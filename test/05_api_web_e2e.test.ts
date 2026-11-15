/**
 * E2E Test Suite — Tier 5: Web API Endpoints, REST Router & Static Asset Server
 * 
 * Tests the complete native Node.js HTTP server lifecycle and full-stack REST API:
 * 1. Server lifecycle on ephemeral port (port 0 binding, clean teardown)
 * 2. System health endpoint (/api/health)
 * 3. 26 PSI Investigation catalog endpoints (/api/investigations, /api/investigations/:id)
 * 4. Habitat scenarios endpoint (/api/scenarios)
 * 5. Predictive simulation analytical endpoint (/api/analyze)
 *    - Valid payload execution (PMMA, Artemis LEA, Critical tier)
 *    - Malformed JSON handling (400 Bad Request)
 *    - Missing required fields validation (400 Bad Request)
 *    - Out-of-bounds parameter validation (400 Bad Request)
 * 6. Comparative matrix endpoint (/api/compare)
 * 7. Full catalog export endpoint (/api/export)
 * 8. Static asset delivery & security headers (index.html, styles.css, app.js, nosniff)
 * 
 * Framework: Native Node.js node:test, node:assert/strict, and global fetch
 * Requirements Covered: F11 (Native HTTP Server & REST Router), F12 (Static Asset Server), §R4, §R5
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

let server: Server;
let baseUrl: string;
let serverMod: any;

before(async () => {
  // Dynamically import server module
  serverMod = await import('../src/server/server.ts');

  if (typeof serverMod.startServer === 'function') {
    const started = await serverMod.startServer(0, '127.0.0.1');
    if (started && typeof started.address === 'function') {
      server = started;
    } else if (started && started.server) {
      server = started.server;
    } else if (started && typeof started.port === 'number') {
      baseUrl = `http://127.0.0.1:${started.port}`;
      server = started.server;
    }
  } else if (typeof serverMod.createServer === 'function') {
    server = serverMod.createServer();
    await new Promise<void>((resolve, reject) => {
      server.listen(0, '127.0.0.1', () => resolve());
      server.once('error', reject);
    });
  } else if (serverMod.default && typeof serverMod.default.listen === 'function') {
    server = serverMod.default;
    await new Promise<void>((resolve, reject) => {
      server.listen(0, '127.0.0.1', () => resolve());
      server.once('error', reject);
    });
  } else {
    throw new Error('src/server/server.ts must export startServer() or createServer()');
  }

  if (server && !baseUrl) {
    const addr = server.address() as AddressInfo;
    assert.ok(addr && typeof addr.port === 'number', 'Server must be listening on a valid dynamic port');
    baseUrl = `http://127.0.0.1:${addr.port}`;
  }

  assert.ok(baseUrl && baseUrl.startsWith('http://127.0.0.1:'), `Base URL must be established: ${baseUrl}`);
});

after(async () => {
  if (typeof serverMod?.stopServer === 'function') {
    await serverMod.stopServer();
  } else if (server && typeof server.close === 'function') {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
});

describe('Tier 5: Web API Endpoints & Static Asset Delivery (F11, F12)', () => {

  // ==========================================================================
  // Suite 5.1: Native HTTP Server Lifecycle
  // ==========================================================================
  describe('5.1 Server Lifecycle on Ephemeral Port', () => {

    it('5.1.1 should bind to an ephemeral OS port (> 1024) without conflict', () => {
      const port = Number(new URL(baseUrl).port);
      assert.ok(typeof port === 'number' && port > 1024, `Port must be dynamic ephemeral (> 1024), got: ${port}`);
    });
  });

  // ==========================================================================
  // Suite 5.2: Health Check Endpoint
  // ==========================================================================
  describe('5.2 System Health Endpoint (GET /api/health)', () => {

    it('5.2.1 should return 200 OK with valid health status and exactly 26 PSI records', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.status, 200, 'GET /api/health must return 200 OK');

      const contentType = res.headers.get('content-type') || '';
      assert.ok(contentType.includes('application/json'), 'Health endpoint must respond with application/json');

      const data = await res.json();
      assert.ok(['online', 'healthy', 'ok'].includes(data.status?.toLowerCase()), `Status must be online, got: ${data.status}`);
      assert.ok(typeof data.timestamp === 'string', 'Timestamp must be an ISO string');
      assert.ok(!isNaN(Date.parse(data.timestamp)), 'Timestamp must parse to a valid date');
      assert.ok(typeof data.uptime === 'number' && data.uptime >= 0, 'Uptime must be a non-negative number');
      assert.equal(data.recordsCount, 26, 'Health check must report exactly 26 ingested PSI records');
      assert.ok(typeof data.version === 'string' && data.version.length > 0, 'Version string must be present');
    });
  });

  // ==========================================================================
  // Suite 5.3: Investigation Catalog Endpoints
  // ==========================================================================
  describe('5.3 Investigation Catalog Endpoints (GET /api/investigations)', () => {

    it('5.3.1 should return the complete array of 26 enriched PSI investigations', async () => {
      const res = await fetch(`${baseUrl}/api/investigations`);
      assert.equal(res.status, 200, 'GET /api/investigations must return 200 OK');

      const list = await res.json();
      assert.ok(Array.isArray(list), 'Payload must be an array of investigations');
      assert.equal(list.length, 26, 'Must return exactly 26 investigations from the PSI database');

      // Verify canonical NASA PSI investigations are present
      const ids = list.map((item: any) => item.id);
      const expectedCanonical = ['PSI-47', 'PSI-26', 'PSI-69', 'PSI-68', 'PSI-21', 'PSI-100'];
      for (const expectedId of expectedCanonical) {
        assert.ok(ids.includes(expectedId), `Catalog must include canonical investigation: ${expectedId}`);
      }
    });

    it('5.3.2 should enforce strict schema invariants on all 26 investigation items', async () => {
      const res = await fetch(`${baseUrl}/api/investigations`);
      const list = await res.json();

      for (const item of list) {
        assert.ok(typeof item.id === 'string' && item.id.startsWith('PSI-'), `Item ID invalid: ${item.id}`);
        assert.ok(typeof item.name === 'string' && item.name.length > 0, `Item ${item.id} missing name`);
        assert.ok(typeof item.url === 'string' && item.url.startsWith('http'), `Item ${item.id} missing valid URL`);
        assert.ok(Array.isArray(item.oxygenRangePct) && item.oxygenRangePct.length === 2, `Item ${item.id} missing oxygenRangePct`);
        assert.ok(Array.isArray(item.pressureRangeKPa) && item.pressureRangeKPa.length === 2, `Item ${item.id} missing pressureRangeKPa`);
        assert.ok(Array.isArray(item.fuelTypes) && item.fuelTypes.length > 0, `Item ${item.id} must list fuel types`);
      }
    });

    it('5.3.3 should return single investigation detail on GET /api/investigations/:id', async () => {
      const res = await fetch(`${baseUrl}/api/investigations/PSI-47`);
      assert.equal(res.status, 200, 'GET /api/investigations/PSI-47 must return 200 OK');

      const item = await res.json();
      assert.equal(item.id, 'PSI-47');
      assert.equal(item.name, 'BASS');
      assert.ok(item.fuelTypes.some((f: string) => f.includes('PMMA')), 'BASS must list PMMA fuel');
      assert.equal(item.isCombustion, true, 'BASS must be categorized as a combustion investigation');
    });

    it('5.3.4 should return 404 Not Found for non-existent investigation ID', async () => {
      const res = await fetch(`${baseUrl}/api/investigations/PSI-9999`);
      assert.equal(res.status, 404, 'Non-existent investigation ID must return 404 Not Found');

      const err = await res.json();
      assert.ok(typeof err.error === 'string', 'Error response must contain descriptive error message');
    });
  });

  // ==========================================================================
  // Suite 5.4: Habitat Scenarios Endpoint
  // ==========================================================================
  describe('5.4 Habitat Scenarios Endpoint (GET /api/scenarios)', () => {

    it('5.4.1 should return all 5 exploration habitat environments with correct hazard tiers', async () => {
      const res = await fetch(`${baseUrl}/api/scenarios`);
      assert.equal(res.status, 200, 'GET /api/scenarios must return 200 OK');

      const scenarios = await res.json();
      assert.ok(Array.isArray(scenarios), 'Scenarios payload must be an array');
      assert.equal(scenarios.length, 5, 'Must return exactly 5 habitat environments');

      const artemis = scenarios.find((s: any) => s.id === 'artemis_lunar');
      assert.ok(artemis, 'Artemis lunar scenario must be present');
      assert.equal(artemis.oxygenPct, 34.0, 'Artemis oxygen must be 34%');
      assert.equal(artemis.fireHazardTier, 'CRITICAL', 'Artemis hazard tier must be CRITICAL');

      const iss = scenarios.find((s: any) => s.id === 'iss');
      assert.ok(iss, 'ISS scenario must be present');
      assert.equal(iss.oxygenPct, 21.0, 'ISS oxygen must be 21%');
      assert.equal(iss.fireHazardTier, 'MODERATE', 'ISS hazard tier must be MODERATE');
    });
  });

  // ==========================================================================
  // Suite 5.5: Predictive Simulation Endpoint
  // ==========================================================================
  describe('5.5 Predictive Simulation Endpoint (POST /api/analyze)', () => {

    it('5.5.1 should compute SCRI risk score and warnings for valid simulation input', async () => {
      const payload = {
        oxygenPct: 34.0,
        pressureKPa: 56.5,
        velocityCmS: 15.0,
        gravityG: 0.166,
        fuelType: 'PMMA',
        geometryType: 'thin_fabric'
      };

      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      assert.equal(res.status, 200, 'POST /api/analyze with valid input must return 200 OK');

      const result = await res.json();
      assert.ok(typeof result.scriScore === 'number', 'Result must contain numeric scriScore');
      assert.ok(result.scriScore >= 0 && result.scriScore <= 100, `scriScore (${result.scriScore}) out of [0, 100]`);
      assert.equal(result.riskTier, 'CRITICAL', 'Artemis LEA 34% O2 input must produce CRITICAL riskTier');
      assert.equal(result.isFlammable, true, 'PMMA in Artemis LEA must be flammable');
      assert.ok(result.flameSpreadVelocityMmS > 0, 'Flame spread velocity must be positive');

      assert.ok(result.subScores && typeof result.subScores === 'object', 'Must include subScores object');
      assert.ok(typeof result.subScores.atmospheric === 'number', 'subScores.atmospheric must be a number');
      assert.ok(typeof result.subScores.flammability === 'number', 'subScores.flammability must be a number');

      assert.ok(Array.isArray(result.warnings) && result.warnings.length > 0, 'Must include warnings array');
      assert.ok(Array.isArray(result.recommendations) && result.recommendations.length > 0, 'Must include recommendations');
    });

    it('5.5.2 should return 400 Bad Request on malformed JSON body', async () => {
      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ malformed json syntax !!!'
      });

      assert.equal(res.status, 400, 'Malformed JSON body must return 400 Bad Request');
      const err = await res.json();
      assert.ok(typeof err.error === 'string', 'Error payload must contain descriptive string');
    });

    it('5.5.3 should return 400 Bad Request when required fields are missing', async () => {
      const incompletePayload = {
        oxygenPct: 21.0
        // missing pressureKPa, velocityCmS, gravityG, fuelType, geometryType
      };

      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incompletePayload)
      });

      assert.equal(res.status, 400, 'Incomplete payload must return 400 Bad Request');
      const err = await res.json();
      assert.ok(typeof err.error === 'string', 'Error message must note missing fields');
    });

    it('5.5.4 should return 400 Bad Request when input values are out of physical bounds', async () => {
      const invalidPayload = {
        oxygenPct: 150.0, // illegal > 100%
        pressureKPa: -10.0, // illegal negative pressure
        velocityCmS: 20.0,
        gravityG: 0.0,
        fuelType: 'PMMA',
        geometryType: 'thin_fabric'
      };

      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload)
      });

      assert.equal(res.status, 400, 'Out-of-bounds parameters must return 400 Bad Request');
      const err = await res.json();
      assert.ok(typeof err.error === 'string', 'Error message must specify invalid parameters');
    });
  });

  // ==========================================================================
  // Suite 5.6: Comparative Matrix Endpoint
  // ==========================================================================
  describe('5.6 Comparative Matrix Endpoint (GET /api/compare)', () => {

    it('5.6.1 should return comparative metrics for multiple investigations', async () => {
      const res = await fetch(`${baseUrl}/api/compare?ids=PSI-47,PSI-69,PSI-68`);
      assert.equal(res.status, 200, 'GET /api/compare with ids must return 200 OK');

      const data = await res.json();
      assert.ok(Array.isArray(data.items), 'Response items must be an array');
      assert.equal(data.items.length, 3, 'Must return exactly 3 compared items');
      assert.ok(data.comparativeMetrics && typeof data.comparativeMetrics === 'object', 'Must include comparativeMetrics');
    });

    it('5.6.2 should handle missing or empty ids parameter gracefully', async () => {
      const res = await fetch(`${baseUrl}/api/compare`);
      // Should return 400 Bad Request or empty comparative response
      assert.ok(
        res.status === 400 || res.status === 200,
        `Expected status 400 or 200, got: ${res.status}`
      );
      if (res.status === 200) {
        const data = await res.json();
        assert.ok(Array.isArray(data.items) && data.items.length === 0, 'Empty ids should yield empty items array');
      }
    });
  });

  // ==========================================================================
  // Suite 5.7: Full Catalog Export Endpoint
  // ==========================================================================
  describe('5.7 Full Catalog Export (GET /api/export)', () => {

    it('5.7.1 should serialize complete database catalog and scenarios as JSON', async () => {
      const res = await fetch(`${baseUrl}/api/export`);
      assert.equal(res.status, 200, 'GET /api/export must return 200 OK');

      const contentType = res.headers.get('content-type') || '';
      assert.ok(contentType.includes('application/json'), 'Export must respond with application/json');

      const dump = await res.json();
      assert.ok(Array.isArray(dump.investigations), 'Export must contain investigations array');
      assert.equal(dump.investigations.length, 26, 'Exported investigations count must be 26');
      assert.ok(Array.isArray(dump.scenarios), 'Export must contain scenarios array');
      assert.equal(dump.scenarios.length, 5, 'Exported scenarios count must be 5');
    });
  });

  // ==========================================================================
  // Suite 5.8: Static Asset Delivery & Security Headers
  // ==========================================================================
  describe('5.8 Static Asset Delivery & Security Headers (F12)', () => {

    it('5.8.1 should serve root index.html with correct text/html MIME type', async () => {
      const res = await fetch(`${baseUrl}/`);
      assert.equal(res.status, 200, 'Root GET / must return 200 OK');

      const contentType = res.headers.get('content-type') || '';
      assert.ok(contentType.includes('text/html'), `Expected text/html, got: ${contentType}`);

      const html = await res.text();
      assert.ok(html.toLowerCase().includes('<!doctype html>'), 'HTML document must contain doctype');
      assert.ok(
        html.toLowerCase().includes('nasa') || html.toLowerCase().includes('microgravity'),
        'HTML document must include NASA Microgravity branding'
      );
    });

    it('5.8.2 should serve styles.css stylesheet with correct text/css MIME type', async () => {
      const res = await fetch(`${baseUrl}/styles.css`);
      assert.equal(res.status, 200, 'GET /styles.css must return 200 OK');

      const contentType = res.headers.get('content-type') || '';
      assert.ok(contentType.includes('text/css'), `Expected text/css, got: ${contentType}`);
    });

    it('5.8.3 should serve app.js client bundle with javascript MIME type', async () => {
      const res = await fetch(`${baseUrl}/app.js`);
      assert.equal(res.status, 200, 'GET /app.js must return 200 OK');

      const contentType = res.headers.get('content-type') || '';
      assert.ok(
        contentType.includes('javascript'),
        `Expected javascript MIME type, got: ${contentType}`
      );
    });

    it('5.8.4 should return 404 Not Found for non-existent static file', async () => {
      const res = await fetch(`${baseUrl}/non_existent_asset_404_test.xyz`);
      assert.equal(res.status, 404, 'Non-existent file must return 404 Not Found');
    });

    it('5.8.5 should attach X-Content-Type-Options: nosniff security header', async () => {
      const res = await fetch(`${baseUrl}/`);
      const nosniff = res.headers.get('x-content-type-options');
      assert.equal(nosniff, 'nosniff', 'Must include X-Content-Type-Options: nosniff header');
    });

    it('5.8.6 should reject unsupported HTTP methods on REST endpoints (e.g. PUT /api/health)', async () => {
      const res = await fetch(`${baseUrl}/api/health`, { method: 'PUT' });
      assert.ok(
        res.status === 405 || res.status === 404,
        `Expected 405 Method Not Allowed or 404, got: ${res.status}`
      );
    });
  });
});
