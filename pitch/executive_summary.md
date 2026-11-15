# Executive Summary — AETHER-SI Microgravity Combustion & Fire Safety Dashboard

## 1. Project Summary
**AETHER-SI** is an interactive, Super Intelligence (SI) powered full-stack web dashboard and handheld crew application developed for the **NASA Space Apps Challenge**. It ingests, analyzes, ranks, and interprets **26 microgravity combustion and physical science investigations** from NASA's **Physical Science Informatics (PSI)** database (`NASA_DATASET.xlsx` and `NASA_DATASET_ANALYZED_V2.xlsx`) to deliver actionable fire safety intelligence for human space exploration across the **ISS**, **Artemis Lunar Base (LEA)**, **Mars Surface Habitats**, **Pressurized Rovers**, and **Earth spin-off industries**.

## 2. How We Addressed the Challenge
1. **Column-by-Column Excel Pipeline (`src/pipeline/`)**:
   - Built a zero-dependency OpenXML PKZIP parser (`xlsx_parser.ts`) that directly reads both `NASA_DATASET.xlsx` (5-column Shared Strings schema) and `NASA_DATASET_ANALYZED_V2.xlsx` (7-column Inline Strings schema + Sheet 2 `Domain_Summary` clusters).
   - Enriches all 26 PSI records (`PSI-10` through `PSI-181`) with fuel types, sample geometries, oxygen concentrations ($\%\text{ O}_2$), cabin pressures ($\text{kPa}$), airflow speeds ($\text{cm/s}$), gravity regimes, and missing exploration opportunities.
2. **4-Algorithm Super Intelligence Engine (`src/engine/`)**:
   - **Algorithm 1 (Combustion Physics)**: Models Grashof/Reynolds/Damköhler scaling, buoyant velocity $u_b = 30\sqrt{g}$, Olson's U-shaped low-flow flammability boundary, and opposed/concurrent flame spread rate $V_f$.
   - **Algorithm 2 (SCRI & Shannon Entropy-TOPSIS)**: Computes the **Spacecraft Combustion Risk Index (SCRI, 0–100)** across 5 weighted sub-scores ($0.25 S_{\text{env}} + 0.30 S_{\text{flam}} + 0.15 S_{\text{geom}} + 0.15 S_{\text{ext}} + 0.15 S_{\text{tox}}$) and ranks 12 spacecraft materials via Shannon Entropy-Weighted TOPSIS closeness $C_i^*$.
   - **Algorithm 3 (64-Tree Unsupervised Isolation Forest)**: Computes real-time multi-sensor anomaly scores $s(x, \psi) = 2^{-\bar{h}(x)/c(\psi)}$.
   - **Algorithm 4 (Dynamic Bayesian Network Arbitrator)**: Arbitrates between `NOMINAL`, `OPEN_FIRE`, `SMOLDER`, and `SENSOR_FAULT_OR_DUST`, rejecting lunar regolith dust false alarms (`SAME/DAFT`) while commanding immediate $0g$ HVAC fan shutdown ($u_g \to 0.3\text{ cm/s}$) on real fires.
3. **Interactive Mission Control Web & Crew Mobile Dashboard (`public/`)**:
   - Features 5 one-click habitat presets, reactive atmosphere/fuel sliders, live U-shaped flammability boundary SVG charts, side-by-side multi-investigation comparator, column-by-column Excel schema inspector, and terrestrial spin-off intelligence.

## 3. Official NASA Datasets & Investigations Used
- `NASA_DATASET.xlsx` & `NASA_DATASET_ANALYZED_V2.xlsx` (26 NASA PSI Investigations)
- **Solid Flammability**: `BASS` (`PSI-26`), `BASS-II` (`PSI-47`), `Saffire-I/-II/-III` (`PSI-69`, `PSI-142`, `PSI-159`)
- **Droplet & Suppression**: `FLEX` (`PSI-68`), `FLEX-2` (`PSI-22`), `CFI` (`PSI-115`)
- **Gaseous & Partial-G Proxy**: `ACME E-FIELD Flames` (`PSI-100`), `ACME BRE` (`PSI-98`), `ACME CFI-G` (`PSI-102`), `SPICE` (`PSI-20`), `SLICE` (`PSI-25`)
- **Smoke & Aerosol Detection**: `SAME` (`PSI-21`, `PSI-101`, `PSI-107`)
