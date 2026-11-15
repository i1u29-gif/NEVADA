/**
 * NASA Microgravity Combustion Science Dashboard & SI Harness
 * Module: Actionable Recommender, Suppression Protocols & Terrestrial Spin-offs
 * Path: src/engine/recommender.ts
 *
 * Implements Feature F10 (Actionable Recommender) and Feature F17 (Terrestrial Spin-offs)
 * conforming to PROJECT.md § 4.2, § 4.3, and src/types/index.ts.
 */

import type {
  SimulationInput,
  SimulationResult,
  FireSafetyGuideline,
  SpinOffInsight,
  SafetyPillar,
  HabitatId
} from '../types/index.ts';

// ============================================================================
// 1. TERRESTRIAL SPIN-OFF INSIGHTS CATALOG (Feature F17)
// ============================================================================

export const TERRESTRIAL_SPINOFFS: readonly SpinOffInsight[] = [
  {
    id: 'spinoff-mine-safety',
    title: 'Underground Coal Mine Dust vs. Pyrolysis Smoke Discriminator',
    domain: 'Mine Safety',
    nasaPrecedent: 'NASA SAME, SAME-R & DAFT/DAFT-2 investigations aboard ISS Microgravity Science Glovebox (MSG)',
    description:
      'Leverages microgravity smoke agglomeration findings where lack of buoyancy prolongs particle residence time, yielding fractal soot aggregates. Terrestrial adaptation couples dual-wavelength laser photometer scattering (DustTrak/P-Trak) with electrochemical CO/CO2 ratio telemetry to distinguish early smoldering coal mine fires from nuisance rock/coal dust clouds, virtually eliminating false mine evacuations.',
    impactMetric:
      'Reduces nuisance dust false alarms by >85%, saving an estimated $12M annually per major mining district and preventing unnecessary production shutdowns.'
  },
  {
    id: 'spinoff-clean-agent',
    title: 'Clean Agent Halon 1301 Replacement (Fluoroketone FK-5-1-12 & Water Mist)',
    domain: 'Clean Agent Halon Replacements',
    nasaPrecedent: 'NASA FLEX, FLEX-2 & CFI (Cool Flames Investigation) in CIR Multi-user Droplet Combustion Apparatus',
    description:
      'Microgravity droplet combustion physics revealed how radiative extinction occurs when inert diluents or high heat-capacity mists absorb radiant energy. This directly guided the optimization of fine-water-mist droplet size spectra (30-50 um) and clean fluoroketone (FK-5-1-12) total flooding dynamics for sealed spaces, providing a non-toxic replacement for ozone-depleting Halon 1301.',
    impactMetric:
      'Zero Ozone Depletion Potential (ODP = 0.0), Global Warming Potential GWP < 1, with 100% human-safe design concentrations in commercial aviation cargo and marine engine rooms.'
  },
  {
    id: 'spinoff-submarine-eclss',
    title: 'Closed Atmosphere HVAC Sector Isolation & Quiescent Quenching',
    domain: 'Submarine Life Support',
    nasaPrecedent: 'NASA BASS & BASS-II investigations in ISS MSG flow duct',
    description:
      'Applies microgravity low-flow flammability science to sealed nuclear submarine life-support compartments. Automated high-speed sector louvers shut down forced ventilation below 1.0 cm/s, starving the fire of advective oxidizer and inducing rapid radiative self-extinction without discharging chemical agents that poison closed CO2 scrubbers.',
    impactMetric:
      'Eliminates toxic chemical agent contamination of closed life-support scrubbing beds and cuts casualty recovery time by 90%.'
  },
  {
    id: 'spinoff-aviation-cargo',
    title: 'Aviation Cargo Hold Low-Pressure Smolder Arrest',
    domain: 'Aviation Cabins',
    nasaPrecedent: 'NASA Saffire large-scale flow duct fire safety demonstrations aboard Cygnus cargo spacecraft',
    description:
      'Integrates multi-criteria optical scattering and NDIR carbon monoxide gas sensors to detect deep-seated smoldering in bulk aircraft cargo containers at 8,000 ft cruise cabin altitudes (75 kPa). Early identification allows controlled inert gas injection prior to transition to open flaming.',
    impactMetric:
      'Extends certified Extended-range Twin-engine Operational Performance Standards (ETOPS) cargo fire diversion windows from 180 to 240+ minutes.'
  },
  {
    id: 'spinoff-plasma-suppression',
    title: 'Electric-Field Flame Deflection & Cleanroom Fire Arrest',
    domain: 'Industrial Chemical Facilities',
    nasaPrecedent: 'NASA ACME E-FIELD Flames investigation in ISS Combustion Integrated Rack (CIR)',
    description:
      'Applies high-voltage electrostatic fields across process flames to manipulate natural flame ions (HCO+, H3O+), destabilizing the reaction zone and inducing rapid blowoff without liquid water, foam, or chemical powder contamination.',
    impactMetric:
      'Sub-second (<150 ms) flame suppression with zero chemical residue, preserving ultra-clean semiconductor fabrication cleanrooms and battery production lines.'
  }
] as const;

