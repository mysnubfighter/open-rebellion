import { useEffect, useRef, useState, useCallback } from 'react';
import { useBmp } from '../../hooks/useBmp';
import { TACTICAL } from '../../assets/ids';
import type { Faction } from '../../types/game';

export type CombatPhase = 'approach' | 'engaged' | 'recovery' | 'resolved';

export interface CombatShip {
  id: number;
  classId: number;        // maps to TACTICAL SHIP_SPRITE_BASE + offset
  name: string;
  faction: Faction;
  hullPct: number;        // 0..1
  shieldPct: number;      // 0..1
  weaponPct: number;      // 0..1 weapon recharge
  x: number;              // normalized 0..1 within arena
  y: number;
  target?: number | null;
}

export interface CombatSession {
  phase: CombatPhase;
  ticksRemaining: number;
  ships: CombatShip[];
  log: { tick: number; text: string; faction?: Faction }[];
}

interface Props {
  session: CombatSession;
  onClose: () => void;
  onRetreat?: () => void;
  onTargetChange?: (shipId: number, targetId: number) => void;
}

function shipColor(f: Faction): string {
  return f === 'Alliance' ? '#5fa8dc' : '#dc5f3a';
}

function shipSpriteId(classId: number): number {
  return TACTICAL.SHIP_SPRITE_BASE + (classId % 130);
}

