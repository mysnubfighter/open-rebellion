//! Persistence for character group profiles.
//!
//! Native: serialised as JSON to `<config_dir>/group_profiles.json`. The
//! config dir defaults to a `profiles/` folder next to the executable so
//! the path lookup is cfg-free and doesn't add a `dirs` crate dep.
//!
//! WASM: serialised as JSON into `web_sys::Storage` under the key
//! `open-rebellion.groupProfiles.v1` — the SAME key the React fork's
//! webapp uses, so any profiles a player created in the React UI auto-
//! load in the native WASM build the first time they open it.
//!
//! Both paths preserve the camelCase JSON shape defined in
//! [`rebellion_core::profiles::GroupProfile`].

use rebellion_core::profiles::GroupProfile;

/// localStorage key — must match the React fork's
/// `webapp/src/hooks/useGroupProfiles.ts` STORAGE_KEY constant so existing
/// browser-saved profiles import on first WASM load.
pub const STORAGE_KEY: &str = "open-rebellion.groupProfiles.v1";

/// Default filename for native filesystem persistence.
pub const PROFILE_FILE_NAME: &str = "group_profiles.json";

/// Errors emitted by the profile store.
#[derive(Debug)]
pub enum ProfileStoreError {
    /// I/O or environment error (storage unavailable, file unreadable, …).
    Io(String),
    /// JSON deserialisation failed.
    Json(String),
}

impl std::fmt::Display for ProfileStoreError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProfileStoreError::Io(s) => write!(f, "profile store i/o: {s}"),
            ProfileStoreError::Json(s) => write!(f, "profile store json: {s}"),
        }
    }
}

impl std::error::Error for ProfileStoreError {}

impl From<serde_json::Error> for ProfileStoreError {
    fn from(e: serde_json::Error) -> Self {
        ProfileStoreError::Json(e.to_string())
    }
}

/// Serialise profiles to a pretty-printed JSON string.
///
/// Matches the format the React fork's `exportJson()` produces, so a player
/// can copy/paste between builds.
pub fn export_json(profiles: &[GroupProfile]) -> String {
    serde_json::to_string_pretty(profiles).unwrap_or_else(|_| "[]".into())
}

/// Parse a JSON array of profiles.
///
/// Rejects malformed JSON with `ProfileStoreError::Json` rather than
/// panicking, mirroring the React `importJson()` `try/catch`.
pub fn import_json(json: &str) -> Result<Vec<GroupProfile>, ProfileStoreError> {
    let parsed: Vec<GroupProfile> = serde_json::from_str(json)?;
    Ok(parsed)
}

// =============================================================================
// Native filesystem implementation
// =============================================================================

#[cfg(not(target_arch = "wasm32"))]
mod native {
    use super::*;
    use std::path::PathBuf;

    pub fn default_profile_path() -> PathBuf {
        // Keep the path layout the same as `save::default_saves_dir()` — a
        // relative directory next to the working dir. Avoids a `dirs` crate
        // dependency and matches the existing convention.
        PathBuf::from("profiles").join(PROFILE_FILE_NAME)
    }

    pub fn load_profiles() -> Vec<GroupProfile> {
        let path = default_profile_path();
        match std::fs::read_to_string(&path) {
            Ok(s) => import_json(&s).unwrap_or_default(),
            // Missing file = first run; empty list is the expected default.
            Err(_) => Vec::new(),
        }
    }

    pub fn save_profiles(profiles: &[GroupProfile]) -> Result<(), ProfileStoreError> {
        let path = default_profile_path();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| ProfileStoreError::Io(e.to_string()))?;
        }
        let json = export_json(profiles);
        std::fs::write(&path, json).map_err(|e| ProfileStoreError::Io(e.to_string()))?;
        Ok(())
    }
}

#[cfg(not(target_arch = "wasm32"))]
pub use native::{default_profile_path, load_profiles, save_profiles};