/**
 * Returns all terrestrial spin-off insights.
 */
export function getTerrestrialSpinOffs(): SpinOffInsight[] {
  return [...TERRESTRIAL_SPINOFFS];
}

// ============================================================================
// 2. FIRE SAFETY GUIDELINES CATALOG (Feature F10)
// ============================================================================

export const FIRE_SAFETY_GUIDELINES: readonly FireSafetyGuideline[] = [
  {
    id: 'guideline-prev-01',
    title: 'Low-Flow Ventilation Flammability Hazard Sweet Spot',
    severity: 'HIGH',
    triggerCondition: 'Forced airflow velocity between 2.0 and 10.0 cm/s in microgravity (0g) or partial gravity',
    protocol:
      'Avoid maintaining low-speed forced ventilation (2-10 cm/s) across combustible solid arrays. At this velocity band, convective cooling is negligible while fresh oxidizer is continuously delivered, depressing material LOC below 1g baseline ratings. In fire emergencies, shut down fans immediately to force quiescent radiative extinction.',
    scientificBasis:
      'NASA BASS & BASS-II investigations proved that solid materials ignite and spread faster at 2-10 cm/s in 0g than in 1g downward spread due to the complete absence of buoyant heat loss.'
  },
  {
    id: 'guideline-prev-02',
    title: 'Exploration Atmosphere (34% O2) Material Recertification',
    severity: 'CRITICAL',
    triggerCondition: 'Cabin operational atmosphere oxygen concentration exceeding 25.0% O2',
    protocol:
      'All materials flight-certified under terrestrial 1g NASA-STD-6001 Test 1 (21% O2) must undergo dedicated hyperoxic testing prior to flight. Materials considered flame-resistant on Earth (e.g. Nomex HT90-40, silicone wire insulation) readily sustain propagation at 34% O2.',
    scientificBasis:
      'NASA Saffire-I/-II/-III large-scale burns demonstrated that hyperoxic exploration atmospheres drastically lower ignition energy thresholds and accelerate flame spread velocities by >1.5x.'
  },
  {
    id: 'guideline-det-01',
    title: 'Multi-Modal Smoke vs. Dust Aerosol Discrimination',
    severity: 'HIGH',
    triggerCondition: 'Optical obscuration detection in lunar/Mars habitats with regolith dust presence',
    protocol:
      'Single-criterion optical or ionization smoke detectors must not be used as sole trip indicators in crewed habitats. Sensor suites must correlate dual-wavelength laser scattering with NDIR CO/CO2 gas ratio and thermal gradient rate-of-rise to reject nuisance regolith dust false alarms.',
    scientificBasis:
      'NASA SAME, SAME-R, and DAFT studies proved that prolonged 0g residence time produces soot fractal aggregates up to 100x larger than 1g smoke, causing standard ionization detectors to experience severe sensitivity loss while confusing optical detectors with mineral dust.'
  },
  {
    id: 'guideline-det-02',
    title: 'Cool-Flame & Smoldering Latency Monitoring Post-Extinction',
    severity: 'MODERATE',
    triggerCondition: 'Extinguishment of open flaming combustion over charring fuels or liquid hydrocarbons',
    protocol:
      'Maintain continuous LWIR thermal imaging and formaldehyde gas monitoring for at least 30 minutes following visible flameout. Charring fabrics and hydrocarbon condensates can maintain low-temperature (600-800 K) reactions that re-ignite upon ventilation restoration.',
    scientificBasis:
      'NASA FLEX and CFI experiments confirmed that droplet and char reactions transition into invisible, low-temperature cool flames that continue exothermically in diffusion-dominated microgravity.'
  },
  {
    id: 'guideline-supp-01',
    title: 'Microgravity Suppression Agent Selection & Chemical Dust Ban',
    severity: 'CRITICAL',
    triggerCondition: 'Fire suppression system deployment in microgravity (0g ISS / Gateway)',
    protocol:
      'Solid chemical dust or particulate extinguishers are strictly banned in 0g microgravity. Deploy only portable gaseous CO2 extinguishers for enclosed avionics racks or fine water mist (deionized water) for open cabin areas. Always command immediate HVAC shutdown.',
    scientificBasis:
      'In zero-g, unconstrained chemical powders form persistent airborne suspensions that permanently blind crew vision, foul life-support HEPA scrubbers, and cause acute respiratory failure.'
  },
  {
    id: 'guideline-supp-02',
    title: 'Confined Space Rover Rapid Cabin Depressurization Protocol',
    severity: 'CRITICAL',
    triggerCondition: 'Confirmed combustion in confined cockpit volume (<=15 m3) with Crew present',
    protocol:
      'Execute immediate 30-second crew suit donning and isolate suit umbilicals. If clean agent total flooding fails to extinguish the fire within 15 seconds, initiate emergency cabin vacuum dump down to < 5 kPa to starve combustion.',
    scientificBasis:
      'Confined rover volumes reach thermal flashover and toxic gas saturation within 30 seconds due to restricted volume heat trapping, leaving vacuum dump as the only 100% reliable extinguishing mechanism.'
  },
  {
    id: 'guideline-supp-03',
    title: 'Hyperoxic Enriched Atmosphere Total Flooding & Dilution',
    severity: 'CRITICAL',
    triggerCondition: 'Fire event in Artemis LEA (34% O2, 56.5 kPa)',
    protocol:
      'Command automated high-pressure Nitrogen (N2) gas dilution or FK-5-1-12 clean agent flooding to force O2 mole fraction rapidly below 16% LOC. Close hermetic sector louvers and trip solid-state power controller (SSPC) bus within 50 ms.',
    scientificBasis:
      'At 34% O2, standard terrestrial agent discharge volumes fail to extinguish flames due to the large oxidizer excess and elevated reaction kinetics.'
  },
  {
    id: 'guideline-proxy-01',
    title: 'Partial-Gravity Buoyancy & Plume Transition Management',
    severity: 'HIGH',
    triggerCondition: 'Operations in partial gravity (Moon 0.166g, Mars 0.38g)',
    protocol:
      'Do not rely on ventilation fan shutdown alone to extinguish fires in lunar or Martian habitats. At 0.166g to 0.38g, natural buoyant plume convection generates 12-18 cm/s updrafts; active louver closure and directed suppression are mandatory.',
    scientificBasis:
      'NASA ACME E-FIELD Flames demonstrated that even weak body forces (mimicking partial gravity) establish stable convective plumes that sustain combustion without forced ventilation.'
  }
] as const;