function ShipMarker({ ship, selected, onClick }: { ship: CombatShip; selected: boolean; onClick: () => void }) {
  // Use the green-keyed transparent versions in tactical/ships/
  const spriteUrl = `/assets/sprites/tactical/ships/${shipSpriteId(ship.classId)}.png`;
  const sprite = useBmp('tactical', shipSpriteId(ship.classId));
  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${ship.x * 100}%`,
        top: `${ship.y * 100}%`,
        transform: 'translate(-50%, -50%) scaleX(' + (ship.faction === 'Alliance' ? '1' : '-1') + ')',
        cursor: 'pointer',
        textAlign: 'center',
        filter: selected ? `drop-shadow(0 0 6px ${shipColor(ship.faction)})` : 'none',
      }}
    >
      {sprite.ready ? (
        <img src={spriteUrl} alt={ship.name} style={{
          width: 64, height: 26, objectFit: 'contain', imageRendering: 'pixelated',
        }} />
      ) : (
        <div style={{
          width: 28, height: 28,
          background: shipColor(ship.faction),
          clipPath: ship.faction === 'Alliance'
            ? 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)'
            : 'polygon(0 20%, 100% 20%, 100% 80%, 0 80%)',
        }} />
      )}
      <div style={{
        fontSize: 9, color: shipColor(ship.faction),
        marginTop: 2, textShadow: '0 0 4px black', fontWeight: 'bold',
      }}>{ship.name}</div>
      {/* Hull bar */}
      <div style={{
        width: 36, height: 3,
        background: 'rgba(0,0,0,0.6)', margin: '1px auto',
        border: '1px solid rgba(255,255,255,0.2)',
      }}>
        <div style={{
          width: `${ship.hullPct * 100}%`, height: '100%',
          background: ship.hullPct > 0.5 ? '#4ca44a' : ship.hullPct > 0.25 ? '#d49810' : '#c83a2a',
        }} />
      </div>
    </div>
  );
}

export function TacticalCombatView({ session, onClose, onRetreat, onTargetChange }: Props) {
  /* slide_16: TACTICAL.BACKGROUND (BMP 1000) is the right info panel
     chrome with mini-map + buttons + gizmo baked in. Surface it on the
     EMPIRE-side panel so the tactical view has the 1998 instrument-panel
     aesthetic. */
  const tacticalChromeBg = useBmp('tactical', TACTICAL.BACKGROUND);
  const [selectedShip, setSelectedShip] = useState<number | null>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const [arenaSize, setArenaSize] = useState({ w: 800, h: 500 });

  useEffect(() => {
    const r = arenaRef.current;
    if (!r) return;
    const resize = () => setArenaSize({ w: r.clientWidth, h: r.clientHeight });
    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(r);
    return () => obs.disconnect();
  }, []);

  const allianceShips = session.ships.filter((s) => s.faction === 'Alliance');
  const empireShips = session.ships.filter((s) => s.faction === 'Empire');
  const selected = session.ships.find((s) => s.id === selectedShip);

  const handleTarget = (targetId: number) => {
    if (selectedShip && onTargetChange) onTargetChange(selectedShip, targetId);
  };

  // Draw target line on canvas overlay
  const lineCanvas = useRef<HTMLCanvasElement>(null);
  const drawLines = useCallback(() => {
    const c = lineCanvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = arenaSize.w * dpr;
    c.height = arenaSize.h * dpr;
    c.style.width = `${arenaSize.w}px`;
    c.style.height = `${arenaSize.h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, arenaSize.w, arenaSize.h);
    for (const s of session.ships) {
      if (!s.target) continue;
      const tgt = session.ships.find((t) => t.id === s.target);
      if (!tgt) continue;
      ctx.strokeStyle = shipColor(s.faction);
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(s.x * arenaSize.w, s.y * arenaSize.h);
      ctx.lineTo(tgt.x * arenaSize.w, tgt.y * arenaSize.h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }, [session.ships, arenaSize]);
  useEffect(() => { drawLines(); }, [drawLines]);

  return (
    <div className="modal-backdrop" style={{ background: 'rgba(0,0,0,0.92)' }}>
      <div className="panel" style={{
        width: '95vw', height: '92vh', display: 'flex', flexDirection: 'column',
        /* slide_16: brushed-metal frame around the entire tactical view */
        background:
          'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, rgba(0,0,0,0.04) 1px 2px),' +
          'linear-gradient(180deg, #8a8a88 0%, #6a6a68 50%, #555553 100%)',
        border: '2px solid #2a2a28',
        boxShadow: 'inset 2px 2px 0 #b8b8b6, inset -2px -2px 0 #353533',
        padding: 8,
      }}>
        <header className="panel-header">
          <span>TACTICAL ENGAGEMENT — Phase: {session.phase.toUpperCase()}</span>
          <div className="row gap-2">
            <span className="small text-dim">Ticks: {session.ticksRemaining}</span>
            {onRetreat && <button onClick={onRetreat} className="text-warning">Retreat</button>}
            <button onClick={onClose}>×</button>
          </div>
        </header>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '200px 1fr 200px', overflow: 'hidden' }}>
          {/* Alliance roster */}
          <aside className="inset" style={{ overflowY: 'auto' }}>
            <h4 style={{ padding: 6, color: shipColor('Alliance') }}>ALLIANCE</h4>
            {allianceShips.map((s) => (
              <div key={s.id} onClick={() => setSelectedShip(s.id)} style={{
                padding: 6, borderBottom: '1px solid var(--chrome-lo)',
                cursor: 'pointer',
                background: selectedShip === s.id ? 'var(--chrome)' : 'transparent',
              }}>
                <div className="small text-bright">{s.name}</div>
                <div className="tiny text-dim">Hull {Math.round(s.hullPct * 100)}% · Shield {Math.round(s.shieldPct * 100)}%</div>
              </div>
            ))}
          </aside>

          {/* slide_16: BLACK starfield viewport (TACTICAL.BACKGROUND BMP
              belongs in the right info panel, not as arena floor). Add
              starfield + battle paused overlay. */}
          <div ref={arenaRef} style={{
            position: 'relative',
            background:
              'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.06) 0 1px, transparent 2px),' +
              'radial-gradient(circle at 70% 60%, rgba(255,255,255,0.06) 0 1px, transparent 2px),' +
              'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.06) 0 1px, transparent 2px),' +
              'radial-gradient(ellipse, #02030a 0%, #000000 100%)',
            overflow: 'hidden',
            border: '2px solid #4a4a48',
            boxShadow: 'inset 2px 2px 0 #1a1a18, inset -2px -2px 0 #6a6a68',
          }}>
            {/* Battle Paused indicator — slide_16/17/18 green text top-left */}
            {session.phase === 'approach' && (
              <div style={{
                position: 'absolute', top: 4, left: 6,
                color: '#80ff80', fontFamily: 'Tahoma, sans-serif',
                fontSize: 12, fontWeight: 'normal',
                textShadow: '0 0 2px rgba(0,0,0,1)',
                pointerEvents: 'none', zIndex: 5,
              }}>Battle Paused</div>
            )}
            <canvas ref={lineCanvas} style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
            }} />
            {session.ships.map((s) => (
              <ShipMarker
                key={s.id}
                ship={s}
                selected={selectedShip === s.id}
                onClick={() => {
                  if (selectedShip != null && selectedShip !== s.id) handleTarget(s.id);
                  else setSelectedShip(s.id);
                }}
              />
            ))}
            <div style={{
              position: 'absolute', bottom: 8, left: 8,
              fontSize: 10, color: 'var(--text-dim)',
              background: 'rgba(0,0,0,0.4)', padding: '3px 6px',
            }}>
              Click own ship → click target to engage
            </div>
          </div>

          {/* slide_16/18: right info panel with TACTICAL.BACKGROUND BMP
              behind enemy roster — gives the 1998 instrument panel look
              (mini-map, gizmo, buttons all baked into BMP 1000). */}
          <aside className="inset" style={{
            overflowY: 'auto',
            position: 'relative',
            background: tacticalChromeBg.ready
              ? `url(${tacticalChromeBg.src}) center/cover no-repeat #2a2a30`
              : '#2a2a30',
          }}>
            <h4 style={{
              padding: 6, color: shipColor('Empire'),
              background: 'rgba(0, 0, 0, 0.55)',
              margin: 0,
              textShadow: '0 0 3px rgba(0, 0, 0, 1)',
            }}>EMPIRE</h4>
            {empireShips.map((s) => (
              <div key={s.id} onClick={() => setSelectedShip(s.id)} style={{
                padding: 6, borderBottom: '1px solid var(--chrome-lo)',
                cursor: 'pointer',
                background: selectedShip === s.id
                  ? 'rgba(220, 95, 58, 0.4)'
                  : 'rgba(0, 0, 0, 0.45)',
                textShadow: '0 0 3px rgba(0, 0, 0, 1)',
              }}>
                <div className="small text-bright">{s.name}</div>
                <div className="tiny text-dim">Hull {Math.round(s.hullPct * 100)}% · Shield {Math.round(s.shieldPct * 100)}%</div>
              </div>
            ))}
          </aside>
        </div>

        {/* HUD bottom: detail + log */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--chrome)', minHeight: 120, maxHeight: 160 }}>
          <div className="inset" style={{ padding: 8 }}>
            {selected ? (
              <>
                <h4 style={{ color: shipColor(selected.faction) }}>{selected.name}</h4>
                <div className="small text-dim">Class {selected.classId} · {selected.faction}</div>
                <div className="small" style={{ marginTop: 6 }}>
                  Hull <strong>{Math.round(selected.hullPct * 100)}%</strong>
                  {' · '}Shield <strong>{Math.round(selected.shieldPct * 100)}%</strong>
                  {' · '}Weapons <strong>{Math.round(selected.weaponPct * 100)}%</strong>
                </div>
                {selected.target && (
                  <div className="small text-warning" style={{ marginTop: 4 }}>
                    Targeting #{selected.target}
                  </div>
                )}
              </>
            ) : (
              <span className="text-dim small">Select a ship to inspect.</span>
            )}
          </div>
          <div className="inset" style={{ padding: 8, overflowY: 'auto' }}>
            <h4>BATTLE LOG</h4>
            {session.log.length === 0 ? (
              <span className="text-dim small">No events yet.</span>
            ) : (
              session.log.slice(-8).map((l, i) => (
                <div key={i} className="tiny" style={{
                  color: l.faction ? shipColor(l.faction) : 'var(--text)',
                  marginTop: 2,
                }}>
                  <span className="text-dim mono">[{l.tick}]</span> {l.text}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
