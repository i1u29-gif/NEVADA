/**
 * NASA SCADA Realtime Loop Actuator Latch Stress Harness
 * Empirical Challenger Verification Script
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

function createMockDom(html) {
  class MockElement {
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
        add: (...classes) => {
          const set = new Set(this.className.split(/\s+/).filter(Boolean));
          classes.forEach((c) => set.add(c));
          this.className = Array.from(set).join(' ');
        },
        remove: (...classes) => {
          const set = new Set(this.className.split(/\s+/).filter(Boolean));
          classes.forEach((c) => set.delete(c));
          this.className = Array.from(set).join(' ');
        },
        toggle: (cls, force) => {
          const set = new Set(this.className.split(/\s+/).filter(Boolean));
          const shouldAdd = force !== undefined ? force : !set.has(cls);
          if (shouldAdd) set.add(cls);
          else set.delete(cls);
          this.className = Array.from(set).join(' ');
          return shouldAdd;
        },
        contains: (cls) => this.className.split(/\s+/).includes(cls)
      };
    }

    get innerHTML() {
      return this._innerHTML;
    }

    set innerHTML(val) {
      this._innerHTML = val;
      const idMatches = val.matchAll(/\bid=["']([^"']+)["']/g);
      for (const m of idMatches) {
        if (!domElementsMap.has(m[1])) {
          domElementsMap.set(m[1], new MockElement(m[1]));
        }
      }
    }

    getAttribute(attr) {
      return this.attributes.get(attr) || null;
    }

    setAttribute(attr, val) {
      this.attributes.set(attr, val);
    }

    addEventListener(evt, handler) {
      if (!this.listeners.has(evt)) this.listeners.set(evt, []);
      this.listeners.get(evt).push(handler);
    }

    dispatchEvent(e) {
      const handlers = this.listeners.get(e.type) || [];
      handlers.forEach((h) => h(e));
    }

    click() {
      this.dispatchEvent({ type: 'click', target: this, stopPropagation: () => {} });
    }

    getContext() {
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

    querySelectorAll(sel) {
      const results = [];
      for (const el of domElementsMap.values()) {
        if (matchesSelector(el, sel)) results.push(el);
      }
      return results;
    }
  }

  const domElementsMap = new Map();

  const idRegex = /\bid=["']([^"']+)["']/g;
  let idMatch;
  while ((idMatch = idRegex.exec(html)) !== null) {
    const id = idMatch[1];
    if (!domElementsMap.has(id)) {
      const el = new MockElement(id);
      if (id === 'chamber-canvas') el.tagName = 'CANVAS';
      domElementsMap.set(id, el);
    }
  }

  function matchesSelector(el, sel) {
    if (sel.startsWith('#')) {
      const parts = sel.split(/\s+/);
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

  return { domElementsMap, matchesSelector };
}

export async function runScadaStressSuite(repoPath, repoName) {
  console.log(`\n========================================================================`);
  console.log(`🔥 EMPIRICAL SCADA STRESS TEST SUITE: ${repoName}`);
  console.log(`   Path: ${repoPath}`);
  console.log(`========================================================================`);

  const htmlPath = path.join(repoPath, 'public', 'index.html');
  const jsPath = path.join(repoPath, 'public', 'app.js');

  const html = fs.readFileSync(htmlPath, 'utf8');
  const js = fs.readFileSync(jsPath, 'utf8');

  const { domElementsMap } = createMockDom(html);

  let loopCallback = null;
  let timerIdCounter = 1;

  const mockWindow = {
    addEventListener: () => {},
    requestAnimationFrame: (fn) => setTimeout(fn, 16)
  };

  const mockDocument = {
    getElementById: (id) => domElementsMap.get(id) || null,
    querySelectorAll: () => []
  };

  // Mock global setInterval/clearInterval to intercept the SCADA loop tick
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;

  globalThis.setInterval = (fn, ms) => {
    loopCallback = fn;
    return timerIdCounter++;
  };
  globalThis.clearInterval = () => {
    loopCallback = null;
  };

  globalThis.window = mockWindow;
  globalThis.document = mockDocument;

  try {
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

    const edgeSI = mockWindow.AetherEdgeSI;
    assert.ok(edgeSI, 'AetherEdgeSI module must be loaded');

    // Start loop and get tick function
    edgeSI.startRealtimeScadaLoop();
    assert.ok(loopCallback, 'Loop callback must have been registered via setInterval');

    const state = edgeSI.state;
    const calc = edgeSI.computeScadaPhysics;

    // Helper to step SCADA loop 1 cycle
    function tick() {
      loopCallback();
    }

    // -------------------------------------------------------------------------
    // TEST 1.a: Hot Flame Ignition with riskIndex >= 65 -> mistRelayOn latches ON
    // -------------------------------------------------------------------------
    console.log(`\n[TEST 1.a] Hot Flame Ignition (riskIndex >= 65)`);
    state.isAuto = true;
    state.combustionPhase = 'HOT_FLAME';
    state.flameRadiusPct = 75;
    state.oxygen = 34;
    state.airflow = 10;
    state.pressurePsi = 14.7;
    state.gravity = 0;
    state.efieldKV = 0;
    state.regolithDustMg = 0;
    state.sensorTempC = 38.0;
    state.mistRelayOn = false;
    state.daftFilterOn = false;
    state.uvSensorOn = false;

    const physics1a = calc();
    console.log(`   Initial State: phase=${state.combustionPhase}, riskIndex=${physics1a.riskIndex}%, temp=${state.sensorTempC}°C, spreadRate=${physics1a.spreadRate}`);
    assert.ok(physics1a.riskIndex >= 65, `Expected riskIndex >= 65, got ${physics1a.riskIndex}`);

    tick();

    console.log(`   Post-Tick: mistRelayOn=${state.mistRelayOn}, flameRadius=${state.flameRadiusPct}%`);
    assert.strictEqual(state.mistRelayOn, true, 'ACTUATOR LATCH FAILED: mistRelayOn must be true after riskIndex >= 65');
    console.log(`   ✔ PASS: Mist relay successfully latched ON upon high risk ignition.`);

    // -------------------------------------------------------------------------
    // TEST 1.b: Intermediate Suppression -> riskIndex drops to 35 while HOT_FLAME
    //           mistRelayOn REMAINS true (no premature flip-off)
    // -------------------------------------------------------------------------
    console.log(`\n[TEST 1.b] Intermediate Suppression Hysteresis (riskIndex ~ 35 while HOT_FLAME)`);
    // System is in HOT_FLAME with mistRelayOn = true. We tune parameters until riskIndex is 35%.
    state.combustionPhase = 'HOT_FLAME';
    state.mistRelayOn = true;
    state.pressurePsi = 14.7;
    let found = false;
    for (const g of [0.05, 0.16, 0.38, 1.0]) {
      state.gravity = g;
      for (let o2 = 21; o2 <= 40; o2 += 0.1) {
        state.oxygen = Number(o2.toFixed(1));
        if (Math.round(calc().riskIndex) === 35) {
          found = true;
          break;
        }
      }
      if (found) break;
    }

    const physics1b = calc();
    console.log(`   Suppression State: phase=${state.combustionPhase}, gravity=${state.gravity}g, oxygen=${state.oxygen}%, riskIndex=${physics1b.riskIndex}%, temp=${state.sensorTempC}°C, spreadRate=${physics1b.spreadRate}`);
    assert.strictEqual(Math.round(physics1b.riskIndex), 35, `Expected riskIndex ~ 35, got ${physics1b.riskIndex}`);

    tick();

    console.log(`   Post-Tick: mistRelayOn=${state.mistRelayOn}, combustionPhase=${state.combustionPhase}`);
    assert.strictEqual(state.mistRelayOn, true, 'HYSTERESIS FAILED: mistRelayOn must NOT prematurely reset to false while HOT_FLAME!');
    console.log(`   ✔ PASS: Mist relay maintained ON state at intermediate risk (${physics1b.riskIndex}%).`);

    // -------------------------------------------------------------------------
    // TEST 1.c: Extinction Transition -> Flame extinguished, but temp is 35°C (> 26.5°C)
    //           mistRelayOn REMAINS true
    // -------------------------------------------------------------------------
    console.log(`\n[TEST 1.c] Extinction Transition with Thermal Residual (temp = 35.0°C > 26.5°C)`);
    state.combustionPhase = 'EXTINGUISHED';
    state.flameRadiusPct = 0;
    state.sensorTempC = 35.0; // elevated thermal residual
    state.regolithDustMg = 0;

    const physics1c = calc();
    console.log(`   Extinguished State: phase=${state.combustionPhase}, riskIndex=${physics1c.riskIndex}%, temp=${state.sensorTempC}°C`);

    tick();

    console.log(`   Post-Tick: mistRelayOn=${state.mistRelayOn}, temp=${state.sensorTempC}°C`);
    assert.strictEqual(state.mistRelayOn, true, 'THERMAL COOLDOWN LATCH FAILED: mistRelayOn must remain true while chamber shell > 26.5°C!');
    console.log(`   ✔ PASS: Mist relay latched ON during thermal cooldown (${state.sensorTempC}°C > 26.5°C).`);

    // -------------------------------------------------------------------------
    // TEST 1.d: Nominal Chamber Settlement -> sensorTempC <= 26.5, regolithDustMg <= 0, riskIndex <= 20
    //           All actuators reset to false (Standby OFF) with Edge SI nominal log
    // -------------------------------------------------------------------------
    console.log(`\n[TEST 1.d] Nominal Chamber Settlement (temp <= 26.5°C, dust <= 0, risk <= 20%)`);
    state.sensorTempC = 23.5; // baseline nominal temperature
    state.regolithDustMg = 0;
    state.oxygen = 20.9;
    state.airflow = 0;
    state.combustionPhase = 'EXTINGUISHED';

    const physics1d = calc();
    console.log(`   Settled State: phase=${state.combustionPhase}, riskIndex=${physics1d.riskIndex}%, temp=${state.sensorTempC}°C, dust=${state.regolithDustMg}`);
    assert.ok(physics1d.riskIndex <= 20, `Expected riskIndex <= 20, got ${physics1d.riskIndex}`);

    const logsBefore = state.eventLogs ? [...state.eventLogs] : [];

    tick();

    console.log(`   Post-Tick Actuators: mistRelayOn=${state.mistRelayOn}, daftFilterOn=${state.daftFilterOn}, uvSensorOn=${state.uvSensorOn}`);
    assert.strictEqual(state.mistRelayOn, false, 'NOMINAL RESET FAILED: mistRelayOn must reset to false upon nominal');
    assert.strictEqual(state.daftFilterOn, false, 'NOMINAL RESET FAILED: daftFilterOn must reset to false upon nominal');
    assert.strictEqual(state.uvSensorOn, false, 'NOMINAL RESET FAILED: uvSensorOn must reset to false upon nominal');

    const latestLog = state.eventLogs ? state.eventLogs[0] : '';
    console.log(`   Latest Log: "${latestLog}"`);
    const hasNominalResetLog =
      latestLog.includes('SI AUTO-RESET') ||
      latestLog.includes('Edge confirmed Chamber Nominal') ||
      latestLog.includes('AIoT Edge xác nhận buồng đốt');
    assert.ok(hasNominalResetLog, `Expected AIoT Edge Nominal log, got: "${latestLog}"`);
    console.log(`   ✔ PASS: All actuators cleanly reset to OFF (Standby) with Edge SI nominal confirmation log.`);

    // -------------------------------------------------------------------------
    // TEST 1.e: Additional Adversarial Challenge — Multi-Hazard Concurrency & Cooldown
    // -------------------------------------------------------------------------
    console.log(`\n[TEST 1.e] Multi-Hazard Concurrency (Regolith Dust + Cool Flame + Thermal)`);
    // 1. Dust hazard triggers Buzzer
    state.regolithDustMg = 40;
    tick();
    assert.strictEqual(state.daftFilterOn, true, 'Buzzer (DAFT-2) must turn ON when dust > 10 mg/m³');

    // 2. Cool flame in quiescent oxygen environment (oxygen = 12% <= MOC+2) triggers LED and Mist
    state.oxygen = 12;
    state.combustionPhase = 'COOL_FLAME';
    tick();
    assert.strictEqual(state.uvSensorOn, true, 'LED (UV-PLIF) must turn ON during COOL_FLAME');
    assert.strictEqual(state.mistRelayOn, true, 'Mist Relay must turn ON to coordinate cool flame quench');

    // 3. Flame quenched and dust cleaned, but chamber shell is still hot (36.0°C cools to ~30.9°C > 26.5°C)
    state.combustionPhase = 'EXTINGUISHED';
    state.regolithDustMg = 0;
    state.sensorTempC = 36.0;
    tick();
    console.log(`   Multi-Hazard Cooldown: temp=${state.sensorTempC}°C (still above 26.5°C baseline)`);
    assert.ok(state.sensorTempC > 26.5, `Chamber temp must still be elevated, got ${state.sensorTempC}`);
    assert.strictEqual(state.uvSensorOn, true, 'LED must remain ON while chamber temp > 26.5°C');
    assert.strictEqual(state.daftFilterOn, true, 'Buzzer must remain ON while chamber temp > 26.5°C');
    assert.strictEqual(state.mistRelayOn, true, 'Mist Relay must remain ON while chamber temp > 26.5°C');

    // 4. Chamber fully settles to 22.0°C
    state.sensorTempC = 22.0;
    tick();
    assert.strictEqual(state.uvSensorOn, false, 'LED must reset to false upon full nominal');
    assert.strictEqual(state.daftFilterOn, false, 'Buzzer must reset to false upon full nominal');
    assert.strictEqual(state.mistRelayOn, false, 'Mist Relay must reset to false upon full nominal');
    console.log(`   ✔ PASS: Multi-hazard concurrency, cross-actuator latching, and coordinated nominal reset verified.`);

    edgeSI.stopRealtimeScadaLoop();
    console.log(`\n🏆 SUITE RESULT FOR ${repoName}: ALL 5 SCENARIOS PASSED WITH ZERO FAILURES.`);
    return true;
  } finally {
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
}

async function main() {
  const nasaPath = path.resolve('C:/Users/Admin/.gemini/antigravity/scratch/Nasa');
  const nasaFinalPath = path.resolve('C:/Users/Admin/.gemini/antigravity/scratch/Nasa_FINAL');

  let allPassed = true;
  try {
    const passedNasa = await runScadaStressSuite(nasaPath, 'Nasa (Vietnamese)');
    const passedFinal = await runScadaStressSuite(nasaFinalPath, 'Nasa_FINAL (English)');
    allPassed = passedNasa && passedFinal;
  } catch (err) {
    console.error(`\n❌ STRESS TEST FAILED WITH ERROR:`, err);
    process.exit(1);
  }

  if (allPassed) {
    console.log(`\n========================================================================`);
    console.log(`✅ ALL EMPIRICAL SCADA STRESS CHALLENGES PASSED ACROSS BOTH REPOSITORIES!`);
    console.log(`========================================================================`);
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main();
