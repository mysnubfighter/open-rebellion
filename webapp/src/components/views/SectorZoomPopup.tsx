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

// xorshift32 hash for deterministic per-system production queues.
function hash32(x: number): number {
  let v = (x | 0) >>> 0;
  v = (v ^ (v << 13)) >>> 0;
  v = (v ^ (v >>> 17)) >>> 0;
  v = (v ^ (v << 5)) >>> 0;
  return v >>> 0;
}

/**
 * REBEXE CoolwinStatusBar — a horizontal percentage-fill widget.
 * Per UIPanel_Init_WithStatusBarsAndStrobe @ 0x005e4110, each sector
 * entry has TWO of these at (34, 81) and (103, 81), both 37×10 px.
 *
 * Each bar represents one facility's production progress 0..100, with
 * fill color set by the OWNING FACTION (Alliance=blue 0x020000FF,
 * Empire=red 0x02FF0000) and remainder in dim bg (0x54000000).
 */
function CoolStatusBar({ pct, faction }: { pct: number; faction: 'Alliance' | 'Empire' | 'Neutral' }) {
  const fillColor =
    faction === 'Alliance' ? '#0000FF' :   // 0x020000FF — REBEXE blue
    faction === 'Empire'   ? '#FF0000' :   // 0x02FF0000 — REBEXE red
                              '#808080';
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="szp-coolbar">
      <span
        className="szp-coolbar-fill"
        style={{ width: `${clamped}%`, background: fillColor }}
      />
    </div>
  );
}

/**
 * REBEXE CoolStrobeButton (vertical strip variant) — animated facility
 * indicator. Each sector entry has TWO at top: shipyard at (7, 10) and
 * training at (132, 10), both 11×53 px. The strobe alternates between
 * two BMP frames when production is active.
 */
function CoolStrobeStrip({ seed, facilityIdx, faction }: {
  seed: number; facilityIdx: number; faction: 'Alliance' | 'Empire' | 'Neutral';
}) {
  // Active when (system, facility) hashes above threshold.
  const active = hash32(seed * 17 + facilityIdx * 41) % 100 > 40;
  const bg =
    !active ? '#202020' :
    faction === 'Alliance' ? '#4080ff' :
    faction === 'Empire'   ? '#ff4040' :
                              '#888888';
  return <span className="szp-strobe-strip" style={{ background: bg }} />;
}

/**
 * PlanetCell — REBEXE-accurate sector entry per
 * UIPanel_Init_WithStatusBarsAndStrobe @ 0x005e4110.
 *
 * Layout (positions from disassembly, scaled to fit 90×80 cell):
 *   - Left strobe strip (shipyard) at top-left
 *   - Right strobe strip (training) at top-right
 *   - LEFT status bar at (LEFT of planet, y=middle)
 *   - Planet sprite center
 *   - RIGHT status bar at (RIGHT of planet, y=middle)
 *   - Construction strobe BOTTOM-LEFT
 *   - Planet name BOTTOM (green Tahoma)
 */
function PlanetCell({ s, isSelected, onClick }: CellProps) {
  const spriteId = planetSpriteFor({ name: s.name, id: s.id, pictureId: s.pictureId });
  const faction = s.control === 'Alliance' ? 'Alliance'
                : s.control === 'Empire'   ? 'Empire'
                : 'Neutral';
  // Production progress for left + right facility (deterministic).
  const leftPct = hash32(s.id * 13 + 1) % 100;
  const rightPct = hash32(s.id * 13 + 2) % 100;
  return (
    <button
      className={`szp-planet ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      title={`${s.name} — ${s.control}`}
    >
      {/* Top: two strobe strips (shipyard L + training R) */}
      <div className="szp-strobe-row">
        <CoolStrobeStrip seed={s.id} facilityIdx={0} faction={faction} />
        <CoolStrobeStrip seed={s.id} facilityIdx={1} faction={faction} />
      </div>
      {/* Middle: status bar | planet | status bar */}
      <div className="szp-middle-row">
        <CoolStatusBar pct={leftPct} faction={faction} />
        <img
          className="szp-planet-sprite"
          src={`/assets/sprites/strategy/${spriteId}.png`}
          alt=""
          draggable={false}
        />
        <CoolStatusBar pct={rightPct} faction={faction} />
      </div>
      {/* Bottom: name */}
      <div className="szp-planet-name">{s.name}</div>
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
