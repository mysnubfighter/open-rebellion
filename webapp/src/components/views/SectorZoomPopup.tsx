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
 * StatusBar — the original 1998 game's single status bar above each
 * planet entry. Renders as 5 segments with the leftmost reflecting
 * Alliance loyalty (green), the rightmost Empire loyalty (red), and
 * the middle segments transitioning yellow (contested) — matching
 * the Yaga Minor close-up reference.
 *
 * REBEXE source:
 *   UIPanel_UpdateLoyaltySlider @ 0x0045c450
 *   ManuMgr_UpdateProduction    @ 0x0053b330
 */
function StatusBar({ alliance, empire, seed }: {
  alliance: number; empire: number; seed: number;
}) {
  const a = Math.max(0, Math.min(1, alliance));
  const e = Math.max(0, Math.min(1, empire));
  // 5-segment scale. Segment i represents threshold i/5 along the
  // alliance→empire axis. Alliance "dominant" colors green; transition
  // yellow; empire red. Unaligned/empty segments stay grey.
  const segments = Array.from({ length: 5 }, (_, i) => {
    // Segment center on the [0..1] axis (Alliance=0, Empire=1).
    const t = (i + 0.5) / 5;
    // Per-segment hash adds slight variation per system so two planets
    // with identical popularity don't render identically.
    const noise = (hash32(seed * 11 + i * 23) % 20) / 100; // ±0.1
    const aw = a - t + 0.2 + noise;   // alliance weight at this segment
    const ew = e - (1 - t) + 0.2 + noise; // empire weight at this segment
    if (aw > 0.25 && aw > ew) return '#30c030';     // green - alliance dominant
    if (ew > 0.25 && ew > aw) return '#d04040';     // red - empire dominant
    if (Math.abs(aw - ew) < 0.15 && (aw > 0 || ew > 0)) {
      return '#e0c020';                              // yellow - contested
    }
    return '#404040';                                // grey - neutral/empty
  });
  return (
    <div className="szp-statusbar">
      {segments.map((c, i) => (
        <span key={i} className="szp-status-seg" style={{ background: c }} />
      ))}
    </div>
  );
}

/**
 * PlanetCell — single planet entry in the sector panel.
 *
 * Layout (matches original 1998 sector zoom — see
 * decompiled/analysis/sector_panel_entry_plan.md):
 *   T-flag → loyalty bar → production queue → planet sprite → name
 *
 * Every planet uses this identical layout — differences come from
 * data (sprite, loyalty %, production queue).
 */
function PlanetCell({ s, isSelected, onClick }: CellProps) {
  const spriteId = planetSpriteFor({ name: s.name, id: s.id, pictureId: s.pictureId });
  const crest = s.control === 'Alliance' ? 'alliance'
              : s.control === 'Empire'   ? 'empire'
              : s.control === 'Contested' ? 'contested'
              : 'neutral';
  return (
    <button
      className={`szp-planet ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      title={`${s.name} — ${s.control}`}
    >
      <span className={`szp-flag crest-${crest}`} />
      <StatusBar
        alliance={s.popularityAlliance}
        empire={s.popularityEmpire}
        seed={s.id}
      />
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
