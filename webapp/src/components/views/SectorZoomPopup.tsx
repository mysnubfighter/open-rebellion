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
 * LoyaltyBar — the original game's single bar showing each planet's
 * popularity split between Alliance (green) and Empire (red).
 * Width is proportional to popularity_alliance + popularity_empire;
 * any unaligned remainder is shown as neutral grey.
 *
 * REBEXE source: UIPanel_UpdateLoyaltySlider @ 0x0045c450.
 */
function LoyaltyBar({ alliance, empire }: { alliance: number; empire: number }) {
  const a = Math.max(0, Math.min(1, alliance));
  const e = Math.max(0, Math.min(1, empire));
  const total = a + e;
  const greenPct = total > 0 ? (a / Math.max(total, 1)) * 100 : 0;
  const redPct = total > 0 ? (e / Math.max(total, 1)) * 100 : 0;
  return (
    <div className="szp-loyalty">
      <span className="szp-loyalty-green" style={{ width: `${greenPct}%` }} />
      <span className="szp-loyalty-red" style={{ width: `${redPct}%` }} />
    </div>
  );
}

/**
 * ProductionQueue — row of 3 small slot indicators showing what's
 * being built at this system's manufacturing facility. Color encodes
 * the item type. Empty slots are dimmed grey.
 *
 * REBEXE source: ManuMgr_UpdateProduction @ 0x0053b330.
 *
 * Until the engine bridge exposes real production queues, the slots
 * are deterministically derived from the system id so each planet
 * has a stable, distinct appearance.
 */
function ProductionQueue({ seed }: { seed: number }) {
  const colors = ['#404040', '#80c0ff', '#ffd040', '#40d040', '#ff8040'];
  // Slot count: 3 fixed (matches close-up of original sector entry)
  const slots = Array.from({ length: 3 }, (_, i) => {
    const v = hash32(seed * 41 + i * 53) % 100;
    if (v < 40) return colors[0];           // empty (most planets idle)
    if (v < 60) return colors[1];           // capital ship (blue)
    if (v < 75) return colors[2];           // fighter (yellow)
    if (v < 90) return colors[3];           // troop (green)
    return colors[4];                       // facility (orange)
  });
  return (
    <div className="szp-prodqueue">
      {slots.map((c, i) => (
        <span key={i} className="szp-prod-slot" style={{ background: c }} />
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
      <LoyaltyBar
        alliance={s.popularityAlliance}
        empire={s.popularityEmpire}
      />
      <ProductionQueue seed={s.id} />
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
