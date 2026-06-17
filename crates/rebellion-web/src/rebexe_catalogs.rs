// AUTO-GENERATED - do not edit. Run tools/gen_rebexe_catalogs.py
// Source: decompiled/analysis/dat_dump.json (parsed REBEXE GData/*.DAT)

/// A REBEXE catalog entry shared across all type tables.
/// Static metadata for one class of unit/facility/mission etc.
pub struct CatalogEntry {
    pub id: u32,
    pub name: &'static str,
}

pub const CAPITAL_SHIPS: [CatalogEntry; 30] = [
    CatalogEntry { id: 64, name: "Mon Calamari Cruiser" },
    CatalogEntry { id: 65, name: "Bulk Cruiser" },
    CatalogEntry { id: 66, name: "Assault Frigate" },
    CatalogEntry { id: 67, name: "Nebulon-B Frigate" },
    CatalogEntry { id: 68, name: "Alliance Escort Carrier" },
    CatalogEntry { id: 69, name: "Corellian Corvette" },
    CatalogEntry { id: 70, name: "Medium Transport" },
    CatalogEntry { id: 71, name: "Bulk Transport" },
    CatalogEntry { id: 72, name: "Corellian Gunship" },
    CatalogEntry { id: 73, name: "Alliance Dreadnaught" },
    CatalogEntry { id: 74, name: "CC-7700 Frigate" },
    CatalogEntry { id: 75, name: "Bulwark Battlecruiser" },
    CatalogEntry { id: 76, name: "Liberator Cruiser" },
    CatalogEntry { id: 77, name: "CC-9600 Frigate" },
    CatalogEntry { id: 78, name: "Dauntless Cruiser" },
    CatalogEntry { id: 128, name: "Strike Cruiser" },
    CatalogEntry { id: 129, name: "Lancer Frigate" },
    CatalogEntry { id: 130, name: "Interdictor Cruiser" },
    CatalogEntry { id: 131, name: "Carrack Light Cruiser" },
    CatalogEntry { id: 132, name: "Victory Destroyer" },
    CatalogEntry { id: 133, name: "Imperial Star Destroyer" },
    CatalogEntry { id: 134, name: "Super Star Destroyer" },
    CatalogEntry { id: 135, name: "Assault Transport" },
    CatalogEntry { id: 136, name: "Death Star" },
    CatalogEntry { id: 137, name: "Galleon" },
    CatalogEntry { id: 138, name: "Victory II Star Destroyer" },
    CatalogEntry { id: 139, name: "Imperial II Star Destroyer" },
    CatalogEntry { id: 140, name: "Star Galleon" },
    CatalogEntry { id: 141, name: "Imperial Escort Carrier" },
    CatalogEntry { id: 142, name: "Imperial Dreadnaught" },
];

pub const FIGHTERS: [CatalogEntry; 8] = [
    CatalogEntry { id: 1, name: "A-wing" },
    CatalogEntry { id: 2, name: "B-wing" },
    CatalogEntry { id: 3, name: "X-wing" },
    CatalogEntry { id: 4, name: "Y-wing" },
    CatalogEntry { id: 5, name: "TIE Fighter" },
    CatalogEntry { id: 6, name: "TIE Interceptor" },
    CatalogEntry { id: 7, name: "TIE Bomber" },
    CatalogEntry { id: 8, name: "TIE Defender" },
];

pub const TROOPS: [CatalogEntry; 10] = [
    CatalogEntry { id: 1, name: "Alliance Fleet Regiment" },
    CatalogEntry { id: 2, name: "Alliance Army Regiment" },
    CatalogEntry { id: 3, name: "Sullustan Regiment" },
    CatalogEntry { id: 4, name: "Wookiee Regiment" },
    CatalogEntry { id: 5, name: "Mon Calamari Regiment" },
    CatalogEntry { id: 6, name: "Stormtrooper Regiment" },
    CatalogEntry { id: 7, name: "Imperial Fleet Regiment" },
    CatalogEntry { id: 8, name: "Imperial Army Regiment" },
    CatalogEntry { id: 9, name: "War Droid Regiment" },
    CatalogEntry { id: 10, name: "Dark Trooper Regiment" },
];

