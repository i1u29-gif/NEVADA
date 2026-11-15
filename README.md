# AETHER-SI — NASA Microgravity Combustion Science & Spacecraft Fire Safety Dashboard

> **NASA Space Apps Challenge 2026** | Pure TypeScript/JavaScript Full-Stack Web & Crew Mobile Application  
> **Datasets**: Direct Column-by-Column OpenXML Ingestion of `NASA_DATASET.xlsx` (V1) & `NASA_DATASET_ANALYZED_V2.xlsx` (V2) covering **26 NASA Physical Science Informatics (PSI)** investigations (`BASS`, `BASS-II`, `Saffire I–III`, `FLEX`, `FLEX-2`, `CFI`, `ACME E-FIELD`, `ACME BRE`, `SAME`, `SPICE`, `SLICE`).

---

## 1. System Overview & Key Capabilities

**AETHER-SI** transforms NASA's Physical Science Informatics (PSI) microgravity combustion datasets into an interactive decision-support and predictive simulation platform for spacecraft, space stations (**ISS**), **Artemis Lunar Bases (LEA)**, **Mars Surface Habitats**, **Pressurized Rovers**, and **Earth spin-off industries**.

### Four Cross-Validating Super Intelligence (SI) Algorithms
1. **Algorithm 1 — Partial-Gravity Combustion Physics (`src/engine/physics_models.ts`)**
   - Computes dimensionless hydrodynamic numbers ($\text{Gr}, \text{Re}, \text{Ri}, \text{Pe}$), induced buoyant velocity $u_b = 30\sqrt{g}$, effective oxidizer speed $u_{\text{eff}} = \sqrt{u_g^2 + u_b^2}$, dynamic Limiting Oxygen Concentration $\text{LOC}(P, u_{\text{eff}})$, Olson's U-shaped low-flow flammability curve, Damköhler blowoff proxy $\text{Da}$, and Fernandez-Pello flame spread velocity $V_f$.
2. **Algorithm 2 — Spacecraft Combustion Risk Index (SCRI) & Shannon Entropy-Weighted TOPSIS (`src/engine/ranking_engine.ts`, `src/engine/si_ensemble.ts`)**
   - Evaluates the composite risk index $R_{\text{composite}} = 0.25 S_{\text{env}} + 0.30 S_{\text{flam}} + 0.15 S_{\text{geom}} + 0.15 S_{\text{ext}} + 0.15 S_{\text{tox}} \in [0, 100]$ and ranks 12 spacecraft materials (`PMMA`, `Cotton-SIBAL`, `Polyethylene`, `Nomex`, `Delrin`, `Mylar`, `Silicone`, `Ultem 1000`, `Kapton`, `PTFE`, `n-Heptane`, `Methane`) using Shannon entropy closeness $C_i^*$.
3. **Algorithm 3 — 64-Tree Unsupervised Isolation Forest (`src/engine/si_ensemble.ts`)**
   - Computes real-time multi-sensor anomaly scores $s(x, \psi) = 2^{-\bar{h}(x)/c(\psi)}$ across 5 cabin telemetry channels (`CO ppm`, `CO2 ppm`, `Dual-Wavelength Laser Obscuration %/m`, `SAME Soot-to-Dust Ratio`, and `LWIR Thermal Rate-of-Rise C/s`).
4. **Algorithm 4 — Dynamic Bayesian Network (DBN) Fire vs. Dust Arbitrator (`src/engine/si_ensemble.ts`)**
   - Performs forward Bayesian inference over `NOMINAL`, `OPEN_FIRE`, `SMOLDER`, and `SENSOR_FAULT_OR_DUST` to command autonomous $0g$ HVAC fan shutdown ($u_g \to 0.3\text{ cm/s}$) on real fires while rejecting lunar/Martian regolith dust nuisance alarms (`NASA SAME / DAFT`).

---

## 2. Quickstart Instructions

### Prerequisites
- **Node.js v24+** (uses native TypeScript execution and `node:test` with zero external runtime dependencies).

### Start the Full-Stack Web Dashboard & REST API Server
```bash
cd C:\Users\Admin\.gemini\antigravity\scratch\Nasa
npm start
```
Then open **`http://127.0.0.1:3000`** in your browser.

### Run the 5-Tier Unified E2E Verification Suite
```bash
npm run test:all
```
Or run the full repository harness + E2E verification check:
```bash
npm run verify
```

---

## 3. Repository Architecture

