//! Character group profiles — automatic role assignment for groups of
//! characters sent on missions together.
//!
//! Example: "When Han Solo and Chewbacca are selected together,
//! Han always goes as Sabotage, Chewie as Espionage."
//!
//! Ported from the React-fork TS implementation at
//! `webapp/src/types/profiles.ts` (mysnubfighter/open-rebellion fork).
//! Field names and semantics match exactly so saved profiles (whether
//! produced by the React UI's localStorage or this native impl) are
//! mutually compatible via JSON serde.

use crate::missions::MissionKind;
use serde::{Deserialize, Serialize};

/// Per-character role assignment within a profile.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RoleAssignment {
    /// `DatId` of the character. Matches `Character::dat_id.value()`.
    pub character_id: u32,
    /// Cached name for UI display when the character can't be resolved.
    pub character_name: String,
    /// Which mission kind this character takes when the profile fires.
    pub preferred_mission: MissionKind,
}

/// Match strictness for a group profile.
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum MatchMode {
    /// Selection must contain EXACTLY the listed members — no more, no fewer.
    Exact,
    /// Selection must contain ALL listed members (may contain extras).
    Subset,
    /// Selection must contain ANY one of the listed members.
    Any,
}

/// A persistent profile defining auto-assignments for a character group.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GroupProfile {
    /// Stable UUID-like identifier.
    pub id: String,
    /// Player-given name (e.g., "Han + Chewie Smuggling Team").
    pub name: String,
    /// Optional notes.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Required character `DatId`s. Selection-match logic depends on
    /// `match_mode`.
    pub required_members: Vec<u32>,
    /// Per-character role assignments. Members without an entry use the
    /// player's mission default.
    pub role_assignments: Vec<RoleAssignment>,
    /// How the selection must match `required_members`.
    pub match_mode: MatchMode,
    /// If false, this profile is skipped even when it would otherwise match.
    pub enabled: bool,
    /// Optional restriction: only apply when targeting these system DatIds.
    /// Empty vec = no restriction.
    #[serde(default)]
    pub restricted_to_system_ids: Vec<u32>,
    /// Optional restriction: only apply for these mission kinds.
    /// Empty vec = no restriction.
    #[serde(default)]
    pub restricted_to_mission_kinds: Vec<MissionKind>,
    /// UNIX ms timestamp the profile was created.
    pub created_at: u64,
    /// UNIX ms timestamp the profile was last edited.
    pub updated_at: u64,
}

/// Result of matching a player's selection against a set of profiles.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProfileMatch<'a> {
    pub profile: &'a GroupProfile,
    /// Character DatIds inside the current selection that the profile
    /// auto-assigns roles for.
    pub matched_character_ids: Vec<u32>,
}

/// Determine which profiles match a given selection + target context.
///
/// `target_system` and `target_mission` are optional filters: when present,
/// they're cross-checked against each profile's `restricted_to_*` lists.
/// Pass `None` to skip that filter (e.g., when previewing all matches
/// independent of dispatch target).
pub fn match_profiles<'a>(
    profiles: &'a [GroupProfile],
    selected_character_ids: &[u32],
    target_system: Option<u32>,
    target_mission: Option<MissionKind>,
) -> Vec<ProfileMatch<'a>> {
    if selected_character_ids.is_empty() {
        return Vec::new();
    }
    let selected: std::collections::HashSet<u32> =
        selected_character_ids.iter().copied().collect();
    let mut out = Vec::new();

    for profile in profiles {
        if !profile.enabled {
            continue;
        }
        if profile.required_members.is_empty() {
            continue;
        }

        let required: std::collections::HashSet<u32> =
            profile.required_members.iter().copied().collect();

        // Target-system restriction.
        if !profile.restricted_to_system_ids.is_empty() {
            match target_system {
                Some(sys) if profile.restricted_to_system_ids.contains(&sys) => {}
                _ => continue,
            }
        }

        // Target-mission-kind restriction.
        if !profile.restricted_to_mission_kinds.is_empty() {
            match target_mission {
                Some(m) if profile.restricted_to_mission_kinds.contains(&m) => {}
                _ => continue,
            }
        }

        // Match-mode evaluation.
        let matched: Vec<u32> = match profile.match_mode {
            MatchMode::Exact => {
                if selected.len() != required.len() {
                    continue;
                }
                if selected != required {
                    continue;
                }
                selected.iter().copied().collect()
            }
            MatchMode::Subset => {
                // All required must be present in selection.
                if !required.iter().all(|r| selected.contains(r)) {
                    continue;
                }
                // Auto-assign only to the required members in the selection.
                required.iter().copied().collect()
            }
            MatchMode::Any => {
                let overlap: Vec<u32> = required
                    .iter()
                    .copied()
                    .filter(|r| selected.contains(r))
                    .collect();
                if overlap.is_empty() {
                    continue;
                }
                overlap
            }
        };

        out.push(ProfileMatch {
            profile,
            matched_character_ids: matched,
        });
    }

    out
}