pub const MANUFACTURING_FACILITIES: [CatalogEntry; 6] = [
    CatalogEntry { id: 1, name: "Orbital Shipyard" },
    CatalogEntry { id: 2, name: "Training Facility" },
    CatalogEntry { id: 3, name: "Construction Yard" },
    CatalogEntry { id: 4, name: "Advanced Shipyard" },
    CatalogEntry { id: 5, name: "Advanced Training Facility" },
    CatalogEntry { id: 6, name: "Advanced Construction Yard" },
];

pub const PRODUCTION_FACILITIES: [CatalogEntry; 2] = [
    CatalogEntry { id: 1, name: "Mine" },
    CatalogEntry { id: 2, name: "Refinery" },
];

pub const DEFENSE_FACILITIES: [CatalogEntry; 6] = [
    CatalogEntry { id: 1, name: "KDY-150" },
    CatalogEntry { id: 2, name: "LNR Series I" },
    CatalogEntry { id: 3, name: "GenCore Level I" },
    CatalogEntry { id: 4, name: "Death Star Shield" },
    CatalogEntry { id: 5, name: "LNR Series II" },
    CatalogEntry { id: 6, name: "GenCore Level II" },
];

pub const SPECIAL_FORCES: [CatalogEntry; 9] = [
    CatalogEntry { id: 1, name: "Guerrillas" },
    CatalogEntry { id: 2, name: "Infiltrators" },
    CatalogEntry { id: 3, name: "Longprobe Y-wing Recon Team" },
    CatalogEntry { id: 4, name: "Bothan Spies" },
    CatalogEntry { id: 5, name: "Imperial Probe Droid" },
    CatalogEntry { id: 6, name: "Imperial Espionage Droid" },
    CatalogEntry { id: 7, name: "Imperial Commandos" },
    CatalogEntry { id: 8, name: "Noghri Death Commandos" },
    CatalogEntry { id: 9, name: "Bounty Hunters" },
];

pub const MISSION_TYPES: [CatalogEntry; 25] = [
    CatalogEntry { id: 1, name: "Move" },
    CatalogEntry { id: 2, name: "Return" },
    CatalogEntry { id: 3, name: "Autorouting" },
    CatalogEntry { id: 4, name: "Adrift" },
    CatalogEntry { id: 16, name: "Diplomacy" },
    CatalogEntry { id: 17, name: "Rescue" },
    CatalogEntry { id: 18, name: "Sabotage" },
    CatalogEntry { id: 19, name: "Espionage" },
    CatalogEntry { id: 21, name: "Reconnaissance" },
    CatalogEntry { id: 22, name: "Recruitment" },
    CatalogEntry { id: 23, name: "Abduction" },
    CatalogEntry { id: 32, name: "Ship Design Research" },
    CatalogEntry { id: 33, name: "Facility Design Research" },
    CatalogEntry { id: 34, name: "Troop Training Research" },
    CatalogEntry { id: 64, name: "Incite Uprising" },
    CatalogEntry { id: 65, name: "Death Star Sabotage" },
    CatalogEntry { id: 66, name: "Jedi Training" },
    CatalogEntry { id: 67, name: "Dagobah" },
    CatalogEntry { id: 68, name: "Palace" },
    CatalogEntry { id: 69, name: "Vacation" },
    CatalogEntry { id: 70, name: "Sabbatical" },
    CatalogEntry { id: 128, name: "Subdue Uprising" },
    CatalogEntry { id: 129, name: "Assassination" },
    CatalogEntry { id: 130, name: "Pickup" },
    CatalogEntry { id: 131, name: "Bounty" },
];

pub const MAJOR_CHARACTERS: [CatalogEntry; 6] = [
    CatalogEntry { id: 576, name: "Mon Mothma" },
    CatalogEntry { id: 577, name: "Leia Organa" },
    CatalogEntry { id: 578, name: "Luke Skywalker" },
    CatalogEntry { id: 579, name: "Han Solo" },
    CatalogEntry { id: 640, name: "Emperor Palpatine" },
    CatalogEntry { id: 641, name: "Darth Vader" },
];

