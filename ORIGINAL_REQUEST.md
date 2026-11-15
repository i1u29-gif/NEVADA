# Original User Request

## Initial Request — 2026-11-14T16:20:09Z

Use the full team with supporting agents. Complete the English translation of the NASA SCADA web application in `C:\Users\Admin\.gemini\antigravity\scratch\Nasa_FINAL`, reorganize UI layout for Tab 3 and `#si-compliance-bar`, and verify compliance with Space Apps Challenge rules across both `Nasa` and `Nasa_FINAL` as a competition showcase.

Working directory: C:\Users\Admin\.gemini\antigravity\scratch\Nasa_FINAL
Integrity mode: demo
The team must NOT: copy code from existing open-source projects for core logic

## Reference Material
Space Apps Challenge Rules (Pages 16 & 17):
- Synthetic Intelligence (SI) tools (LLMs, code generation) are permitted to accelerate innovation; indicate where and how utilized via dropdown list.
- Generated content may not contain or modify NASA branding or design elements (such as NASA logos, flags, or mission identifiers).
- Generated visuals must include a visible watermark indicating SI generation. Generated code and data must acknowledge generation in descriptive text and metadata.

## Requirements

### R1. Complete English Translation of Nasa_FINAL
Complete the remaining English translation of `C:\Users\Admin\.gemini\antigravity\scratch\Nasa_FINAL\public\app.js` (lines 1310-1971: CSV export log, `startRealtimeScadaLoop` logs, `initEvents` logs, and `siDisclosureMap`) and ensure that all UI elements, telemetry labels, console/event logs, and SI disclosure entries in `Nasa_FINAL` are 100% in English.

### R2. Tab 3 UI Restructuring and SI Compliance Bar Relocation
In both `C:\Users\Admin\.gemini\antigravity\scratch\Nasa` (Vietnamese) and `C:\Users\Admin\.gemini\antigravity\scratch\Nasa_FINAL` (English):
1. Relocate `#si-compliance-bar` completely out of `#view-scada` and place it inside Tab 3 (`#view-math_spinoff`). It must NOT remain on `#view-scada`.
2. In Tab 3 (`#view-math_spinoff`), remove the two redundant static columns: "1. Mathematical Foundations of Microgravity Combustion" ("1. Cơ Sở Toán Học Vật Lý Cháy Vi Trọng Lực") and "2. Edge SI Algorithms & Physics-Informed AI" ("2. Thuật Toán Edge SI & Physics-Informed AI").
3. Retain `.scada-formulas-panel` (Live Telemetry Evaluation) and the "Spaceflight Lessons & Earth Spin-Offs" ("Bài Học Vũ Trụ & Spin-Off Trái Đất") card.
4. Arrange Tab 3 in a clean, balanced layout with `.scada-formulas-panel` at the top, followed by a balanced 2-column grid/row containing "Spaceflight Lessons & Earth Spin-Offs" and `#si-compliance-bar` side-by-side.

### R3. Maintain Space Apps SI Policy Compliance
Ensure both `C:\Users\Admin\.gemini\antigravity\scratch\Nasa` and `C:\Users\Admin\.gemini\antigravity\scratch\Nasa_FINAL` strictly comply with Space Apps Challenge rules:
1. Zero NASA branding or design elements (no NASA logos, flags, or mission identifiers).
2. Visible watermark indicating SI generation (`WATERMARK: SI-GENERATED VISUAL` on visual/canvas components and watermark badge).
3. Synthetic Intelligence (SI) disclosure dropdown bar and JSON-LD / `<meta>` metadata acknowledging SI tool usage.
4. Auto-reset to default standby (OFF) when chamber conditions return to normal in SCADA loop.
5. Continuous 1Hz sensor telemetry updates.

### R4. Automated Verification Across Both Projects
Run and pass all existing automated test suites and validation scripts (`npm test` and `node scripts/verify.js`) without errors in both `Nasa` and `Nasa_FINAL`.

## Verification Resources
- Test suite in `C:\Users\Admin\.gemini\antigravity\scratch\Nasa`: `npm test` and `node scripts/verify.js`
- Test suite in `C:\Users\Admin\.gemini\antigravity\scratch\Nasa_FINAL`: `npm test` and `node scripts/verify.js`

## Acceptance Criteria

### Translation & UI Consistency
- [ ] Lines 1310 through 1971 in `C:\Users\Admin\.gemini\antigravity\scratch\Nasa_FINAL\public\app.js` contain zero untranslated Vietnamese text in logs, CSV export strings, or SI disclosure mapping.
- [ ] Web application at `C:\Users\Admin\.gemini\antigravity\scratch\Nasa_FINAL` renders completely in English across all tabs, panels, charts, inspector tools, and modal dialogs.

### Tab 3 Layout & Relocation
- [ ] `#si-compliance-bar` is completely removed from `#view-scada` and resides exclusively within Tab 3 (`#view-math_spinoff`) in both `Nasa` and `Nasa_FINAL`.
- [ ] The two redundant static math columns are removed from Tab 3 (`#view-math_spinoff`) in both `Nasa` and `Nasa_FINAL`.
- [ ] Tab 3 renders `.scada-formulas-panel` at the top and a balanced two-column section containing the Spaceflight Lessons & Earth Spin-Offs card alongside `#si-compliance-bar` in both `Nasa` and `Nasa_FINAL`.

