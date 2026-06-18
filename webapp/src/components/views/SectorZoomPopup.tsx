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

interface Props {
  allSystems: StarSystem[];
  selectedSystem: StarSystem;
  onSelectSystem: (id: number) => void;
  onClose: () => void;
  secondary?: boolean;
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

function PlanetCell({ s, isSelected, onClick }: CellProps) {
  const spriteId = planetSpriteFor({ name: s.name, id: s.id, pictureId: s.pictureId });
  const a = Math.max(0, Math.min(1, s.popularityAlliance));
  const e = Math.max(0, Math.min(1, s.popularityEmpire));
  const total = Math.max(0.001, a + e);
  const alliancePct = (a / total) * 95;
  const empirePct = 95 - alliancePct;
  const supportLit = computeSupportSegments(s);
  const tickSeed = hash32(s.id + 7);

  return (
    <button
      className={`szp-planet ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      title={`${s.name} — ${s.control}`}
      data-testid={`szp-planet-${s.id}`}
    >
      <div className="szp-sprite-wrap">
        <img
          className="szp-fi szp-fi-tl"
          src="/assets/sprites/strategy/11531.png"
          alt=""
          draggable={false}
          title="Shipyard"
        />
        <img
          className="szp-fi szp-fi-tr"
          src="/assets/sprites/strategy/11537.png"
          alt=""
          draggable={false}
          title="Fighter facility"
        />
        <img
          className="szp-fi szp-fi-bl"
          src="/assets/sprites/strategy/11534.png"
          alt=""
          draggable={false}
          title="Training facility"
        />
        <img
          className="szp-fi szp-fi-br"
          src="/assets/sprites/strategy/11540.png"
          alt=""
          draggable={false}
          title="Defense"
        />
        <img
          className="szp-planet-sprite"
          src={`/assets/sprites/strategy/${spriteId}.png`}
          alt=""
          draggable={false}
        />
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

      <div className="szp-support-bar" data-testid="szp-support-bar">
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
      </div>

      <div className="szp-loyalty-bar" data-testid="szp-loyalty-bar">
        <span
          className="szp-loyalty-alliance"
          style={{ width: `${alliancePct}%` }}
        />
        <span
          className="szp-loyalty-empire"
          style={{ width: `${empirePct}%` }}
        />
        <span className="szp-loyalty-endtab" />
      </div>

      <div className="szp-planet-name">{s.name}</div>
    </button>
  );
}

export function SectorZoomPopup({ allSystems, selectedSystem, onSelectSystem, onClose, secondary = false }: Props) {
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
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
