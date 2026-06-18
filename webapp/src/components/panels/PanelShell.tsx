import { useEffect, useState, type ReactNode } from 'react';
import { AudioBus } from '../../audio/AudioEngine';

interface PanelShellProps {
  title: string;
  onClose: () => void;
  width?: number | string;
  children: ReactNode;
  actions?: ReactNode;
}

export function PanelShell({ title, onClose, width = 720, children, actions }: PanelShellProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    AudioBus.playSfx('open');
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const close = () => { AudioBus.playSfx('close'); onClose(); };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
      style={{
        opacity: mounted ? 1 : 0,
        transition: 'opacity 160ms ease-out',
      }}
    >
      <div
        className="panel"
        style={{
          width, maxWidth: '92vw', maxHeight: '86vh',
          display: 'flex', flexDirection: 'column',
          transform: mounted ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.98)',
          transition: 'transform 160ms ease-out',
        }}
      >
        <header className="panel-header">
          <span>{title}</span>
          <div className="row gap-2">
            {actions}
            <button onClick={close} title="Close (Esc)">×</button>
          </div>
        </header>
        <div className="panel-body" style={{ overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
