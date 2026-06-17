/**
 * Sector Zoom Popup — slide_04 reference layout.
 *
 * Layout (measured from reference/golden_1998_slides/slide_04.png):
 *   - Green "Sesswenna" sector name at top
 *   - 2-column grid of planet entries
 *   - Each entry: small faction crest icon + horizontal support bar + large
 *     round planet photo (~50px) + green planet name below
 *
 * Sprites used:
 *   strategy/10212-10240 — 29 planet variants (37×37 native, displayed 50px)
 */
import { useMemo } from 'react';
import type { StarSystem } from '../../types/game';

interface Props {
  allSystems: StarSystem[];
  selectedSystem: StarSystem;
  onSelectSystem: (id: number) => void;
  onClose: () => void;
  /** When true, position on right half of monitor (multi-sector zoom, slide 15) */
  secondary?: boolean;
}

const PLANET_SPRITE_IDS = [
  10212, 10213, 10214, 10215, 10216, 10217, 10218, 10219, 10220,
  10221, 10222, 10223, 10224, 10225, 10226, 10227, 10228, 10229,
  10230, 10231, 10232, 10233, 10234, 10237, 10238, 10239, 10240,
];

// Canonical planet→sprite assignments. Iconic planets get their
// visual identity; everything else falls back to a deterministic
// hash so reloads stay stable. Sprite IDs from STRATEGY.DLL 10212-40.
const CANONICAL_PLANET_SPRITES: Record<string, number> = {
  Coruscant:    10212,
  Hoth:         10219,
  Tatooine:     10224,
  Yavin:        10222,
  Endor:        10227,
  Naboo:        10215,
  'Mon Calamari': 10221,
  Bespin:       10216,
  Dagobah:      10229,
  Kashyyyk:     10222,
  Sullust:      10230,
  Bothawui:     10231,
  Alderaan:     10215,
  Corellia:     10214,
  Kuat:         10217,
  Geonosis:     10224,
  Mustafar:     10228,
  Ilum:         10219,
  Felucia:      10227,
  Ryloth:       10223,
  Dantooine:    10226,
  Mygeeto:      10219,
  Korriban:     10228,
};

function planetSpriteFor(systemName: string, systemId: number): number {
  const canonical = CANONICAL_PLANET_SPRITES[systemName];
  if (canonical) return canonical;
  return PLANET_SPRITE_IDS[systemId % PLANET_SPRITE_IDS.length];
}

// REBEXE-authoritative sector names by id (per SECTORSD.DAT).
const SECTOR_NAMES: Record<number, string> = {
  20: 'Abrion',     21: 'Atrivis',    22: 'Churba',     23: 'Corellian',
  24: 'Calaron',    25: 'Dolomar',    26: 'Dufilvan',   27: 'Fakir',
  28: 'Farfin',     29: 'Glythe',     30: 'Jospro',     31: 'Kanchen',
  32: 'Mayagil',    33: 'Moddell',    34: 'Orus',       35: 'Quelli',
  36: 'Sesswenna',  37: 'Sluis',      38: 'Sumitra',    39: 'Xappyh',
};

interface CellProps {
  s: StarSystem;
  isSelected: boolean;
  onClick: () => void;
}

function PlanetCell({ s, isSelected, onClick }: CellProps) {
  const spriteId = planetSpriteFor(s.name, s.id);
  const allP = Math.round(s.popularityAlliance * 100);
  const empP = Math.round(s.popularityEmpire * 100);
  // slide_04 reference: small flag/crest above support bar, then large
  // round planet photo, then green name label below.
  const crest = s.control === 'Alliance' ? 'alliance'
              : s.control === 'Empire'   ? 'empire'
              : null;
  return (
    <button
      className={`szp-planet ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      title={`${s.name} — ${s.control}`}
    >
      {crest && <div className={`szp-planet-crest crest-${crest}`} />}
      <div className="szp-bars">
        <div className="szp-bar">
          <div className="szp-bar-fill all" style={{ width: `${allP}%` }} />
        </div>
        <div className="szp-bar">
          <div className="szp-bar-fill emp" style={{ width: `${empP}%` }} />
        </div>
      </div>
      <img
        className="szp-planet-sprite"
        src={`/assets/sprites/strategy/${spriteId}.png`}
        alt=""
        draggable={false}
      />
      <div className="szp-planet-name">{s.name}</div>
    </button>
  );
}

export function SectorZoomPopup({ allSystems, selectedSystem, onSelectSystem, onClose, secondary = false }: Props) {
  const sectorSystems = useMemo(
    () => allSystems
      .filter((s) => s.sectorId === selectedSystem.sectorId)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [allSystems, selectedSystem.sectorId],
  );

  const sectorName = SECTOR_NAMES[selectedSystem.sectorId] ?? `Sector ${selectedSystem.sectorId}`;

  return (
    <div className={`sector-zoom-popup${secondary ? ' sector-zoom-popup--secondary' : ''}`}>
      <div className="szp-header">
        <span className="szp-title">{sectorName}</span>
        <button className="szp-resize" title="Resize">⇔</button>
        <button className="szp-close" onClick={onClose} title="Close (Esc)">×</button>
      </div>
      <div className="szp-body">
        {sectorSystems.length === 0 ? (
          <div className="szp-empty">No systems known in this sector.</div>
        ) : (
          sectorSystems.map((s) => (
            <PlanetCell
              key={s.id}
              s={s}
              isSelected={s.id === selectedSystem.id}
              onClick={() => onSelectSystem(s.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
