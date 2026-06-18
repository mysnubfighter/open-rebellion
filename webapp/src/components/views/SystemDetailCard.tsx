/**
 * Floating system detail card — matches slide_06 (Personnel) + slide_09
 * (Fleet) + planet_resources.md categories.
 *
 * 4 tabs (Personnel / Fleet / Garrisons / Defenses) backed by REBEXE-
 * authoritative data through Engine.getPlanetResources(system.id).
 */
import { useEffect, useState } from 'react';
import { Sprite } from '../ui/Sprite';
import type { StarSystem, Character, PlanetResources } from '../../types/game';
import { Engine } from '../../wasm/engine';

interface Props {
  system: StarSystem;
  characters: Character[];
  onClose: () => void;
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

const PLANET_BACKDROP: Record<string, number> = {
  Coruscant: 10212, Hoth: 10219, Tatooine: 10224, Yavin: 10222,
  Endor: 10227, Naboo: 10215, 'Mon Calamari': 10221, Bespin: 10216,
  Dagobah: 10229, Kashyyyk: 10222, Sullust: 10230, Bothawui: 10231,
  Alderaan: 10215, Corellia: 10214, Kuat: 10217, Geonosis: 10224,
  Mustafar: 10228, Ilum: 10219, Balmorra: 10226,
};

type Tab = 'Personnel' | 'Fleet' | 'Garrisons' | 'Defenses';

export function SystemDetailCard({ system, characters, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('Personnel');
  const [resources, setResources] = useState<PlanetResources | null>(null);
  const present = characters.filter((c) => c.currentSystemId === system.id);
  const backdropId = PLANET_BACKDROP[system.name];

  useEffect(() => {
    let cancelled = false;
    Engine.getPlanetResources(system.id).then((r) => {
      if (!cancelled) setResources(r);
    });
    return () => { cancelled = true; };
  }, [system.id]);

  return (
    <div className="system-detail-card" data-testid="system-detail-card">
      <div className="sdc-header">
        <div className="sdc-name">{system.name}</div>
        <button className="sdc-close" onClick={onClose} title="Close (Esc)">×</button>
      </div>

      <div className="sdc-tabs">
        {(['Personnel', 'Fleet', 'Garrisons', 'Defenses'] as Tab[]).map((t) => (
          <div
            key={t}
            className={`sdc-tab${activeTab === t ? ' sdc-tab--active' : ''}`}
            onClick={() => setActiveTab(t)}
            data-testid={`sdc-tab-${t}`}
          >{t}</div>
        ))}
      </div>

      {backdropId && (
        <img
          className="sdc-planet-backdrop"
          src={`/assets/sprites/strategy/${backdropId}.png`}
          alt=""
          draggable={false}
        />
      )}

      <div className="sdc-body">
        {activeTab === 'Personnel' && (
          <PersonnelTab present={present} resources={resources} />
        )}
        {activeTab === 'Fleet' && (
          <FleetTab resources={resources} />
        )}
        {activeTab === 'Garrisons' && (
          <GarrisonsTab resources={resources} />
        )}
        {activeTab === 'Defenses' && (
          <DefensesTab resources={resources} />
        )}
      </div>

      {/* slide_06 / slide_09 native: NO resource summary bar at the bottom.
          The earlier RM/RF/EN/MN strip was my addition — the original game
          shows resource values inside the Personnel/Fleet content area or
          via a separate Galaxy Overview panel, not pinned to the right
          pane. Removed for parity. */}
    </div>
  );
}

function PersonnelTab({ present, resources }: {
  present: Character[]; resources: PlanetResources | null;
}) {
  const seeded = resources?.charactersPresent ?? [];
  const allNames = new Set(present.map((c) => c.name));
  const merged = [
    ...present.map((c) => ({ id: c.id, name: c.name, isMajor: c.isMajor })),
    ...seeded
      .filter((c) => !allNames.has(c.name))
      .map((c) => ({ id: c.characterId, name: c.name, isMajor: c.isMajor })),
  ];
  if (merged.length === 0) return <div className="sdc-empty">No personnel present.</div>;
  return (
    <div className="sdc-personnel-grid" data-testid="personnel-grid">
      {merged.map((c) => (
        <div key={`${c.id}-${c.name}`} className="sdc-person">
          <Sprite
            dll="gokres"
            id={portraitId(c.name, c.id)}
            alt={c.name}
            className="sdc-person-portrait"
          />
          <div className="sdc-person-name">{c.name}</div>
        </div>
      ))}
    </div>
  );
}

function FleetTab({ resources }: { resources: PlanetResources | null }) {
  if (!resources) return <div className="sdc-empty">Loading…</div>;
  const ships = resources.shipsInOrbit;
  if (ships.length === 0) return <div className="sdc-empty">No ships in orbit.</div>;
  return (
    <div className="sdc-list" data-testid="fleet-list">
      {ships.map((s, i) => (
        <div key={`${s.classId}-${i}`} className="sdc-list-row">
          <span className="sdc-list-name">{s.className}</span>
          <span className="sdc-list-stat">Hull {Math.round(s.hullPct * 100)}%</span>
          <span className="sdc-list-stat">Shield {Math.round(s.shieldPct * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

function GarrisonsTab({ resources }: { resources: PlanetResources | null }) {
  if (!resources) return <div className="sdc-empty">Loading…</div>;
  const items = [
    ...resources.troopsGarrisoned.map((t) => ({
      kind: 'Troop', label: t.className, sub: `${Math.round(t.strengthPct * 100)}%`,
    })),
    ...resources.manufacturingFacilities.map((f) => ({
      kind: 'Manufacturing', label: f.className, sub: `${Math.round(f.hpPct * 100)}%`,
    })),
    ...resources.productionFacilities.map((f) => ({
      kind: 'Production', label: f.className, sub: `${Math.round(f.hpPct * 100)}%`,
    })),
  ];
  if (items.length === 0) return <div className="sdc-empty">No garrison present.</div>;
  return (
    <div className="sdc-list" data-testid="garrisons-list">
      {items.map((it, i) => (
        <div key={i} className="sdc-list-row">
          <span className="sdc-list-kind">{it.kind}</span>
          <span className="sdc-list-name">{it.label}</span>
          <span className="sdc-list-stat">{it.sub}</span>
        </div>
      ))}
    </div>
  );
}

function DefensesTab({ resources }: { resources: PlanetResources | null }) {
  if (!resources) return <div className="sdc-empty">Loading…</div>;
  const items = [
    ...resources.defenseFacilities.map((f) => ({
      kind: 'Defense', label: f.className, sub: `${Math.round(f.hpPct * 100)}%`,
    })),
    ...resources.specialForces.map((sf) => ({
      kind: 'Special', label: sf.className, sub: '',
    })),
  ];
  if (items.length === 0) return <div className="sdc-empty">No defenses present.</div>;
  return (
    <div className="sdc-list" data-testid="defenses-list">
      {items.map((it, i) => (
        <div key={i} className="sdc-list-row">
          <span className="sdc-list-kind">{it.kind}</span>
          <span className="sdc-list-name">{it.label}</span>
          {it.sub && <span className="sdc-list-stat">{it.sub}</span>}
        </div>
      ))}
    </div>
  );
}
