/**
 * Live panels (Research, Jedi, Loyalty, Encyclopedia, Messages, SaveLoad, Options).
 * Bombardment and DeathStar remain UX stubs pending engine command exports.
 */
import { useEffect, useState } from 'react';
import { PanelShell } from './PanelShell';
import { Engine } from '../../wasm/engine';
import type {
  Character, StarSystem, Faction, WorldState,
  ResearchProject, JediCandidate, LoyaltyRow,
} from '../../types/game';

const Stub = ({ title, onClose, lines, width }: {
  title: string; onClose: () => void; lines: string[]; width?: number;
}) => (
  <PanelShell title={title} onClose={onClose} width={width ?? 640}>
    <div style={{ padding: 20 }}>
      {lines.map((l, i) => (
        <p key={i} className={i === 0 ? 'text-bright' : 'text-dim small'} style={{ marginBottom: 8 }}>
          {l}
        </p>
      ))}
    </div>
  </PanelShell>
);

// ── RESEARCH ────────────────────────────────────────────────
const TREE_COLORS: Record<string, string> = {
  Ship: '#5fa8dc', Troop: '#4ca44a', Facility: '#c8a448',
};

export function ResearchPanel({ onClose, characters }: { onClose: () => void; playerFaction: Faction; characters: Character[] }) {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  useEffect(() => { Engine.getResearch().then(setProjects); }, []);
  const charName = (id: number) => characters.find((c) => c.id === id)?.name ?? `#${id}`;
  return (
    <PanelShell title="RESEARCH & DEVELOPMENT" onClose={onClose} width={720}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {projects.map((p) => (
          <div key={p.tree} className="inset" style={{ padding: 12 }}>
            <h3 style={{ color: TREE_COLORS[p.tree] }}>{p.tree} Tree</h3>
            <div className="small text-dim" style={{ marginTop: 4 }}>Level {p.currentLevel}</div>
            <div style={{ marginTop: 8, height: 8, background: 'var(--bg-deep)', border: '1px solid var(--chrome-lo)' }}>
              <div style={{
                height: '100%', width: `${p.progressPct * 100}%`,
                background: TREE_COLORS[p.tree],
              }} />
            </div>
            <div className="tiny text-dim" style={{ marginTop: 3 }}>{Math.round(p.progressPct * 100)}% to next level</div>
            <h4 style={{ marginTop: 12 }}>Researchers</h4>
            {p.assignedCharacterIds.length === 0 ? (
              <div className="tiny text-dim">No one assigned.</div>
            ) : p.assignedCharacterIds.map((id) => (
              <div key={id} className="small">{charName(id)}</div>
            ))}
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

// ── JEDI ────────────────────────────────────────────────────
const TIER_COLORS: Record<string, string> = {
  None: '#5a5a5a', Aware: '#7a8aaa', Training: '#c8a448', Experienced: '#9050d0',
};

export function JediPanel({ onClose }: { onClose: () => void; characters: Character[]; playerFaction: Faction }) {
  const [jedi, setJedi] = useState<JediCandidate[]>([]);
  useEffect(() => { Engine.getJedi().then(setJedi); }, []);
  return (
    <PanelShell title="JEDI ORDER" onClose={onClose} width={680}>
      {jedi.length === 0 ? (
        <div className="text-dim center" style={{ padding: 30 }}>No Force-sensitives detected.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {jedi.map((j) => (
            <div key={j.characterId} className="inset" style={{ padding: 10 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ color: TIER_COLORS[j.tier] }}>{j.characterName}</h4>
                  <div className="small text-dim">Tier: {j.tier}{j.isTraining && ' · currently in training'}</div>
                </div>
                <button disabled={j.isTraining || j.tier === 'Experienced'}>
                  {j.tier === 'Experienced' ? 'Mastered' : j.isTraining ? 'Training' : 'Begin Training'}
                </button>
              </div>
              <div style={{ marginTop: 6, height: 6, background: 'var(--bg-deep)', border: '1px solid var(--chrome-lo)' }}>
                <div style={{
                  height: '100%', width: `${j.xpPct * 100}%`,
                  background: TIER_COLORS[j.tier],
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

// ── BOMBARDMENT (UX stub — needs engine command exports) ────
export const BombardmentPanel = ({ onClose }: { onClose: () => void }) => (
  <Stub title="ORBITAL BOMBARDMENT" onClose={onClose} lines={[
    'Select fleet → select target system → preview damage forecast → fire.',
    'Costs morale; can flip neutral/contested control.',
    'Requires Engine.bombardSystem() command export (Phase 8b).',
  ]} />
);

// ── DEATH STAR (UX stub) ───────────────────────────────────
export const DeathStarPanel = ({ onClose, playerFaction }: { onClose: () => void; playerFaction: Faction }) => (
  <Stub title="DEATH STAR COMMAND" onClose={onClose} lines={
    playerFaction === 'Empire'
      ? ['Construction progress, superlaser targeting, movement orders.',
         'Requires Engine.getDeathStarState() (Phase 8b).']
      : ['This panel is Empire-only.',
         'You are commanding the Rebellion.']
  } />
);

// ── LOYALTY ─────────────────────────────────────────────────
function riskColor(p: number): string {
  return p > 0.7 ? 'var(--danger)' : p > 0.4 ? 'var(--warning)' : 'var(--success)';
}

export function LoyaltyPanel({ onClose, playerFaction }: { onClose: () => void; systems: StarSystem[]; playerFaction: Faction }) {
  const [rows, setRows] = useState<LoyaltyRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'controlled' | 'contested' | 'enemy'>('all');
  const [activeId, setActiveId] = useState<number | null>(null);
  useEffect(() => { Engine.getLoyalty().then(setRows); }, []);

  const filtered = rows.filter((r) => {
    if (filter === 'controlled') return r.control === playerFaction;
    if (filter === 'contested')  return r.control === 'Contested' || r.control === 'Uncontrolled' || r.control === 'Uprising';
    if (filter === 'enemy')      return r.control !== playerFaction && r.control !== 'Contested' && r.control !== 'Uncontrolled' && r.control !== 'Uprising';
    return true;
  });

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: 'all',        label: 'All Systems' },
    { key: 'controlled', label: 'Controlled' },
    { key: 'contested',  label: 'Contested' },
    { key: 'enemy',      label: 'Enemy' },
  ];

  return (
    <PanelShell title="Galaxy Overview - Loyalty" onClose={onClose} width={760}>
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
      {filtered.length === 0 ? (
        <div className="np-empty">No systems match filter.</div>
      ) : (
        <div className="np-list">
          {filtered.map((r) => {
            const isActive = activeId === r.systemId;
            const uprisingPct = Math.round(r.uprisingRisk * 100);
            const betrayalPct = Math.round(r.betrayalRisk * 100);
            return (
              <button
                key={r.systemId}
                className={`np-row${isActive ? ' np-row--active' : ''}`}
                onClick={() => setActiveId(r.systemId)}
              >
                <span className="np-row-kind">[{r.control}]</span>
                <span className="np-row-name">{r.systemName}</span>
                <span className="np-row-pct">U:{uprisingPct}%</span>
                <span className="np-row-days">B:{betrayalPct}%</span>
                <div className="np-row-bar">
                  <span
                    className="np-row-bar-fill"
                    style={{
                      width: `${Math.max(uprisingPct, betrayalPct)}%`,
                      background: uprisingPct > betrayalPct ? '#FF8030' : '#FF0000',
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </PanelShell>
  );
}

// ── ENCYCLOPEDIA ────────────────────────────────────────────
export function EncyclopediaPanel({ onClose, characters, systems }: { onClose: () => void; characters: Character[]; systems: StarSystem[] }) {
  const [tab, setTab] = useState<'characters' | 'systems'>('characters');
  return (
    <PanelShell title="GALACTIC ENCYCLOPEDIA" onClose={onClose} width={820}>
      <div className="row gap-2" style={{ borderBottom: '1px solid var(--chrome-lo)', marginBottom: 10 }}>
        <button style={{ borderBottom: tab === 'characters' ? '2px solid var(--accent)' : 'none' }}
                onClick={() => setTab('characters')}>Characters ({characters.length})</button>
        <button style={{ borderBottom: tab === 'systems' ? '2px solid var(--accent)' : 'none' }}
                onClick={() => setTab('systems')}>Systems ({systems.length})</button>
      </div>
      <div style={{ maxHeight: 460, overflowY: 'auto' }}>
        {tab === 'characters' ? (
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--chrome)' }}>
                <th style={{ textAlign: 'left', padding: 4 }}>Name</th>
                <th style={{ textAlign: 'left', padding: 4 }}>Faction</th>
                <th style={{ textAlign: 'left', padding: 4 }}>Type</th>
                <th style={{ textAlign: 'right', padding: 4 }}>Combat</th>
                <th style={{ textAlign: 'right', padding: 4 }}>Diplomacy</th>
                <th style={{ textAlign: 'right', padding: 4 }}>Espionage</th>
              </tr>
            </thead>
            <tbody>
              {characters.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--chrome-lo)' }}>
                  <td style={{ padding: 4 }} className="text-bright">{c.name}</td>
                  <td style={{ padding: 4, color: c.faction === 'Alliance' ? '#5fa8dc' : '#dc5f3a' }}>{c.faction}</td>
                  <td style={{ padding: 4 }} className="text-dim">{c.isMajor ? 'Major' : 'Minor'}</td>
                  <td className="mono" style={{ textAlign: 'right', padding: 4 }}>{c.combat.base}</td>
                  <td className="mono" style={{ textAlign: 'right', padding: 4 }}>{c.diplomacy.base}</td>
                  <td className="mono" style={{ textAlign: 'right', padding: 4 }}>{c.espionage.base}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--chrome)' }}>
                <th style={{ textAlign: 'left', padding: 4 }}>System</th>
                <th style={{ textAlign: 'left', padding: 4 }}>Sector</th>
                <th style={{ textAlign: 'left', padding: 4 }}>Control</th>
                <th style={{ textAlign: 'right', padding: 4 }}>Alliance %</th>
                <th style={{ textAlign: 'right', padding: 4 }}>Empire %</th>
              </tr>
            </thead>
            <tbody>
              {systems.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--chrome-lo)' }}>
                  <td style={{ padding: 4 }} className="text-bright">{s.name}</td>
                  <td style={{ padding: 4 }} className="text-dim">{s.sectorId}</td>
                  <td style={{ padding: 4 }}>{s.control}</td>
                  <td className="mono" style={{ textAlign: 'right', padding: 4 }}>{Math.round(s.popularityAlliance * 100)}</td>
                  <td className="mono" style={{ textAlign: 'right', padding: 4 }}>{Math.round(s.popularityEmpire * 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PanelShell>
  );
}

// ── MESSAGE LOG ─────────────────────────────────────────────
export function MessagesPanel({ onClose, world }: { onClose: () => void; world?: WorldState }) {
  // Placeholder events until Engine.getEvents() exists
  const events = [
    { tick: world?.currentDay ?? 0, cat: 'system',   text: 'Game loaded — engine ready.' },
    { tick: (world?.currentDay ?? 0) - 4, cat: 'diplomatic', text: 'Mon Mothma reports favorable conditions on Hoth.' },
    { tick: (world?.currentDay ?? 0) - 8, cat: 'military',   text: 'Imperial fleet detected near Bilbringi.' },
    { tick: (world?.currentDay ?? 0) - 12, cat: 'intel',     text: 'Espionage report: Death Star construction at 60%.' },
  ];
  const colors: Record<string, string> = {
    system: '#cfd4dc', diplomatic: '#5fa8dc', military: '#dc5f3a',
    intel: '#4ca44a', alert: '#d49810',
  };
  return (
    <PanelShell title="MESSAGE LOG" onClose={onClose} width={680}>
      <div style={{ maxHeight: 460, overflowY: 'auto' }}>
        {events.map((e, i) => (
          <div key={i} className="inset" style={{ padding: 6, marginBottom: 4 }}>
            <span className="mono small text-dim">Day {e.tick}</span>
            <span style={{ color: colors[e.cat] ?? 'var(--text)', marginLeft: 8, fontSize: 9, textTransform: 'uppercase' }}>
              [{e.cat}]
            </span>
            <div className="small text-bright" style={{ marginTop: 2 }}>{e.text}</div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

// ── SAVE/LOAD ───────────────────────────────────────────────
interface SaveSlot {
  slot: number;
  day: number;
  saved_at: string;
  size_bytes: number;
}

export function SaveLoadPanel({ onClose, world }: { onClose: () => void; world: WorldState }) {
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  useEffect(() => {
    // Read localStorage save metadata (rebellion-data's WASM save format)
    const found: SaveSlot[] = [];
    for (let i = 0; i < 10; i++) {
      const meta = localStorage.getItem(`rebellion-save-meta-${i}`);
      if (meta) {
        try { found.push({ slot: i, ...JSON.parse(meta) }); } catch {}
      }
    }
    setSlots(found);
  }, []);

  const save = (slot: number) => {
    const meta = {
      day: world.currentDay,
      saved_at: new Date().toISOString(),
      size_bytes: 0,
    };
    localStorage.setItem(`rebellion-save-meta-${slot}`, JSON.stringify(meta));
    setSlots((prev) => {
      const existing = prev.findIndex((s) => s.slot === slot);
      const updated: SaveSlot = { slot, ...meta };
      if (existing >= 0) {
        const copy = [...prev];
        copy[existing] = updated;
        return copy;
      }
      return [...prev, updated].sort((a, b) => a.slot - b.slot);
    });
  };

  return (
    <PanelShell title="SAVE / LOAD" onClose={onClose} width={680}>
      <div style={{ maxHeight: 460, overflowY: 'auto' }}>
        {Array.from({ length: 10 }).map((_, slot) => {
          const s = slots.find((x) => x.slot === slot);
          return (
            <div key={slot} className="inset" style={{
              padding: 8, marginBottom: 4, display: 'flex',
              alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <span className="text-bright">Slot {slot}</span>
                {s ? (
                  <span className="small text-dim" style={{ marginLeft: 12 }}>
                    Day {s.day} · {new Date(s.saved_at).toLocaleString()}
                  </span>
                ) : (
                  <span className="small text-dim" style={{ marginLeft: 12 }}>Empty</span>
                )}
              </div>
              <div className="row gap-2">
                <button onClick={() => save(slot)}>Save</button>
                <button disabled={!s}>Load</button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="small text-dim" style={{ marginTop: 8 }}>
        Real engine state save/load lands in Phase 8b (needs Engine.save_to_slot / load_from_slot exports).
      </div>
    </PanelShell>
  );
}

// ── OPTIONS ─────────────────────────────────────────────────
import { AudioBus } from '../../audio/AudioEngine';

export function OptionsPanel({ onClose }: { onClose: () => void }) {
  const [vol, setVol] = useState(AudioBus.getVolumes());
  const update = (key: keyof typeof vol, v: number) => {
    AudioBus.setVolume(key, v);
    setVol({ ...vol, [key]: v });
  };
  return (
    <PanelShell title="OPTIONS" onClose={onClose} width={520}>
      <h3>Audio</h3>
      <div style={{ marginTop: 10 }}>
        {(['master', 'music', 'sfx', 'voice'] as const).map((key) => (
          <div key={key} style={{ marginBottom: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ textTransform: 'capitalize' }}>{key}</span>
              <span className="small mono text-dim">{Math.round(vol[key] * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.01"
                   value={vol[key]}
                   onChange={(e) => update(key, Number(e.target.value))}
                   style={{ width: '100%' }} />
          </div>
        ))}
      </div>
      <h3 style={{ marginTop: 20 }}>Display</h3>
      <div className="small text-dim" style={{ marginTop: 6 }}>
        UI scale, fullscreen toggle, mod manager — Phase 9.
      </div>
    </PanelShell>
  );
}
