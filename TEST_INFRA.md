# E2E Test Infrastructure & Test Plan
# NASA Microgravity Combustion Science Dashboard & Super Intelligence Harness

## 1. Test Philosophy & Principles
- **Opaque-Box & Requirement-Driven**: All test suites are authored strictly against the authoritative contracts in `ORIGINAL_REQUEST.md`, `PROJECT.md`, and NASA combustion science specifications, completely decoupled from internal implementation choices.
- **Scientific Rigor & Determinism**: Verifies exact physical and chemical invariants: hypoxic flame extinction below Limiting Oxygen Concentration (LOC), anomalous low-flow flammability hazard in microgravity ($0.5\text{--}5.0\text{ cm/s}$), radiative quenching at quiescent low flow, hyperoxic fire acceleration in the Artemis Lunar Exploration Atmosphere ($34\% \text{ O}_2$), and confined space thermal flashover.
- **Zero External Dependencies**: 100% pure TypeScript/JavaScript running natively on Node.js v24.19.0 using native `node:test` and `node:assert/strict`. No external testing frameworks (such as Jest, Mocha, or Vitest) or assertion libraries are permitted.
- **Comprehensive Methodology**: Employs Category-Partition testing, Boundary Value Analysis (BVA), Pairwise Combinatorial testing across environmental dimensions (Oxygen × Gravity, Pressure × Geometry, Flow × Fuel), and Real-World Mission Workload simulation.

---

## 2. Datasets Under Test
1. **Primary Raw Dataset**: `C:\Users\Admin\.gemini\antigravity\scratch\Nasa\NASA_DATASET.xlsx`  
   - Direct NASA Physical Science Informatics (PSI) workbook containing 26 microgravity investigations (Rows 2–27).
   - Validates OpenXML ZIP decompression, shared string table resolution, and column-by-column schema parsing.
2. **Pre-Analyzed Augmented Dataset**: `C:\Users\Admin\.gemini\antigravity\scratch\Nasa\NASA_DATASET_ANALYZED_V2.xlsx`  
   - Updated workbook incorporating pre-analyzed metadata and supplementary columns.
   - Validates backward compatibility, multi-dataset schema adaptation, and enriched parameter mapping.

---

## 3. 5-Tier Test Architecture & Directory Layout

```
C:\Users\Admin\.gemini\antigravity\scratch\Nasa\test\
├── 01_data_pipeline.test.ts     # Tier 1: Data parsing, OpenXML unpack, 26 PSI entries, schema mapping, both datasets
├── 02_physics_engine.test.ts     # Tier 2: Physics limits, microgravity low-flow hazards, extinction regimes
├── 03_ranking_scoring.test.ts    # Tier 3: SCRI composite index, pairwise interactions, monotonicity
├── 04_scenarios_env.test.ts      # Tier 4: Mission scenarios (ISS, Artemis LEA, Mars, Rover, Terrestrial)
├── 05_api_web_e2e.test.ts       # Tier 5: Web API endpoints (/api/health, /api/investigations, /api/analyze)
└── run_all_tests.ts             # Master runner executing all tiers sequentially with aggregated reporting
```

---

## 4. Feature Inventory & Test Coverage Matrix

| # | Feature Code | Feature Name | Source | Target Test File | Tier | Coverage Scope & Verifications |
|---|---|---|---|---|:---:|---|
| 1 | F03, F04 | Native OpenXML XLSX Parser & Schema Validator | ORIGINAL_REQUEST §R2 | `test/01_data_pipeline.test.ts` | 1 | Zero-dep inflateRawSync, shared strings, XML cell types, parses both datasets |
| 2 | F05, F06 | 26 PSI Investigation Catalog & Normalizer | ORIGINAL_REQUEST §R2 | `test/01_data_pipeline.test.ts` | 1 | All 26 records (BASS, Saffire, FLEX, ACME, SAME, etc.), schema mapping, empty cell fallbacks |
| 3 | F07 | Microgravity Physics Models & LOC Calculations | ORIGINAL_REQUEST §R3 | `test/02_physics_engine.test.ts` | 2 | Buoyancy suppression ($Gr \approx 0$), low-flow hazard sweet spot ($0.5\text{--}5\text{ cm/s}$), Damköhler blowoff |
| 4 | F07 | Physics Boundary & Extreme Conditions | ORIGINAL_REQUEST §R3 | `test/02_physics_engine.test.ts` | 2 | Boundary conditions: $0\% \text{ O}_2$ (vacuum/inert), $100\% \text{ O}_2$, vacuum ($0\text{ kPa}$), extreme pressure |
| 5 | F09 | Super Intelligence Risk Index (SCRI) | ORIGINAL_REQUEST §R3 | `test/03_ranking_scoring.test.ts` | 3 | Composite score bounds $[0, 100]$, 5-component weighting, monotonic increase with $O_2$ |
| 6 | F09 | Pairwise Parameter Interactions | ORIGINAL_REQUEST §R3 | `test/03_ranking_scoring.test.ts` | 3 | Pairwise cross-combinations: ($O_2 \times g$), ($P \times \text{geometry}$), ($u_\infty \times \text{fuel}$); Artemis vs ISS delta |
| 7 | F08 | Habitat Scenario Matrix | ORIGINAL_REQUEST §R3 | `test/04_scenarios_env.test.ts` | 4 | 5 Exploration environments: ISS, Artemis LEA, Mars Habitat, Pressurized Rover, Terrestrial |
| 8 | F10, F17 | Actionable Recommender & Suppression Protocols | ORIGINAL_REQUEST §R3 | `test/04_scenarios_env.test.ts` | 4 | Vent shutdown timing, agent selection (forbidding dry powders in $0g$), terrestrial spin-offs |
| 9 | F11 | Native HTTP Server & REST Router | ORIGINAL_REQUEST §R4, §R5 | `test/05_api_web_e2e.test.ts` | 5 | Ephemeral port lifecycle, `/api/health`, `/api/investigations`, `/api/scenarios`, `/api/analyze`, `/api/compare` |
| 10 | F12 | Static Asset Delivery & Telemetry UI | ORIGINAL_REQUEST §R4 | `test/05_api_web_e2e.test.ts` | 5 | Serves `index.html`, `styles.css`, `app.js`, MIME types, security headers, 400/404 handling |
| 11 | Unified | Master E2E Verification Runner | ORIGINAL_REQUEST §R5 | `test/run_all_tests.ts` | Master | Sequential discovery, execution, HUD report, exit code 0/1 |