/**
 * Returns all fire safety guidelines.
 */
export function getFireSafetyGuidelines(): FireSafetyGuideline[] {
  return [...FIRE_SAFETY_GUIDELINES];
}

/**
 * Returns fire safety guidelines filtered by architectural safety pillar.
 */
export function getGuidelinesByPillar(pillar: SafetyPillar): FireSafetyGuideline[] {
  const p = pillar.toLowerCase();
  return FIRE_SAFETY_GUIDELINES.filter((g) => g.id.toLowerCase().includes(p.slice(0, 4)));
}

// ============================================================================
// 3. AUTONOMOUS SUPPRESSION PROTOCOLS
// ============================================================================

/**
 * Returns environment-specific fire suppression protocols based on habitat operational constraints.
 */
export function getSuppressionProtocol(habitatId: string): string[] {
  switch (habitatId as HabitatId) {
    case 'iss':
      return [
        'AGENT RESTRICTION: Solid chemical dust or particulate extinguishers are strictly banned in 0g microgravity due to suspended aerosol clouds that blind crew, clog ECLSS HEPA filters, and cause acute respiratory trauma.',
        'PRIMARY SUPPRESSION: Deploy portable Gaseous CO2 Fire Extinguisher (PFE) directly into the affected avionics rack port or enclosure.',
        'SECONDARY SUPPRESSION: Discharge fine water mist extinguisher using deionized water for open cabin surface fires.',
        'VENTILATION PROTOCOL: Execute immediate cabin HVAC loop shutdown to drop airflow < 1.0 cm/s and promote radiative self-extinction in zero-g.'
      ];

    case 'artemis_lunar':
      return [
        'HYPEROXIC MITIGATION: In 34% O2 LEA exploration atmosphere, standard 1g suppression concentrations are inadequate.',
        'TOTAL FLOODING: Discharge FK-5-1-12 clean agent flooding or high-pressure gaseous Nitrogen (N2) purge to dilute O2 concentration rapidly below 16% LOC.',
        'SECTOR ISOLATION: Close hermetic sector louvers to prevent hyperoxic draft feeding to adjacent lander compartments.',
        'ELECTRICAL SAFEGUARD: Trip solid-state power controller (SSPC) bus within 50 ms to suppress electrical re-ignition.'
      ];

    case 'rover':
      return [
        'CONFINED SPACE PROTOCOL: Confined 12 m3 cabin volume requires automated total flooding or rapid emergency depressurization.',
        'CREW SAFETY: Mandate immediate 30-second crew suit donning and switch suit umbilical to closed-loop life support.',
        'CABIN DEPRESSURIZATION: If automated clean agent flooding fails to arrest thermal runaway, initiate controlled vacuum dump down to < 5 kPa to extinguish all flaming combustion.',
        'VENTILATION ISOLATION: Instantly shut down cabin recirculation blowers.'
      ];

    case 'mars_habitat':
      return [
        'PARTIAL GRAVITY BUOYANCY: At 0.38g, natural convection sustains upward flame plumes; ventilation shutdown alone will not extinguish flames.',
        'SUPPRESSION AGENTS: Discharge directed gaseous CO2 or fine water mist directly at the fire base.',
        'GREENHOUSE BIOMASS MANAGEMENT: For agricultural/greenhouse bays, isolate biomass sector and activate dedicated HEPA particulate scrubbing loops to extract heavy pyrolysis smoke aerosols.',
        'SURFACE ISOLATION: Isolate power distribution units feeding lighting and heating grids.'
      ];

    case 'terrestrial':
    default:
      return [
        'Deploy standard multi-criteria NFPA Class A/B/C suppression systems.',
        'Utilize FK-5-1-12 clean agent flooding or fine water mist for sensitive electronics, server racks, and cleanroom enclosures.',
        'Engage HVAC smoke damper isolation and emergency building exhaust.'
      ];
  }
}

