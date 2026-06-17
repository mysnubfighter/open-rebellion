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
    () => allSystems.filter((s) => s.sectorId === selectedSystem.sectorId),
    [allSystems, selectedSystem.sectorId],
  );

  // 1998 original arranges planets at their ABSOLUTE (x, y) within the
  // sector — not in a grid. Compute the sector's bbox and map each
  // system's (x, y) to popup-local coordinates.
  const layout = useMemo(() => {
    if (sectorSystems.length === 0) return null;
    const xs = sectorSystems.map((s) => s.x ?? 0);
    const ys = sectorSystems.map((s) => s.y ?? 0);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = Math.max(1, maxX - minX);
    const rangeY = Math.max(1, maxY - minY);
    return { minX, minY, rangeX, rangeY };
  }, [sectorSystems]);

  const sectorName = SECTOR_NAMES[selectedSystem.sectorId] ?? `Sector ${selectedSystem.sectorId}`;

  return (
    <div className={`sector-zoom-popup${secondary ? ' sector-zoom-popup--secondary' : ''}`}>
      <div className="szp-header">
        <span className="szp-title">{sectorName}</span>
        <span className="szp-speed">4x</span>
        <button className="szp-resize" title="Resize">⇔</button>
        <button className="szp-close" onClick={onClose} title="Close (Esc)">×</button>
      </div>
      <div className="szp-body szp-body--absolute">
        {sectorSystems.length === 0 ? (
          <div className="szp-empty">No systems known in this sector.</div>
        ) : (
          sectorSystems.map((s) => {
            // Map system's REBEXE (x, y) to popup-local % coords.
            // The original game positions planets organically — not in
            // a grid — per their SYSTEMSD.DAT positions.
            const px = layout
              ? ((s.x ?? 0) - layout.minX) / layout.rangeX * 75 + 5
              : 0;
            const py = layout
              ? ((s.y ?? 0) - layout.minY) / layout.rangeY * 75 + 4
              : 0;
            return (
              <div
                key={s.id}
                className="szp-planet-anchor"
                style={{ left: `${px}%`, top: `${py}%` }}
              >
                <PlanetCell
                  s={s}
                  isSelected={s.id === selectedSystem.id}
                  onClick={() => onSelectSystem(s.id)}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
