/**
 * Floating system detail card — matches slide_06 (Coruscant > Personnel pane)
 * and slide_09 (Chandrilla > Fleet tab) and slide_12 (Balmorra Personnel).
 *
 * Layout (slide_06 reference, 488×315 monitor crop):
 *   - Green system-name title bar at top
 *   - Tabs row: Personnel | Fleet | Garrisons | Defenses
 *   - 2-column portrait grid below tabs
 *   - FADED planet image as backdrop behind grid
 */
import { useState } from 'react';
import { Sprite } from '../ui/Sprite';
import type { StarSystem, Character } from '../../types/game';

interface Props {
  system: StarSystem;
  characters: Character[];
  onClose: () => void;
}

// slide_06 maps Emperor Palpatine + Imperial Espionage Droid to specific
// portraits. Build by NAME so the right BMP loads regardless of engine
// character ordering. IDs from GOKRES.DLL portrait range 2112-2128.
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

// Canonical planet backdrop for a system (same map as SectorZoomPopup).
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
  const present = characters.filter((c) => c.currentSystemId === system.id);
  const backdropId = PLANET_BACKDROP[system.name];

  return (
    <div className="system-detail-card">
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
          >{t}</div>
        ))}
      </div>

      {/* slide_06: faded planet image as backdrop behind content */}
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
          present.length === 0 ? (
            <div className="sdc-empty">No personnel present.</div>
          ) : (
            <div className="sdc-personnel-grid">
              {present.map((c) => (
                <div key={c.id} className="sdc-person">
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
          )
        )}
        {activeTab === 'Fleet' && (
          <div className="sdc-empty">Fleet view — TBD</div>
        )}
        {activeTab === 'Garrisons' && (
          <div className="sdc-empty">Garrisons — TBD</div>
        )}
        {activeTab === 'Defenses' && (
          <div className="sdc-empty">Defenses — TBD</div>
        )}
      </div>
    </div>
  );
}
