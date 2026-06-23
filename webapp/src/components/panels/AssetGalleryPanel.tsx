/**
 * AssetGalleryPanel — renders EVERY extracted BMP from every DLL of
 * the original GOG REBEXE install, organized by DLL with status badges.
 *
 * Backed by:
 *   - decompiled/analysis/sprite_full_inventory.csv (line-by-line catalog)
 *   - decompiled/analysis/sprite_function_index.json (BMP -> REBEXE funcs)
 *   - decompiled/analysis/webapp_sprite_usage.json (webapp render status)
 *
 * This panel converts every "completely unused" or "GAP" sprite into a
 * rendered element in open_rebellion. Each tile shows the BMP id, dims,
 * status badge (USED / GAP / WASM_ONLY / UNUSED), and the first REBEXE
 * function that loads it.
 */
import { useMemo, useState } from 'react';
import { PanelShell } from './PanelShell';
import manifestRaw from '../../data/sprite_manifest.json';

interface SpriteEntry {
  id: number;
  w: number;
  h: number;
  cls: string;
  rxRefs: number;
  used: boolean;
  status: 'USED' | 'WASM_ONLY' | 'GAP' | 'UNUSED';
  fn: string | null;
}

interface Manifest {
  totalSprites: number;
  dlls: Record<string, SpriteEntry[]>;
}

const manifest = manifestRaw as Manifest;

const DLL_TO_SUBDIR: Record<string, string> = {
  'ALBRIEF.DLL':  'albrief',
  'ALSPRITE.DLL': 'alsprite',
  'COMMON.DLL':   'common',
  'EMBRIEF.DLL':  'embrief',
  'EMSPRITE.DLL': 'emsprite',
  'GOKRES.DLL':   'gokres',
  'REBDLOG.DLL':  'rebdlog',
  'STRATEGY.DLL': 'strategy',
  'TACTICAL.DLL': 'tactical',
};

type Filter = 'ALL' | 'USED' | 'GAP' | 'WASM_ONLY' | 'UNUSED';

interface Props {
  onClose: () => void;
}

export function AssetGalleryPanel({ onClose }: Props) {
  const [activeDll, setActiveDll] = useState<string>('STRATEGY.DLL');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [selected, setSelected] = useState<SpriteEntry | null>(null);

  const dllList = Object.keys(manifest.dlls).sort();
  const subdir = DLL_TO_SUBDIR[activeDll] ?? activeDll.toLowerCase().replace('.dll', '');

  const sprites = useMemo(() => {
    const list = manifest.dlls[activeDll] ?? [];
    if (filter === 'ALL') return list;
    return list.filter((s) => s.status === filter);
  }, [activeDll, filter]);

  return (
    <PanelShell title="Asset Gallery - every sprite from REBEXE.EXE" onClose={onClose} width={1100}>
      <div className="ag-tabs">
        {dllList.map((dll) => {
          const items = manifest.dlls[dll] ?? [];
          return (
            <button
              key={dll}
              className={`ag-tab${activeDll === dll ? ' ag-tab--active' : ''}`}
              onClick={() => setActiveDll(dll)}
            >
              {dll} ({items.length})
            </button>
          );
        })}
      </div>

      <div className="ag-filter">
        {(['ALL', 'USED', 'GAP', 'WASM_ONLY', 'UNUSED'] as Filter[]).map((f) => {
          const all = manifest.dlls[activeDll] ?? [];
          const n = f === 'ALL' ? all.length : all.filter((s) => s.status === f).length;
          return (
            <button
              key={f}
              className={`ag-flt${filter === f ? ' ag-flt--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f} ({n})
            </button>
          );
        })}
        <span className="ag-status-text">
          Showing {sprites.length} sprites · total catalog {manifest.totalSprites}
        </span>
      </div>

      <div className="ag-grid">
        {sprites.map((s) => (
          <button
            key={s.id}
            className={`ag-tile ag-tile--${s.status.toLowerCase()}`}
            onClick={() => setSelected(s)}
            title={`${activeDll} #${s.id} (${s.w}x${s.h}) - ${s.status} - REBEXE refs: ${s.rxRefs}`}
          >
            <img
              className="ag-img"
              src={`/assets/sprites/${subdir}/${s.id}.png`}
              alt={`${s.id}`}
              loading="lazy"
              draggable={false}
            />
            <span className="ag-id">{s.id}</span>
            <span className={`ag-badge ag-badge--${s.status.toLowerCase()}`}>{s.status}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="ag-detail">
          <div className="ag-detail-row">
            <strong>{activeDll} #{selected.id}</strong>
            <span>{selected.w} × {selected.h} ({selected.cls})</span>
            <span>REBEXE refs: {selected.rxRefs}</span>
            <span>Status: <strong>{selected.status}</strong></span>
            {selected.fn && <span>First fn: <code>{selected.fn}</code></span>}
            <button className="ag-detail-close" onClick={() => setSelected(null)}>×</button>
          </div>
        </div>
      )}
    </PanelShell>
  );
}
