/**
 * MessageIndexPanel — slides 7 and 10 of the 1998 game.
 * Categorized event log w/ filter buttons across the top.
 * Each row click opens the full MissionReportModal for detail.
 */
import { useState } from 'react';

export type MessageCategory =
  | 'advice' | 'systems' | 'defenses' | 'maintenance'
  | 'manufacturing' | 'fleet' | 'alliance' | 'victory'
  | 'characters' | 'galactic' | 'positioning';

export interface GameMessage {
  id: number;
  category: MessageCategory;
  tick: number;
  title: string;          // 'The System Defenses Window'
  body?: string;
}

const CATEGORY_LABELS: Record<MessageCategory, string> = {
  advice:        'Advice',
  systems:       'Systems',
  defenses:      'Defenses',
  maintenance:   'Maintenance',
  manufacturing: 'Manufacturing',
  fleet:         'Fleet',
  alliance:      'Alliance',
  victory:       'Victory',
  characters:    'Characters',
  galactic:      'Galactic Info',
  positioning:   'Fleet Positioning',
};

const CATEGORY_ORDER: MessageCategory[] = [
  'advice', 'systems', 'defenses', 'maintenance', 'manufacturing',
  'fleet', 'alliance', 'victory', 'characters', 'galactic', 'positioning',
];

// Category BMPs from STRATEGY.DLL — 36×33 icons in resource range
// 10310-10330. Visually selected per category.
const CATEGORY_BMP_ID: Record<MessageCategory, number> = {
  advice:        10310,  // green list icon
  systems:       10319,
  defenses:      10312,  // crossed sabers / red crest
  maintenance:   10322,  // factory/wrench
  manufacturing: 10324,  // ship-yard
  fleet:         10325,  // ship line
  alliance:      10311,  // Mon Mothma / alliance crest
  victory:       10313,
  characters:    10314,
  galactic:      10316,
  positioning:   10325,  // fallback
};

interface Props {
  messages: GameMessage[];
  onClose: () => void;
  onMessageClick?: (msg: GameMessage) => void;
}

export function MessageIndexPanel({ messages, onClose, onMessageClick }: Props) {
  const [activeCat, setActiveCat] = useState<MessageCategory | 'all'>('all');

  const filtered = activeCat === 'all'
    ? messages
    : messages.filter((m) => m.category === activeCat);

  return (
    <div className="panel-shell-backdrop" onClick={onClose}>
      <div
        className="panel-shell message-index-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="message-index-panel__title">
          <span>Message Index</span>
          <button className="message-index-panel__close" onClick={onClose}>×</button>
        </div>

        {/* slide_07: 11 STRATEGY.DLL category icon tabs (36×33 BMPs) in
            a square row below the title bar. */}
        <div className="message-index-panel__filters">
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              className={`message-index-panel__filter ${activeCat === cat ? 'active' : ''}`}
              onClick={() => setActiveCat(cat)}
              title={CATEGORY_LABELS[cat]}
            >
              <img
                src={`/assets/sprites/strategy/${CATEGORY_BMP_ID[cat]}.png`}
                alt={CATEGORY_LABELS[cat]}
                style={{ imageRendering: 'pixelated', maxWidth: '100%', maxHeight: '100%' }}
              />
            </button>
          ))}
        </div>

        {/* slide_07: green sub-header naming the active category */}
        <div className="message-index-panel__subheader">
          {activeCat === 'all' ? 'All Messages' : `${CATEGORY_LABELS[activeCat]} Messages`}
        </div>

        <div className="message-index-panel__list">
          {filtered.length === 0 ? (
            <div className="message-index-panel__empty">
              No messages in this category yet.
            </div>
          ) : (
            filtered.map((msg, i) => (
              <div
                key={msg.id}
                className={`message-index-panel__row ${i === 0 ? 'selected' : ''}`}
                onClick={() => onMessageClick?.(msg)}
              >
                <span className="message-index-panel__row-icon" aria-hidden>i</span>
                <span className="message-index-panel__row-title">{msg.title}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
