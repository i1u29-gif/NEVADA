/**
 * NASA Microgravity Combustion Science Dashboard & SI Harness
 * Subsystem: Super Intelligence (SI) Physics & Risk Engine
 * Path: src/engine/index.ts
 *
 * Clean unified barrel export for the SI engine subsystem:
 * - Microgravity Combustion Physics Models (physics_models.ts)
 * - Exploration Habitat Operational Scenarios Matrix (habitat_scenarios.ts)
 * - Super Intelligence Combustion Risk Index (SCRI) Engine (ranking_engine.ts)
 * - Autonomous Actionable Recommender & Spin-offs (recommender.ts)
 */

export * from './physics_models.ts';
export * from './habitat_scenarios.ts';
export * from './ranking_engine.ts';
export * from './recommender.ts';
export * from './si_ensemble.ts';
