/**
 * SystemContextMenu — the right-click popup from slide_05 of the 1998 game.
 * 9 actions: Build Ships, Build Troops, Build Facilities, Galaxy Overview,
 * Objectives, Manage Garrisons, Manage Production, Translate Counterpart,
 * Agent Advice.
 */
import { useEffect, useRef } from 'react';

export type ContextMenuAction =
  | 'build-ships'
  | 'build-troops'
  | 'build-facilities'
  | 'galaxy-overview'
  | 'objectives'
  | 'manage-garrisons'
  | 'manage-production'
  | 'translate-counterpart'
  | 'agent-advice';

interface Props {
  x: number;
  y: number;
  systemId: number | null;
  systemName: string;
  onAction: (action: ContextMenuAction) => void;
  onClose: () => void;
}

const ITEMS: { action: ContextMenuAction; label: string; sep?: boolean }[] = [
  { action: 'build-ships',           label: 'Build Ships' },
  { action: 'build-troops',          label: 'Build Troops' },
  { action: 'build-facilities',      label: 'Build Facilities' },
  { action: 'galaxy-overview',       label: 'Galaxy Overview', sep: true },
  { action: 'objectives',            label: 'Objectives' },
  { action: 'manage-garrisons',      label: 'Manage Garrisons' },
  { action: 'manage-production',     label: 'Manage Production' },
  { action: 'translate-counterpart', label: 'Translate Counterpart', sep: true },
  { action: 'agent-advice',          label: 'Agent Advice' },
];

export function SystemContextMenu({ x, y, systemName: _systemName, onAction, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click + Esc.
  // The deps array is EMPTY so we only register listeners once (mount only),
  // not on every parent re-render. We hold onClose in a ref to avoid stale-
  // closure issues without retriggering the effect when the prop changes.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    // Defer mousedown listener registration past the right-click mouseup
    // that opened us — otherwise the same gesture's bubbled events would
    // close the menu immediately.
    let mounted = true;
    let mousedownAttached = false;
    const handle = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onCloseRef.current();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    const id = setTimeout(() => {
      if (!mounted) return;
      document.addEventListener('mousedown', handle);
      mousedownAttached = true;
    }, 100);
    document.addEventListener('keydown', onKey);
    return () => {
      mounted = false;
      clearTimeout(id);
      if (mousedownAttached) document.removeEventListener('mousedown', handle);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // slide_05: menu opens slightly below + right of the clicked system
  // (anchored to the planet sprite). Adjust to stay in viewport.
  const w = 160, h = 200;
  const adjX = Math.min(Math.max(x + 8, 8), window.innerWidth - w - 8);
  const adjY = Math.min(Math.max(y + 4, 8), window.innerHeight - h - 8);

  return (
    <div
      ref={ref}
      className="system-context-menu"
      style={{
        position: 'fixed',
        left: adjX, top: adjY,
        zIndex: 100,
      }}
      onContextMenu={(e) => { e.preventDefault(); }}
    >
      {/* slide_05: NO title bar. Items only. The first item is highlighted
          by default (1998 menus open with "most recent" command pre-armed).
          Translate Counterpart shows a checkmark when active. */}
      <div className="system-context-menu__items">
        {ITEMS.map((it) => (
          <button
            key={it.action}
            className={`system-context-menu__item${
              it.action === 'translate-counterpart' ? ' system-context-menu__item--checked' : ''
            }`}
            onClick={() => { onAction(it.action); onClose(); }}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
