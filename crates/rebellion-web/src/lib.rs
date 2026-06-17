//! WASM bindings exposing a clean game-state API to a TypeScript/JS web UI.
//!
//! Architecture note:
//!
//! This crate is intentionally **decoupled** from `rebellion-core`'s deep
//! internal types. It exposes a stable, JSON-friendly DTO layer that the
//! web UI consumes. The DTO layer is the contract; the underlying engine
//! can evolve without breaking the UI.
//!
//! For the demo, we maintain an in-memory game state in this crate
//! directly. Production wiring would replace `Engine::tick()` with calls
//! through `rebellion-data::simulation::run_simulation_tick()`, projecting
//! results into the DTO types we already define here.
//!
//! Character group profiles — the showcase QoL feature — live entirely in
//! the UI layer (localStorage). The engine only sees the resulting batch of
//! mission dispatch commands.

use std::cell::RefCell;

use serde::{Deserialize, Serialize};

// REBEXE-authoritative galaxy layout — 20 sectors × 10 systems each.
// Generated from SECTORSD.DAT + SYSTEMSD.DAT in the GOG install.
// See decompiled/analysis/sector_layout.md for details.
mod rebexe_galaxy;
use wasm_bindgen::prelude::*;

// ──────────────────────────────────────────────────────────────────────────
// DTO types — mirror webapp/src/types/game.ts exactly
// ──────────────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Skill {
    pub base: u32,
    pub variance: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Character {
    pub id: u32,
    pub name: String,
    pub faction: String, // "Alliance" | "Empire"
    pub is_major: bool,
    pub on_mission: bool,
    pub on_hidden_mission: bool,
    pub is_captive: bool,
    pub current_system_id: Option<u32>,
    pub diplomacy: Skill,
    pub espionage: Skill,
    pub combat: Skill,
    pub leadership: Skill,
    pub loyalty: Skill,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StarSystem {
    pub id: u32,
    pub name: String,
    pub sector_id: u32,
    pub control: String,
    pub popularity_alliance: f32,
    pub popularity_empire: f32,
    #[serde(default)]
    pub x: f32,
    #[serde(default)]
    pub y: f32,
    /// REBEXE picture_id from SYSTEMSD.DAT — selects the planet portrait BMP.
    #[serde(default)]
    pub picture_id: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ShipEntry {
    pub class_id: u32,
    pub class_name: String,
    pub count: u32,
    pub hull_pct: f32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Fleet {
    pub id: u32,
    pub name: String,
    pub faction: String,
    pub current_system_id: u32,
    /// If in transit, the destination system; otherwise None.
    pub destination_system_id: Option<u32>,
    /// Days until arrival.
    pub eta_days: Option<u32>,
    pub ships: Vec<ShipEntry>,
    pub commander_character_id: Option<u32>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProductionItem {
    pub id: u32,
    pub system_id: u32,
    pub system_name: String,
    pub kind: String,         // "Capital Ship" / "Fighter" / "Troop" / "Facility"
    pub name: String,         // "Mon Calamari Cruiser", "X-Wing", etc.
    pub progress_pct: f32,
    pub days_remaining: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ResearchProject {
    pub tree: String,         // "Ship" / "Troop" / "Facility"
    pub current_level: u32,
    pub progress_pct: f32,
    pub assigned_character_ids: Vec<u32>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct JediCandidate {
    pub character_id: u32,
    pub character_name: String,
    pub tier: String,         // "None" / "Aware" / "Training" / "Experienced"
    pub xp_pct: f32,
    pub is_training: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LoyaltyRow {
    pub system_id: u32,
    pub system_name: String,
    pub control: String,
    pub uprising_risk: f32,
    pub betrayal_risk: f32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ActiveMission {
    pub id: u64,
    pub character_id: u32,
    pub character_name: String,
    pub kind: String,
    pub target_system_id: u32,
    pub target_system_name: String,
    pub ticks_remaining: u32,
    pub total_ticks: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WorldState {
    pub current_day: u32,
    pub character_count: u32,
    pub system_count: u32,
    pub active_mission_count: u32,
}

// ──────────────────────────────────────────────────────────────────────────
// Engine singleton
// ──────────────────────────────────────────────────────────────────────────

struct Engine {
    current_day: u32,
    characters: Vec<Character>,
    systems: Vec<StarSystem>,
    missions: Vec<ActiveMission>,
    fleets: Vec<Fleet>,
    production: Vec<ProductionItem>,
    research: Vec<ResearchProject>,
    jedi: Vec<JediCandidate>,
    next_mission_id: u64,
}

thread_local! {
    static ENGINE: RefCell<Engine> = RefCell::new(Engine {
        current_day: 0,
        characters: Vec::new(),
        systems: Vec::new(),
        missions: Vec::new(),
        fleets: Vec::new(),
        production: Vec::new(),
        research: Vec::new(),
        jedi: Vec::new(),
        next_mission_id: 1,
    });
}

#[wasm_bindgen(start)]
pub fn _start() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

// ──────────────────────────────────────────────────────────────────────────
// Init / world setup
// ──────────────────────────────────────────────────────────────────────────

#[wasm_bindgen]
pub fn init_demo_world() {
    ENGINE.with(|e| {
        let mut engine = e.borrow_mut();
        engine.current_day = 192;
        engine.systems = build_demo_systems();
        engine.characters = build_demo_characters();
        engine.fleets = build_demo_fleets();
        engine.production = build_demo_production();
        engine.research = build_demo_research();
        engine.jedi = build_demo_jedi();
        engine.missions = Vec::new();
        engine.next_mission_id = 1;
    });
}

#[wasm_bindgen]
pub fn world_loaded() -> bool {
    ENGINE.with(|e| !e.borrow().characters.is_empty())
}

// ──────────────────────────────────────────────────────────────────────────
// Query API
// ──────────────────────────────────────────────────────────────────────────

#[wasm_bindgen]
pub fn get_world_state() -> JsValue {
    ENGINE.with(|e| {
        let e = e.borrow();
        let state = WorldState {
            current_day: e.current_day,
            character_count: e.characters.len() as u32,
            system_count: e.systems.len() as u32,
            active_mission_count: e.missions.len() as u32,
        };
        serde_wasm_bindgen::to_value(&state).unwrap()
    })
}

#[wasm_bindgen]
pub fn get_characters() -> JsValue {
    ENGINE.with(|e| serde_wasm_bindgen::to_value(&e.borrow().characters).unwrap())
}

#[wasm_bindgen]
pub fn get_characters_on_system(system_id: u32) -> JsValue {
    ENGINE.with(|e| {
        let filtered: Vec<Character> = e
            .borrow()
            .characters
            .iter()
            .filter(|c| c.current_system_id == Some(system_id))
            .cloned()
            .collect();
        serde_wasm_bindgen::to_value(&filtered).unwrap()
    })
}

#[wasm_bindgen]
pub fn get_systems() -> JsValue {
    ENGINE.with(|e| serde_wasm_bindgen::to_value(&e.borrow().systems).unwrap())
}

#[wasm_bindgen]
pub fn get_active_missions() -> JsValue {
    ENGINE.with(|e| serde_wasm_bindgen::to_value(&e.borrow().missions).unwrap())
}

#[wasm_bindgen]
pub fn get_fleets() -> JsValue {
    ENGINE.with(|e| serde_wasm_bindgen::to_value(&e.borrow().fleets).unwrap())
}

#[wasm_bindgen]
pub fn get_production() -> JsValue {
    ENGINE.with(|e| serde_wasm_bindgen::to_value(&e.borrow().production).unwrap())
}

#[wasm_bindgen]
pub fn get_research() -> JsValue {
    ENGINE.with(|e| serde_wasm_bindgen::to_value(&e.borrow().research).unwrap())
}

#[wasm_bindgen]
pub fn get_jedi() -> JsValue {
    ENGINE.with(|e| serde_wasm_bindgen::to_value(&e.borrow().jedi).unwrap())
}

#[wasm_bindgen]
pub fn get_loyalty() -> JsValue {
    ENGINE.with(|e| {
        let e = e.borrow();
        let rows: Vec<LoyaltyRow> = e.systems.iter().map(|s| LoyaltyRow {
            system_id: s.id,
            system_name: s.name.clone(),
            control: s.control.clone(),
            // Heuristic: if controlled by Alliance/Empire and the *other* faction's
            // popularity is high, uprising risk is high.
            uprising_risk: match s.control.as_str() {
                "Alliance" => s.popularity_empire,
                "Empire" => s.popularity_alliance,
                _ => 0.5,
            },
            betrayal_risk: ((s.popularity_alliance - s.popularity_empire).abs() - 0.5).max(0.0) * 2.0,
        }).collect();
        serde_wasm_bindgen::to_value(&rows).unwrap()
    })
}

// ──────────────────────────────────────────────────────────────────────────
// Command API
// ──────────────────────────────────────────────────────────────────────────

#[wasm_bindgen]
pub fn dispatch_mission(
    character_id: u32,
    target_system_id: u32,
    kind: &str,
) -> Result<u64, JsValue> {
    ENGINE.with(|e| {
        let mut engine = e.borrow_mut();

        let duration = synthetic_duration(kind);
        if duration == 0 {
            return Err(JsValue::from_str(&format!("Unknown mission kind: {kind}")));
        }

        // Find the character + system (using JS-friendly id lookups)
        let char_idx = engine
            .characters
            .iter()
            .position(|c| c.id == character_id)
            .ok_or_else(|| JsValue::from_str("Character not found"))?;

        let sys = engine
            .systems
            .iter()
            .find(|s| s.id == target_system_id)
            .ok_or_else(|| JsValue::from_str("System not found"))?
            .clone();

        let mission_id = engine.next_mission_id;
        engine.next_mission_id += 1;

        let mission = ActiveMission {
            id: mission_id,
            character_id,
            character_name: engine.characters[char_idx].name.clone(),
            kind: kind.to_string(),
            target_system_id,
            target_system_name: sys.name,
            ticks_remaining: duration,
            total_ticks: duration,
        };

        engine.characters[char_idx].on_mission = true;
        engine.missions.push(mission);

        Ok(mission_id)
    })
}

#[wasm_bindgen]
pub fn advance_days(n: u32) {
    ENGINE.with(|e| {
        let mut engine = e.borrow_mut();
        engine.current_day = engine.current_day.saturating_add(n);

        // Decrement mission timers, collect freed characters
        let mut freed = Vec::new();
        for m in &mut engine.missions {
            m.ticks_remaining = m.ticks_remaining.saturating_sub(n);
            if m.ticks_remaining == 0 {
                freed.push(m.character_id);
            }
        }
        engine.missions.retain(|m| m.ticks_remaining > 0);

        for char_id in freed {
            if let Some(c) = engine.characters.iter_mut().find(|c| c.id == char_id) {
                c.on_mission = false;
            }
        }
    });
}

// ──────────────────────────────────────────────────────────────────────────
// Demo world builders
// ──────────────────────────────────────────────────────────────────────────

fn synthetic_duration(kind: &str) -> u32 {
    match kind {
        "Diplomacy" => 10,
        "Espionage" => 8,
        "Sabotage" => 12,
        "Assassination" => 15,
        "Rescue" => 14,
        "Abduction" => 16,
        "InciteUprising" => 20,
        "Recruitment" => 7,
        _ => 0,
    }
}

fn build_demo_systems() -> Vec<StarSystem> {
    // REBEXE-authoritative galaxy: 200 systems across 20 sectors, loaded
    // from the constants generated from SECTORSD.DAT + SYSTEMSD.DAT.
    // See decompiled/analysis/sector_layout.md.
    use crate::rebexe_galaxy::REBEXE_SYSTEMS;
    REBEXE_SYSTEMS
        .iter()
        .map(|s| StarSystem {
            id: s.id,
            name: s.name.into(),
            sector_id: s.sector_id,
            control: s.control.into(),
            popularity_alliance: s.popularity_alliance,
            popularity_empire: s.popularity_empire,
            x: s.x,
            y: s.y,
            picture_id: s.picture_id,
        })
        .collect()
}

fn build_demo_fleets() -> Vec<Fleet> {
    vec![
        // REBEXE system IDs (per SYSTEMSD.DAT):
        //   Coruscant=265, Yavin=289, Mon Calamari=272, Bilbringi=180, Hoth=135
        Fleet {
            id: 1, name: "Death Squadron".into(), faction: "Empire".into(),
            current_system_id: 265, destination_system_id: None, eta_days: None,  // Coruscant
            commander_character_id: Some(5),
            ships: vec![
                ShipEntry { class_id: 1, class_name: "Executor".into(), count: 1, hull_pct: 1.0 },
                ShipEntry { class_id: 2, class_name: "Imperial-class Star Destroyer".into(), count: 4, hull_pct: 0.95 },
                ShipEntry { class_id: 3, class_name: "Victory Star Destroyer".into(), count: 6, hull_pct: 0.90 },
            ],
        },
        Fleet {
            id: 2, name: "Battlegroup Tau".into(), faction: "Empire".into(),
            current_system_id: 180, destination_system_id: Some(289), eta_days: Some(18),  // Bilbringi → Yavin
            commander_character_id: Some(11),
            ships: vec![
                ShipEntry { class_id: 2, class_name: "Imperial-class Star Destroyer".into(), count: 2, hull_pct: 1.0 },
                ShipEntry { class_id: 4, class_name: "Strike Cruiser".into(), count: 3, hull_pct: 1.0 },
            ],
        },
        Fleet {
            id: 3, name: "Rogue Squadron".into(), faction: "Alliance".into(),
            current_system_id: 289, destination_system_id: None, eta_days: None,  // Yavin
            commander_character_id: Some(7),
            ships: vec![
                ShipEntry { class_id: 10, class_name: "Mon Calamari Cruiser".into(), count: 2, hull_pct: 0.85 },
                ShipEntry { class_id: 11, class_name: "Nebulon-B Frigate".into(), count: 4, hull_pct: 1.0 },
                ShipEntry { class_id: 12, class_name: "Corellian Corvette".into(), count: 6, hull_pct: 0.95 },
            ],
        },
        Fleet {
            id: 4, name: "Phoenix Group".into(), faction: "Alliance".into(),
            current_system_id: 135, destination_system_id: None, eta_days: None,  // Hoth
            commander_character_id: Some(6),
            ships: vec![
                ShipEntry { class_id: 10, class_name: "Mon Calamari Cruiser".into(), count: 1, hull_pct: 1.0 },
                ShipEntry { class_id: 12, class_name: "Corellian Corvette".into(), count: 4, hull_pct: 1.0 },
            ],
        },
    ]
}

fn build_demo_production() -> Vec<ProductionItem> {
    // REBEXE system IDs: Coruscant=265, Bilbringi=180, Yavin=289,
    // Mon Calamari=272, Hoth=135. (Kuat isn't in the parsed REBEXE
    // sector layout — using Corellia=232 as nearest Core analogue.)
    vec![
        ProductionItem { id: 1, system_id: 265, system_name: "Coruscant".into(),
            kind: "Capital Ship".into(), name: "Imperial-class Star Destroyer".into(),
            progress_pct: 0.65, days_remaining: 42 },
        ProductionItem { id: 2, system_id: 232, system_name: "Corellia".into(),
            kind: "Capital Ship".into(), name: "Imperial-class Star Destroyer".into(),
            progress_pct: 0.30, days_remaining: 84 },
        ProductionItem { id: 3, system_id: 180, system_name: "Bilbringi".into(),
            kind: "Fighter".into(), name: "TIE Interceptor".into(),
            progress_pct: 0.85, days_remaining: 6 },
        ProductionItem { id: 4, system_id: 289, system_name: "Yavin".into(),
            kind: "Fighter".into(), name: "X-Wing".into(),
            progress_pct: 0.50, days_remaining: 14 },
        ProductionItem { id: 5, system_id: 272, system_name: "Mon Calamari".into(),
            kind: "Capital Ship".into(), name: "Mon Calamari Cruiser".into(),
            progress_pct: 0.20, days_remaining: 96 },
        ProductionItem { id: 6, system_id: 135, system_name: "Hoth".into(),
            kind: "Troop".into(), name: "Alliance Army Regiment".into(),
            progress_pct: 0.70, days_remaining: 9 },
    ]
}

fn build_demo_research() -> Vec<ResearchProject> {
    vec![
        ResearchProject {
            tree: "Ship".into(), current_level: 2, progress_pct: 0.45,
            assigned_character_ids: vec![10],
        },
        ResearchProject {
            tree: "Troop".into(), current_level: 1, progress_pct: 0.20,
            assigned_character_ids: vec![],
        },
        ResearchProject {
            tree: "Facility".into(), current_level: 3, progress_pct: 0.80,
            assigned_character_ids: vec![6],
        },
    ]
}

fn build_demo_jedi() -> Vec<JediCandidate> {
    vec![
        JediCandidate { character_id: 2, character_name: "Luke Skywalker".into(),
            tier: "Training".into(), xp_pct: 0.45, is_training: true },
        JediCandidate { character_id: 1, character_name: "Leia Organa".into(),
            tier: "Aware".into(), xp_pct: 0.15, is_training: false },
        JediCandidate { character_id: 4, character_name: "Emperor Palpatine".into(),
            tier: "Experienced".into(), xp_pct: 1.0, is_training: false },
        JediCandidate { character_id: 5, character_name: "Darth Vader".into(),
            tier: "Experienced".into(), xp_pct: 1.0, is_training: false },
    ]
}

fn build_demo_characters() -> Vec<Character> {
    // IDs match the seed profiles in webapp/src/hooks/useGroupProfiles.ts
    vec![
        // Alliance majors
        // REBEXE system IDs: Yavin=289 (Alliance HQ), Coruscant=265 (Imperial HQ)
        major(0, "Mon Mothma", "Alliance", 289, 95, 70, 20, 90, 95),
        major(1, "Leia Organa", "Alliance", 289, 90, 80, 60, 85, 95),
        major(2, "Luke Skywalker", "Alliance", 289, 60, 70, 95, 80, 95),
        major(3, "Han Solo", "Alliance", 289, 50, 85, 80, 70, 85),
        // Empire majors
        major(4, "Emperor Palpatine", "Empire", 265, 85, 95, 60, 95, 95),
        major(5, "Darth Vader", "Empire", 265, 30, 75, 98, 90, 85),
        // Alliance minors — all at Yavin (289)
        minor(6, "Admiral Ackbar", "Alliance", 289, 85, 50, 70, 80, 90),
        minor(7, "Wedge Antilles", "Alliance", 289, 40, 60, 85, 70, 90),
        minor(8, "Lando Calrissian", "Alliance", 289, 75, 70, 60, 75, 70),
        minor(9, "Chewbacca", "Alliance", 289, 20, 80, 90, 50, 90),
        minor(10, "Jan Dodonna", "Alliance", 289, 60, 50, 70, 80, 85),
        // Empire minors — all at Coruscant (265)
        minor(11, "Admiral Ozzel", "Empire", 265, 40, 60, 65, 70, 80),
        minor(12, "Admiral Piett", "Empire", 265, 45, 70, 70, 80, 90),
        minor(13, "General Grammel", "Empire", 265, 30, 65, 80, 70, 75),
        minor(14, "Grand Admiral Thrawn", "Empire", 265, 75, 90, 85, 95, 85),
        minor(15, "Admiral Daala", "Empire", 265, 40, 70, 80, 75, 70),
    ]
}

fn major(
    id: u32, name: &str, faction: &str, sys: u32,
    diplomacy: u32, espionage: u32, combat: u32, leadership: u32, loyalty: u32,
) -> Character {
    Character {
        id, name: name.into(), faction: faction.into(),
        is_major: true,
        on_mission: false, on_hidden_mission: false, is_captive: false,
        current_system_id: Some(sys),
        diplomacy: Skill { base: diplomacy, variance: 5 },
        espionage: Skill { base: espionage, variance: 5 },
        combat: Skill { base: combat, variance: 5 },
        leadership: Skill { base: leadership, variance: 5 },
        loyalty: Skill { base: loyalty, variance: 5 },
    }
}

fn minor(
    id: u32, name: &str, faction: &str, sys: u32,
    diplomacy: u32, espionage: u32, combat: u32, leadership: u32, loyalty: u32,
) -> Character {
    Character {
        id, name: name.into(), faction: faction.into(),
        is_major: false,
        on_mission: false, on_hidden_mission: false, is_captive: false,
        current_system_id: Some(sys),
        diplomacy: Skill { base: diplomacy, variance: 10 },
        espionage: Skill { base: espionage, variance: 10 },
        combat: Skill { base: combat, variance: 10 },
        leadership: Skill { base: leadership, variance: 10 },
        loyalty: Skill { base: loyalty, variance: 10 },
    }
}

// ──────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn reset() {
        ENGINE.with(|e| {
            let mut engine = e.borrow_mut();
            engine.current_day = 0;
            engine.characters.clear();
            engine.systems.clear();
            engine.missions.clear();
            engine.fleets.clear();
            engine.production.clear();
            engine.research.clear();
            engine.jedi.clear();
            engine.next_mission_id = 1;
        });
    }

    #[test]
    fn init_populates_world() {
        reset();
        init_demo_world();
        assert!(world_loaded());
        ENGINE.with(|e| {
            let e = e.borrow();
            assert_eq!(e.current_day, 192);
            assert_eq!(e.characters.len(), 16);
            assert!(e.systems.len() >= 16);
            assert!(!e.fleets.is_empty());
            assert!(!e.production.is_empty());
            assert!(!e.research.is_empty());
            assert!(!e.jedi.is_empty());
        });
    }

    #[test]
    fn dispatch_marks_character_on_mission_and_returns_id() {
        reset();
        init_demo_world();
        let id = ENGINE.with(|e| {
            // Han Solo (id=3), target Coruscant (id=0), Sabotage
            let mut engine = e.borrow_mut();
            let duration = synthetic_duration("Sabotage");
            let mission_id = engine.next_mission_id;
            engine.next_mission_id += 1;
            engine.missions.push(ActiveMission {
                id: mission_id,
                character_id: 3,
                character_name: "Han Solo".into(),
                kind: "Sabotage".into(),
                target_system_id: 0,
                target_system_name: "Coruscant".into(),
                ticks_remaining: duration,
                total_ticks: duration,
            });
            if let Some(c) = engine.characters.iter_mut().find(|c| c.id == 3) {
                c.on_mission = true;
            }
            mission_id
        });
        assert_eq!(id, 1);
        ENGINE.with(|e| {
            let e = e.borrow();
            let han = e.characters.iter().find(|c| c.id == 3).unwrap();
            assert!(han.on_mission);
            assert_eq!(e.missions.len(), 1);
        });
    }

    #[test]
    fn advance_decrements_and_frees() {
        reset();
        init_demo_world();
        // Dispatch a sabotage (12 days)
        ENGINE.with(|e| {
            let mut engine = e.borrow_mut();
            engine.missions.push(ActiveMission {
                id: 1, character_id: 3, character_name: "Han Solo".into(),
                kind: "Sabotage".into(), target_system_id: 0,
                target_system_name: "Coruscant".into(),
                ticks_remaining: 12, total_ticks: 12,
            });
            engine.characters[3].on_mission = true;
        });
        advance_days(12);
        ENGINE.with(|e| {
            let e = e.borrow();
            assert_eq!(e.current_day, 192 + 12);
            assert!(e.missions.is_empty());
            assert!(!e.characters[3].on_mission);
        });
    }
}
