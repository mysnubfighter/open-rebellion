/**
 * Cockpit chrome — composes the original game's 640×481 chrome (chrome/empire.png
 * or chrome/alliance.png) on top of game content (galaxy/panels/combat).
 *
 * The chrome PNG is the actual extracted strategy/900 (Alliance) or 901 (Empire)
 * with the central blue region made transparent. We render game content
 * underneath, then the chrome overlay, then interactive elements (right-column
 * buttons, left-column system list, top status, speed controls) on top.
 */
import { type ReactNode } from 'react';
import type { Faction, WorldState, ActiveMission, StarSystem } from '../../types/game';

export type PanelKey =
  | 'galaxy' | 'officers' | 'fleets' | 'manufacture' | 'missions'
  | 'research' | 'jedi' | 'bombardment' | 'deathstar' | 'loyalty'
  | 'encyclopedia' | 'saveload' | 'messages' | 'options'
  | 'garrisons' | 'objectives' | 'galaxy-overview';

export type GameSpeed = 'paused' | '1x' | '2x' | '4x';

interface CockpitFrameProps {
  world: WorldState;
  missions: ActiveMission[];
  systems: StarSystem[];
  playerFaction: Faction;
  speed: GameSpeed;
  onSpeedChange: (s: GameSpeed) => void;
  activePanel: PanelKey | null;
  onPanel: (key: PanelKey) => void;
  selectedSystemId: number | null;
  onSelectSystem: (id: number | null) => void;
  /** Shift-click on a cell — compare-mode (multi-sector zoom, slide 15) */
  onShiftSelectSystem?: (id: number) => void;
  children: ReactNode;        // monitor content (galaxy / panel)
}

interface ButtonDef {
  key: PanelKey;
  label: string;
  /** Strategy.DLL sprite id to render as the button icon, or null for text-only. */
  spriteId: number | null;
  /** Optional faction-specific sprite (Alliance / Empire variant) */
  spriteAlliance?: number;
  spriteEmpire?: number;
}

// 10 right-column buttons matching the original game's right rail.
// Icon sprites picked from common+strategy DLL: prefer 25x25 to fit the tight ~24x20 slot.
const RIGHT_BUTTONS: ButtonDef[] = [
  { key: 'officers',     label: 'OFF', spriteId: null,  spriteAlliance: 11000, spriteEmpire: 11013 },
  { key: 'fleets',       label: 'FLT', spriteId: 10325 },
  { key: 'manufacture',  label: 'MFG', spriteId: 10322 },
  { key: 'missions',     label: 'MSN', spriteId: 10404 },
  { key: 'research',     label: 'RES', spriteId: 10388 },
  { key: 'jedi',         label: 'JED', spriteId: null,  spriteAlliance: 11001, spriteEmpire: 11013 },
  { key: 'loyalty',      label: 'LOY', spriteId: null,  spriteAlliance: 10311, spriteEmpire: 10314 },
  { key: 'encyclopedia', label: 'ENC', spriteId: 10387 },
  { key: 'saveload',     label: 'SAV', spriteId: 10595 },
  { key: 'options',      label: 'OPT', spriteId: 10322 },
];

