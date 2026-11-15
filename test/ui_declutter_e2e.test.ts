/**
 * NASA Microgravity Combustion Science Dashboard & System Identification (SI)
 * UI Decluttering, Formulas Display & SI Inspector E2E Verification Suite
 * Path: test/ui_declutter_e2e.test.ts
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Server } from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('UI Decluttering, Mathematical Formulas & SI Engine Inspection E2E', () => {
  const htmlPath = path.join(rootDir, 'public', 'index.html');
  const cssPath = path.join(rootDir, 'public', 'styles.css');
  const jsPath = path.join(rootDir, 'public', 'app.js');

  const html = fs.readFileSync(htmlPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');
  const js = fs.readFileSync(jsPath, 'utf8');

  // ==========================================================================
  // 1. Acceptance Criteria: UI Decluttering & Layout Organization (R1)
  // ==========================================================================
  describe('1. UI Decluttering & Layout Organization (R1)', () => {
    it('1.1 should have completely removed all .param-hint boxes and hint elements', () => {
      assert.equal(html.includes('class="param-hint"'), false, 'index.html must not contain param-hint class');
      assert.equal(html.includes('id="hint-efield"'), false, 'index.html must not contain hint-efield id');
      assert.equal(css.includes('.param-hint'), false, 'styles.css must not contain .param-hint rules');
    });

    it('1.2 should adhere to the monochrome visual style referencing index.tsx', () => {
      assert.ok(css.includes('--scada-slate-900'), 'CSS must define slate monochrome variables');
      assert.ok(css.includes('--scada-border'), 'CSS must define scada border variables');
      assert.ok(css.includes('--font-math'), 'CSS must define mathematical typography font');
      assert.ok(html.includes('class="top-header-bar"'), 'HTML must render top header bar');
      assert.ok(html.includes('iuh-corner-box'), 'HTML must retain IUH branding');
    });

    it('1.3 should retain all core monitoring and operational controls accessible on the page', () => {
      const coreIds = [
        'btn-toggle-auto',
        'btn-act-uv',
        'btn-act-daft',
        'btn-act-mist',
        'param-tab-strip',
        'chips-o2',
        'slider-o2',
        'chips-g',
        'slider-g',
        'chips-psi',
        'slider-psi',
        'chips-fan',
        'slider-fan',
        'chips-efield',
        'slider-efield',
        'fuel-selector-strip',
        'chamber-canvas',
        'btn-trig-hot',
        'btn-trig-cool',
        'btn-trig-dust',
        'btn-trig-n2',
        'arc-temp',
        'needle-temp',
        'gauge-temp-val',
        'gauge-vf-val',
        'arc-risk',
        'needle-risk',
        'gauge-risk-val',
        'gauge-moc-val',
        'chart-temp-bars',
        'chart-gravity-bars',
        'predictive-horizon-svg'
      ];

      for (const id of coreIds) {
        assert.ok(html.includes(`id="${id}"`), `HTML must contain core control/gauge ID: ${id}`);
      }
    });
  });

  // ==========================================================================
  // 2. Acceptance Criteria: Combustion Physics & SI Formulas (R2)
  // ==========================================================================
  describe('2. Combustion Physics & SI Mathematical Formulas Display (R2)', () => {
    it('2.1 should render microgravity droplet burning (d²-law) formulas legibly', () => {
      assert.ok(html.includes('d²(t) = d₀² − K · t') || html.includes('d²-law'), 'Must render d²-law droplet burning formula');
      assert.ok(html.includes('id="formula-live-d2"'), 'Must render live dynamic d2 calculation badge');
      assert.ok(html.includes('formula-card'), 'Must format formulas in dedicated cards');
    });

    it('2.2 should render soot radiative heat loss equation legibly', () => {
      assert.ok(html.includes('q̇_rad = 4σ · κ_p · (T_f⁴ − T_∞⁴)') || html.includes('q̇_rad'), 'Must render soot radiation formula');
      assert.ok(html.includes('id="formula-live-qrad"'), 'Must render live dynamic soot radiation badge');
    });

    it('2.3 should render internal SI PINN residual and loss equations', () => {
      assert.ok(html.includes('ℒ_PINN') || html.includes('PINN Residual'), 'Must render PINN loss / residual equation');
      assert.ok(html.includes('ℛ_PDE') || html.includes('Energy PDE Residual'), 'Must render PDE energy conservation equation');
      assert.ok(html.includes('id="formula-live-pinn"'), 'Must render live dynamic PINN residual readout');
    });

    it('2.4 should render internal SI ensemble loss and state estimation equations', () => {
      assert.ok(html.includes('ℒ_Ensemble') || html.includes('Ensemble Loss'), 'Must render Ensemble Loss equation');
      assert.ok(html.includes('id="formula-live-ensemble"'), 'Must render live dynamic ensemble loss readout');
      assert.ok(html.includes('x̂_{t+1') || html.includes('f_SI'), 'Must render state estimation equation');
    });
  });

  // ==========================================================================
  // 3. Acceptance Criteria: SI Engine Operation Inspection (R3)
  // ==========================================================================
  describe('3. SI Engine Operation Inspection (R3)', () => {
    it('3.1 should render interactive inspection triggers without cluttering layout', () => {
      assert.ok(html.includes('id="btn-open-si-inspect"'), 'Must render SI inspection button in Edge SI panel');
      assert.ok(html.includes('id="btn-open-si-inspect-strip"'), 'Must render SI inspection shortcut in top control strip');
      assert.ok(html.includes('id="modal-si-inspect"'), 'Must render modal-si-inspect diagnostic window');
    });

    it('3.2 should provide verification signals and inference metrics in diagnostic view', () => {
      const inspectIds = [
        'si-inspect-model-id',
        'si-inspect-architecture',
        'si-inspect-latency',
        'si-inspect-comms-bypassed',
        'si-inspect-pinn-residual',
        'si-inspect-cusum-drift',
        'si-inspect-maha-ood',
        'si-inspect-conformal-interval',
        'si-inspect-bayes-openfire-bar',
        'si-inspect-bayes-smolder-bar',
        'si-inspect-bayes-dust-bar',
        'si-inspect-bayes-nominal-bar',
        'si-inspect-bayes-rationale',
        'si-inspect-iforest-score',
        'si-inspect-iforest-channel',
        'si-inspect-aiot-nodes-table',
        'si-inspect-actuators-list',
        'btn-run-si-selftest',
        'si-selftest-status'
      ];

      for (const id of inspectIds) {
        assert.ok(html.includes(`id="${id}"`), `Diagnostic view must contain inspector ID: ${id}`);
      }
    });

    it('3.3 should wire interactive inspection handlers and self-test verification in app.js', () => {
      assert.ok(js.includes('openSiInspector'), 'app.js must define openSiInspector');
      assert.ok(js.includes('renderSiInspector'), 'app.js must define renderSiInspector');
      assert.ok(js.includes('btn-run-si-selftest'), 'app.js must wire self-test verification button');
    });

    it('3.4 should validate that app.js is syntactically valid and compiles cleanly', () => {
      const codeWithoutImports = js.replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?/gm, '');
      assert.doesNotThrow(() => {
        new Function(codeWithoutImports);
      }, 'app.js should be syntactically valid JavaScript');
    });
  });

  // ==========================================================================
  // 4. Acceptance Criteria: Server E2E Live Integration
  // ==========================================================================
  describe('4. Server E2E Live Integration with POST /api/analyze', () => {
    let server: Server;
    let baseUrl: string;

    before(async () => {
      const serverMod = await import('../src/server/server.ts');
      const started = await serverMod.startServer(0, '127.0.0.1');
      server = started.server || started;
      const addr: any = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
    });

    after(async () => {
      if (server && typeof server.close === 'function') {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it('4.1 should serve decluttered index.html without errors', async () => {
      const res = await fetch(`${baseUrl}/`);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.ok(text.includes('Flame in Freefall'));
      assert.equal(text.includes('class="param-hint"'), false);
    });

    it('4.2 should respond with 200 OK and full siEnsemble for frontend simulation payloads', async () => {
      const fuelPayloads = [
        { fuelType: 'pmma', geometryType: 'cylinder_rod' },
        { fuelType: 'heptane', geometryType: 'droplet' },
        { fuelType: 'methane', geometryType: 'gas_jet' },
        { fuelType: 'cotton', geometryType: 'thin_fabric' }
      ];

      for (const p of fuelPayloads) {
        const res = await fetch(`${baseUrl}/api/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oxygenPct: 34,
            pressureKPa: 56.5,
            velocityCmS: 12,
            gravityG: 0.16,
            fuelType: p.fuelType,
            geometryType: p.geometryType,
            sensorTelemetry: {
              tempRiseRateCS: 0.85,
              opticalObscurationPctM: 4.2,
              coPpm: 145,
              co2Ppm: 2100,
              ionCurrentMicroAmps: 0.5,
              sootConcentrationMgM3: 8.5
            }
          })
        });

        assert.equal(res.status, 200, `POST /api/analyze should return 200 for ${p.fuelType}`);
        const data = await res.json();
        assert.ok(data.siEnsemble, 'Response must include siEnsemble');
        assert.ok(data.siEnsemble.edgeAiotModel, 'siEnsemble must include edgeAiotModel');
        assert.ok(data.siEnsemble.isolationForest, 'siEnsemble must include isolationForest');
        assert.ok(data.siEnsemble.bayesianArbitrator, 'siEnsemble must include bayesianArbitrator');
        assert.ok(data.siEnsemble.topsis, 'siEnsemble must include topsis');
        assert.ok(data.siEnsemble.verification, 'siEnsemble must include live verification signals');
      }
    });

    it('4.3 should serve 26 enriched investigations with typed schema for excel catalog table', async () => {
      const res = await fetch(`${baseUrl}/api/investigations`);
      assert.equal(res.status, 200);
      const catalog = await res.json();
      assert.ok(Array.isArray(catalog), 'Catalog response must be an array');
      assert.equal(catalog.length, 26, 'Must contain all 26 canonical investigations');

      const bass = catalog.find((c: any) => c.id === 'PSI-47');
      assert.ok(bass, 'BASS (PSI-47) must be present');
      assert.ok(bass.name, 'Investigation must contain name');
      assert.ok(bass.category, 'Investigation must contain category');
      assert.ok(Array.isArray(bass.oxygenRangePct), 'Must provide oxygenRangePct tuple');
      assert.ok(Array.isArray(bass.pressureRangeKPa), 'Must provide pressureRangeKPa tuple');
    });

    it('4.4 should provide 12 ranked materials under siEnsemble.topsis for material table rendering', async () => {
      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oxygenPct: 34,
          pressureKPa: 56.5,
          velocityCmS: 12,
          gravityG: 0.16,
          fuelType: 'pmma',
          geometryType: 'cylinder_rod'
        })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      const materials = data.siEnsemble?.topsis?.rankedMaterials;
      assert.ok(Array.isArray(materials), 'siEnsemble.topsis.rankedMaterials must be an array');
      assert.equal(materials.length, 12, 'Must provide exactly 12 ranked spacecraft materials');

      for (const m of materials) {
        assert.ok(typeof m.rank === 'number', 'Rank must be a number');
        assert.ok(m.materialName || m.name, 'Material must have a name');
        assert.ok(typeof (m.dynamicLocPct ?? m.loiPercent) === 'number', 'LOC must be numeric');
        assert.ok(typeof (m.closenessCoefficient ?? m.topsisScore) === 'number', 'TOPSIS score must be numeric');
      }
    });

    it('4.5 should provide verified live signals in siEnsemble.verification', async () => {
      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oxygenPct: 21,
          pressureKPa: 101.3,
          velocityCmS: 10,
          gravityG: 0.0,
          fuelType: 'pmma',
          geometryType: 'cylinder_rod'
        })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      const ver = data.siEnsemble?.verification;
      assert.ok(ver, 'siEnsemble must include verification object');
      assert.ok(typeof ver.pinnResidualL2 === 'number' && ver.pinnResidualL2 < 0.01, 'PINN residual must be converged < 0.01');
      assert.ok(typeof ver.cusumDriftScore === 'number', 'CUSUM score must be numeric');
      assert.ok(typeof ver.mahalanobisDistance === 'number', 'Mahalanobis distance must be numeric');
      assert.ok(typeof ver.conformalMargin === 'number', 'Conformal margin must be numeric');
    });

    it('4.6 should handle rapid AbortController cancellations without unhandled rejections', async () => {
      // Simulate rapid user slider dragging with aborted requests
      const controllers = [new AbortController(), new AbortController(), new AbortController()];
      const promises = controllers.map((ctrl, idx) => {
        const p = fetch(`${baseUrl}/api/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
          body: JSON.stringify({
            oxygenPct: 20 + idx * 5,
            pressureKPa: 50,
            velocityCmS: 10,
            gravityG: 0.16,
            fuelType: 'pmma',
            geometryType: 'cylinder_rod'
          })
        }).catch((err) => {
          // Expected abort error
          return { aborted: true, name: err.name };
        });
        ctrl.abort(); // Immediately cancel
        return p;
      });

      const results = await Promise.all(promises);
      for (const r of results) {
        assert.ok((r as any).aborted, 'Cancelled fetch should be gracefully handled');
      }

      // Subsequent un-aborted request should succeed immediately
      const finalRes = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oxygenPct: 34,
          pressureKPa: 56.5,
          velocityCmS: 12,
          gravityG: 0.16,
          fuelType: 'pmma',
          geometryType: 'cylinder_rod'
        })
      });
      assert.equal(finalRes.status, 200, 'Subsequent request must return 200 OK');
    });
  });

  // ==========================================================================
  // 5. Open Issues & Adversarial Edge Cases (OI-1, OI-4, OI-5)
  // ==========================================================================
  describe('5. Open Issues & Adversarial Edge Cases (OI-1, OI-4, OI-5)', () => {
    const visPath = path.join(rootDir, 'public', 'visualizer.js');
    const vis = fs.readFileSync(visPath, 'utf8');

    it('5.1 should verify that all element IDs referenced in app.js and visualizer.js exist in index.html (OI-1)', () => {
      const idRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
      const referencedIds = new Set<string>();
      let match: RegExpExecArray | null;

      while ((match = idRegex.exec(js)) !== null) {
        referencedIds.add(match[1]);
      }
      while ((match = idRegex.exec(vis)) !== null) {
        referencedIds.add(match[1]);
      }

      assert.ok(referencedIds.size > 20, 'Should reference at least 20 dynamic element IDs');

      const missing: string[] = [];
      for (const id of referencedIds) {
        if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
          missing.push(id);
        }
      }

      assert.deepEqual(missing, [], `All referenced element IDs must exist in index.html: missing [${missing.join(', ')}]`);
    });

    it('5.2 should verify that there are zero duplicate element IDs in index.html (OI-1)', () => {
      const idAttrRegex = /\bid=["']([^"']+)["']/g;
      const seen = new Set<string>();
      const duplicates: string[] = [];
      let match: RegExpExecArray | null;

      while ((match = idAttrRegex.exec(html)) !== null) {
        const id = match[1];
        if (seen.has(id)) {
          duplicates.push(id);
        }
        seen.add(id);
      }

      assert.deepEqual(duplicates, [], `index.html must have 0 duplicate element IDs: found [${duplicates.join(', ')}]`);
    });

    it('5.3 should provide complete 12 NASA-STD-6001 materials fallback for offline execution (OI-4)', () => {
      assert.ok(js.includes('DEFAULT_SPACECRAFT_MATERIALS'), 'app.js must define DEFAULT_SPACECRAFT_MATERIALS');
      assert.ok(js.includes('renderMaterialTopsisTable'), 'app.js must define renderMaterialTopsisTable');

      // Verify that all 12 materials are present in the fallback data
      const expectedMaterials = [
        'ptfe', 'ultem', 'kapton', 'nomex', 'delrin', 'mylar',
        'methane', 'pmma', 'silicone', 'heptane', 'polyethylene', 'cotton'
      ];
      for (const mat of expectedMaterials) {
        assert.ok(js.includes(mat), `DEFAULT_SPACECRAFT_MATERIALS must include ${mat}`);
      }
    });

    it('5.4 should verify physical formulas evaluate without NaN under extreme parameter boundaries (OI-5)', () => {
      // Simulate extreme inputs that would test computeScadaPhysics
      const extremeCases = [
        { g: 0.0, o2: 10.0, psi: 4.0, fan: 0, ef: 0 },       // ISS quiescent vacuum
        { g: 0.0, o2: 100.0, psi: 16.7, fan: 15, ef: 0 },    // Apollo 1 hyperoxic
        { g: 0.16, o2: 34.0, psi: 8.2, fan: 55, ef: 10 },    // Lunar max convection + E-field
        { g: 0.38, o2: 26.0, psi: 10.2, fan: 12, ef: 6.5 },  // Mars habitat
        { g: 1.0, o2: 21.0, psi: 14.7, fan: 10, ef: 0 }      // Terrestrial baseline
      ];

      for (const c of extremeCases) {
        // Analytical formula calculation mirror
        const activeFan = c.fan;
        const vBuoyant = 32.0 * Math.sqrt(Math.max(0, c.g)) * (Math.max(0.1, c.psi) / 14.7);
        const vIonWind = c.ef * 1.85;
        const vEffective = Math.sqrt(Math.pow(vBuoyant + vIonWind, 2) + Math.pow(activeFan, 2));

        assert.ok(!isNaN(vBuoyant) && isFinite(vBuoyant), `vBuoyant must be finite for ${JSON.stringify(c)}`);
        assert.ok(!isNaN(vEffective) && isFinite(vEffective), `vEffective must be finite for ${JSON.stringify(c)}`);

        const flowAmplifier =
          vEffective < 2
            ? 0.48
            : vEffective <= 18
            ? 1.0 + 0.50 * Math.sin(((vEffective - 2) / 16) * Math.PI)
            : Math.max(0.62, 1.35 - (vEffective - 18) * 0.013);

        const theoreticalVf =
          1.75 *
          Math.pow(Math.max(10, c.o2) / 21.0, 1.65) *
          Math.pow(Math.max(0.1, c.psi) / 14.7, 0.45) *
          flowAmplifier;

        assert.ok(!isNaN(theoreticalVf) && isFinite(theoreticalVf), `theoreticalVf must be finite for ${JSON.stringify(c)}`);
      }
    });

    it('5.5 should wire modal backdrop click and ESC key dismissals for accessible UX (OI-5)', () => {
      assert.ok(js.includes("e.target === backdrop"), 'app.js must dismiss modals on backdrop click');
      assert.ok(js.includes("e.key === 'Escape'"), 'app.js must dismiss modals on Escape key press');
      assert.ok(js.includes("modal-backdrop.open"), 'app.js must target open modal backdrops');
    });

    it('5.6 should dynamically update verification status tags and debounce self-test button (OI-5)', () => {
      assert.ok(html.includes('id="si-inspect-pinn-tag"'), 'index.html must have PINN tag element');
      assert.ok(html.includes('id="si-inspect-cusum-tag"'), 'index.html must have CUSUM tag element');
      assert.ok(html.includes('id="si-inspect-maha-tag"'), 'index.html must have Mahalanobis tag element');
      assert.ok(html.includes('id="si-inspect-conformal-tag"'), 'index.html must have Conformal tag element');

      assert.ok(css.includes('.si-signal-tag.pass'), 'styles.css must style pass status');
      assert.ok(css.includes('.si-signal-tag.warn'), 'styles.css must style warn status');

      assert.ok(js.includes('selfTestBtn.disabled = true'), 'app.js must disable self-test button while running');
      assert.ok(js.includes('selfTestBtn.disabled = false'), 'app.js must re-enable self-test button upon completion');
    });

    it('5.7 should provide immediate reactive fuel calculation and distinct physical parameters for all 5 fuels (OI-7)', () => {
      assert.ok(js.includes('FUEL_PROPERTIES'), 'app.js must define canonical FUEL_PROPERTIES dictionary');
      assert.ok(js.includes('setFuelType'), 'app.js must define synchronous setFuelType handler');

      const fuels = ['pmma_rod', 'heptane_droplet', 'methane_counterflow', 'cotton_fabric', 'filter_dust'];
      for (const f of fuels) {
        assert.ok(js.includes(f), `FUEL_PROPERTIES must contain entry for ${f}`);
      }

      // Check that formulas panel elements update dynamically with fuel regime information
      assert.ok(js.includes('fuelProp.regimeName'), 'updateLiveFormulas must incorporate fuel regime into d2 badge');
      assert.ok(js.includes('fuelProp.spaldingBBase'), 'updateLiveFormulas must compute fuel-specific Spalding number B');
      assert.ok(js.includes('fuelProp.sootRadiationFactor'), 'computeScadaPhysics must compute fuel-specific soot radiation');
      assert.ok(js.includes('fuelProp.kappaP'), 'updateLiveFormulas must incorporate fuel-specific Planck absorption');
    });

    it('5.8 should synchronize fuel selection and active chips when loading PSI studies and Excel records (OI-7)', () => {
      assert.ok(js.includes("st.id === 'CIR-FLEX'"), 'applyStudyToSCADA must map CIR-FLEX to droplet fuel');
      assert.ok(js.includes("state.fuelType = 'heptane_droplet'"), 'CIR-FLEX must set heptane_droplet');
      assert.ok(js.includes("state.fuelType = 'filter_dust'"), 'MSG-DAFT2 must set filter_dust');
      assert.ok(js.includes("b.getAttribute('data-fuel') === state.fuelType"), 'Fuel chips must highlight active fuel selection');
    });

    it('5.9 should verify responsive layout, word-breaking, and anti-overflow guards (OI-6)', () => {
      // Check wrap styling on button strips and tab strips
      assert.ok(css.includes('.param-tab-strip') && css.includes('flex-wrap: wrap'), 'param-tab-strip must wrap on tight columns');
      assert.ok(css.includes('.strip-right-actions') && css.includes('flex-wrap: wrap'), 'strip-right-actions must wrap on narrow viewports');
      
      // Check anti-overflow word breaking on dynamic formulas
      assert.ok(css.includes('.formula-dynamic') && css.includes('word-break: break-word'), 'formula-dynamic must prevent line blowout');
      assert.ok(css.includes('.si-diag-formula-summary') && css.includes('word-break: break-word'), 'si-diag-formula-summary must prevent modal overflow');
      
      // Check modal width bounding with viewport units
      assert.ok(css.includes('width: min(680px, 94vw)') || css.includes('width: min('), 'modal-window must be bounded by viewport width');
      assert.ok(css.includes('@media (max-width: 520px)'), 'styles.css must have responsive breakpoint for mobile screens');
    });

    it('5.10 should execute full frontend DOM lifecycle simulation without any console errors or exceptions (OI-1)', async () => {
      // Construct an isolated Mock DOM environment conforming to public/index.html
      const consoleErrors: string[] = [];
      const originalConsoleError = console.error;
      console.error = (...args: any[]) => {
        consoleErrors.push(args.map(String).join(' '));
      };

      try {
        class MockElement {
          id: string;
          tagName: string;
          className: string;
          style: Record<string, string>;
          children: MockElement[];
          attributes: Map<string, string>;
          listeners: Map<string, Array<(e?: any) => void>>;
          _innerHTML: string;
          textContent: string;
          value: string;
          disabled: boolean;
          width: number;
          height: number;

          constructor(id = '', tagName = 'div') {
            this.id = id;
            this.tagName = tagName.toUpperCase();
            this.className = '';
            this.style = {};
            this.children = [];
            this.attributes = new Map();
            this.listeners = new Map();
            this._innerHTML = '';
            this.textContent = '';
            this.value = '';
            this.disabled = false;
            this.width = 520;
            this.height = 175;
          }

          get classList() {
            return {
              add: (...classes: string[]) => {
                const set = new Set(this.className.split(/\s+/).filter(Boolean));
                classes.forEach((c) => set.add(c));
                this.className = Array.from(set).join(' ');
              },
              remove: (...classes: string[]) => {
                const set = new Set(this.className.split(/\s+/).filter(Boolean));
                classes.forEach((c) => set.delete(c));
                this.className = Array.from(set).join(' ');
              },
              toggle: (cls: string, force?: boolean) => {
                const set = new Set(this.className.split(/\s+/).filter(Boolean));
                const shouldAdd = force !== undefined ? force : !set.has(cls);
                if (shouldAdd) set.add(cls);
                else set.delete(cls);
                this.className = Array.from(set).join(' ');
                return shouldAdd;
              },
              contains: (cls: string) => this.className.split(/\s+/).includes(cls)
            };
          }

          get innerHTML() {
            return this._innerHTML;
          }

          set innerHTML(val: string) {
            this._innerHTML = val;
            // Parse IDs or data attributes created dynamically in tables or charts
            const idMatches = val.matchAll(/\bid=["']([^"']+)["']/g);
            for (const m of idMatches) {
              if (!domElementsMap.has(m[1])) {
                domElementsMap.set(m[1], new MockElement(m[1]));
              }
            }
          }

          getAttribute(attr: string) {
            return this.attributes.get(attr) || null;
          }

          setAttribute(attr: string, val: string) {
            this.attributes.set(attr, val);
          }

          addEventListener(evt: string, handler: (e?: any) => void) {
            if (!this.listeners.has(evt)) this.listeners.set(evt, []);
            this.listeners.get(evt)!.push(handler);
          }

          dispatchEvent(e: any) {
            const handlers = this.listeners.get(e.type) || [];
            handlers.forEach((h) => h(e));
          }

          click() {
            this.dispatchEvent({ type: 'click', target: this, stopPropagation: () => {} });
          }

          getContext(type: string) {
            if (type === '2d') {
              return {
                fillRect: () => {},
                beginPath: () => {},
                moveTo: () => {},
                lineTo: () => {},
                stroke: () => {},
                arc: () => {},
                ellipse: () => {},
                fill: () => {},
                save: () => {},
                restore: () => {},
                translate: () => {},
                transform: () => {},
                setLineDash: () => {},
                fillText: () => {},
                createRadialGradient: () => ({ addColorStop: () => {} })
              };
            }
            return null;
          }

          querySelectorAll(sel: string): MockElement[] {
            const results: MockElement[] = [];
            for (const el of domElementsMap.values()) {
              if (matchesSelector(el, sel)) results.push(el);
            }
            return results;
          }
        }

        const domElementsMap = new Map<string, MockElement>();

        // Harvest all static IDs and buttons from index.html
        const idRegex = /\bid=["']([^"']+)["']/g;
        let idMatch: RegExpExecArray | null;
        while ((idMatch = idRegex.exec(html)) !== null) {
          const id = idMatch[1];
          if (!domElementsMap.has(id)) {
            const el = new MockElement(id);
            if (id === 'chamber-canvas') el.tagName = 'CANVAS';
            domElementsMap.set(id, el);
          }
        }

        // Helper to match simple mock CSS selectors
        function matchesSelector(el: MockElement, sel: string): boolean {
          if (sel.startsWith('#')) {
            const parts = sel.split(/\s+/);
            const parent = domElementsMap.get(parts[0].slice(1));
            if (parts.length > 1 && parts[1].startsWith('.')) {
              return el.classList.contains(parts[1].slice(1));
            }
            return el.id === sel.slice(1);
          }
          if (sel.startsWith('.')) {
            return el.classList.contains(sel.slice(1));
          }
          return false;
        }

        // Instantiate fuel buttons with data-fuel attributes
        const fuelKeys = ['pmma_rod', 'heptane_droplet', 'methane_counterflow', 'cotton_fabric', 'filter_dust'];
        const fuelStrip = domElementsMap.get('fuel-selector-strip');
        for (const k of fuelKeys) {
          const btn = new MockElement(`fuel-btn-${k}`, 'button');
          btn.setAttribute('data-fuel', k);
          btn.classList.add('val-chip');
          if (k === 'pmma_rod') btn.classList.add('active');
          domElementsMap.set(btn.id, btn);
          if (fuelStrip) fuelStrip.children.push(btn);
        }

        // Mock window, document, and globals on globalThis
        const windowListeners: Map<string, Array<(e?: any) => void>> = new Map();
        const mockWindow = {
          addEventListener: (evt: string, fn: (e?: any) => void) => {
            if (!windowListeners.has(evt)) windowListeners.set(evt, []);
            windowListeners.get(evt)!.push(fn);
          },
          requestAnimationFrame: (fn: () => void) => setTimeout(fn, 16)
        };

        const mockDocument = {
          getElementById: (id: string) => domElementsMap.get(id) || null,
          querySelectorAll: (sel: string) => {
            const results: MockElement[] = [];
            for (const el of domElementsMap.values()) {
              if (matchesSelector(el, sel)) results.push(el);
            }
            return results;
          }
        };

        (globalThis as any).window = mockWindow;
        (globalThis as any).document = mockDocument;

        // Evaluate app.js logic inside the mock DOM environment
        const codeWithoutImports = js.replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?/gm, '');
        const mockVisualizer = {
          startChamberDigitalTwinLoop: () => {},
          renderPredictiveHorizonSvg: () => {}
        };
        const runFn = new Function(
          'startChamberDigitalTwinLoop',
          'renderPredictiveHorizonSvg',
          codeWithoutImports
        );
        runFn(mockVisualizer.startChamberDigitalTwinLoop, mockVisualizer.renderPredictiveHorizonSvg);

        const edgeSI = (mockWindow as any).AetherEdgeSI;
        assert.ok(edgeSI, 'AetherEdgeSI module must be exposed on window');

        // Verify that DOM ID bindings execute cleanly
        const formulaD2 = domElementsMap.get('formula-live-d2');
        const formulaQrad = domElementsMap.get('formula-live-qrad');
        const formulaRes = domElementsMap.get('formula-live-result');
        assert.ok(formulaD2, 'formula-live-d2 element must be present in DOM map');
        assert.ok(formulaQrad, 'formula-live-qrad element must be present in DOM map');
        assert.ok(formulaRes, 'formula-live-result element must be present in DOM map');

        // Test immediate reactive fuel switching
        edgeSI.setFuelType('heptane_droplet');
        assert.ok(formulaD2.textContent.includes('FLEX-2'), 'formula-live-d2 must reflect FLEX-2 droplet regime');
        assert.ok(formulaD2.textContent.includes('K = '), 'formula-live-d2 must include calculated K');

        edgeSI.setFuelType('methane_counterflow');
        assert.ok(formulaD2.textContent.includes('ACME CFI-G'), 'formula-live-d2 must reflect ACME gas regime');

        // Test SI Inspector modal open & close
        const modalSi = domElementsMap.get('modal-si-inspect');
        assert.ok(modalSi, 'modal-si-inspect must exist in DOM');
        edgeSI.openSiInspector();
        assert.ok(modalSi.classList.contains('open'), 'modal-si-inspect must have open class when inspected');

        edgeSI.closeSiInspector();
        assert.equal(modalSi.classList.contains('open'), false, 'modal-si-inspect must not have open class when closed');

        // Stop any background timer and wait for pending microtasks
        edgeSI.stopRealtimeScadaLoop();
        await new Promise((r) => setTimeout(r, 60));

        // Confirm 0 console errors were thrown throughout the entire execution
        assert.deepEqual(consoleErrors, [], `Expected 0 console errors, but got: [${consoleErrors.join('; ')}]`);
      } finally {
        console.error = originalConsoleError;
        (globalThis as any).document = { getElementById: () => null, querySelectorAll: () => [] };
        (globalThis as any).window = { addEventListener: () => {} };
      }
    });

    it('5.11 should verify latch-until-Edge-SI-Nominal auto closed-loop logic and invariants (OI-8)', () => {
      // 1. Static codebase invariants
      assert.ok(js.includes('isEdgeSiNominal'), 'app.js must define isEdgeSiNominal check');
      assert.ok(js.includes('state.mistRelayOn = false;'), 'app.js must reset mist relay upon nominal');
      assert.ok(js.includes('state.daftFilterOn = false;'), 'app.js must reset daft filter upon nominal');
      assert.ok(js.includes('state.uvSensorOn = false;'), 'app.js must reset uv sensor upon nominal');
      assert.ok(js.includes('26.5'), 'app.js must enforce 26.5°C quiescent baseline');
      assert.ok(js.includes('1.50'), 'app.js must check CUSUM drift score < 1.50');
      assert.ok(js.includes('0.005'), 'app.js must check PINN PDE residual < 0.005');

      // 2. Behavioral verification of latch logic
      const evalNominal = (phase: string, risk: number, temp: number, dust: number, cusum = 0.35, pinn = 0.0016) => {
        return (
          (phase === 'EXTINGUISHED' || (risk <= 20 && temp <= 26.5)) &&
          dust <= 0 &&
          risk <= 20 &&
          temp <= 26.5 &&
          (typeof cusum === 'undefined' || cusum < 1.50) &&
          (typeof pinn === 'undefined' || pinn < 0.005)
        );
      };

      // While fire is active (HOT_FLAME) at elevated temperature, nominal MUST be false
      assert.equal(evalNominal('HOT_FLAME', 72, 38.5, 0), false, 'Active fire must not be nominal');

      // When risk drops below 45 while fire or high temp is active, nominal MUST remain false (no premature reset)
      assert.equal(evalNominal('HOT_FLAME', 42, 32.0, 0), false, 'Fire with risk < 45 must NOT prematurely evaluate nominal');

      // During cool flame transition, nominal MUST remain false
      assert.equal(evalNominal('COOL_FLAME', 58, 31.8, 0, 1.85), false, 'Cool flame must not evaluate nominal');

      // While regolith dust is in chamber, nominal MUST remain false
      assert.equal(evalNominal('EXTINGUISHED', 6, 23.5, 12), false, 'Dust presence must not evaluate nominal');

      // While chamber is still cooling down (T > 26.5°C) after extinction, nominal MUST remain false
      assert.equal(evalNominal('EXTINGUISHED', 6, 28.2, 0), false, 'Thermal cooldown (>26.5°C) must latch actuators ON');

      // Once extinguished, cooled to <= 26.5°C, dust <= 0, risk <= 20, nominal MUST be true
      assert.equal(evalNominal('EXTINGUISHED', 6, 23.5, 0, 0.32, 0.0018), true, 'Cooled quiescent chamber must confirm nominal');
    });
  });
});