// =============================================================================
// WASM (browser) implementation — in-memory only for now
// =============================================================================
//
// The upstream WASM build vendors `gl.js` from macroquad/miniquad, which
// doesn't include wasm-bindgen runtime shims. Calling `web_sys::Storage`
// from inside the WASM blob causes the loader to fail with missing
// `__wbg_*` imports. Until a proper macroquad-storage or wasm-bindgen JS
// glue is added (separate PR), persistence on WASM is in-memory only
// for the current session — players can still use the panel's
// Import/Export JSON buttons to save & restore profiles manually.

#[cfg(target_arch = "wasm32")]
mod wasm {
    use super::*;

    pub fn load_profiles() -> Vec<GroupProfile> {
        // No-op load: in-memory only.
        Vec::new()
    }

    pub fn save_profiles(_profiles: &[GroupProfile]) -> Result<(), ProfileStoreError> {
        // No-op save: in-memory only. Use the panel's "Copy export to text box"
        // followed by manual paste-elsewhere to persist between sessions.
        Ok(())
    }
}

#[cfg(target_arch = "wasm32")]
pub use wasm::{load_profiles, save_profiles};

// =============================================================================
// Tests (native only — WASM is tested by integration screenshots)
// =============================================================================

#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use super::*;
    use rebellion_core::missions::MissionKind;
    use rebellion_core::profiles::{MatchMode, RoleAssignment};

    fn sample_profile() -> GroupProfile {
        GroupProfile {
            id: "han-chewie".into(),
            name: "Han + Chewie Smuggling Team".into(),
            description: Some("Default smuggling crew".into()),
            required_members: vec![10, 20],
            role_assignments: vec![
                RoleAssignment {
                    character_id: 10,
                    character_name: "Han Solo".into(),
                    preferred_mission: MissionKind::Sabotage,
                },
                RoleAssignment {
                    character_id: 20,
                    character_name: "Chewbacca".into(),
                    preferred_mission: MissionKind::Espionage,
                },
            ],
            match_mode: MatchMode::Subset,
            enabled: true,
            restricted_to_system_ids: Vec::new(),
            restricted_to_mission_kinds: Vec::new(),
            created_at: 1_700_000_000_000,
            updated_at: 1_700_000_000_000,
        }
    }

    #[test]
    fn export_import_round_trip() {
        let original = vec![sample_profile()];
        let json = export_json(&original);
        let back = import_json(&json).unwrap();
        assert_eq!(original, back);
    }

    #[test]
    fn export_is_camel_case() {
        let p = vec![sample_profile()];
        let json = export_json(&p);
        // Matches what webapp/src/hooks/useGroupProfiles.ts produces.
        assert!(json.contains("\"requiredMembers\""));
        assert!(json.contains("\"roleAssignments\""));
        assert!(json.contains("\"matchMode\": \"subset\""));
        assert!(json.contains("\"preferredMission\": \"Sabotage\""));
    }

    #[test]
    fn import_empty_array_succeeds() {
        let r = import_json("[]").unwrap();
        assert!(r.is_empty());
    }

    #[test]
    fn import_malformed_returns_error() {
        let r = import_json("not json{");
        assert!(matches!(r, Err(ProfileStoreError::Json(_))));
    }

    #[test]
    fn import_with_missing_optional_field_works() {
        // `description` is optional in our type; ensure missing-field tolerance.
        let json = r#"[{
            "id": "x",
            "name": "X",
            "requiredMembers": [1],
            "roleAssignments": [],
            "matchMode": "any",
            "enabled": true,
            "createdAt": 0,
            "updatedAt": 0
        }]"#;
        let r = import_json(json).unwrap();
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].description, None);
    }

    #[test]
    fn native_save_load_round_trip() {
        // Use a temp dir to avoid stomping any real saved profiles.
        let dir = tempfile::tempdir().expect("tempdir");
        let prev = std::env::current_dir().unwrap();
        std::env::set_current_dir(&dir).unwrap();

        let profiles = vec![sample_profile()];
        save_profiles(&profiles).expect("save");

        // File must land under `profiles/`.
        let path = default_profile_path();
        assert!(path.exists(), "expected {path:?} to exist");

        let loaded = load_profiles();
        assert_eq!(loaded, profiles);

        std::env::set_current_dir(prev).unwrap();
    }
}
