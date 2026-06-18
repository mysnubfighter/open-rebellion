/**
 * Sector Zoom Popup — slide_04 itemized faithful match.
 *
 * Cell composition (9 elements, per decompiled/analysis/sector_entry_rebexe_eval.md Pass 5):
 *   1. Planet sprite — STRATEGY.DLL 10212-10240 via picture_id
 *   2. Shipyard icon (BMP 11531) — top-left of sprite
 *   3. Fighter/ship icon (BMP 11537) — top-right of sprite
 *   4. Training icon (BMP 11534) — bottom-left of sprite
 *   5. Defense/gear icon (BMP 11540) — bottom-right of sprite
 *   6. Selection crosshair (BMP 10153) — overlay on selected planet
 *   7. Top bar — popular support tick segments (yellow/white/orange)
 *   8. Bottom bar — loyalty split (green=Alliance / red=Empire / small blue end tab)
 *   9. Planet name — centered green Tahoma below bars
 *
 * The REBEXE function that produces this cell remains unidentified after
 * 5 disassembly passes (see eval doc). The visual itemization is sourced
 * directly from reference/golden_1998_slides/slide_04.png, which the
 * REBEXE binary itself produced, so it is authoritative for layout even
 * though we have not located the constructor function.
 */
import { useMemo } from 'react';
import type { StarSystem } from '../../types/game';

/**
 * Click targets per the sector_entry_rebexe_eval.md Pass 5 itemization
 * + panel_inventory.md mapping. Each cell element fires a typed action
 * which the App routes to the proper native panel.
 */
export type CellAction =
  | 'open-shipyard'   // shipyard icon  -> Build Ships (slide 5 item 1)
  | 'open-fighters'   // fighter icon   -> Fleet / Build Fighters
  | 'open-training'   // training icon  -> Build Troops (slide 5 item 2)
  | 'open-defense'    // defense icon   -> Build Facilities (slide 5 item 3)
  | 'open-loyalty'    // loyalty bar    -> Galaxy Overview - Loyalty
  | 'open-support'    // support bar    -> Galaxy Overview - Popular Support
  | 'open-detail'     // planet sprite  -> System Detail / Personnel
  | 'open-name';      // planet name    -> System context menu

interface Props {
  allSystems: StarSystem[];
  selectedSystem: StarSystem;
  onSelectSystem: (id: number) => void;
  onClose: () => void;
  secondary?: boolean;
  /** Fires when a specific cell element is clicked. */
  onCellAction?: (systemId: number, action: CellAction) => void;
  /** Right-click on any part of a cell — opens system context menu. */
  onCellContextMenu?: (systemId: number, x: number, y: number) => void;
}

const PLANET_SPRITE_IDS = [
  10212, 10213, 10214, 10215, 10216, 10217, 10218, 10219, 10220, 10221,
  10222, 10223, 10224, 10225, 10226, 10227, 10228, 10229, 10230, 10231,
  10232, 10233, 10234, 10237, 10238, 10239, 10240,
];

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
  onCellAction?: (systemId: number, action: CellAction) => void;
  onContextMenu?: (systemId: number, x: number, y: number) => void;
}

function hash32(x: number): number {
  let v = (x | 0) >>> 0;
  v = (v ^ (v << 13)) >>> 0;
  v = (v ^ (v >>> 17)) >>> 0;
  v = (v ^ (v << 5)) >>> 0;
  return v >>> 0;
}

const SUPPORT_TICK_COUNT = 12;

function computeSupportSegments(s: StarSystem): number {
  const a = Math.max(0, Math.min(1, s.popularityAlliance));
  const e = Math.max(0, Math.min(1, s.popularityEmpire));
  const total = Math.max(0.001, a + e);
  return Math.max(2, Math.round((total / 1.0) * SUPPORT_TICK_COUNT));
}

