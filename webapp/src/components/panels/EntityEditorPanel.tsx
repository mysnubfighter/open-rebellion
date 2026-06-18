/**
 * EntityEditorPanel — native dual-pane editor.
 *
 * Faithful implementation of REBEXE's UIPanel_Init_WithGDI_0046a9c0
 * (decompiled/functions/FUN_0046a9c0.c). Per my line-by-line report:
 *
 *   - LEFT inner pane:  STRATEGY.DLL 11100 (259x355, slot 0x32)
 *   - RIGHT inner pane: STRATEGY.DLL 11101 (259x355, slot 0x33)
 *   - Header strip:     STRATEGY.DLL 10801 (Alliance) / 10802 (Empire), 240x17
 *   - Sub-panel A:      11121 (Alliance) / 11123 (Empire), 108x27 @ (8, 65)
 *   - Sub-panel B:      11122 (Alliance) / 11124 (Empire), 108x27 @ (136, 65)
 *   - Tab strobe A:     11103/11104 (Alliance) / 11105/11106 (Empire), 116x33
 *   - Tab strobe B:     11107/11108 (Alliance) / 11109/11110 (Empire), 116x33
 *   - List box:         200x113 @ (35, 62), control id 7, item bmp 10598
 *   - Drag list LEFT:   108x213 @ (8, 93)
 *   - Drag list RIGHT:  108x213 @ (136, 93)
 *   - Toggle A:         11117/11118 (16x16) @ (120, 136), id 0xCA
 *   - Toggle B:         11119/11120 (16x16) @ (120, 221), id 0xCB
 *   - Close strobe:     10108/10109 (14x14) @ (242, 3), id 100
 *   - Help strobe:      10606/10607 (65x18) @ (101, 174), id 0x68
 *   - Faction-choice 3: 10596/10597 (66x33) @ (170, 320), id 0x65
 *   - Faction-choice 2: 10594/10595 (66x33) @ (102, 320), id 0x66
 *   - Faction-choice 1: 10592/10593 (66x33) @ (33,  320), id 0x67
 *   - Character portrait @ centered bottom (around 51, 211), 165x79
 *   - Character name @ (37, 294), color #FFFFFF
 *   - Status text @ (37, 195), label resource 0x8504, color #808080
 *
 * Natural panel dimensions: ~284 wide x 358 tall (matches 259+25 padding).
 * Rendered at INTEGER SCALE so pixel art stays crisp (image-rendering: pixelated).
 */
import { useState } from 'react';
import type { Faction } from '../../types/game';

interface Props {
  faction: Faction;
  entityType?: number;   // 1-26 per UIWnd_MapEntityTypeToPanel table
  characterPortraitId?: number;
  characterName?: string;
  onClose: () => void;
  scale?: number;        // integer scale for crisp pixel rendering
}

// UIWnd_MapEntityTypeToPanel @ 0x0045f660 — maps entity type (1-26) to
// LEFT pane BMP. RIGHT pane is always one higher (entity type N -> 11099+N
// for left pane in this implementation).
const ENTITY_TYPE_TO_BMP = [
  0, // index 0 unused
  11100, 11101, 11102, 11103, 11104, 11105, 11106, 11107, 11108, 11109,
  11110, 11111, 11112, 11113, 11114, 11115, 11116, 11117, 11118, 11119,
  11120, 11121, 11122, 11125,  // entity 24 -> 0x2B75 = 11125 (skips 0x2B73)
  11123, 11124,
];

function leftPaneBmp(entityType: number): number {
  if (entityType < 1 || entityType > 26) return 11100;
  return ENTITY_TYPE_TO_BMP[entityType];
}

const BASE_W = 284;
const BASE_H = 358;

