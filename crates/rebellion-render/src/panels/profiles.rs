//! Character group profiles panel.
//!
//! Three-column egui window: profile list | member roster | role assignments.
//! Profiles are loaded on first open and saved on close (or on any "Save"
//! click).  Persistence delegates to `rebellion_data::profile_store` —
//! native filesystem on desktop, browser localStorage on WASM.
//!
//! Hotkey: `Ctrl+G` (registered in rebellion-app/src/main.rs).

use egui_macroquad::egui::{self, Color32, RichText, ScrollArea};
use rebellion_core::missions::MissionKind;
use rebellion_core::profiles::{GroupProfile, MatchMode, RoleAssignment};
use rebellion_core::world::GameWorld;

/// Mutable state held across frames for the profiles panel.
#[derive(Debug, Clone, Default)]
pub struct ProfilesPanelState {
    /// All profiles loaded from disk / localStorage.  Edits stay in memory
    /// until `save_now` is invoked.
    pub profiles: Vec<GroupProfile>,
    /// Stable id of the currently focused profile in the left column.
    pub selected_id: Option<String>,
    /// Set when any field is edited; consulted by the caller on close to
    /// decide whether to persist.
    pub dirty: bool,
    /// Open/closed flag.  External hotkey toggles this.
    pub open: bool,
    /// Lazy-init flag.  Profiles are loaded from store on first open.
    loaded: bool,
    /// In-flight import/export text buffer (textbox content for "paste JSON").
    pub import_buffer: String,
    /// Visible error message (e.g. malformed import).
    pub message: Option<String>,
}

impl ProfilesPanelState {
    /// Open the panel and lazily load profiles on first appearance.
    pub fn open(&mut self, loader: impl FnOnce() -> Vec<GroupProfile>) {
        if !self.loaded {
            self.profiles = loader();
            self.loaded = true;
        }
        self.open = true;
    }

    /// Toggle visibility.
    pub fn toggle(&mut self, loader: impl FnOnce() -> Vec<GroupProfile>) {
        if self.open {
            self.open = false;
        } else {
            self.open(loader);
        }
    }
}

/// Render the profiles window (only when `state.open` is true).
///
/// Returns `true` if the player saved/changed profiles this frame (caller
/// should persist with `rebellion_data::profile_store::save_profiles`).
pub fn draw_profiles(
    ctx: &egui::Context,
    state: &mut ProfilesPanelState,
    world: &GameWorld,
) -> bool {
    if !state.open {
        return false;
    }

    let mut saved_this_frame = false;
    let mut should_close = false;

    egui::Window::new("Character Group Profiles")
        .resizable(true)
        .default_width(720.0)
        .default_height(480.0)
        .show(ctx, |ui| {
            // ─ Header buttons ────────────────────────────────────────────────
            ui.horizontal(|ui| {
                if ui.button("➕ New Profile").clicked() {
                    let id = new_uuid_like();
                    let now = now_ms();
                    state.profiles.push(GroupProfile {
                        id: id.clone(),
                        name: "New Profile".into(),
                        description: None,
                        required_members: Vec::new(),
                        role_assignments: Vec::new(),
                        match_mode: MatchMode::Subset,
                        enabled: true,
                        restricted_to_system_ids: Vec::new(),
                        restricted_to_mission_kinds: Vec::new(),
                        created_at: now,
                        updated_at: now,
                    });
                    state.selected_id = Some(id);
                    state.dirty = true;
                }
                if ui.button("💾 Save").clicked() {
                    saved_this_frame = true;
                    state.dirty = false;
                }
                if ui.button("✖ Close").clicked() {
                    should_close = true;
                }
                if let Some(msg) = &state.message {
                    ui.colored_label(Color32::from_rgb(255, 120, 80), msg);
                }
            });

            ui.separator();

            // ─ Three-column body ─────────────────────────────────────────────
            ui.horizontal_top(|ui| {
                draw_profile_list(ui, state);
                ui.separator();
                draw_detail_or_blank(ui, state, world);
            });

            ui.separator();

            // ─ Import / Export ───────────────────────────────────────────────
            ui.collapsing("Import / Export JSON", |ui| {
                ui.horizontal(|ui| {
                    if ui.button("Copy export to text box").clicked() {
                        state.import_buffer = export_to_string(&state.profiles);
                    }
                    if ui.button("Import from text box").clicked() {
                        match parse_import(&state.import_buffer) {
                            Ok(imported) => {
                                state.profiles = imported;
                                state.dirty = true;
                                state.message = Some(format!(
                                    "Imported {} profile(s).",
                                    state.profiles.len()
                                ));
                            }
                            Err(e) => {
                                state.message = Some(format!("Import failed: {e}"));
                            }
                        }
                    }
                });
                ui.add(
                    egui::TextEdit::multiline(&mut state.import_buffer)
                        .desired_rows(6)
                        .desired_width(f32::INFINITY),
                );
            });
        });

    if should_close {
        state.open = false;
    }

    saved_this_frame
}