---

## 5. Real-World Mission Scenarios (Tier 4 Specifications)

| # | Scenario ID | Exploration Habitat | Atmospheric Conditions | Gravity & Flow | Primary Physics & Safety Outcome |
|---|---|---|---|---|---|
| 1 | `iss` | ISS Nominal Spacecraft Cabin | $21.0\% \text{ O}_2$, $101.3\text{ kPa}$ ($14.7\text{ psia}$) | $0.0g$, $15\text{ cm/s}$ HVAC | Moderate risk baseline ($40 \le \text{SCRI} < 65$). Quiescent low-flow ($u_\infty < 1\text{ cm/s}$) triggers radiative quenching. |
| 2 | `artemis_lunar` | Artemis Lunar Exploration Atmosphere (LEA) | $34.0\% \text{ O}_2$, $56.5\text{ kPa}$ ($8.2\text{ psia}$) | $0.166g$, $20\text{ cm/s}$ flow | **CRITICAL** risk ($\text{SCRI} \ge 75$). Hyperoxic reaction acceleration ($V_f > 1.8 \times V_{f,ISS}$); invalidates Earth $1g$ safety ratings. |
| 3 | `mars_habitat` | Mars Surface Habitat Greenhouse | $28.0\% \text{ O}_2$, $65.0\text{ kPa}$ ($9.4\text{ psia}$) | $0.38g$, $10\text{ cm/s}$ flow | **HIGH** risk tier. Partial buoyant plume active ($v_b \approx 18.5\text{ cm/s}$); biomass aerosol loading elevated. |
| 4 | `rover` | Pressurized Lunar/Mars Rover | $32.0\% \text{ O}_2$, $55.0\text{ kPa}$ ($8.0\text{ psia}$) | $0.166g$, confined volume ($<15\text{ m}^3$) | **CRITICAL** flashover alert. Rapid toxic smoke accumulation mandates emergency suit donning in $<30\text{ s}$. |
| 5 | `terrestrial` | Terrestrial Industrial Spin-off (Mines/Cleanrooms) | $20.9\% \text{ O}_2$, $101.3\text{ kPa}$ ($14.7\text{ psia}$) | $1.0g$, high ambient flow | Moderate/Low baseline. Full buoyancy; dual-wavelength smoke discrimination (SAME) and fine water-mist Halon replacement. |

---

## 6. Coverage Thresholds & Quality Gates

- **Tier 1 (Data Pipeline)**: $\ge 25$ test assertions validating raw Excel parsing, shared string tables, all 26 PSI entries, missing cell handling, and both datasets (`NASA_DATASET.xlsx` and `NASA_DATASET_ANALYZED_V2.xlsx`).
- **Tier 2 (Physics Engine & Boundaries)**: $\ge 25$ test assertions validating microgravity low-flow flammability sweet spot, quiescent radiative extinction, $U$-shaped flammability curve, Damköhler blowoff, and extreme conditions ($0\% \text{ O}_2$, $100\% \text{ O}_2$, vacuum, extreme pressure).
- **Tier 3 (Ranking & Cross-Feature Interactions)**: $\ge 20$ test assertions validating SCRI mathematical invariants (bounds $[0, 100]$, monotonicity with $O_2$, Artemis LEA $34\%$ elevated risk delta over ISS $21\%$, pairwise parameter interactions).
- **Tier 4 (Habitat Operational Scenarios)**: $\ge 15$ test assertions covering 5 distinct space exploration and terrestrial regimes, autonomous suppression agent validation (strictly forbidding dry chemical powders in microgravity), and actionable recommender guidelines.
- **Tier 5 (Web API & Dashboard Endpoints)**: $\ge 20$ test assertions verifying native HTTP server lifecycle on ephemeral ports (`listen(0)`), status codes, JSON payload schemas (`/api/health`, `/api/investigations`, `/api/scenarios`, `/api/analyze`, `/api/compare`, `/api/export`), static asset delivery, security headers, and 400/404 error responses.
- **Total Minimum Expected**: $\ge 105$ test assertions across the entire verification suite.

---

## 7. Execution Commands & Unified Test Runner

### Standard Execution
```powershell
# Run individual test suites
node --test test/01_data_pipeline.test.ts
node --test test/02_physics_engine.test.ts
node --test test/03_ranking_scoring.test.ts
node --test test/04_scenarios_env.test.ts
node --test test/05_api_web_e2e.test.ts

# Run all test suites via native glob
node --test test/*.test.ts

# Execute Unified Master E2E Runner with Mission Control HUD Report
node test/run_all_tests.ts
```

### Exit Code Semantics
- **Exit Code 0**: All test assertions passed cleanly; no regressions.
- **Exit Code 1**: One or more test assertions failed, or an uncaught exception occurred. Process terminates immediately with detailed error diagnostics.