// Bottom decorative panels in the chrome image have CLICKABLE WINDOWS baked in.
// Coordinates measured in percentages of the 640×481 chrome:
//   Bottom-center 3 panels: x=28%–50%, y=84%–98%
//   Bottom-right 3 panels:  x=73%–97%, y=84%–98%
// Each row contains 3 sub-windows (planet, ship/star, character icons).
interface BottomHotspot {
  key: PanelKey;
  left: number; width: number; top: number; height: number;
  label: string;
}
const BOTTOM_HOTSPOTS: BottomHotspot[] = [
  // Bottom-left logo: opens loyalty/dashboard
  { key: 'loyalty',     left: 2.3,  width: 18,  top: 86, height: 13, label: 'Faction Status' },
  // Bottom-center 3 panel windows (planet, ship, character displays)
  { key: 'fleets',      left: 25.0, width: 15,  top: 86, height: 13, label: 'Fleets' },
  { key: 'manufacture', left: 40.0, width: 15.5, top: 86, height: 13, label: 'Manufacturing' },
  { key: 'officers',    left: 55.5, width: 15.6, top: 86, height: 13, label: 'Officers' },
  // Bottom-right 3 panel windows
  { key: 'missions',    left: 73.4, width: 8.1, top: 86, height: 13, label: 'Missions' },
  { key: 'research',    left: 81.5, width: 8.0, top: 86, height: 13, label: 'Research' },
  { key: 'jedi',        left: 89.5, width: 8.2, top: 86, height: 13, label: 'Jedi' },
];

