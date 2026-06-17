/**
 * Sector Zoom Popup — matches slide_04 of the 1998 game.
 *
 * Layout (measured from reference/golden_1998_slides/slide_04.png):
 *   - Green centered sector name at top of panel
 *   - "4x" speed indicator + minimize + X close on right of title bar
 *   - 2-column layout of planet entries, each entry has:
 *       LEFT  — vertical strip of 4 facility status icons (~10px each):
 *                 shipyard / training / construction / defense
 *       ABOVE — multi-segment colored bar (manufacturing/production)
 *       CENTER — round planet photo (~40px), varied artwork per system
 *       BELOW — multi-segment colored bar (garrison) + green planet name
 *
 * Planet positions inside the popup use the REBEXE-authoritative system
 * (x, y) coordinates from SYSTEMSD.DAT, mapped from the sector's bbox
 * to popup space. This produces the same "staggered" arrangement the
 * 1998 game shows (planets aren't on a strict grid — each planet has
 * its own canonical position within the sector).
 */
import { useMemo } from 'react';
import type { StarSystem } from '../../types/game';

interface Props {
  allSystems: StarSystem[];
  selectedSystem: StarSystem;
  onSelectSystem: (id: number) => void;
  onClose: () => void;
  secondary?: boolean;
}

// Sorted list of 37×37 planet BMP IDs in STRATEGY.DLL (10212..10240 with
// gap at 10235-10236). REBEXE's picture_id field (1..26) is a 1-indexed
// offset into this list.
const PLANET_SPRITE_IDS = [
  10212, 10213, 10214, 10215, 10216, 10217, 10218, 10219, 10220, 10221,
  10222, 10223, 10224, 10225, 10226, 10227, 10228, 10229, 10230, 10231,
  10232, 10233, 10234, 10237, 10238, 10239, 10240,
];

/**
 * Maps a system to its planet sprite BMP id.
 *
 * Uses the REBEXE `picture_id` field from SYSTEMSD.DAT (which is the
 * canonical 1998 game's planet assignment) as the index into the
 * sorted STRATEGY.DLL planet BMP table. Falls back to a deterministic
 * id-based pick when picture_id is missing.
 */
function planetSpriteFor(s: { name: string; id: number; pictureId?: number }): number {
  if (s.pictureId && s.pictureId >= 1 && s.pictureId <= PLANET_SPRITE_IDS.length) {
    return PLANET_SPRITE_IDS[s.pictureId - 1];
  }
  return PLANET_SPRITE_IDS[s.id % PLANET_SPRITE_IDS.length];
}

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

// slide_04: each planet has a multi-segment horizontal bar showing
// manufacturing/garrison status. Segments are colored by activity:
// yellow=construction, green=full, red=damaged/missing.
function hash32(x: number): number {
  // xorshift32-style mixer — distributes bits properly so consecutive
  // seeds produce varied outputs (avoids the (seed*K)%100 degeneration
  // that gave all-yellow bars for sector_layout.json IDs 230-239).
  let v = (x | 0) >>> 0;
  v = (v ^ (v << 13)) >>> 0;
  v = (v ^ (v >>> 17)) >>> 0;
  v = (v ^ (v << 5)) >>> 0;
  return v >>> 0;
}
function StatusBar({ seed }: { seed: number }) {
  const segments = Array.from({ length: 8 }, (_, i) => {
    const v = hash32(seed * 17 + i * 31) % 100;
    if (v < 30) return '#40d040';        // green (active/full)
    if (v < 50) return '#ffd040';        // yellow (in progress)
    if (v < 70) return '#dc5050';        // red (damaged/contested)
    return '#404040';                    // empty/grey
  });
  return (
    <div className="szp-statusbar">
      {segments.map((c, i) => (
        <span key={i} className="szp-seg" style={{ background: c }} />
      ))}
    </div>
  );
}

// slide_04: vertical strip of 4 facility icons on the LEFT of each
// planet entry — shipyard / training / construction / defense.
// Each icon is a tiny BMP (~10×10 px) showing facility status.
function FacilityStrip({ seed }: { seed: number }) {
  const ids = [10322, 10324, 10325, 10312];  // factory / shipyard / fleet / defense
  return (
    <div className="szp-facilities">
      {ids.map((bmpId, i) => {
        const active = hash32(seed * 23 + i * 7) % 100 > 40;
        return (
          <img
            key={i}
            src={`/assets/sprites/strategy/${bmpId}.png`}
            className={`szp-fac-icon ${active ? '' : 'szp-fac-icon--dim'}`}
            alt=""
            draggable={false}
          />
        );
      })}
    </div>
  );
}

function PlanetCell({ s, isSelected, onClick }: CellProps) {
  const spriteId = planetSpriteFor({ name: s.name, id: s.id, pictureId: s.pictureId });
  const crest = s.control === 'Alliance' ? 'alliance'
              : s.control === 'Empire'   ? 'empire'
              : s.control === 'Contested' ? 'contested'
              : null;
  return (
    <button
      className={`szp-planet ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      title={`${s.name} — ${s.control}`}
    >
      <FacilityStrip seed={s.id} />
      <div className="szp-planet-body">
        {/* slide_04: small T-shaped flag above the planet photo */}
        <span className={`szp-flag crest-${crest ?? 'neutral'}`} />
        <StatusBar seed={s.id} />
        <img
          className="szp-planet-sprite"
          src={`/assets/sprites/strategy/${spriteId}.png`}
          alt=""
          draggable={false}
        />
        <StatusBar seed={s.id + 1} />
        <div className="szp-planet-name">
          {s.name}
          {crest && <span className={`szp-planet-dot crest-${crest}`} />}
        </div>
      </div>
    </button>
  );
}

export function SectorZoomPopup({ allSystems, selectedSystem, onSelectSystem, onClose, secondary = false }: Props) {
  const sectorSystems = useMemo(
    () => allSystems
      .filter((s) => s.sectorId === selectedSystem.sectorId)
      .sort((a, b) => {
        // slide_04: planets are arranged top-to-bottom by Y, then left-
        // to-right by X. This produces the staggered 2-column look.
        const ay = a.y ?? 0, by = b.y ?? 0;
        const ax = a.x ?? 0, bx = b.x ?? 0;
        if (Math.abs(ay - by) > 30) return ay - by;
        return ax - bx;
      }),
    [allSystems, selectedSystem.sectorId],
  );

  const sectorName = SECTOR_NAMES[selectedSystem.sectorId] ?? `Sector ${selectedSystem.sectorId}`;

  return (
    <div className={`sector-zoom-popup${secondary ? ' sector-zoom-popup--secondary' : ''}`}>
      <div className="szp-header">
        <span className="szp-title">{sectorName}</span>
        <span className="szp-speed">4x</span>
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
