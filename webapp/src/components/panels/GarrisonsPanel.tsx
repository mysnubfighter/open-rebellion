/**
 * GarrisonsPanel — native-faithful "Manage Garrisons" panel.
 *
 * Maps to slide_05 right-click context menu item 6. Shows the player's
 * troops + special forces at every controlled planet, with the same
 * slide_07 toolbar + grouped-row layout used by Manage Production.
 */
import { useEffect, useState } from 'react';
import { PanelShell } from './PanelShell';
import { Engine } from '../../wasm/engine';
import type { StarSystem, Faction, PlanetResources } from '../../types/game';

interface Props {
  systems: StarSystem[];
  playerFaction: Faction;
  onClose: () => void;
}

type Filter = 'all' | 'troops' | 'special';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',     label: 'All' },
  { key: 'troops',  label: 'Troops' },
  { key: 'special', label: 'Special Forces' },
];

interface RowItem {
  systemId: number;
  systemName: string;
  kind: 'Troop' | 'Special';
  name: string;
  strengthPct?: number;
  id: string;
}

export function GarrisonsPanel({ systems, playerFaction, onClose }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [resourcesBySystem, setResourcesBySystem] = useState<Map<number, PlanetResources>>(new Map());

  const ownSystems = systems.filter((s) => s.control === playerFaction);

  useEffect(() => {
    let cancelled = false;
    Promise.all(ownSystems.map((s) => Engine.getPlanetResources(s.id).then((r) => [s.id, r] as const)))
      .then((entries) => {
        if (cancelled) return;
        const m = new Map<number, PlanetResources>();
        for (const [sid, r] of entries) { if (r) m.set(sid, r); }
        setResourcesBySystem(m);
      });
    return () => { cancelled = true; };
  }, [ownSystems.length, playerFaction]);

  const rows: RowItem[] = [];
  for (const s of ownSystems) {
    const r = resourcesBySystem.get(s.id);
    if (!r) continue;
    for (const t of r.troopsGarrisoned) {
      if (filter !== 'all' && filter !== 'troops') continue;
      rows.push({
        systemId: s.id,
        systemName: s.name,
        kind: 'Troop',
        name: t.className,
        strengthPct: t.strengthPct,
        id: `troop-${s.id}-${t.className}`,
      });
    }
    for (const sf of r.specialForces) {
      if (filter !== 'all' && filter !== 'special') continue;
      rows.push({
        systemId: s.id,
        systemName: s.name,
        kind: 'Special',
        name: sf.className,
        id: `sf-${s.id}-${sf.className}`,
      });
    }
  }

  const bySystem = new Map<number, RowItem[]>();
  for (const r of rows) {
    if (!bySystem.has(r.systemId)) bySystem.set(r.systemId, []);
    bySystem.get(r.systemId)!.push(r);
  }
  const ordered = Array.from(bySystem.entries()).sort(
    (a, b) => (a[1][0].systemName ?? '').localeCompare(b[1][0].systemName ?? ''),
  );

  return (
    <PanelShell title="Manage Garrisons" onClose={onClose} panelKey="garrisons">
      <div className="np-toolbar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`np-tab${filter === f.key ? ' np-tab--active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {ordered.length === 0 ? (
        <div className="np-empty">No garrison present at {playerFaction} planets.</div>
      ) : (
        <div className="np-list">
          {ordered.map(([sysId, sysRows]) => (
            <div key={sysId} className="np-system-block">
              <div className="np-system-name">{sysRows[0].systemName}</div>
              {sysRows.map((r) => {
                const isActive = activeId === r.id;
                const strength = r.strengthPct !== undefined ? Math.round(r.strengthPct * 100) : null;
                return (
                  <button
                    key={r.id}
                    className={`np-row${isActive ? ' np-row--active' : ''}`}
                    onClick={() => setActiveId(r.id)}
                  >
                    <span className="np-row-kind">[{r.kind}]</span>
                    <span className="np-row-name">{r.name}</span>
                    <span className="np-row-pct">{strength != null ? `${strength}%` : '—'}</span>
                    <span className="np-row-days">{r.kind === 'Special' ? 'SF' : 'TR'}</span>
                    {strength != null && (
                      <div className="np-row-bar">
                        <span className="np-row-bar-fill" style={{ width: `${strength}%` }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
