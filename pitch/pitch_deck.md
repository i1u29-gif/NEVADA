# AETHER-SI: Super Intelligence Microgravity Combustion & Spacecraft Fire Safety Dashboard
**NASA Space Apps Challenge 2026 — Presentation Deck (7 Slides)**

---

## Slide 1: The 80,000-Mile Problem — Fire in Deep Space
- **The Quote**: *"If you want to get somebody's attention really quick, make the fire alarm go off in your spacecraft when you're still about 80,000 miles from home."* — Artemis II Commander.
- **Historical Precedents**: Apollo 1 (1967 hyperoxic cabin tragedy), Apollo 13 (1970 oxygen tank explosion), and Space Station Mir (1997 solid-fuel oxygen generator fire).
- **The Challenge**: NASA's Physical Science Informatics (PSI) repository houses decades of ISS microgravity combustion experiments, yet engineers and researchers struggle to synthesize, compare, and apply these findings to next-generation Lunar and Martian habitats.

---

## Slide 2: Why Microgravity & Lunar Exploration Change Everything
- **Zero Buoyancy ($Gr \approx 0$)**: Without rising hot gases, flames become ghostly blue diffusion spheres.
- **The Low-Flow Paradox (BASS & BASS-II)**: At slow HVAC drafts ($2\text{–}10\text{ cm/s}$), materials burn at *lower* oxygen concentrations in $0g$ than on Earth because fresh oxidizer arrives without convective heat loss.
- **The Artemis Hyperoxic Trap ($34\%\text{ O}_2, 56.5\text{ kPa} / 8.2\text{ psia}$)**: To eliminate hours of EVA pre-breathing on the Moon, habitats and pressurized rovers increase $\text{O}_2$ to $30\text{–}34\%$ — invalidating standard Earth $1g$ material certifications (`NASA-STD-6001 Test 1`).

---

## Slide 3: Direct Column-by-Column Ingestion of NASA PSI Datasets
- **Zero-Dependency Native OpenXML Parser (`src/pipeline/xlsx_parser.ts`)**:
  - Directly unpacks both `NASA_DATASET.xlsx` (V1 Shared Strings Table) and `NASA_DATASET_ANALYZED_V2.xlsx` (V2 Inline Strings + Sheet 2 `Domain_Summary` clusters) using native `node:zlib` in `<25 ms`.
- **26 Canonical PSI Investigations Unified**:
  - **Solid Fuels (11)**: `BASS` (`PSI-26`), `BASS-II` (`PSI-47`), `Saffire-I/-II/-III` (`PSI-69`, `PSI-142`, `PSI-159`), `SOFIE`.
  - **Gaseous & Electric-Field Proxy (5)**: `ACME E-FIELD` (`PSI-100`, mimicking partial gravity via flame ion body forces), `ACME BRE` (`PSI-98`), `CFI-G` (`PSI-102`), `SPICE` (`PSI-20`), `SLICE` (`PSI-25`).
  - **Droplet & Cool Flames (3)**: `FLEX` (`PSI-68`), `FLEX-2` (`PSI-22`), `CFI`.
  - **Smoke vs. Dust Detection (3)**: `SAME` (`PSI-21`, `PSI-101`, `PSI-107`) & `DAFT` precedent.

---

## Slide 4: The 4-Algorithm AETHER Super Intelligence (SI) Engine
1. **Algorithm 1 — Partial-Gravity Combustion Physics (`src/engine/physics_models.ts`)**:
   - Computes buoyant velocity $u_b = 30\sqrt{g}$, effective oxidizer speed $u_{\text{eff}} = \sqrt{u_g^2 + u_b^2}$, dynamic Limiting Oxygen Concentration $\text{LOC}(P, u_{\text{eff}})$, Olson's U-shaped flammability boundary, and Fernandez-Pello flame spread rate $V_f$.
2. **Algorithm 2 — Composite SCRI + Shannon Entropy-Weighted TOPSIS (`src/engine/ranking_engine.ts`, `si_ensemble.ts`)**:
   - Ranks all 26 PSI investigations (`SCRI 0–100`) and 12 spacecraft materials (`PMMA`, `Cotton-SIBAL`, `Nomex`, `Ultem 1000`, `PTFE`, etc.) using blended objective/subjective entropy weights $w_j^{\text{blend}} = 0.65 w_j^0 + 0.35 w_j^{\text{entropy}}$.
3. **Algorithm 3 — 64-Tree Unsupervised Isolation Forest (`src/engine/si_ensemble.ts`)**:
   - Isolates multi-sensor cabin anomalies ($s(x, \psi) = 2^{-\bar{h}(x)/c(\psi)}$) across CO, $\text{CO}_2$, dual-wavelength laser obscuration, soot fractal ratio, and LWIR temperature rise.
4. **Algorithm 4 — Dynamic Bayesian Network (DBN) Fire vs. Dust Arbitrator**:
   - Cross-validates Algorithms 1–3 to trigger autonomous $0g$ HVAC fan shutdown ($u_g \to 0.3\text{ cm/s}$) on real fires while rejecting lunar regolith dust nuisance alarms (`SAME/DAFT`).

---

## Slide 5: Interactive Mission Control & Crew Mobile App
- **Live Habitat Simulator**: Instant presets for `ISS (0g, 21% O2)`, `Artemis Lunar LEA (0.166g, 34% O2)`, `Mars Habitat (0.38g, 28% O2)`, `Pressurized Rover (0.166g, 32% O2)`, and `Earth Baseline (1g)`.
- **Interactive SVG Visualizers**: Real-time U-shaped Flammability Curve with operating point crosshair, $0g$ Spherical vs. Partial-$g$ Teardrop Flame Morphology, and 5-Axis Risk Radar.
- **Dual Mode UI**: Switch seamlessly between the **12-Column Web Mission Control Dashboard** and the **Handheld Crew Mobile App** with 1-tap `⚡ 0g CUT HVAC FAN` actuation.

---

## Slide 6: From the ISS to Earth — Terrestrial Spin-Off Impact
- **Coal Mine Safety (`SAME / DAFT`)**: Dual-wavelength laser scattering + CO/$\text{CO}_2$ telemetry distinguishes pyrolysis soot aggregates from rock/coal dust, cutting false mine evacuations by $>85\%$.
- **Clean Agent Halon 1301 Replacements (`FLEX / CFI`)**: Optimizes fine-water-mist droplet spectra ($30\text{–}50\ \mu\text{m}$) and Fluoroketone `FK-5-1-12` total flooding with zero ozone depletion ($\text{ODP}=0$).
- **Submarine & Cleanroom Protection (`BASS / ACME E-FIELD`)**: Quiescent ventilation quenching for nuclear submarines and residue-free electric-field flame suppression for semiconductor cleanrooms.

---

## Slide 7: Verification & Flight Readiness
- **100% Pure TypeScript / JavaScript**: Zero external runtime npm dependencies; runs natively on Node.js v24.
- **5-Tier Automated Verification Suite (`test/run_all_tests.ts`)**:
  - **159 Passing Assertions / 0 Failures** across Data Ingestion, Combustion Physics, SCRI Monotonicity, Habitat Scenarios, and Full-Stack REST API E2E tests in `< 2 seconds`.