// =============================================================================
// Column 1 — profile list
// =============================================================================

fn draw_profile_list(ui: &mut egui::Ui, state: &mut ProfilesPanelState) {
    ui.vertical(|ui| {
        ui.set_min_width(180.0);
        ui.set_max_width(220.0);
        ui.label(RichText::new("Profiles").strong());
        ScrollArea::vertical()
            .id_source("profile_list_scroll")
            .max_height(360.0)
            .show(ui, |ui| {
                let mut to_delete: Option<String> = None;
                for profile in &state.profiles {
                    let selected = state.selected_id.as_ref() == Some(&profile.id);
                    let label = format!(
                        "{} {}",
                        if profile.enabled { "●" } else { "○" },
                        profile.name
                    );
                    let resp = ui.selectable_label(selected, label);
                    if resp.clicked() {
                        state.selected_id = Some(profile.id.clone());
                    }
                    resp.context_menu(|ui| {
                        if ui.button("Delete").clicked() {
                            to_delete = Some(profile.id.clone());
                            ui.close_menu();
                        }
                    });
                }
                if let Some(id) = to_delete {
                    state.profiles.retain(|p| p.id != id);
                    if state.selected_id.as_ref() == Some(&id) {
                        state.selected_id = None;
                    }
                    state.dirty = true;
                }
            });
    });
}

// =============================================================================
// Column 2 + 3 — profile detail + member/role editor
// =============================================================================

