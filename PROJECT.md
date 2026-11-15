# Project: Space Apps 2026 — Flame in Freefall SCADA Application (Nasa & Nasa_FINAL)

## Architecture
- **Overview**: Web-based SCADA & Edge SI application for microgravity combustion monitoring and flame extinction simulation (NASA PSI dataset).
- **Core Technology**:
  - Frontend: Vanilla TypeScript / ES6 JavaScript (`public/app.js`, `public/visualizer.js`, `public/index.html`, `public/styles.css`).
  - Backend / API: Node.js HTTP server (`src/server/server.ts`, `src/server/router.ts`), dynamic analysis endpoints `/api/analyze`, `/api/investigations`.
  - Edge SI Engine: Physics-Informed Neural Network (PINN) PDE Residuals, TOPSIS Multi-Criteria Ranking, 64-Tree Isolation Forest, and Dynamic Bayesian Network.
- **Dual Repositories**:
  - `C:\Users\Admin\.gemini\antigravity\scratch\Nasa`: Primary Vietnamese showcase application.
  - `C:\Users\Admin\.gemini\antigravity\scratch\Nasa_FINAL`: Primary English international showcase application.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Full English Translation in Nasa_FINAL | Translate remaining 36 Vietnamese lines in `public/app.js` (CSV export log, real-time loop logs, UI trigger logs, self-test text, and `siDisclosureMap` values). | M1 | ORIGINAL_REQUEST §R1, Explorer 1 |
| 2 | Tab 3 Restructuring & SI Bar Relocation in Nasa | Move `#si-compliance-bar` out of `#view-scada` to Tab 3 (`#view-math_spinoff`), remove 2 static math columns, retain `.scada-formulas-panel` on top, balanced 2-column layout with Spaceflight Lessons & SI Compliance Bar side-by-side in `Nasa`. | M2 | ORIGINAL_REQUEST §R2, Explorer 2 |
| 3 | Tab 3 Restructuring & SI Bar Relocation in Nasa_FINAL | Same restructuring in `Nasa_FINAL`: `#si-compliance-bar` in Tab 3 side-by-side with Spaceflight Lessons card, `.scada-formulas-panel` on top, responsive `.two-cols-row`. | M2 | ORIGINAL_REQUEST §R2, Explorer 2 |
| 4 | Space Apps Challenge SI Compliance | Ensure zero NASA branding/logos/flags, visible SI watermark on canvas/SVG/badge, SI disclosure dropdown & metadata (JSON-LD, `<meta>`), 1Hz sensor loop, and auto-reset to OFF (standby) when chamber conditions clear in both repos. | M3 | ORIGINAL_REQUEST §R3, Explorer 3 |
| 5 | Automated Verification Across Both Repositories | Ensure `npm test` (123 tests) and `node scripts/verify.js` (159 assertions) pass 100% in both `Nasa` and `Nasa_FINAL`. | M4 | ORIGINAL_REQUEST §R4, Explorer 3 |
| 6 | Latch-until-Edge-SI-Nominal Auto Actuator Logic | In `startRealtimeScadaLoop()` (both `Nasa` and `Nasa_FINAL`), once Relay, Buzzer, or LED is ON, maintain ON state until AIoT Edge confirms NOMINAL (`isEdgeSiNominal`: extinguished/cooldown, dust<=0, risk<=20, temp<=26.5°C, cusum<1.50, pinn<0.005). Reset to OFF only upon nominal. | M3 | ORIGINAL_REQUEST Follow-up (16:35:05Z) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Complete English Translation of Nasa_FINAL | `Nasa_FINAL/public/app.js` (36 lines: CSV log, SCADA loop logs, trigger logs, self-test strings, `siDisclosureMap` values). | None | DONE |
| M2 | Tab 3 UI Restructuring and SI Bar Relocation | `Nasa/public/index.html`, `Nasa/public/styles.css`, `Nasa_FINAL/public/index.html`, `Nasa_FINAL/public/styles.css`. | None | DONE |
| M3 | Latch-until-Edge-SI-Nominal Auto SCADA Loop | `Nasa/public/app.js` and `Nasa_FINAL/public/app.js` (`startRealtimeScadaLoop` auto-latch logic). | M1 | DONE |
| M4 | SI Compliance Audit & Full Automated Test Pass | Align `package.json` `"test"` script to `node test/run_all_tests.ts`, fix `ui_declutter_e2e.test.ts:192` branding assertion, run `npm test` and `node scripts/verify.js` across both projects. | M2, M3 | DONE |

## Interface Contracts
### Tab 3 & SI Compliance Bar (`index.html` ↔ `app.js` / `styles.css`)
- Element ID `#si-compliance-bar`: Moved from `<section id="view-scada">` to `<section id="view-math_spinoff">`.
- Element ID `#si-usage-dropdown`: Dropdown `<select>` retains exact ID and `<option value="...">` keys (`code_gen`, `edge_pinn`, `visual_sim`, `psi_data`).
- Element ID `#si-usage-detail-text`: Dynamic target for text replacement retains exact ID.
- Retained formula IDs in `.scada-formulas-panel`: `#formula-live-d2`, `#formula-live-qrad`, `#formula-live-pinn`, `#formula-live-ensemble`, `#formula-live-result`.
- Layout class `.two-cols-row`: Responsive 2-column grid (`grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;`). Collapses to 1 column on screens $\le$ 1120px.

### S.I. Disclosure Map Contract (`app.js` ↔ `index.html`)
- Keys:
  - `code_gen`
  - `edge_pinn`
  - `visual_sim`
  - `psi_data`
- Event Listener: `document.getElementById('si-usage-dropdown').addEventListener('change', ...)` accesses `siDisclosureMap[key]` and sets `siDetailEl.textContent`.

### Auto SCADA Latch & Edge SI Nominal Contract (`startRealtimeScadaLoop` in `app.js`)
- `isEdgeSiNominal` conditions:
  1. `state.combustionPhase === 'EXTINGUISHED'` (or `calc.riskIndex <= 20` and `state.sensorTempC <= 26.5`),
  2. `state.regolithDustMg <= 0`,
  3. `calc.riskIndex <= 20`,
  4. `state.sensorTempC <= 26.5`,
  5. `cusumVal < 1.50` and `pinnVal < 0.005` (or `edgeSiStatus === 'NOMINAL'`).
- Latch Behavior: Once `daftFilterOn`, `uvSensorOn`, or `mistRelayOn` turns `true` in `state.isAuto === true`, keep it `true` until `isEdgeSiNominal` becomes `true`.
- Reset: When `isEdgeSiNominal` is `true`, reset `daftFilterOn = false`, `uvSensorOn = false`, `mistRelayOn = false` with informative log.

## Code Layout
- `C:\Users\Admin\.gemini\antigravity\scratch\Nasa\`:
  - `public/index.html`: Vietnamese HTML template
  - `public/styles.css`: Monochrome SCADA styles & layout grid
  - `public/app.js`: Client-side SCADA controller
  - `package.json`: Scripts & dependencies
  - `test/`: Verification test suites
  - `scripts/verify.js`: 5-tier verification harness
- `C:\Users\Admin\.gemini\antigravity\scratch\Nasa_FINAL\`:
  - `public/index.html`: English HTML template
  - `public/styles.css`: Monochrome SCADA styles & layout grid
  - `public/app.js`: Client-side SCADA controller (100% English target)
  - `package.json`: Scripts & dependencies
  - `test/`: Verification test suites
  - `scripts/verify.js`: 5-tier verification harness
