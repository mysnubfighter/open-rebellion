/**
 * Types mirroring the DTOs exposed by the `rebellion-web` WASM crate.
 * Keep these in sync with `crates/rebellion-web/src/lib.rs`.
 */

export type Faction = 'Alliance' | 'Empire';

export type SystemControl =
  | 'Uncontrolled'
  | 'Alliance'
  | 'Empire'
  | 'Contested'
  | 'Uprising';

export type MissionKind =
  | 'Diplomacy'
  | 'Espionage'
  | 'Sabotage'
  | 'Assassination'
  | 'Rescue'
  | 'Abduction'
  | 'InciteUprising'
  | 'Recruitment';

export const ALL_MISSION_KINDS: MissionKind[] = [
  'Diplomacy',
  'Espionage',
  'Sabotage',
  'Assassination',
  'Rescue',
  'Abduction',
  'InciteUprising',
  'Recruitment',
];

export interface Skill {
  base: number;
  variance: number;
}

export interface Character {
  id: number;
  name: string;
  faction: Faction;
  isMajor: boolean;
  onMission: boolean;
  onHiddenMission: boolean;
  isCaptive: boolean;
  currentSystemId: number | null;
  diplomacy: Skill;
  espionage: Skill;
  combat: Skill;
  leadership: Skill;
  loyalty: Skill;
}

export interface StarSystem {
  id: number;
  name: string;
  sectorId: number;
  control: SystemControl;
  popularityAlliance: number;
  popularityEmpire: number;
  x?: number;
  y?: number;
  /** REBEXE picture_id from SYSTEMSD.DAT — selects planet portrait. */
  pictureId?: number;
}

/** Per-planet resource bundle — mirrors planet_resources.md. */
export interface PlanetResources {
  manufacturingFacilities: { classId: number; className: string; hpPct: number }[];
  productionFacilities:    { classId: number; className: string; hpPct: number }[];
  defenseFacilities:       { classId: number; className: string; hpPct: number }[];
  allianceFacility?:       { classId: number; className: string; hpPct: number } | null;
  troopsGarrisoned:        { classId: number; className: string; strengthPct: number }[];
  shipsInOrbit:            { classId: number; className: string; hullPct: number; shieldPct: number }[];
  specialForces:           { classId: number; className: string }[];
  charactersPresent:       { characterId: number; name: string; isMajor: boolean }[];
  activeMissions:          { missionId: number; name: string; ticksRemaining: number }[];
  productionQueue:         { kind: string; classId: number; className: string; progressPct: number }[];
  rawMaterials: number;
  refinedMaterials: number;
  energy: number;
  maintenancePoints: number;
  uprisingRisk: number;
  blockaded: boolean;
}

export interface ShipEntry {
  classId: number;
  className: string;
  count: number;
  hullPct: number;
}

export interface Fleet {
  id: number;
  name: string;
  faction: Faction;
  currentSystemId: number;
  destinationSystemId: number | null;
  etaDays: number | null;
  ships: ShipEntry[];
  commanderCharacterId: number | null;
}

export interface ProductionItem {
  id: number;
  systemId: number;
  systemName: string;
  kind: 'Capital Ship' | 'Fighter' | 'Troop' | 'Facility';
  name: string;
  progressPct: number;
  daysRemaining: number;
}

export interface ResearchProject {
  tree: 'Ship' | 'Troop' | 'Facility';
  currentLevel: number;
  progressPct: number;
  assignedCharacterIds: number[];
}

export interface JediCandidate {
  characterId: number;
  characterName: string;
  tier: 'None' | 'Aware' | 'Training' | 'Experienced';
  xpPct: number;
  isTraining: boolean;
}

export interface LoyaltyRow {
  systemId: number;
  systemName: string;
  control: SystemControl;
  uprisingRisk: number;
  betrayalRisk: number;
}

export interface ActiveMission {
  id: number;
  characterId: number;
  characterName: string;
  kind: MissionKind;
  targetSystemId: number;
  targetSystemName: string;
  ticksRemaining: number;
  totalTicks: number;
}

export interface WorldState {
  currentDay: number;
  characterCount: number;
  systemCount: number;
  activeMissionCount: number;
  playerFaction?: Faction;
}