pub const MINOR_CHARACTERS: [CatalogEntry; 54] = [
    CatalogEntry { id: 832, name: "Ackbar" },
    CatalogEntry { id: 833, name: "Wedge Antilles" },
    CatalogEntry { id: 834, name: "Lando Calrissian" },
    CatalogEntry { id: 835, name: "Chewbacca" },
    CatalogEntry { id: 836, name: "Jan Dodonna" },
    CatalogEntry { id: 837, name: "Crix Madine" },
    CatalogEntry { id: 838, name: "Carlist Rieekan" },
    CatalogEntry { id: 839, name: "Afyon" },
    CatalogEntry { id: 840, name: "Drayson" },
    CatalogEntry { id: 841, name: "Borsk Fey'lya" },
    CatalogEntry { id: 842, name: "Tura Raftican" },
    CatalogEntry { id: 843, name: "Bren Derlin" },
    CatalogEntry { id: 844, name: "Garm Bel Iblis" },
    CatalogEntry { id: 845, name: "Talon Karrde" },
    CatalogEntry { id: 846, name: "Narra" },
    CatalogEntry { id: 847, name: "Huoba Neva" },
    CatalogEntry { id: 848, name: "Page" },
    CatalogEntry { id: 849, name: "Syub Snunb" },
    CatalogEntry { id: 850, name: "Adar Tallon" },
    CatalogEntry { id: 851, name: "Sarin Virgilio" },
    CatalogEntry { id: 852, name: "Vanden Willard" },
    CatalogEntry { id: 853, name: "Roget Jiriss" },
    CatalogEntry { id: 854, name: "Kaiya Andrimetrum" },
    CatalogEntry { id: 855, name: "Mazer Rackus" },
    CatalogEntry { id: 856, name: "Orrimaarko" },
    CatalogEntry { id: 857, name: "Ma'w'shiye" },
    CatalogEntry { id: 896, name: "Jerjerrod" },
    CatalogEntry { id: 897, name: "Ozzel" },
    CatalogEntry { id: 898, name: "Piett" },
    CatalogEntry { id: 899, name: "Veers" },
    CatalogEntry { id: 900, name: "Brandei" },
    CatalogEntry { id: 901, name: "Covell" },
    CatalogEntry { id: 902, name: "Dorja" },
    CatalogEntry { id: 903, name: "Bin Essada" },
    CatalogEntry { id: 904, name: "Niles Ferrier" },
    CatalogEntry { id: 905, name: "Grammel" },
    CatalogEntry { id: 906, name: "Griff" },
    CatalogEntry { id: 907, name: "Klev" },
    CatalogEntry { id: 908, name: "Needa" },
    CatalogEntry { id: 909, name: "Bane Nothos" },
    CatalogEntry { id: 910, name: "Orlok" },
    CatalogEntry { id: 911, name: "Pellaeon" },
    CatalogEntry { id: 912, name: "Screed" },
    CatalogEntry { id: 913, name: "Thrawn" },
    CatalogEntry { id: 914, name: "Zuggs" },
    CatalogEntry { id: 915, name: "Daala" },
    CatalogEntry { id: 916, name: "Pter Thanas" },
    CatalogEntry { id: 917, name: "Bevel Lemelisk" },
    CatalogEntry { id: 918, name: "Shenir Rix" },
    CatalogEntry { id: 919, name: "Noval Garaint" },
    CatalogEntry { id: 920, name: "Garindan" },
    CatalogEntry { id: 921, name: "Menndo" },
    CatalogEntry { id: 922, name: "Labansat" },
    CatalogEntry { id: 923, name: "Villar" },
];

pub const ALLIANCE_FACILITIES: [CatalogEntry; 1] = [
    CatalogEntry { id: 1, name: "Alliance Headquarters" },
];