fn draw_detail_or_blank(
    ui: &mut egui::Ui,
    state: &mut ProfilesPanelState,
    world: &GameWorld,
) {
    let selected_id = state.selected_id.clone();
    let Some(idx) = selected_id
        .as_ref()
        .and_then(|id| state.profiles.iter().position(|p| &p.id == id))
    else {
        ui.vertical(|ui| {
            ui.add_space(40.0);
            ui.label(RichText::new("Select a profile, or click ➕ New Profile.").italics());
        });
        return;
    };

    let profile = &mut state.profiles[idx];
    let mut dirty = false;

    ui.vertical(|ui| {
        ui.label(RichText::new("Details").strong());
        ui.horizontal(|ui| {
            ui.label("Name:");
            if ui.text_edit_singleline(&mut profile.name).changed() {
                dirty = true;
            }
        });
        ui.horizontal(|ui| {
            let mut enabled = profile.enabled;
            if ui.checkbox(&mut enabled, "Enabled").changed() {
                profile.enabled = enabled;
                dirty = true;
            }
        });
        ui.horizontal(|ui| {
            ui.label("Match mode:");
            for (mode, label) in [
                (MatchMode::Exact, "Exact"),
                (MatchMode::Subset, "Subset"),
                (MatchMode::Any, "Any"),
            ] {
                if ui
                    .selectable_label(profile.match_mode == mode, label)
                    .clicked()
                {
                    profile.match_mode = mode;
                    dirty = true;
                }
            }
        });

        ui.separator();
        ui.label(RichText::new("Members & Roles").strong());
        ui.label(
            RichText::new("Click a character below to add. Use the dropdown to set a role.")
                .small()
                .weak(),
        );

        // ── Add-character picker ─────────────────────────────────────────────
        let mut to_add: Option<(u32, String)> = None;
        ScrollArea::vertical()
            .id_source(format!("member_picker_{}", profile.id))
            .max_height(140.0)
            .show(ui, |ui| {
                for (_, character) in &world.characters {
                    let cid = character.dat_id.raw();
                    if profile.required_members.contains(&cid) {
                        continue;
                    }
                    if ui.small_button(format!("+ {}", character.name)).clicked() {
                        to_add = Some((cid, character.name.clone()));
                    }
                }
            });
        if let Some((cid, name)) = to_add {
            profile.required_members.push(cid);
            profile.role_assignments.push(RoleAssignment {
                character_id: cid,
                character_name: name,
                preferred_mission: MissionKind::Espionage,
            });
            dirty = true;
        }

        ui.separator();

        // ── Assigned roles list ──────────────────────────────────────────────
        let mut to_remove: Option<u32> = None;
        let assignments_snapshot: Vec<u32> = profile.required_members.clone();
        for cid in assignments_snapshot {
            let display_name = profile
                .role_assignments
                .iter()
                .find(|r| r.character_id == cid)
                .map(|r| r.character_name.clone())
                .or_else(|| {
                    world
                        .characters
                        .iter()
                        .find(|(_, c)| c.dat_id.raw() == cid)
                        .map(|(_, c)| c.name.clone())
                })
                .unwrap_or_else(|| format!("#{cid}"));

            ui.horizontal(|ui| {
                ui.label(display_name);
                let current = profile
                    .role_assignments
                    .iter()
                    .find(|r| r.character_id == cid)
                    .map(|r| r.preferred_mission)
                    .unwrap_or(MissionKind::Espionage);
                let mut selected = current;
                egui::ComboBox::from_id_source(format!("mission_for_{cid}_{}", profile.id))
                    .selected_text(format!("{selected:?}"))
                    .show_ui(ui, |ui| {
                        for kind in MISSION_KINDS {
                            ui.selectable_value(&mut selected, *kind, format!("{kind:?}"));
                        }
                    });
                if selected != current {
                    upsert_role(profile, cid, selected);
                    dirty = true;
                }
                if ui.small_button("×").clicked() {
                    to_remove = Some(cid);
                }
            });
        }
        if let Some(cid) = to_remove {
            profile.required_members.retain(|c| c != &cid);
            profile.role_assignments.retain(|r| r.character_id != cid);
            dirty = true;
        }
    });

    if dirty {
        profile.updated_at = now_ms();
        state.dirty = true;
    }
}

fn upsert_role(profile: &mut GroupProfile, cid: u32, kind: MissionKind) {
    if let Some(r) = profile
        .role_assignments
        .iter_mut()
        .find(|r| r.character_id == cid)
    {
        r.preferred_mission = kind;
    } else {
        profile.role_assignments.push(RoleAssignment {
            character_id: cid,
            character_name: format!("#{cid}"),
            preferred_mission: kind,
        });
    }
}

// =============================================================================
// Helpers
// =============================================================================

const MISSION_KINDS: &[MissionKind] = &[
    MissionKind::Diplomacy,
    MissionKind::Recruitment,
    MissionKind::Sabotage,
    MissionKind::Assassination,
    MissionKind::Espionage,
    MissionKind::Rescue,
    MissionKind::Abduction,
    MissionKind::InciteUprising,
    MissionKind::SubdueUprising,
    MissionKind::DeathStarSabotage,
];

fn now_ms() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// Quick UUID-like id (timestamp + small random suffix).  Doesn't need
/// cryptographic strength — just collision avoidance within one player's
/// profile set.
fn new_uuid_like() -> String {
    let now = now_ms();
    let salt = now.wrapping_mul(2654435761) & 0xFFFF;
    format!("{:x}-{:x}", now, salt)
}

// Import / export are pure helpers — `profile_store` owns the round-trip
// tests in rebellion-data.  We inline equivalent functions here to avoid
// a dependency on rebellion-data from rebellion-render.

fn export_to_string(profiles: &[GroupProfile]) -> String {
    serde_json::to_string_pretty(profiles).unwrap_or_else(|_| "[]".into())
}

fn parse_import(json: &str) -> Result<Vec<GroupProfile>, String> {
    serde_json::from_str::<Vec<GroupProfile>>(json).map_err(|e| e.to_string())
}

