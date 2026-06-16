/**
 * Floating system detail card — matches slide_06 (Coruscant > Personnel pane).
 * Shows the characters currently at the selected system as a 2-column portrait
 * grid. Title bar has the system name + tabs row (Personnel only for now).
 */
import { Sprite } from '../ui/Sprite';
import type { StarSystem, Character } from '../../types/game';

interface Props {
  system: StarSystem;
  characters: Character[];
  onClose: () => void;
}

// GOKRES 2112+ are the 80x80 character portraits. Same mapping as
// OfficersPanel — kept inline because the panel doesn't export it.
function portraitId(charId: number): number {
  const portraitMap: Record<number, number> = {
    0: 2112,
    1: 2113,
    2: 2114,
    3: 2115,
    4: 2113,
    5: 2113,
    6: 2113,
    7: 2113,
    8: 2113,
    9: 2128,
    10: 2113,
  };
  return portraitMap[charId] ?? (2112 + (charId % 16));
}

export function SystemDetailCard({ system, characters, onClose }: Props) {
  const present = characters.filter((c) => c.currentSystemId === system.id);

  return (
    <div className="system-detail-card">
      <div className="sdc-header">
        <div className="sdc-name">{system.name}</div>
        <button className="sdc-close" onClick={onClose} title="Close (Esc)">×</button>
      </div>

      <div className="sdc-tabs">
        <div className="sdc-tab sdc-tab--active">Personnel</div>
      </div>

      {present.length === 0 ? (
        <div className="sdc-empty">No personnel present.</div>
      ) : (
        <div className="sdc-personnel-grid">
          {present.map((c) => (
            <div key={c.id} className="sdc-person">
              <Sprite
                dll="gokres"
                id={portraitId(c.id)}
                alt={c.name}
                className="sdc-person-portrait"
              />
              <div className="sdc-person-name">{c.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
