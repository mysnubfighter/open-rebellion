/**
 * FleetsPanel — native-faithful fleet command panel matching slide_09
 * (Fleet 2 with commander portrait + ship sprites) layout, using the
 * slide_07 np-row pattern for the left list.
 */
import { useEffect, useState } from 'react';
import { PanelShell } from './PanelShell';
import { Engine } from '../../wasm/engine';
import type { StarSystem, Faction, Fleet, Character } from '../../types/game';

interface Props {
  systems: StarSystem[];
  characters: Character[];
  playerFaction: Faction;
  onClose: () => void;
}

export function FleetsPanel({ systems, characters, playerFaction, onClose }: Props) {
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'in-system' | 'transit'>('all');

  useEffect(() => {
    Engine.getFleets().then((f) => {
      setFleets(f);
      const first = f.find((x) => x.faction === playerFaction);
      if (first) setSelectedId(first.id);
    });
  }, [playerFaction]);

  const ownFleets = fleets.filter((f) => f.faction === playerFaction);
  const filtered = ownFleets.filter((f) => {
    if (filter === 'in-system') return f.destinationSystemId == null;
    if (filter === 'transit')   return f.destinationSystemId != null;
    return true;
  });
  const selected = fleets.find((f) => f.id === selectedId);
  const systemName = (id: number) => systems.find((s) => s.id === id)?.name ?? `#${id}`;
  const commander = selected?.commanderCharacterId != null
    ? characters.find((c) => c.id === selected.commanderCharacterId)
    : null;

  return (
    <PanelShell title="Fleet Command" onClose={onClose} width={820}>
      <div className="np-toolbar">
        {(['all', 'in-system', 'transit'] as const).map((f) => (
          <button
            key={f}
            className={`np-tab${filter === f ? ' np-tab--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'in-system' ? 'In System' : 'In Transit'}
          </button>
        ))}
      </div>
      <div className="op-grid">
        <div className="np-list" style={{ overflowY: 'auto', maxHeight: 460 }}>
          {filtered.length === 0 ? (
            <div className="np-empty">No {playerFaction} fleets.</div>
          ) : filtered.map((f) => {
            const isActive = selectedId === f.id;
            const totalShips = f.ships.reduce((sum, s) => sum + s.count, 0);
            return (
              <button
                key={f.id}
                className={`np-row${isActive ? ' np-row--active' : ''}`}
                onClick={() => setSelectedId(f.id)}
              >
                <span className="np-row-kind">[Fleet]</span>
                <span className="np-row-name">{f.name}</span>
                <span className="np-row-pct">{totalShips} ships</span>
                <span className="np-row-days">
                  {f.destinationSystemId != null ? `${f.etaDays}d` : 'docked'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="op-detail">
          {selected ? (
            <>
              <div className="op-name">{selected.name}</div>
              <div className="op-sub">
                Location: {systemName(selected.currentSystemId)}
                {selected.destinationSystemId != null &&
                  ` - En route to ${systemName(selected.destinationSystemId)} (${selected.etaDays}d)`}
              </div>
              {commander && (
                <div className="op-sub">
                  Commander: <strong>{commander.name}</strong> (Leadership {commander.leadership.base})
                </div>
              )}

              <div className="op-skills-title">Composition</div>
              <div className="np-list">
                {selected.ships.map((s) => {
                  const hullPct = Math.round(s.hullPct * 100);
                  return (
                    <div key={s.classId} className="np-row" style={{ cursor: 'default' }}>
                      <span className="np-row-kind">[Ship]</span>
                      <span className="np-row-name">{s.className}</span>
                      <span className="np-row-pct">x{s.count}</span>
                      <span className="np-row-days">{hullPct}%</span>
                      <div className="np-row-bar">
                        <span className="np-row-bar-fill" style={{ width: `${hullPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="op-dispatch-row" style={{ marginTop: 12 }}>
                <button className="op-dispatch-btn">Move</button>
                <button className="op-dispatch-btn">Merge</button>
                <button className="op-dispatch-btn">Disband</button>
              </div>
            </>
          ) : (
            <div className="np-empty">Select a fleet.</div>
          )}
        </div>
      </div>
    </PanelShell>
  );
}