/// Resolve the preferred mission kind for a single character under a
/// profile, falling back to `None` when the profile didn't assign a role.
pub fn role_for(profile: &GroupProfile, character_id: u32) -> Option<MissionKind> {
    profile
        .role_assignments
        .iter()
        .find(|r| r.character_id == character_id)
        .map(|r| r.preferred_mission)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mk_profile(
        id: &str,
        members: Vec<u32>,
        roles: Vec<(u32, MissionKind)>,
        mode: MatchMode,
    ) -> GroupProfile {
        GroupProfile {
            id: id.into(),
            name: id.into(),
            description: None,
            required_members: members,
            role_assignments: roles
                .into_iter()
                .map(|(cid, mk)| RoleAssignment {
                    character_id: cid,
                    character_name: format!("char-{cid}"),
                    preferred_mission: mk,
                })
                .collect(),
            match_mode: mode,
            enabled: true,
            restricted_to_system_ids: Vec::new(),
            restricted_to_mission_kinds: Vec::new(),
            created_at: 0,
            updated_at: 0,
        }
    }

    #[test]
    fn empty_selection_no_matches() {
        let profiles = [mk_profile("p", vec![1, 2], vec![], MatchMode::Subset)];
        assert!(match_profiles(&profiles, &[], None, None).is_empty());
    }

    #[test]
    fn exact_mode_extra_member_no_match() {
        let profiles = [mk_profile("p", vec![1, 2], vec![], MatchMode::Exact)];
        assert!(match_profiles(&profiles, &[1, 2, 3], None, None).is_empty());
    }

    #[test]
    fn exact_mode_exact_set_matches() {
        let profiles = [mk_profile("p", vec![1, 2], vec![], MatchMode::Exact)];
        let m = match_profiles(&profiles, &[1, 2], None, None);
        assert_eq!(m.len(), 1);
        let mut ids = m[0].matched_character_ids.clone();
        ids.sort();
        assert_eq!(ids, vec![1, 2]);
    }

    #[test]
    fn subset_mode_extra_member_matches() {
        let profiles = [mk_profile("p", vec![1, 2], vec![], MatchMode::Subset)];
        let m = match_profiles(&profiles, &[1, 2, 3], None, None);
        assert_eq!(m.len(), 1);
        let mut ids = m[0].matched_character_ids.clone();
        ids.sort();
        // Subset auto-assigns only to required members, not extras.
        assert_eq!(ids, vec![1, 2]);
    }

    #[test]
    fn subset_mode_missing_member_no_match() {
        let profiles = [mk_profile("p", vec![1, 2], vec![], MatchMode::Subset)];
        assert!(match_profiles(&profiles, &[1, 3], None, None).is_empty());
    }

    #[test]
    fn any_mode_one_overlap_matches() {
        let profiles = [mk_profile("p", vec![1, 2], vec![], MatchMode::Any)];
        let m = match_profiles(&profiles, &[2, 3], None, None);
        assert_eq!(m.len(), 1);
        assert_eq!(m[0].matched_character_ids, vec![2]);
    }

    #[test]
    fn any_mode_no_overlap_no_match() {
        let profiles = [mk_profile("p", vec![1, 2], vec![], MatchMode::Any)];
        assert!(match_profiles(&profiles, &[3, 4], None, None).is_empty());
    }

    #[test]
    fn disabled_profile_skipped() {
        let mut p = mk_profile("p", vec![1, 2], vec![], MatchMode::Subset);
        p.enabled = false;
        let profiles = [p];
        assert!(match_profiles(&profiles, &[1, 2], None, None).is_empty());
    }

    #[test]
    fn empty_required_members_skipped() {
        let profiles = [mk_profile("p", vec![], vec![], MatchMode::Subset)];
        assert!(match_profiles(&profiles, &[1, 2], None, None).is_empty());
    }

    #[test]
    fn system_restriction_enforced() {
        let mut p = mk_profile("p", vec![1, 2], vec![], MatchMode::Subset);
        p.restricted_to_system_ids = vec![100];
        let profiles = [p];
        // Wrong system
        assert!(match_profiles(&profiles, &[1, 2], Some(99), None).is_empty());
        // Right system
        assert_eq!(
            match_profiles(&profiles, &[1, 2], Some(100), None).len(),
            1
        );
        // No system context: restriction means we can't confirm, so skip.
        assert!(match_profiles(&profiles, &[1, 2], None, None).is_empty());
    }

    #[test]
    fn mission_restriction_enforced() {
        let mut p = mk_profile("p", vec![1, 2], vec![], MatchMode::Subset);
        p.restricted_to_mission_kinds = vec![MissionKind::Sabotage];
        let profiles = [p];
        assert_eq!(
            match_profiles(
                &profiles,
                &[1, 2],
                None,
                Some(MissionKind::Sabotage)
            )
            .len(),
            1
        );
        assert!(match_profiles(
            &profiles,
            &[1, 2],
            None,
            Some(MissionKind::Diplomacy)
        )
        .is_empty());
    }

    #[test]
    fn role_for_resolves_assigned_character() {
        let p = mk_profile(
            "p",
            vec![1, 2],
            vec![
                (1, MissionKind::Sabotage),
                (2, MissionKind::Espionage),
            ],
            MatchMode::Subset,
        );
        assert_eq!(role_for(&p, 1), Some(MissionKind::Sabotage));
        assert_eq!(role_for(&p, 2), Some(MissionKind::Espionage));
        assert_eq!(role_for(&p, 3), None);
    }

    #[test]
    fn json_round_trip_matches_react_camel_case() {
        let p = mk_profile(
            "han-chewie",
            vec![10, 20],
            vec![
                (10, MissionKind::Sabotage),
                (20, MissionKind::Espionage),
            ],
            MatchMode::Subset,
        );
        let json = serde_json::to_string(&p).unwrap();
        // camelCase field names mirror the TS shape so React-saved
        // profiles import seamlessly.
        assert!(json.contains("\"requiredMembers\""));
        assert!(json.contains("\"roleAssignments\""));
        assert!(json.contains("\"matchMode\":\"subset\""));
        assert!(json.contains("\"preferredMission\":\"Sabotage\""));
        let round: GroupProfile = serde_json::from_str(&json).unwrap();
        assert_eq!(round, p);
    }
}