### S.I. Policy Compliance
- [ ] Neither `Nasa` nor `Nasa_FINAL` contains any NASA logos, trademarked insignia, or NASA branding elements.
- [ ] Visible SI watermark is present on all canvas and SVG visualizers in both projects.
- [ ] `#si-compliance-bar` with `#si-usage-dropdown` and metadata acknowledgment are present and functional in both projects.

### Operational Behavior
- [ ] Automatic reset to OFF (standby) triggers when hazards clear and chamber returns to normal state in both projects.
- [ ] Continuous 1Hz sensor telemetry loop updates inspector data and PINN residual tracking in both projects.

### Test Verification
- [ ] `npm test` passes 100% (123 tests) in `C:\Users\Admin\.gemini\antigravity\scratch\Nasa`.
- [ ] `node scripts/verify.js` passes 100% (159 assertions) in `C:\Users\Admin\.gemini\antigravity\scratch\Nasa`.
- [ ] `npm test` passes 100% in `C:\Users\Admin\.gemini\antigravity\scratch\Nasa_FINAL`.
- [ ] `node scripts/verify.js` passes 100% in `C:\Users\Admin\.gemini\antigravity\scratch\Nasa_FINAL`.


## Follow-up — 2026-11-14T16:35:05Z

New Follow-up User Requirement received (Appended to ORIGINAL_REQUEST.md):

Additional User Requirement (High Priority — Integrate into BOTH `C:\Users\Admin\.gemini\antigravity\scratch\Nasa` and `C:\Users\Admin\.gemini\antigravity\scratch\Nasa_FINAL`):

User request:
"với cả là khi đang ở chế độ auto thì khi đã bật ON Relay,Buzzer và LED thì bạn hãy duy trì mức đó cho tới khi AIOT edge nhận thấy đã ở trnagj thái bình thường thì mới chuyển các thành phần on đó thành off (default)"

Technical specification & bug fix for `startRealtimeScadaLoop()` in `public/app.js` (both `Nasa` and `Nasa_FINAL`):
1. Previously, turning `mistRelayOn = true` reduced `spreadRate` via `suppressionFactor = 0.22`, which immediately caused `calc.riskIndex < 45` while `combustionPhase === 'HOT_FLAME'`, prematurely flipping `mistRelayOn` back to `false` before the fire actually extinguished! Also `uvSensorOn` flipped off immediately when leaving `COOL_FLAME`.
2. New required behavior when `state.isAuto === true`:
   - Trigger ON when needed:
     - `BUZZER (daftFilterOn)`: turns `ON` when `state.regolithDustMg > 10`.
     - `LED (uvSensorOn)`: turns `ON` when `state.combustionPhase === 'COOL_FLAME'`.
     - `RELAY (mistRelayOn)`: turns `ON` when `state.combustionPhase === 'HOT_FLAME' && calc.riskIndex >= 65` (or when `COOL_FLAME` is detected so UV-PLIF + Mist suppress it).
   - **MAINTAIN ON STATE**: Once `mistRelayOn`, `daftFilterOn`, or `uvSensorOn` is `ON`, **DO NOT** reset them to `OFF` while fire, cool flame, dust, elevated temperature, or Edge SI alert/critical state is still active! (Remove the premature `HOT_FLAME && calc.riskIndex < 45` reset branch).
   - **RESET TO OFF ONLY WHEN AIoT EDGE DETECTS NORMAL STATE (`NOMINAL`)**:
     - Define AIoT Edge normal check (`isEdgeSiNominal`):
       1. `state.combustionPhase === 'EXTINGUISHED'` (no hot flame or cool flame remaining; OR `calc.riskIndex <= 20` and `state.sensorTempC <= 26.5` if thermal cooldown has settled),
       2. `state.regolithDustMg <= 0`,
       3. `calc.riskIndex <= 20`,
       4. `state.sensorTempC <= 26.5` (chamber shell cooled back down to normal quiescent baseline ~21.5–26.5°C — taking a few 1Hz scan cycles after flame extinction so the user visibly sees the ON actuators being maintained until AIoT Edge confirms NOMINAL!),
       5. Edge SI status / DBN nominal posterior confirms normal regime (`cusumVal < 1.50` and `pinnVal < 0.005` or `edgeSiStatus === 'NOMINAL'`).
     - Wait until `isEdgeSiNominal` is TRUE: only then reset any active ON actuators (`uvSensorOn`, `daftFilterOn`, `mistRelayOn`) back to `false` (`OFF` default standby) and append a clear log indicating AIoT Edge detected Normal/Nominal state and reset the active actuators to OFF for the next scan cycle.
3. Add or update unit/E2E test coverage in `test/` if appropriate to verify this latch-until-Edge-SI-Nominal behavior without breaking existing tests, and verify both `Nasa` and `Nasa_FINAL` pass `npm test` and `node scripts/verify.js`.

Please incorporate this requirement into the project milestones immediately.