// ============================================================================
// 4. ACTIONABLE RECOMMENDATIONS GENERATOR
// ============================================================================

/**
 * Autonomously generates context-aware fire safety and mitigation recommendations
 * based on live or simulated combustion telemetry.
 */
export function generateRecommendations(
  input: SimulationInput,
  _result?: Partial<SimulationResult>
): string[] {
  const recs: string[] = [];
  const g = input.gravityG;
  const o2 = input.oxygenPct;
  const p = input.pressureKPa;
  const fuel = input.fuelType.toLowerCase();

  // 1. Ventilation actuation guidance
  if (g < 0.1) {
    recs.push(
      'Immediately cut forced ventilation to <0.5 cm/s to suppress convective oxidizer supply and promote radiative flame extinction in microgravity.'
    );
  } else {
    recs.push(
      `At partial gravity (${g.toFixed(2)}g), natural buoyancy sustains convective flow (~12-18 cm/s); close sector louvers and do not rely on fan shutdown alone.`
    );
  }

  // 2. Material & geometry specific mitigation
  if (fuel.includes('cotton') || fuel.includes('fabric')) {
    recs.push(
      'Caution: Do NOT restore airflow drafts or ventilation loops after visible flameout; charring fabrics sustain flameless smoldering and will re-ignite upon oxidizer draft re-introduction.'
    );
  } else if (fuel.includes('pmma') || fuel.includes('polyethylene')) {
    recs.push(
      'Thermoplastic solid fuels produce molten flaming droplets in microgravity wakes; maintain directed CO2 or water-mist boundary cooling.'
    );
  } else if (fuel.includes('ptfe') || fuel.includes('teflon')) {
    recs.push(
      'Extreme toxic hazard: Fluoropolymer thermal degradation generates lethal HF and PFIB gases; crew must immediately don emergency breathing masks.'
    );
  }

  // 3. Rover / confined volume emergency protocol
  if (p <= 58.0 && o2 >= 30.0 && g <= 0.2) {
    recs.push(
      'Confined rover volume requires immediate crew emergency suit donning and preparation for cabin emergency depressurization.'
    );
  }

  // 4. Mars greenhouse / biomass management
  if (o2 >= 28.0 && g >= 0.3) {
    recs.push(
      'Greenhouse biomass loading: activate emergency HEPA particulate filters and aerosol scrubbing to manage heavy smoke particulates.'
    );
  }

  // 5. Electrical bus isolation
  recs.push(
    'Command Solid-State Power Controller (SSPC) bus isolation to de-energize electrical ignition and ohmic heating sources.'
  );

  return recs;
}

export default {
  TERRESTRIAL_SPINOFFS,
  FIRE_SAFETY_GUIDELINES,
  getTerrestrialSpinOffs,
  getFireSafetyGuidelines,
  getGuidelinesByPillar,
  getSuppressionProtocol,
  generateRecommendations
};
