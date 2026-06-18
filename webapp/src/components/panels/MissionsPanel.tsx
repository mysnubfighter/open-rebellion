/**
 * MissionsPanel — native-faithful active-mission listing using the
 * slide_07 np-row pattern.
 */
import { useState } from 'react';
import { PanelShell } from './PanelShell';
import type { ActiveMission, WorldState } from '../../types/game';

interface Props {
  missions: ActiveMission[];
  world: WorldState;
  onClose: () => void;
}

type Filter = 'all' | 'diplomatic' | 'covert';

const COVERT = new Set(['Espionage', 'Sabotage', 'Assassination', 'Rescue', 'Abduction', 'InciteUprising']);

export function MissionsPanel({ missions, world, onClose }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [activeId, setActiveId] = useState<number | null>(null);

  const filtered = missions.filter((m) => {
    if (filter === 'diplomatic') return m.kind === 'Diplomacy' || m.kind === 'Recruitment';
    if (filter === 'covert')     return COVERT.has(m.kind);
    return true;
  });

  return (
    <PanelShell title="Active Missions" onClose={onClose} width={680}>
      <div className="np-toolbar">
        {(['all', 'diplomatic', 'covert'] as const).map((f) => (
          <button
            key={f}
            className={`np-tab${filter === f ? ' np-tab--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="np-empty">No missions in transit. Dispatch from Personnel.</div>
      ) : (
        <div className="np-list">
          {filtered.map((m) => {
            const isActive = activeId === m.id;
            const pct = Math.round((1 - m.ticksRemaining / m.totalTicks) * 100);
            return (
              <button
                key={m.id}
                className={`np-row${isActive ? ' np-row--active' : ''}`}
                onClick={() => setActiveId(m.id)}
              >
                <span className="np-row-kind">[{m.kind}]</span>
                <span className="np-row-name">
                  {m.characterName} - {m.targetSystemName}
                </span>
                <span className="np-row-pct">{pct}%</span>
                <span className="np-row-days">D{world.currentDay + m.ticksRemaining}</span>
                <div className="np-row-bar">
                  <span className="np-row-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </PanelShell>
  );
}
