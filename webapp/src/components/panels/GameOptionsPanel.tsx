/**
 * GameOptionsPanel — composite Save/Sound/Tactical-Display options screen,
 * matches slide 8 of the 1998 game. Replaces the separate SaveLoadPanel +
 * OptionsPanel with a single metal-panel modal.
 */
import { useState } from 'react';

interface SaveSlot {
  id: number;
  name: string;          // empty = unsaved
  thumbnailId?: number;
}

interface Props {
  onClose: () => void;
  onSave?: (slotId: number) => void;
  onLoad?: (slotId: number) => void;
}

export function GameOptionsPanel({ onClose, onSave, onLoad }: Props) {
  const [slots, setSlots] = useState<SaveSlot[]>([
    { id: 0, name: '' }, { id: 1, name: '' }, { id: 2, name: '' },
    { id: 3, name: '' }, { id: 4, name: '' }, { id: 5, name: '' },
  ]);
  const [musicOn, setMusicOn] = useState(true);
  const [musicVol, setMusicVol] = useState(0.75);
  const [sfxVol, setSfxVol] = useState(0.7);
  const [showStarfield, setShowStarfield] = useState(true);
  const [showPlanet, setShowPlanet] = useState(true);
  const [showPyrotechnics, setShowPyrotechnics] = useState(true);
  const [highDetail, setHighDetail] = useState(true);
  const [holocube, setHolocube] = useState(true);

  return (
    <div className="game-options-panel__backdrop" onClick={onClose}>
      <div
        className="game-options-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="game-options-panel__grid">
          {/* LEFT: Saved Games */}
          <div className="gop-section gop-section--saved">
            <div className="gop-section__title">Saved Games</div>
            <div className="gop-section__body">
              {slots.map((slot) => (
                <div key={slot.id} className="gop-saveslot">
                  <button
                    className="gop-saveslot__icon"
                    title="Save"
                    onClick={() => { onSave?.(slot.id); setSlots(s => s.map((sl, i) => i === slot.id ? { ...sl, name: `Slot ${slot.id+1}` } : sl)); }}
                  >💾</button>
                  <div className="gop-saveslot__name">{slot.name || '— empty —'}</div>
                  <button
                    className="gop-saveslot__icon"
                    title="Load"
                    disabled={!slot.name}
                    onClick={() => onLoad?.(slot.id)}
                  >📂</button>
                </div>
              ))}
              <div className="gop-saveslot-footer">
                <span className="gop-thumb">🌍</span>
                <span className="gop-thumb">🌌</span>
                <span className="gop-thumb">⚔️</span>
              </div>
              <div className="gop-version">Version: 0.1.00 (web)</div>
            </div>
          </div>

          {/* TOP-RIGHT: Sound Options */}
          <div className="gop-section gop-section--sound">
            <div className="gop-section__title">Sound Options</div>
            <div className="gop-section__body">
              <button
                className={`gop-toggle ${musicOn ? 'on' : 'off'}`}
                onClick={() => setMusicOn(!musicOn)}
              >
                <span className="gop-toggle__led"></span>
                <span className="gop-toggle__label">Play Music</span>
                <span className="gop-toggle__state">{musicOn ? 'On' : 'Off'}</span>
              </button>

              <div className="gop-slider">
                <span className="gop-slider__icon">🎵</span>
                <input type="range" min={0} max={100} value={musicVol * 100}
                  onChange={(e) => setMusicVol(+e.target.value / 100)}
                />
              </div>
              <div className="gop-slider">
                <span className="gop-slider__icon">🔊</span>
                <input type="range" min={0} max={100} value={sfxVol * 100}
                  onChange={(e) => setSfxVol(+e.target.value / 100)}
                />
              </div>
            </div>
          </div>

          {/* BOTTOM-RIGHT: Tactical Display Options */}
          <div className="gop-section gop-section--tactical">
            <div className="gop-section__title">Tactical Display Options</div>
            <div className="gop-section__body">
              {[
                { id: 'starfield', label: 'Show Starfield', value: showStarfield, set: setShowStarfield },
                { id: 'planet',    label: 'Show Planet',    value: showPlanet,    set: setShowPlanet },
                { id: 'pyro',      label: 'Show Pyrotechnics', value: showPyrotechnics, set: setShowPyrotechnics },
                { id: 'high',      label: 'Use High Detail Models', value: highDetail, set: setHighDetail },
                { id: 'holo',      label: 'Display Holocube', value: holocube, set: setHolocube },
              ].map((toggle) => (
                <button
                  key={toggle.id}
                  className={`gop-toggle ${toggle.value ? 'on' : 'off'}`}
                  onClick={() => toggle.set(!toggle.value)}
                >
                  <span className="gop-toggle__led"></span>
                  <span className="gop-toggle__label">{toggle.label}</span>
                  <span className="gop-toggle__state">{toggle.value ? 'On' : 'Off'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <button className="gop-close" onClick={onClose}>×</button>
      </div>
    </div>
  );
}