```text
C:\Users\Admin\.gemini\antigravity\scratch\Nasa\
├── NASA_DATASET.xlsx                  # V1 Raw NASA PSI Dataset (5 columns, Shared Strings)
├── NASA_DATASET_ANALYZED_V2.xlsx      # V2 Analyzed NASA PSI Dataset (7 columns + Sheet 2 Domain Clusters)
├── package.json                       # Zero-dependency Node.js v24 configuration
├── tsconfig.json                      # Strict TypeScript NodeNext configuration
├── src/
│   ├── index.ts                       # Unified barrel export
│   ├── types/index.ts                 # Domain contracts & runtime type guards
│   ├── pipeline/
│   │   ├── xlsx_parser.ts             # Native PKZIP / OpenXML parser (V1 SST + V2 InlineStr + Sheet 2)
│   │   ├── psi_catalog.ts             # 26 Canonical NASA PSI Investigations taxonomy
│   │   └── normalizer.ts              # Dataset normalizer & scientific enrichment
│   ├── engine/
│   │   ├── physics_models.ts          # Microgravity & partial-g combustion physics
│   │   ├── habitat_scenarios.ts       # 5 Exploration Habitats (ISS, Artemis LEA, Mars, Rover, Earth)
│   │   ├── ranking_engine.ts          # Multi-factor SCRI risk scoring & investigation ranker
│   │   ├── recommender.ts             # Autonomous fire safety guidelines & terrestrial spin-offs
│   │   └── si_ensemble.ts             # 4-Algorithm Ensemble (TOPSIS + Isolation Forest + Bayesian DBN)
│   └── server/
│       ├── server.ts                  # Native node:http server lifecycle
│       ├── router.ts                  # REST API router (/api/health, /investigations, /analyze, /compare...)
│       └── static_handler.ts          # Static asset handler with nosniff security headers
├── public/
│   ├── index.html                     # Mission Control HUD + Crew Mobile View HTML
│   ├── styles.css                     # Dark aerospace telemetry styling & responsive mobile mode
│   ├── visualizer.js                  # Interactive SVG U-Curve, Flame Morphology & 5-Axis Risk Radar
│   └── app.js                         # Client state controller & live API integration
├── test/
│   ├── 01_data_pipeline.test.ts       # Tier 1: V1/V2 XLSX parsing, 26 PSI records, fault injection
│   ├── 02_physics_engine.test.ts      # Tier 2: Microgravity low-flow sweet spot, quenching, blowoff
│   ├── 03_ranking_scoring.test.ts     # Tier 3: SCRI bounds, O2 monotonicity, Artemis vs ISS deltas
│   ├── 04_scenarios_env.test.ts       # Tier 4: 5 Habitat scenarios, suppression & Earth spin-offs
│   ├── 05_api_web_e2e.test.ts         # Tier 5: HTTP server lifecycle, REST endpoints & static assets
│   └── run_all_tests.ts               # Unified 5-Tier E2E test runner
├── scripts/
│   ├── start.js                       # Server launcher
│   └── verify.js                      # Complete repository & E2E verification CLI
└── pitch/
    ├── pitch_deck.md                  # 7-Slide NASA Space Apps presentation deck
    ├── executive_summary.md           # Project submission summary
    └── demo_script.md                 # 240-second live demonstration walkthrough
```

---

## 4. REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Server health status, uptime, memory, and 26 ingested PSI record count |
| `GET` | `/api/investigations` | Full array of 26 enriched PSI investigations (supports `?category=`, `?isCombustion=`, `?q=`) |
| `GET` | `/api/investigations/:id` | Detailed record for a single PSI investigation (e.g., `PSI-47`, `PSI-69`, `PSI-100`) |
| `GET` | `/api/scenarios` | All 5 standardized exploration habitat environments (`iss`, `artemis_lunar`, `mars_habitat`, `rover`, `terrestrial`) |
| `POST` | `/api/analyze` | Executes real-time combustion physics, SCRI, U-curve boundary, and 4-Algorithm SI evaluation |
| `GET` | `/api/compare?ids=...` | Side-by-side comparison matrix and parameter overlap synthesis across selected PSI IDs |
| `GET` | `/api/rankings?scenario=...` | Ranks all 26 PSI investigations and 12 spacecraft materials (TOPSIS) for a target habitat |
| `GET` | `/api/columns` | Direct column-by-column analysis of `NASA_DATASET.xlsx` (V1) and `NASA_DATASET_ANALYZED_V2.xlsx` (V2 + Sheet 2) |
| `GET` | `/api/spinoffs` | Fire safety operational guidelines, terrestrial spin-offs, and spacecraft material catalog |
| `GET` | `/api/export` | Complete JSON dump of all 26 PSI investigations, 5 habitat scenarios, and scenario rankings |