export function CockpitFrame({
  world, missions, systems, playerFaction, speed, onSpeedChange,
  activePanel, onPanel, selectedSystemId, onSelectSystem, onShiftSelectSystem, children,
}: CockpitFrameProps) {
  const chromeSrc = playerFaction === 'Alliance'
    ? '/assets/sprites/chrome/alliance.png'
    : '/assets/sprites/chrome/empire.png';

  // slide_02 / slide_04 reference: the chrome's left silver bars are EMPTY
  // by default. Planet thumbnails appear ONLY inside the monitor (via the
  // SectorZoomPopup) when a system is selected. The earlier permanent
  // 10-cell planet column was my own addition and is removed.
  void systems;
  const _inTransit = missions.length;

  return (
    <div className="cockpit" data-faction={playerFaction.toLowerCase()}>
      <div className="cockpit-frame">
        {/* MONITOR: galaxy/panels render here BEHIND the chrome */}
        <div className="cockpit-monitor">
          {children}
        </div>

        {/* CHROME OVERLAY: original game's cockpit on top */}
        <img
          className="cockpit-chrome-overlay"
          src={chromeSrc}
          alt=""
          draggable={false}
        />

        {/* slide_02 / slide_04: left silver bars are empty by default.
            Planet thumbnails for a sector appear only inside the monitor
            via SectorZoomPopup when a system is selected. */}

        {/* RIGHT COLUMN: 10 navigation buttons. slide_04 reference shows
            small text labels on the silver bars, not chunky icons (chunky
            character portraits were my own flare). Falls back to icons
            only when the user clicks (title attr still shows the panel
            name for hover). */}
        <div className="cockpit-buttons-right">
          {RIGHT_BUTTONS.map((b) => {
            return (
              <button
                key={b.key}
                className={`cockpit-btn cockpit-btn--text ${activePanel === b.key ? 'active' : ''}`}
                onClick={() => onPanel(b.key)}
                title={b.key}
              >
                <span className="btn-content">{b.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom-panel CLICK HOTSPOTS — invisible overlays that make the chrome's
             baked-in bottom display windows interactive */}
        {BOTTOM_HOTSPOTS.map((h, i) => (
          <button
            key={`hs-${i}`}
            className="cockpit-bottom-hotspot"
            style={{
              left: `${h.left}%`,
              width: `${h.width}%`,
              top: `${h.top}%`,
              height: `${h.height}%`,
            }}
            onClick={() => onPanel(h.key)}
            title={h.label}
          >
            <span className="hotspot-tooltip">{h.label}</span>
          </button>
        ))}

        {/* Live status values, each positioned inside its chrome icon slot */}
        <span className="cockpit-stat stat-pop">{Math.round((systems.filter(s => s.control === playerFaction).length / Math.max(systems.length, 1)) * 100)}</span>
        <span className="cockpit-stat stat-tank">{world.characterCount}</span>
        <span className="cockpit-stat stat-ship">{world.activeMissionCount}</span>
        <span className="cockpit-stat stat-wrench">{world.systemCount}</span>
        <span className="cockpit-stat stat-day">{world.currentDay}</span>

        {/* Speed indicators in chrome's top-right slot */}
        <div className="cockpit-speed-indicators">
          <button className={speed === 'paused' ? 'active' : ''}
                  onClick={() => onSpeedChange('paused')} title="Pause (Space)">‖</button>
          <button className={speed === '1x' ? 'active' : ''}
                  onClick={() => onSpeedChange('1x')} title="1× (key 1)">1</button>
          <button className={speed === '2x' ? 'active' : ''}
                  onClick={() => onSpeedChange('2x')} title="2× (key 2)">2</button>
          <button className={speed === '4x' ? 'active' : ''}
                  onClick={() => onSpeedChange('4x')} title="4× (key 4)">4</button>
        </div>

        {/* Bottom-left mini-monitor: selected system details, or galaxy summary */}
        <div className="cockpit-mini-monitor">
          {(() => {
            const sel = systems.find((s) => s.id === selectedSystemId);
            if (sel) {
              return <>
                <div className="mm-title">{sel.name}</div>
                <div className="mm-row">
                  <span className="mm-label">Sec</span>
                  <span className="mm-value">{sel.sectorId}</span>
                </div>
                <div className="mm-row">
                  <span className="mm-label">Ctrl</span>
                  <span className="mm-value" style={{
                    color: sel.control === 'Alliance' ? '#5fa8dc'
                         : sel.control === 'Empire'   ? '#dc5f3a'
                         : '#ffd770',
                  }}>{sel.control.slice(0, 4)}</span>
                </div>
                <div className="mm-row"><span className="mm-label">All</span><span className="mm-value">{Math.round(sel.popularityAlliance * 100)}%</span></div>
                <div className="mm-bar"><div className="mm-bar-fill" style={{ width: `${sel.popularityAlliance * 100}%`, background: '#5fa8dc' }} /></div>
                <div className="mm-row" style={{ marginTop: 2 }}><span className="mm-label">Emp</span><span className="mm-value">{Math.round(sel.popularityEmpire * 100)}%</span></div>
                <div className="mm-bar"><div className="mm-bar-fill" style={{ width: `${sel.popularityEmpire * 100}%`, background: '#dc5f3a' }} /></div>
              </>;
            }
            const allianceCount = systems.filter(s => s.control === 'Alliance').length;
            const empireCount = systems.filter(s => s.control === 'Empire').length;
            const neutralCount = systems.length - allianceCount - empireCount;
            return <>
              <div className="mm-title">Galaxy</div>
              <div className="mm-row"><span className="mm-label">Alliance</span><span className="mm-value" style={{ color: '#5fa8dc' }}>{allianceCount}</span></div>
              <div className="mm-row"><span className="mm-label">Empire</span><span className="mm-value" style={{ color: '#dc5f3a' }}>{empireCount}</span></div>
              <div className="mm-row"><span className="mm-label">Neutral</span><span className="mm-value">{neutralCount}</span></div>
              <div className="mm-row" style={{ marginTop: 4 }}><span className="mm-label">Total</span><span className="mm-value">{systems.length}</span></div>
            </>;
          })()}
        </div>

        {/* Floor patches behind the chrome's baked dark display windows —
            fills the gaps where R2-D2 (center) and C-3PO (right) stand so
            they no longer sit inside black rectangles. */}
        <div className="cockpit-r2-pedestal" />
        <div className="cockpit-c3po-pedestal" />

        {/* Droid advisor overlays — R2-D2 + C-3PO on the cockpit chrome pedestals */}
        <img
          className="cockpit-droid r2d2"
          src="/assets/sprites/alsprite/3331.png"
          alt="R2-D2"
          draggable={false}
        />
        <img
          className="cockpit-droid c3po"
          src="/assets/sprites/alsprite/2001.png"
          alt="C-3PO"
          draggable={false}
        />

        {null}
      </div>
    </div>
  );
}