export function EntityEditorPanel({
  faction, entityType = 1, characterPortraitId, characterName,
  onClose, scale = 2,
}: Props) {
  const [activeTab, setActiveTab] = useState<'A' | 'B'>('A');

  const isAlliance = faction === 'Alliance';
  // Faction-conditional BMP ids per FUN_0046a9c0.c
  const headerStripBmp = isAlliance ? 10801 : 10802;     // 240x17
  const subPanelA      = isAlliance ? 11121 : 11123;     // 108x27 @ (8, 65)
  const subPanelB      = isAlliance ? 11122 : 11124;     // 108x27 @ (136, 65)
  const tabA_idle      = isAlliance ? 11103 : 11105;     // 116x33
  const tabA_active    = isAlliance ? 11104 : 11106;     // 116x33
  const tabB_idle      = isAlliance ? 11107 : 11109;     // 116x33
  const tabB_active    = isAlliance ? 11108 : 11110;     // 116x33

  const leftBmp  = leftPaneBmp(entityType);
  const rightBmp = leftBmp === 11125 ? 11125 : leftBmp + 1;

  const bmp = (id: number) => `/assets/panels/strategy/${id}.png`;

  return (
    <div
      className="entity-editor-panel"
      style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
        width: BASE_W, height: BASE_H,
        background: 'transparent',
        imageRendering: 'pixelated',
        zIndex: 200,
      }}
      data-testid="entity-editor-panel"
    >
      {/* Inner pane LEFT (slot 0x32) - per report line 116 */}
      <img
        className="ee-pane-left"
        src={bmp(leftBmp)}
        alt=""
        draggable={false}
        style={{ position: 'absolute', left: 0, top: 0, width: 142, height: 355 }}
        data-testid={`ee-pane-left-${leftBmp}`}
      />
      {/* Inner pane RIGHT (slot 0x33) - per report line 162 */}
      <img
        className="ee-pane-right"
        src={bmp(rightBmp)}
        alt=""
        draggable={false}
        style={{ position: 'absolute', left: 142, top: 0, width: 142, height: 355 }}
        data-testid={`ee-pane-right-${rightBmp}`}
      />

      {/* Header strip (faction-conditional) at top */}
      <img
        className="ee-header"
        src={bmp(headerStripBmp)}
        alt=""
        draggable={false}
        style={{ position: 'absolute', left: 22, top: 0, width: 240, height: 17 }}
      />

      {/* Close strobe @ (242, 3) - 14x14 - control id 100 */}
      <button
        type="button"
        className="ee-close"
        onClick={onClose}
        title="Close"
        style={{
          position: 'absolute', left: 242, top: 3,
          width: 14, height: 14, padding: 0,
          background: `url(${bmp(10108)}) center/contain no-repeat`,
          border: 'none', cursor: 'pointer',
        }}
        data-testid="ee-close"
      />

      {/* Tab control @ (7, 20), 253x33 - 2 tab buttons (116x33 each) */}
      <button
        type="button"
        className="ee-tab ee-tab-a"
        onClick={() => setActiveTab('A')}
        style={{
          position: 'absolute', left: 7, top: 20,
          width: 116, height: 33, padding: 0,
          background: `url(${bmp(activeTab === 'A' ? tabA_active : tabA_idle)}) center/contain no-repeat`,
          border: 'none', cursor: 'pointer',
        }}
        data-testid="ee-tab-a"
      />
      <button
        type="button"
        className="ee-tab ee-tab-b"
        onClick={() => setActiveTab('B')}
        style={{
          position: 'absolute', left: 130, top: 20,
          width: 116, height: 33, padding: 0,
          background: `url(${bmp(activeTab === 'B' ? tabB_active : tabB_idle)}) center/contain no-repeat`,
          border: 'none', cursor: 'pointer',
        }}
        data-testid="ee-tab-b"
      />

      {/* Sub-panel A @ (8, 65), 108x27 - faction-conditional */}
      <img
        className="ee-subpanel-a"
        src={bmp(subPanelA)}
        alt=""
        draggable={false}
        style={{ position: 'absolute', left: 8, top: 65, width: 108, height: 27 }}
      />
      {/* Sub-panel B @ (136, 65), 108x27 */}
      <img
        className="ee-subpanel-b"
        src={bmp(subPanelB)}
        alt=""
        draggable={false}
        style={{ position: 'absolute', left: 136, top: 65, width: 108, height: 27 }}
      />

      {/* List box @ (35, 62), 200x113 - item bmp 10598 */}
      {/* (Inset rectangle; content overlays into 200x113 area) */}
      <div
        className="ee-listbox"
        style={{
          position: 'absolute', left: 35, top: 62,
          width: 200, height: 113,
          pointerEvents: 'none',
        }}
      />

      {/* Help strobe @ (101, 174), 65x18 - control id 0x68 */}
      <button
        type="button"
        className="ee-help"
        title="Help"
        style={{
          position: 'absolute', left: 101, top: 174,
          width: 65, height: 18, padding: 0,
          background: `url(${bmp(10606)}) center/contain no-repeat`,
          border: 'none', cursor: 'pointer',
        }}
        data-testid="ee-help"
      />

      {/* Status text label @ (37, 195), color #808080 */}
      <div
        className="ee-status"
        style={{
          position: 'absolute', left: 37, top: 195,
          color: '#808080',
          fontFamily: 'Tahoma, sans-serif',
          fontSize: 10,
          lineHeight: 1.2,
        }}
      >
        Status
      </div>

      {/* Drag list LEFT @ (8, 93), 108x213 (overlap with sub-panel below) */}
      <div
        className="ee-drag-left"
        style={{
          position: 'absolute', left: 8, top: 93,
          width: 108, height: 213,
          pointerEvents: 'none',
        }}
      />
      {/* Drag list RIGHT @ (136, 93), 108x213 */}
      <div
        className="ee-drag-right"
        style={{
          position: 'absolute', left: 136, top: 93,
          width: 108, height: 213,
          pointerEvents: 'none',
        }}
      />

      {/* Small toggle A @ (120, 136), 16x16 - control id 0xCA */}
      <button
        type="button"
        className="ee-toggle-a"
        title="Toggle A"
        style={{
          position: 'absolute', left: 120, top: 136,
          width: 16, height: 16, padding: 0,
          background: `url(${bmp(11117)}) center/contain no-repeat`,
          border: 'none', cursor: 'pointer',
        }}
        data-testid="ee-toggle-a"
      />
      {/* Small toggle B @ (120, 221), 16x16 - control id 0xCB */}
      <button
        type="button"
        className="ee-toggle-b"
        title="Toggle B"
        style={{
          position: 'absolute', left: 120, top: 221,
          width: 16, height: 16, padding: 0,
          background: `url(${bmp(11119)}) center/contain no-repeat`,
          border: 'none', cursor: 'pointer',
        }}
        data-testid="ee-toggle-b"
      />

      {/* Faction-choice buttons row @ y=320, each 66x33 */}
      <button
        type="button"
        className="ee-fc-1"
        title="Faction choice 1"
        style={{
          position: 'absolute', left: 33, top: 320,
          width: 66, height: 33, padding: 0,
          background: `url(${bmp(10592)}) center/contain no-repeat`,
          border: 'none', cursor: 'pointer',
        }}
        data-testid="ee-fc-1"
      />
      <button
        type="button"
        className="ee-fc-2"
        title="Faction choice 2"
        style={{
          position: 'absolute', left: 102, top: 320,
          width: 66, height: 33, padding: 0,
          background: `url(${bmp(10594)}) center/contain no-repeat`,
          border: 'none', cursor: 'pointer',
        }}
        data-testid="ee-fc-2"
      />
      <button
        type="button"
        className="ee-fc-3"
        title="Faction choice 3"
        style={{
          position: 'absolute', left: 170, top: 320,
          width: 66, height: 33, padding: 0,
          background: `url(${bmp(10596)}) center/contain no-repeat`,
          border: 'none', cursor: 'pointer',
        }}
        data-testid="ee-fc-3"
      />

      {/* Character portrait area @ center-bottom (51-216, 211-290) */}
      {characterPortraitId != null && (
        <img
          className="ee-portrait"
          src={`/assets/sprites/gokres/${characterPortraitId}.png`}
          alt=""
          draggable={false}
          style={{
            position: 'absolute', left: 51, top: 211,
            width: 165, height: 79,
            objectFit: 'contain',
          }}
        />
      )}

      {/* Character name @ (37, 294), color #FFFFFF */}
      {characterName && (
        <div
          className="ee-name"
          style={{
            position: 'absolute', left: 37, top: 294,
            width: 185,
            color: '#FFFFFF',
            fontFamily: 'Tahoma, sans-serif',
            fontSize: 10,
            textAlign: 'center',
          }}
        >
          {characterName}
        </div>
      )}
    </div>
  );
}
