/**
 * PanelKey -> native BMP id mapping.
 *
 * Sourced from decompiled/analysis/panel_catalog_original_game.md after
 * exhaustive scan of every BMP in every DLL of the GOG install.
 * "New game should point to the same panel in code as the original game"
 * — that pointer lives here.
 */
import insets from './panel_insets.json';

export type PanelBmpId =
  | 'common/10100' | 'common/10101' | 'common/10102' | 'common/10103'
  | 'common/20001' | 'common/20002'
  | 'strategy/11100' | 'strategy/11101'
  | 'strategy/11165' | 'strategy/11554' | 'strategy/11555' | 'strategy/11556'
  | 'strategy/11557' | 'strategy/11558' | 'strategy/11559'
  | 'tactical/1000'
  | 'rebdlog/10621' | 'rebdlog/10622' | 'rebdlog/10623';

import type { PanelKey } from '../components/chrome/CockpitFrame';

/**
 * Per panel_native_implementation_plan.md — every PanelKey maps to its
 * native BMP id. This is what makes "new game point to same panel as
 * original game" true at the code level.
 */
export const PANEL_BMP_MAP: Record<PanelKey, PanelBmpId> = {
  galaxy:       'common/10100',
  officers:     'common/10103',
  fleets:       'common/10103',
  manufacture:  'common/10101',
  missions:     'common/10103',
  garrisons:    'common/10101',
  research:     'common/10103',
  jedi:         'common/10103',
  bombardment:  'tactical/1000',
  deathstar:    'strategy/11555',
  loyalty:      'common/10103',
  encyclopedia: 'common/10103',
  saveload:     'common/20002',
  messages:     'common/10103',
  options:      'common/20002',
  'galaxy-overview': 'strategy/11556',
  objectives:   'common/10103',
  'entity-editor': 'strategy/11100',  // dual-pane editor uses inner pane BMPs directly
};

export interface PanelInset {
  label: string;
  bmpSize: { w: number; h: number };
  inset: { x: number; y: number; w: number; h: number };
}

export function getInsetFor(bmpId: PanelBmpId): PanelInset {
  const data = (insets as Record<string, unknown>)[bmpId];
  if (!data) throw new Error(`No inset for ${bmpId}`);
  return data as PanelInset;
}

export function bmpUrl(bmpId: PanelBmpId): string {
  return `/assets/panels/${bmpId}.png`;
}
