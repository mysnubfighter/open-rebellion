/**
 * OfficersPanel — native-faithful officer roster matching slide_06 layout
 * (Personnel tab: portrait grid + skill bars on right). Uses the slide_07
 * np-row pattern for the left-side list.
 */
import { useState } from 'react';
import { PanelShell } from './PanelShell';
import { Sprite } from '../ui/Sprite';
import { useBmp } from '../../hooks/useBmp';
import type { Character, StarSystem, Faction, MissionKind } from '../../types/game';
import { ALL_MISSION_KINDS } from '../../types/game';

interface Props {
  characters: Character[];
  systems: StarSystem[];
  playerFaction: Faction;
  onClose: () => void;
  onDispatchMission?: (characterId: number, targetSystemId: number, kind: MissionKind) => void;
}

const PORTRAIT_BY_NAME: Record<string, number> = {
  'Emperor Palpatine':  2120,
  'Darth Vader':        2125,
  'Mon Mothma':         2112,
  'Princess Leia':      2113,
  'Leia Organa':        2113,
  'Luke Skywalker':     2114,
  'Han Solo':           2115,
  'Admiral Ackbar':     2116,
  'Wedge Antilles':     2117,
  'Lando Calrissian':   2118,
  'Chewbacca':          2128,
  'Jan Dodonna':        2119,
  'Imperial Espionage Droid': 2126,
};

function portraitId(name: string, fallbackId: number): number {
  return PORTRAIT_BY_NAME[name] ?? (2112 + (fallbackId % 16));
}

function CharacterPortrait({ name, charId }: { name: string; charId: number }) {
  const bmp = useBmp('gokres', portraitId(name, charId));
  if (!bmp.ready) {
    return (
      <div className="op-portrait-placeholder">?</div>
    );
  }
  return (
    <Sprite dll="gokres" id={portraitId(name, charId)} alt="portrait" className="op-portrait" />
  );
}

export function OfficersPanel({ characters, systems, playerFaction, onClose, onDispatchMission }: Props) {
  const own = characters.filter((c) => c.faction === playerFaction);
  const [selectedId, setSelectedId] = useState<number | null>(own[0]?.id ?? null);
  const [filter, setFilter] = useState<'all' | 'major' | 'minor' | 'mission'>('all');
  const selected = characters.find((c) => c.id === selectedId);
  const systemName = (id: number | null) =>
    id == null ? 'In Transit' : (systems.find((s) => s.id === id)?.name ?? `#${id}`);

  const filtered = own.filter((c) => {
    if (filter === 'major')   return c.isMajor;
    if (filter === 'minor')   return !c.isMajor;
    if (filter === 'mission') return c.onMission;
    return true;
  });

  return (
    <PanelShell title="Personnel" onClose={onClose} width={880}>
      <div className="np-toolbar">
        {(['all', 'major', 'minor', 'mission'] as const).map((f) => (
          <button
            key={f}
            className={`np-tab${filter === f ? ' np-tab--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'mission' ? 'On Mission' : (f.charAt(0).toUpperCase() + f.slice(1))}
          </button>
        ))}
      </div>
      <div className="op-grid">
        <div className="np-list" style={{ overflowY: 'auto', maxHeight: 460 }}>
          {filtered.map((c) => {
            const isActive = selectedId === c.id;
            return (
              <button
                key={c.id}
                className={`np-row${isActive ? ' np-row--active' : ''}`}
                onClick={() => setSelectedId(c.id)}
              >
                <span className="np-row-kind">[{c.isMajor ? 'Major' : 'Minor'}]</span>
                <span className="np-row-name">{c.name}</span>
                <span className="np-row-pct">{systemName(c.currentSystemId)}</span>
                <span className="np-row-days">{c.onMission ? 'M' : c.isCaptive ? 'C' : '—'}</span>
              </button>
            );
          })}
        </div>

        <div className="op-detail">
          {selected ? (
            <>
              <div className="op-portrait-row">
                <CharacterPortrait name={selected.name} charId={selected.id} />
                <div className="op-portrait-meta">
                  <div className="op-name">{selected.name}</div>
                  <div className="op-sub">{selected.faction} - {selected.isMajor ? 'Major' : 'Minor'}</div>
                  <div className="op-sub">Location: {systemName(selected.currentSystemId)}</div>
                </div>
              </div>

              <div className="op-skills-title">Skills</div>
              <div className="op-skills">
                {[
                  ['Diplomacy', selected.diplomacy.base],
                  ['Espionage', selected.espionage.base],
                  ['Combat', selected.combat.base],
                  ['Leadership', selected.leadership.base],
                  ['Loyalty', selected.loyalty.base],
                ].map(([label, val]) => {
                  const pct = Math.min(100, (val as number) / 250 * 100);
                  return (
                    <div key={label as string} className="op-skill-row">
                      <span className="op-skill-label">{label}</span>
                      <div className="op-skill-bar">
                        <span className="op-skill-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="op-skill-val">{val}</span>
                    </div>
                  );
                })}
              </div>

              {onDispatchMission && (
                <div className="op-dispatch">
                  <div className="op-skills-title">Dispatch Mission</div>
                  <div className="op-dispatch-row">
                    <select id={`mission-${selected.id}`} className="op-select">
                      {ALL_MISSION_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                    <select id={`target-${selected.id}`} className="op-select">
                      {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button
                      className="op-dispatch-btn"
                      onClick={() => {
                        const kind = (document.getElementById(`mission-${selected.id}`) as HTMLSelectElement).value as MissionKind;
                        const target = Number((document.getElementById(`target-${selected.id}`) as HTMLSelectElement).value);
                        onDispatchMission(selected.id, target, kind);
                      }}
                    >Dispatch</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="np-empty">Select an officer.</div>
          )}
        </div>
      </div>
    </PanelShell>
  );
}
