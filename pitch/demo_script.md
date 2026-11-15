# 240-Second Judge Demonstration & Video Script (`demo_script.md`)

## 0:00 – 0:30 | Hook: The Fire Alarm 80,000 Miles from Home
- **Visual**: Open **AETHER-SI Mission Control Dashboard** (`http://127.0.0.1:3000`). Highlight the header status badge (`ONLINE • 26 PSI RECORDS • 4 ALGOS`).
- **Narration**: *"When a smoke alarm went off aboard Artemis II, 80,000 miles from Earth, it reminded humanity that fire in space leaves zero room for error. NASA has conducted decades of microgravity combustion experiments in the Physical Science Informatics (PSI) database—but how do we turn 26 complex datasets into instant, life-saving decisions for the Moon and Mars? Meet AETHER-SI."*

## 0:30 – 1:15 | Live Habitat Simulation & The Artemis 34% O2 Paradox
- **Action**:
  1. Click the **`ISS Nominal Cabin (21% O2, 101.3 kPa, 0g)`** preset button. Note the `MODERATE` risk tier and spherical $0g$ diffusion flame morphology.
  2. Click the **`Artemis Lunar Base / LEA (34% O2, 56.5 kPa, 0.166g)`** preset button.
- **Visual**: Watch the **SCRI Score** jump to `CRITICAL`, the operating crosshair move deep into the flammable zone above the **U-Shaped Flammability Boundary Curve**, and the **TOPSIS Material Table** flag materials that were safe on Earth (`Nomex`) as `RESTRICTED_HYPEROXIC`.
- **Action**: Click **`⚡ 0g CUT HVAC FAN (0.3 cm/s)`** in the top header.
- **Visual**: Airflow drops to `0.3 cm/s`, transitioning the regime to `QUENCHED_RADIATION` (`SELF-EXTINGUISHING`), demonstrating the core `BASS` / `BASS-II` discovery!

## 1:15 – 2:00 | 4-Algorithm SI Arbitrator: Rejecting Lunar Dust False Alarms
- **Action**: In the right-hand **4-Algorithm SI Arbitrator** panel, click the sensor event chips:
  1. Click **`🔥 Open Flame`** → Isolation Forest triggers ($s(x,\psi) > 0.70$) and Dynamic Bayesian Network confirms `OPEN_FIRE` ($P > 95\%$), commanding HVAC isolation.
  2. Click **`🌫️ SAME/DAFT Dust Nuisance`** → Optical obscuration spikes from lunar regolith dust, but CO and fractal soot ratios remain low. The Bayesian Arbitrator outputs `SENSOR_FAULT_OR_DUST` (`NUISANCE ALARM REJECTED`), preventing a false cabin depressurization!
  3. Click **`📱 Crew Mobile View`** in the top header to demonstrate the handheld astronaut tablet/phone interface.

## 2:00 – 3:00 | Direct Excel Column-by-Column Analyzer & Side-by-Side PSI Comparator
- **Action**:
  1. Switch to **Tab 2 (`📊 26 PSI Catalog & Excel Column Analyzer`)**. Show the live column-by-column breakdown of `NASA_DATASET.xlsx` (5 columns) and `NASA_DATASET_ANALYZED_V2.xlsx` (7 columns including `DOMAIN_TAG`, `EN_TECHNICAL_KEYWORDS`, and Sheet 2 `Domain_Summary` clusters).
  2. Click **`Inspect`** on `PSI-47 (BASS-II)` to view Column E's Missing Opportunities analysis and direct NASA PSI repository link.
  3. Switch to **Tab 3 (`⚖️ Side-by-Side PSI Comparator`)** and click **`Flagship Trio (BASS + Saffire-I + FLEX)`** to compare solid, large-scale spacecraft, and droplet combustion envelopes side by side.

## 3:00 – 4:00 | Terrestrial Spin-Offs & 159-Assertion Verification Proof
- **Action**:
  1. Switch to **Tab 4 (`🌍 Fire Protocols & Earth Spin-Offs`)** to highlight how `SAME` aerosol physics prevents false coal-mine evacuations and `FLEX` droplet data drives clean Halon 1301 replacements.
  2. Run `npm run test:all` in the terminal, showing all **5 Verification Tiers (159 assertions, 0 failures)** passing in under 2 seconds.
