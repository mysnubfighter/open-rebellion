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

function planetSpriteFor(systemId: number): number {
  return PLANET_SPRITE_IDS[systemId % PLANET_SPRITE_IDS.length];
}

const SECTOR_NAMES: Record<number, string> = {
  0: 'Sesswenna',
  1: 'Bormea',
  2: 'Outer Rim',
};

interface CellProps {
  s: StarSystem;
  isSelected: boolean;
  onClick: () => void;
}

function PlanetCell({ s, isSelected, onClick }: CellProps) {
  const spriteId = planetSpriteFor(s.id);
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
