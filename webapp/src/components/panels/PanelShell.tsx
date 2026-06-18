/**
 * PanelShell — BMP-backed native panel shell.
 *
 * Renders the original game's panel BMP as the chrome (sourced from
 * the GOG install at C:/Program Files (x86)/GOG Galaxy/...) and
 * overlays React content into the BMP's inset rectangle.
 *
 * This is the architecture the original REBEXE.EXE uses: BMP blit +
 * widget overlay. See decompiled/analysis/panel_catalog_original_game.md
 * for the catalog and decompiled/analysis/panel_native_implementation_plan.md
 * for the design.
 *
 * Each PanelKey maps to an exact BMP id via data/panel_bmp_map.ts —
 * "new game points to same panel in code as the original game".
 */
import { useEffect, useState, type ReactNode } from 'react';
import { AudioBus } from '../../audio/AudioEngine';
import {
  PANEL_BMP_MAP, type PanelBmpId, getInsetFor, bmpUrl,
} from '../../data/panel_bmp_map';
import type { PanelKey } from '../chrome/CockpitFrame';

interface PanelShellProps {
  /** Title shown above the BMP (matches slide_07 label band). */
  title: string;
  onClose: () => void;
  /** Webapp panel key — used to look up the native BMP. */
  panelKey?: PanelKey;
  /** Optional explicit BMP override (e.g. dialog variants). */
  bmpId?: PanelBmpId;
  /** Legacy width prop — ignored, BMP dictates the size. */
  width?: number | string;
  children: ReactNode;
  actions?: ReactNode;
}

export function PanelShell({ title, onClose, panelKey, bmpId, children, actions }: PanelShellProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    AudioBus.playSfx('open');
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const close = () => { AudioBus.playSfx('close'); onClose(); };

  // Resolve the native BMP for this panel.
  const resolvedBmp: PanelBmpId | undefined = bmpId ?? (panelKey ? PANEL_BMP_MAP[panelKey] : undefined);
  const insetMeta = resolvedBmp ? getInsetFor(resolvedBmp) : undefined;

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
        className="panel panel-native"
        style={{
          transform: mounted ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.98)',
          transition: 'transform 160ms ease-out',
        }}
      >
        {resolvedBmp && insetMeta ? (
          <>
            <img
              className="panel-native-bg"
              src={bmpUrl(resolvedBmp)}
              alt=""
              draggable={false}
            />
            <div className="panel-native-titlebar">
              <span className="panel-native-title">{title}</span>
              <div className="panel-native-actions">
                {actions}
                <button className="panel-native-close" onClick={close} title="Close (Esc)">×</button>
              </div>
            </div>
            <div
              className="panel-native-content"
              style={{
                /* BMP-relative inset percentages — content overlays into
                   the dark area inside the chrome. */
                left:   `${(insetMeta.inset.x / insetMeta.bmpSize.w) * 100}%`,
                top:    `${(insetMeta.inset.y / insetMeta.bmpSize.h) * 100}%`,
                width:  `${(insetMeta.inset.w / insetMeta.bmpSize.w) * 100}%`,
                height: `${(insetMeta.inset.h / insetMeta.bmpSize.h) * 100}%`,
              }}
            >
              {children}
            </div>
          </>
        ) : (
          /* Fallback if no BMP mapped — bare title + content. */
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
