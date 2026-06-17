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

// Placeholder glyphs until STRATEGY.DLL tab icons are extracted.
// slide_07 tab order matches CATEGORY_ORDER above.
const CATEGORY_GLYPH: Record<MessageCategory, string> = {
  advice:        '★',
  systems:       '◉',
  defenses:      '⚔',
  maintenance:   '⚙',
  manufacturing: '⚒',
  fleet:         '▲',
  alliance:      '✦',
  victory:       '♛',
  characters:    '☻',
  galactic:      '✜',
  positioning:   '⇲',
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

        {/* slide_07: 11 ICON tabs in a tall strip below the title bar.
            We don't have the BMP icons extracted yet so we render single-
            character glyph placeholders (one per category) at the same
            square dimensions as the reference. */}
        <div className="message-index-panel__filters">
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              className={`message-index-panel__filter ${activeCat === cat ? 'active' : ''}`}
              onClick={() => setActiveCat(cat)}
              title={CATEGORY_LABELS[cat]}
            >
              {CATEGORY_GLYPH[cat]}
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
