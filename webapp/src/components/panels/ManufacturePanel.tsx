/**
 * ManufacturePanel — native-faithful "Manage Production" panel.
 *
 * Matches slide_07 row pattern (Message Index): cyan list rows + green
 * active row highlight, organized by system. Each item is a clickable
 * row that selects the active production order.
 *
 * Maps to slide_05 right-click context menu item 7 ("Manage Production").
 * 4 cell-element click paths all open this panel per panel_inventory.md.
 */
import { useEffect, useState } from 'react';
import { PanelShell } from './PanelShell';
import { Engine } from '../../wasm/engine';
import type { StarSystem, Faction, ProductionItem } from '../../types/game';

interface Props {
  systems: StarSystem[];
  playerFaction: Faction;
  onClose: () => void;
}

type Filter = 'all' | 'capital' | 'fighter' | 'troop' | 'facility';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'capital',  label: 'Capital Ships' },
  { key: 'fighter',  label: 'Fighters' },
  { key: 'troop',    label: 'Troops' },
  { key: 'facility', label: 'Facilities' },
];

function matchesFilter(it: ProductionItem, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'capital')  return it.kind === 'Capital Ship';
  if (filter === 'fighter')  return it.kind === 'Fighter';
  if (filter === 'troop')    return it.kind === 'Troop';
  if (filter === 'facility') return it.kind === 'Facility';
  return true;
}

export function ManufacturePanel({ systems, playerFaction, onClose }: Props) {
  const [items, setItems] = useState<ProductionItem[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    Engine.getProduction().then(setItems);
  }, []);

  const ownSystemIds = new Set(systems.filter((s) => s.control === playerFaction).map((s) => s.id));
  const filtered = items.filter((i) => ownSystemIds.has(i.systemId) && matchesFilter(i, filter));

  // Group by system, ordered by system name
  const bySystem = new Map<number, ProductionItem[]>();
  for (const i of filtered) {
    if (!bySystem.has(i.systemId)) bySystem.set(i.systemId, []);
    bySystem.get(i.systemId)!.push(i);
  }
  const ordered = Array.from(bySystem.entries()).sort(
    (a, b) => (a[1][0].systemName ?? '').localeCompare(b[1][0].systemName ?? ''),
  );

  return (
    <PanelShell title="Manage Production" onClose={onClose} panelKey="manufacture">
      {/* slide_07: filter buttons across top of panel content area. */}
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
        <div className="np-empty">No active {playerFaction} production.</div>
      ) : (
        <div className="np-list">
          {ordered.map(([sysId, sysItems]) => (
            <div key={sysId} className="np-system-block">
              <div className="np-system-name">{sysItems[0].systemName}</div>
              {sysItems.map((it) => {
                const isActive = activeId === it.id;
                return (
                  <button
                    key={it.id}
                    className={`np-row${isActive ? ' np-row--active' : ''}`}
                    onClick={() => setActiveId(it.id)}
                  >
                    <span className="np-row-kind">[{it.kind}]</span>
                    <span className="np-row-name">{it.name}</span>
                    <span className="np-row-pct">{Math.round(it.progressPct * 100)}%</span>
                    <span className="np-row-days">{it.daysRemaining}d</span>
                    <div className="np-row-bar">
                      <span
                        className="np-row-bar-fill"
                        style={{ width: `${it.progressPct * 100}%` }}
                      />
                    </div>
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
