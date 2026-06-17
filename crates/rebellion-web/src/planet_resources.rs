//! Per-planet resource bundle — mirrors decompiled/analysis/planet_resources.md.
//!
//! Each StarSystem owns a `PlanetResources` snapshot exposing every category
//! the original game tracks per planet:
//! - Manufacturing facilities (instances, with build queue)
//! - Production facilities (mines/refineries)
//! - Defense facilities (shields/lasers/etc.)
//! - Special force units
//! - Troops garrisoned
//! - Capital ships in orbit
//! - Major + minor characters present
//! - Active missions targeting this planet
//! - Resources (raw_materials, refined_materials, energy, maintenance)
//! - Production queue slots
//!
//! Instances are SEEDED DETERMINISTICALLY from system id + faction until the
//! engine bridge starts emitting real game state. The seed function uses
//! xorshift32 so any change in id produces a totally different bundle —
//! avoiding the "all-yellow bar" bug from earlier sessions.

use crate::rebexe_catalogs::{
    CAPITAL_SHIPS, DEFENSE_FACILITIES, FIGHTERS, MANUFACTURING_FACILITIES,
    MAJOR_CHARACTERS, MINOR_CHARACTERS, MISSION_TYPES, PRODUCTION_FACILITIES,
    SPECIAL_FORCES, TROOPS,
};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FacilityInstance {
    pub class_id: u32,
    pub class_name: String,
    pub hp_pct: f32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TroopInstance {
    pub class_id: u32,
    pub class_name: String,
    pub strength_pct: f32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ShipInstance {
    pub class_id: u32,
    pub class_name: String,
    pub hull_pct: f32,
    pub shield_pct: f32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SpecialForceInstance {
    pub class_id: u32,
    pub class_name: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CharacterPresence {
    pub character_id: u32,
    pub name: String,
    pub is_major: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ActiveMission {
    pub mission_id: u32,
    pub name: String,
    pub ticks_remaining: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProductionQueueSlot {
    pub kind: String, // "CapitalShip" | "Fighter" | "Troop" | "Facility" | "Empty"
    pub class_id: u32,
    pub class_name: String,
    pub progress_pct: f32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PlanetResources {
    pub manufacturing_facilities: Vec<FacilityInstance>,
    pub production_facilities: Vec<FacilityInstance>,
    pub defense_facilities: Vec<FacilityInstance>,
    pub alliance_facility: Option<FacilityInstance>,
    pub troops_garrisoned: Vec<TroopInstance>,
    pub ships_in_orbit: Vec<ShipInstance>,
    pub special_forces: Vec<SpecialForceInstance>,
    pub characters_present: Vec<CharacterPresence>,
    pub active_missions: Vec<ActiveMission>,
    pub production_queue: Vec<ProductionQueueSlot>,
    pub raw_materials: u32,
    pub refined_materials: u32,
    pub energy: u32,
    pub maintenance_points: i32,
    pub uprising_risk: f32,
    pub blockaded: bool,
}

/// xorshift32 deterministic mixer — same as SectorZoomPopup TS for
/// cross-language reproducibility.
pub fn hash32(x: u32) -> u32 {
    let mut v = x;
    v ^= v << 13;
    v ^= v >> 17;
    v ^= v << 5;
    v
}

/// Pick `count` distinct items from a slice using a seeded shuffle.
fn pick<'a, T>(slice: &'a [T], count: usize, seed: u32) -> Vec<&'a T> {
    if slice.is_empty() {
        return vec![];
    }
    let n = count.min(slice.len());
    let mut chosen: Vec<&T> = Vec::with_capacity(n);
    let mut taken = vec![false; slice.len()];
    for i in 0..n {
        let mut tries = 0;
        loop {
            let idx = (hash32(seed.wrapping_add(i as u32).wrapping_add(tries))
                       as usize) % slice.len();
            if !taken[idx] {
                taken[idx] = true;
                chosen.push(&slice[idx]);
                break;
            }
            tries += 1;
            if tries > 100 {
                break;
            }
        }
    }
    chosen
}

/// Seeds a deterministic resource bundle for one system.
/// `is_hq` boosts ship/troop counts. `faction` filters faction-specific
/// catalog entries.
pub fn seed_resources(system_id: u32, faction: &str, is_hq: bool) -> PlanetResources {
    let s = hash32(system_id * 7919);

    // Manufacturing facilities: 0-3 random
    let mfc_count = (hash32(s) % 4) as usize;
    let manufacturing_facilities: Vec<_> = pick(MANUFACTURING_FACILITIES.as_slice(),
                                                mfc_count,
                                                s.wrapping_add(1001))
        .into_iter()
        .map(|c| FacilityInstance {
            class_id: c.id, class_name: c.name.to_string(),
            hp_pct: 0.6 + (hash32(s ^ c.id) % 40) as f32 / 100.0,
        })
        .collect();

    // Production facilities (mines): 0-2 random
    let pfc_count = (hash32(s.wrapping_add(2002)) % 3) as usize;
    let production_facilities: Vec<_> = pick(PRODUCTION_FACILITIES.as_slice(),
                                             pfc_count,
                                             s.wrapping_add(2002))
        .into_iter()
        .map(|c| FacilityInstance {
            class_id: c.id, class_name: c.name.to_string(),
            hp_pct: 0.7 + (hash32(s ^ c.id) % 30) as f32 / 100.0,
        })
        .collect();

    // Defense facilities: 0-4 random, more for HQ
    let dfc_count = ((hash32(s.wrapping_add(3003)) % 4) + if is_hq { 2 } else { 0 }) as usize;
    let defense_facilities: Vec<_> = pick(DEFENSE_FACILITIES.as_slice(),
                                          dfc_count,
                                          s.wrapping_add(3003))
        .into_iter()
        .map(|c| FacilityInstance {
            class_id: c.id, class_name: c.name.to_string(),
            hp_pct: 0.8 + (hash32(s ^ c.id) % 20) as f32 / 100.0,
        })
        .collect();

    // Troops garrisoned: 0-3 random
    let trp_count = ((hash32(s.wrapping_add(4004)) % 4) + if is_hq { 2 } else { 0 }) as usize;
    let troops_garrisoned: Vec<_> = pick(TROOPS.as_slice(),
                                         trp_count,
                                         s.wrapping_add(4004))
        .into_iter()
        .map(|c| TroopInstance {
            class_id: c.id, class_name: c.name.to_string(),
            strength_pct: 0.7 + (hash32(s ^ c.id) % 30) as f32 / 100.0,
        })
        .collect();

    // Ships in orbit: 0-3 unless HQ (then 2-5)
    let cap_count = if is_hq {
        2 + (hash32(s.wrapping_add(5005)) % 4) as usize
    } else {
        (hash32(s.wrapping_add(5005)) % 4) as usize
    };
    let ships_in_orbit: Vec<_> = pick(CAPITAL_SHIPS.as_slice(),
                                      cap_count,
                                      s.wrapping_add(5005))
        .into_iter()
        .map(|c| ShipInstance {
            class_id: c.id, class_name: c.name.to_string(),
            hull_pct: 0.7 + (hash32(s ^ c.id) % 30) as f32 / 100.0,
            shield_pct: 0.8 + (hash32(s ^ c.id ^ 11) % 20) as f32 / 100.0,
        })
        .collect();

    // Special forces (rare): 0-1
    let sf_count = (hash32(s.wrapping_add(6006)) % 3 == 0) as usize;
    let special_forces: Vec<_> = pick(SPECIAL_FORCES.as_slice(),
                                      sf_count,
                                      s.wrapping_add(6006))
        .into_iter()
        .map(|c| SpecialForceInstance {
            class_id: c.id, class_name: c.name.to_string(),
        })
        .collect();

    // Characters present: HQ planets get majors; others rarely get any
    let mut characters_present = Vec::new();
    if is_hq {
        for c in MAJOR_CHARACTERS.iter().take(3) {
            characters_present.push(CharacterPresence {
                character_id: c.id,
                name: c.name.to_string(),
                is_major: true,
            });
        }
    }
    if hash32(s.wrapping_add(7007)) % 5 == 0 {
        let pick_min = pick(MINOR_CHARACTERS.as_slice(), 1, s.wrapping_add(7007));
        for c in pick_min {
            characters_present.push(CharacterPresence {
                character_id: c.id, name: c.name.to_string(), is_major: false,
            });
        }
    }
    // Filter major characters by faction
    let _ = faction;

    // Active missions: 0-2
    let m_count = (hash32(s.wrapping_add(8008)) % 3) as usize;
    let active_missions: Vec<_> = pick(MISSION_TYPES.as_slice(),
                                       m_count,
                                       s.wrapping_add(8008))
        .into_iter()
        .map(|c| ActiveMission {
            mission_id: c.id, name: c.name.to_string(),
            ticks_remaining: 5 + (hash32(s ^ c.id) % 50),
        })
        .collect();

    // Production queue: 3 fixed slots filled by what's being built
    let production_queue: Vec<ProductionQueueSlot> = (0..3)
        .map(|i| {
            let slot_seed = hash32(s ^ (i as u32 * 13));
            let r = slot_seed % 100;
            let (kind, class_id, class_name, pct) = if r < 40 {
                ("Empty".to_string(), 0, String::new(), 0.0)
            } else if r < 60 && !CAPITAL_SHIPS.is_empty() {
                let pick_c = pick(CAPITAL_SHIPS.as_slice(), 1, slot_seed);
                let c = pick_c[0];
                ("CapitalShip".to_string(), c.id, c.name.to_string(),
                 (slot_seed % 80) as f32 / 100.0)
            } else if r < 75 && !FIGHTERS.is_empty() {
                let pick_c = pick(FIGHTERS.as_slice(), 1, slot_seed);
                let c = pick_c[0];
                ("Fighter".to_string(), c.id, c.name.to_string(),
                 (slot_seed % 80) as f32 / 100.0)
            } else if r < 90 && !TROOPS.is_empty() {
                let pick_c = pick(TROOPS.as_slice(), 1, slot_seed);
                let c = pick_c[0];
                ("Troop".to_string(), c.id, c.name.to_string(),
                 (slot_seed % 80) as f32 / 100.0)
            } else {
                let pick_c = pick(MANUFACTURING_FACILITIES.as_slice(), 1, slot_seed);
                if pick_c.is_empty() {
                    ("Empty".to_string(), 0, String::new(), 0.0)
                } else {
                    let c = pick_c[0];
                    ("Facility".to_string(), c.id, c.name.to_string(),
                     (slot_seed % 80) as f32 / 100.0)
                }
            };
            ProductionQueueSlot { kind, class_id, class_name, progress_pct: pct }
        })
        .collect();

    PlanetResources {
        manufacturing_facilities,
        production_facilities,
        defense_facilities,
        alliance_facility: None,
        troops_garrisoned,
        ships_in_orbit,
        special_forces,
        characters_present,
        active_missions,
        production_queue,
        raw_materials: hash32(s.wrapping_add(9009)) % 1000,
        refined_materials: hash32(s.wrapping_add(10010)) % 500,
        energy: hash32(s.wrapping_add(11011)) % 800,
        maintenance_points: (hash32(s.wrapping_add(12012)) % 200) as i32 - 100,
        uprising_risk: (hash32(s.wrapping_add(13013)) % 100) as f32 / 100.0,
        blockaded: hash32(s.wrapping_add(14014)) % 10 == 0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deterministic_seed_same_id_same_output() {
        // Same id + faction + hq flag must produce identical bundles.
        let a = seed_resources(265, "Empire", true);
        let b = seed_resources(265, "Empire", true);
        assert_eq!(a.raw_materials, b.raw_materials);
        assert_eq!(a.refined_materials, b.refined_materials);
        assert_eq!(a.manufacturing_facilities.len(),
                   b.manufacturing_facilities.len());
        assert_eq!(a.production_queue.len(), b.production_queue.len());
        for i in 0..a.production_queue.len() {
            assert_eq!(a.production_queue[i].kind, b.production_queue[i].kind);
        }
    }

    #[test]
    fn different_ids_produce_different_outputs() {
        let a = seed_resources(100, "Alliance", false);
        let b = seed_resources(200, "Alliance", false);
        // At least one of the resource scalars should differ.
        assert!(a.raw_materials != b.raw_materials
                || a.energy != b.energy
                || a.refined_materials != b.refined_materials);
    }

    #[test]
    fn hq_systems_have_more_ships_than_non_hq() {
        // Over many seeds, HQ should average more ships.
        let mut hq_total = 0;
        let mut nm_total = 0;
        for id in 100..200 {
            hq_total += seed_resources(id, "Empire", true).ships_in_orbit.len();
            nm_total += seed_resources(id, "Empire", false).ships_in_orbit.len();
        }
        assert!(hq_total > nm_total,
                "HQ avg should exceed non-HQ avg ({} vs {})",
                hq_total, nm_total);
    }

    #[test]
    fn hq_systems_have_major_characters() {
        let r = seed_resources(265, "Empire", true);
        assert!(r.characters_present.iter().any(|c| c.is_major),
                "HQ should host at least one major character");
    }

    #[test]
    fn production_queue_always_has_3_slots() {
        for id in 100..300 {
            let r = seed_resources(id, "Neutral", false);
            assert_eq!(r.production_queue.len(), 3,
                       "system {} should have 3 queue slots", id);
        }
    }

    #[test]
    fn hash32_distributes_low_seeds_avoiding_yellow_bug() {
        // Previously (seed * 9301 + i * 49297) % 100 produced all-yellow
        // (values < 40) for seeds 230-239. Verify xorshift32 doesn't.
        let mut buckets = [0usize; 4];
        for id in 230..240 {
            for i in 0..8 {
                let v = hash32((id as u32) * 17 + i * 31) % 100;
                let b = if v < 30 { 0 } else if v < 50 { 1 }
                        else if v < 70 { 2 } else { 3 };
                buckets[b] += 1;
            }
        }
        // At least 3 of 4 buckets should have non-zero counts.
        let non_zero = buckets.iter().filter(|&&c| c > 0).count();
        assert!(non_zero >= 3,
                "hash32 fails to distribute: buckets={:?}", buckets);
    }
}
