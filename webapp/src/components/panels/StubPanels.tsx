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
    <div className="np-stub">
      {lines.map((l, i) => (
        <div key={i} className={i === 0 ? 'np-stub-head' : 'np-stub-line'}>{l}</div>
      ))}
    </div>
  </PanelShell>
);

// ── RESEARCH ────────────────────────────────────────────────
export function ResearchPanel({ onClose, characters }: { onClose: () => void; playerFaction: Faction; characters: Character[] }) {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => { Engine.getResearch().then(setProjects); }, []);
  const charName = (id: number) => characters.find((c) => c.id === id)?.name ?? `#${id}`;
  return (
    <PanelShell title="Research &amp; Development" onClose={onClose} panelKey="research">
      <div className="np-list">
        {projects.map((p) => {
          const isActive = activeId === p.tree;
          const pct = Math.round(p.progressPct * 100);
          return (
            <div key={p.tree} className="np-system-block">
              <div className="np-system-name">{p.tree} Tree - Level {p.currentLevel}</div>
              <button
                className={`np-row${isActive ? ' np-row--active' : ''}`}
                onClick={() => setActiveId(p.tree)}
              >
                <span className="np-row-kind">[{p.tree}]</span>
                <span className="np-row-name">
                  {p.assignedCharacterIds.length === 0
                    ? 'No researchers assigned'
                    : p.assignedCharacterIds.map(charName).join(', ')}
                </span>
                <span className="np-row-pct">{pct}%</span>
                <span className="np-row-days">L{p.currentLevel}</span>
                <div className="np-row-bar">
                  <span className="np-row-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </PanelShell>
  );
}

// ── JEDI ────────────────────────────────────────────────────
export function JediPanel({ onClose }: { onClose: () => void; characters: Character[]; playerFaction: Faction }) {
  const [jedi, setJedi] = useState<JediCandidate[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  useEffect(() => { Engine.getJedi().then(setJedi); }, []);
  return (
    <PanelShell title="Jedi Order" onClose={onClose} panelKey="jedi">
      {jedi.length === 0 ? (
        <div className="np-empty">No Force-sensitives detected.</div>
      ) : (
        <div className="np-list">
          {jedi.map((j) => {
            const isActive = activeId === j.characterId;
            const pct = Math.round(j.xpPct * 100);
            return (
              <button
                key={j.characterId}
                className={`np-row${isActive ? ' np-row--active' : ''}`}
                onClick={() => setActiveId(j.characterId)}
              >
                <span className="np-row-kind">[{j.tier}]</span>
                <span className="np-row-name">
                  {j.characterName}{j.isTraining ? ' - in training' : ''}
                </span>
                <span className="np-row-pct">{pct}%</span>
                <span className="np-row-days">XP</span>
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
    <PanelShell title="Galaxy Overview - Loyalty" onClose={onClose} panelKey="loyalty">
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

// ── ENCYCLOPEDIA / OBJECTIVES ────────────────────────────────
export function EncyclopediaPanel({ onClose, characters, systems }: { onClose: () => void; characters: Character[]; systems: StarSystem[] }) {
  const [tab, setTab] = useState<'characters' | 'systems'>('characters');
  const [activeId, setActiveId] = useState<string | null>(null);
  return (
    <PanelShell title="Galactic Encyclopedia" onClose={onClose} panelKey="encyclopedia">
      <div className="np-toolbar">
        <button
          className={`np-tab${tab === 'characters' ? ' np-tab--active' : ''}`}
          onClick={() => setTab('characters')}
        >Characters ({characters.length})</button>
        <button
          className={`np-tab${tab === 'systems' ? ' np-tab--active' : ''}`}
          onClick={() => setTab('systems')}
        >Systems ({systems.length})</button>
      </div>
      <div className="np-list" style={{ maxHeight: 460, overflowY: 'auto' }}>
        {tab === 'characters' ? characters.map((c) => {
          const id = `char-${c.id}`;
          const isActive = activeId === id;
          return (
            <button
              key={c.id}
              className={`np-row${isActive ? ' np-row--active' : ''}`}
              onClick={() => setActiveId(id)}
            >
              <span className="np-row-kind">[{c.faction}]</span>
              <span className="np-row-name">{c.name} - {c.isMajor ? 'Major' : 'Minor'}</span>
              <span className="np-row-pct">C:{c.combat.base}</span>
              <span className="np-row-days">D:{c.diplomacy.base}</span>
              <div className="np-row-bar">
                <span className="np-row-bar-fill" style={{ width: `${Math.min(100, c.combat.base / 2)}%` }} />
              </div>
            </button>
          );
        }) : systems.map((s) => {
          const id = `sys-${s.id}`;
          const isActive = activeId === id;
          const a = Math.round(s.popularityAlliance * 100);
          const e = Math.round(s.popularityEmpire * 100);
          return (
            <button
              key={s.id}
              className={`np-row${isActive ? ' np-row--active' : ''}`}
              onClick={() => setActiveId(id)}
            >
              <span className="np-row-kind">[{s.control}]</span>
              <span className="np-row-name">{s.name} (S{s.sectorId})</span>
              <span className="np-row-pct">A:{a}%</span>
              <span className="np-row-days">E:{e}%</span>
              <div className="np-row-bar">
                <span className="np-row-bar-fill" style={{ width: `${Math.max(a, e)}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </PanelShell>
  );
}

// ── MESSAGE LOG ─────────────────────────────────────────────
export function MessagesPanel({ onClose, world }: { onClose: () => void; world?: WorldState }) {
  const [filter, setFilter] = useState<'all' | 'system' | 'diplomatic' | 'military' | 'intel'>('all');
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const events = [
    { tick: world?.currentDay ?? 0, cat: 'system',   text: 'Game loaded - engine ready.' },
    { tick: (world?.currentDay ?? 0) - 4, cat: 'diplomatic', text: 'Mon Mothma reports favorable conditions on Hoth.' },
    { tick: (world?.currentDay ?? 0) - 8, cat: 'military',   text: 'Imperial fleet detected near Bilbringi.' },
    { tick: (world?.currentDay ?? 0) - 12, cat: 'intel',     text: 'Espionage report: Death Star construction at 60%.' },
  ];
  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: 'all',        label: 'All' },
    { key: 'system',     label: 'System' },
    { key: 'diplomatic', label: 'Diplomatic' },
    { key: 'military',   label: 'Military' },
    { key: 'intel',      label: 'Intel' },
  ];
  const filtered = filter === 'all' ? events : events.filter((e) => e.cat === filter);
  return (
    <PanelShell title="Message Index" onClose={onClose} panelKey="messages">
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
      <div className="np-list" style={{ maxHeight: 460, overflowY: 'auto' }}>
        {filtered.map((e, i) => {
          const isActive = activeIdx === i;
          return (
            <button
              key={i}
              className={`np-row${isActive ? ' np-row--active' : ''}`}
              onClick={() => setActiveIdx(i)}
            >
              <span className="np-row-kind">[{e.cat}]</span>
              <span className="np-row-name">{e.text}</span>
              <span className="np-row-pct">D{e.tick}</span>
              <span className="np-row-days">—</span>
            </button>
          );
        })}
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
    <PanelShell title="Saved Games" onClose={onClose} panelKey="saveload">
      <div className="np-list" style={{ maxHeight: 460, overflowY: 'auto' }}>
        {Array.from({ length: 10 }).map((_, slot) => {
          const s = slots.find((x) => x.slot === slot);
          return (
            <div key={slot} className="np-row" style={{ cursor: 'default' }}>
              <span className="np-row-kind">[Slot {slot}]</span>
              <span className="np-row-name">
                {s ? `Day ${s.day} - ${new Date(s.saved_at).toLocaleString()}` : 'Empty'}
              </span>
              <button className="op-dispatch-btn" onClick={() => save(slot)}>Save</button>
              <button
                className="op-dispatch-btn"
                disabled={!s}
                style={{ opacity: s ? 1 : 0.4 }}
              >Load</button>
            </div>
          );
        })}
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
    <PanelShell title="Sound Options" onClose={onClose} panelKey="options">
      <div className="op-skills-title" style={{ marginTop: 0 }}>Audio Levels</div>
      <div className="op-skills">
        {(['master', 'music', 'sfx', 'voice'] as const).map((key) => {
          const pct = Math.round(vol[key] * 100);
          return (
            <div key={key} className="op-skill-row">
              <span className="op-skill-label" style={{ textTransform: 'capitalize' }}>{key}</span>
              <input
                type="range" min="0" max="1" step="0.01"
                value={vol[key]}
                onChange={(e) => update(key, Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <span className="op-skill-val">{pct}%</span>
            </div>
          );
        })}
      </div>
    </PanelShell>
  );
}