function PlanetCell({ s, isSelected, onClick, onCellAction, onContextMenu }: CellProps) {
  const spriteId = planetSpriteFor({ name: s.name, id: s.id, pictureId: s.pictureId });
  const a = Math.max(0, Math.min(1, s.popularityAlliance));
  const e = Math.max(0, Math.min(1, s.popularityEmpire));
  const total = Math.max(0.001, a + e);
  const alliancePct = (a / total) * 95;
  const empirePct = 95 - alliancePct;
  const supportLit = computeSupportSegments(s);
  const tickSeed = hash32(s.id + 7);

  const fire = (action: CellAction) => (ev: React.MouseEvent) => {
    ev.stopPropagation();
    if (onCellAction) {
      onCellAction(s.id, action);
    } else {
      onClick();
    }
  };
  const rightClick = (ev: React.MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (onContextMenu) onContextMenu(s.id, ev.clientX, ev.clientY);
  };

  return (
    <div
      className={`szp-planet ${isSelected ? 'selected' : ''}`}
      onContextMenu={rightClick}
      data-testid={`szp-planet-${s.id}`}
    >
      <div className="szp-sprite-wrap">
        <button
          type="button"
          className="szp-fi szp-fi-tl"
          onClick={fire('open-shipyard')}
          title="Shipyard - Build Ships"
          data-testid={`szp-shipyard-${s.id}`}
        >
          <img src="/assets/sprites/strategy/11531.png" alt="" draggable={false} />
        </button>
        <button
          type="button"
          className="szp-fi szp-fi-tr"
          onClick={fire('open-fighters')}
          title="Fighters - Manage Fleet"
          data-testid={`szp-fighters-${s.id}`}
        >
          <img src="/assets/sprites/strategy/11537.png" alt="" draggable={false} />
        </button>
        <button
          type="button"
          className="szp-fi szp-fi-bl"
          onClick={fire('open-training')}
          title="Training - Build Troops"
          data-testid={`szp-training-${s.id}`}
        >
          <img src="/assets/sprites/strategy/11534.png" alt="" draggable={false} />
        </button>
        <button
          type="button"
          className="szp-fi szp-fi-br"
          onClick={fire('open-defense')}
          title="Defense - Build Facilities"
          data-testid={`szp-defense-${s.id}`}
        >
          <img src="/assets/sprites/strategy/11540.png" alt="" draggable={false} />
        </button>
        <button
          type="button"
          className="szp-planet-sprite-btn"
          onClick={fire('open-detail')}
          title={`${s.name} — open System Detail`}
          data-testid={`szp-sprite-${s.id}`}
        >
          <img
            className="szp-planet-sprite"
            src={`/assets/sprites/strategy/${spriteId}.png`}
            alt=""
            draggable={false}
          />
        </button>
        {isSelected && (
          <img
            className="szp-selection-cross"
            src="/assets/sprites/strategy/10153.png"
            alt=""
            draggable={false}
            data-testid="szp-selection-cross"
          />
        )}
      </div>

      <button
        type="button"
        className="szp-support-bar"
        onClick={fire('open-support')}
        title="Popular Support - Galaxy Overview"
        data-testid={`szp-support-bar-${s.id}`}
      >
        {Array.from({ length: SUPPORT_TICK_COUNT }).map((_, i) => {
          const lit = i < supportLit;
          const r = hash32(tickSeed + i * 31) % 100;
          const tone =
            !lit ? 'szp-tick-off' :
            r < 25 ? 'szp-tick-yellow' :
            r < 70 ? 'szp-tick-white' :
                     'szp-tick-orange';
          return <span key={i} className={`szp-tick ${tone}`} />;
        })}
        <span className="szp-tick-endtab" />
      </button>

      <button
        type="button"
        className="szp-loyalty-bar"
        onClick={fire('open-loyalty')}
        title="Loyalty - Galaxy Overview"
        data-testid={`szp-loyalty-bar-${s.id}`}
      >
        <span
          className="szp-loyalty-alliance"
          style={{ width: `${alliancePct}%` }}
        />
        <span
          className="szp-loyalty-empire"
          style={{ width: `${empirePct}%` }}
        />
        <span className="szp-loyalty-endtab" />
      </button>

      <button
        type="button"
        className="szp-planet-name"
        onClick={fire('open-name')}
        title={`${s.name} — open context menu`}
        data-testid={`szp-name-${s.id}`}
      >
        {s.name}
      </button>
    </div>
  );
}

export function SectorZoomPopup({ allSystems, selectedSystem, onSelectSystem, onClose, secondary = false, onCellAction, onCellContextMenu }: Props) {
  const sectorSystems = useMemo(
    () => allSystems.filter((s) => s.sectorId === selectedSystem.sectorId),
    [allSystems, selectedSystem.sectorId],
  );

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
      {/* slide_15-confirmed native chrome: STRATEGY.DLL 11100 (single
          sector zoom) -- a 259x355 BMP with starfield body + space frame.
          BMP background sits behind everything; header + planets overlay. */}
      <img
        className="szp-bg-native"
        src="/assets/panels/strategy/11100.png"
        alt=""
        draggable={false}
      />
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
                  onCellAction={(systemId, action) => {
                    onSelectSystem(systemId);
                    if (onCellAction) onCellAction(systemId, action);
                  }}
                  onContextMenu={(systemId, x, y) => {
                    onSelectSystem(systemId);
                    if (onCellContextMenu) onCellContextMenu(systemId, x, y);
                  }}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
