# Webapp Cockpit Parity + Self-Test Harness — Project Plan

**Date:** 2026-06-29
**Project:** `external/open-rebellion/webapp` (React + TS + WASM web reimplementation)
**Reference:** `c:\Users\nate\sw_reb_decompiled\reference\golden_1998_slides\` (24 slides)
**Authoritative source:** `c:\Users\nate\sw_reb_decompiled\decompiled\functions\` (22,600 `FUN_*.c` files from REBEXE.EXE)
**GOG install:** `C:\Program Files (x86)\GOG Galaxy\Games\Star Wars - Rebellion\`

## Goal

Achieve 1998 visual + functional parity for the webapp's cockpit UI by routing every panel chrome through the original REBEXE.EXE BMP that the decompiled function actually loads at runtime, then guarantee regression-free progress with playwright self-test harnesses that click every cell + button.

## Status snapshot

| Metric | Value |
|---|---|
| REBEXE functions decompiled | 22,600 |
| Sprites extracted from DLLs | 2,075 (100% rendered in AssetGalleryPanel) |
| Cockpit bottom-strip buttons functional | 7/7 |
| Speed indicator buttons functional | 4/4 |
| Sector-popup cell elements functional | 8/8 |
| Right-click context menu items functional | 9/9 |
| Self-test PASS rate (cockpit) | 21/21 |
| Self-test PASS rate (sector + context) | 24/24 |
| Native panel BMPs wired (REBEXE-authoritative) | 11 |

## Architecture

### Panel chrome — REBEXE-authoritative mapping

Every webapp panel routes through `webapp/src/data/panel_bmp_map.ts`, which maps a `PanelKey` to the exact BMP id that the corresponding REBEXE function loads. The mapping is verified by reading the decompiled `FUN_*.c` source — not guessed.

Example (`webapp/src/data/panel_bmp_map.ts:32-34`):
```ts
manufacture:  'strategy/10710',  // REBEXE UIPanel_Init_TactMgrView Alliance chrome (470x331)
garrisons:    'strategy/10710',  // same Tact Mgr View chrome
```

Anchored to `FUN_0044f860.c:47-55` (UIPanel_Init_TactMgrView): loads `0x29d6` = 10710 for Alliance, `0x29d7` = 10711 for Empire.

### Panel insets (where content overlays the BMP)

`webapp/src/data/panel_insets.json` holds the pixel-measured inset rectangle for each BMP's native size. Webapp renders the BMP as background and overlays content positioned by percentage-of-BMP-dimensions. CSS uses `object-fit: fill` (not `contain`) so BMP stretches to full panel container.

Currently wired BMPs:
- `common/10100` (generic monitor)
- `common/10101–10103` (production / list)
- `common/20001–20002` (cockpit window / sound options)
- `strategy/10710–10711` (Tact Mgr Alliance / Empire)
- `strategy/11100–11101` (entity editor panes)
- `strategy/11165` (side portrait)
- `strategy/11554–11559` (faction frames)
- `tactical/1000` (tactical combat)
- `rebdlog/10621–10623` (dialog variants)

### Self-test harnesses

Two playwright scripts at `tools/` (in main `sw_reb_decompiled` repo) test the webapp at `http://localhost:4180/`. Both use real Chrome (`channel: 'chrome'`).

**`tools/self_test_loop.mjs`** — 24 checks covering:
- Sector zoom popup open via galaxy click
- 8 cell element clicks (shipyard / training / fighters / defense / loyalty bar / support bar / name / right-click sprite)
- 9 context menu items (Build Ships / Build Troops / Build Facilities / Galaxy Overview / Objectives / Manage Garrisons / Manage Production / Translate Counterpart / Agent Advice)
- Top stat bar (tank / ship / wrench, native green #00FF00)
- Right column empty (no OFF/FLT/MFG buttons — that was a non-native invention)
- C-3PO pedestal hidden + sprite present
- Browser console errors

**`tools/cockpit_button_loop.mjs`** — 21 checks covering:
- 7 cockpit-bottom hotspots (loyalty / fleets / manufacture / officers / missions / research / jedi)
- 4 speed indicators (paused / 1x / 2x / 4x)
- 3 visible stats (tank / ship / wrench)
- 2 hidden stats (pop / day — intentionally `display:none` per slide_01)
- Stat color verification (#00FF00)
- Mini-monitor + droids + chrome overlay

Both write markdown reports at `reference/_selftest_results.md` and `reference/_cockpit_buttons.md`, with per-test screenshots captured to `reference/_selftest/` and `reference/_cockpit_buttons/`.

## Completed work

### Phase 1 — Sprite inventory + 100% coverage (commits `f689597b7` → `401c0b45d`)
- Extracted 2,075 BMPs from 9 DLLs (COMMON, STRATEGY, TACTICAL, REBDLOG, GOKRES, ALSPRITE, EMSPRITE, ALBRIEF, EMBRIEF)
- Built `decompiled/analysis/sprite_full_inventory.csv` (2,075 rows)
- Built `decompiled/analysis/sprite_function_index.json` mapping each sprite to its loading REBEXE function
- Fixed src-ref scanner regex (`\b\d{4,5}\b` was missing IDs 1, 2, 256-264, 512-516, 640, 832, 900-906)
- Achieved 100% coverage: every extracted sprite is visible somewhere in the webapp

### Phase 2 — REBEXE-authoritative panel chrome (submodule commits `82429be` → `dbcba0e`)
- Identified the actual BMP each panel loads by reading decompiled C source
- Sector zoom popup → STRATEGY.DLL 11100 / 10577
- Manage Production / Garrisons → STRATEGY.DLL 10710 / 10711 (NOT common/10101 as initially guessed)
- Entity editor → STRATEGY.DLL 11100/11101 dual-pane (UIPanel_Init_WithGDI_0046a9c0)
- Asset gallery → COMMON.DLL 10103 list chrome
- Fixed BMP `object-fit: contain` letterboxing → `fill`

### Phase 3 — Cockpit chrome polish (submodule commits `f0961d6` → `0adde13`)
- Removed RIGHT_BUTTONS column (10-button OFF/FLT/MFG/... stack was non-native)
- Hid stat-pop + stat-day (native chrome has 3 stat slots, not 5)
- Removed C-3PO artificial pedestal (chrome already has bake-in slot)
- Switched dev server to port 4180
- Wired 7 bottom-strip hotspots over the chrome's baked-in display windows

### Phase 4 — Self-test infrastructure (main repo commits `c0c92e9e0` → `5bdec1e8d`)
- `tools/self_test_loop.mjs`: 24 PASS / 0 FAIL
- `tools/cockpit_button_loop.mjs`: 21 PASS / 0 FAIL
- Both regenerate markdown report + screenshots on every run

## Known parity gaps (from `reference/golden_1998_slides/GOLDEN_SLIDES.md`)

| # | Feature | Priority | Effort |
|---|---|---|---|
| 1 | Tactical combat view (slides 16–22, 24) | HIGHEST | LARGE |
| 2 | Mission report screens (slides 11, 13, 14, 23) | HIGH | MEDIUM |
| 3 | Right-click system context menu (slide 5) | DONE in webapp | — |
| 4 | Message Index modal (slides 7, 10) | MEDIUM-HIGH | MEDIUM |
| 5 | Polished composite Options screen (slide 8) | MEDIUM | MEDIUM |
| 6 | Multi-sector zoom — side-by-side (slide 15) | MEDIUM | SMALL-MEDIUM |
| 7 | Right-half overlay panels (slides 6, 9, 12) | LOW | SMALL |
| 8 | Popular Support green color scheme (slides 2, 3) | LOW | TINY |

## Next steps

### Phase 5 — Extend self-test to visual diff (NOT STARTED)
Current self-tests verify a panel opens; they don't verify visual parity. Extend `cockpit_button_loop.mjs` to:
- Capture each panel screenshot
- Diff against `reference/golden_1998_slides/slide_*.png` using `pixelmatch`
- Report per-region SSIM scores
- Flag deltas above tolerance

This is partially scaffolded — each test already has a `refSlide` field pointing to the corresponding golden slide.

### Phase 6 — Tactical combat view (LARGE)
Slides 16–22, 24 show a 2D tactical battle view that the webapp does not have. Reference:
- Pre-engagement view of planet with battle-paused indicator
- Ship selection → task force info panel
- Fighter group selection → group info panel
- Navigation gizmo (pan/zoom/rotate)
- Bottom mini-icons

REBEXE entry: `UIPanel_Init_TacticalView_*` — needs Ghidra investigation to map state machine.

### Phase 7 — Mission report screens (MEDIUM)
Slides 11, 13, 14, 23 show full-modal cinematic mission/battle outcome screens. Webapp has `MissionReportModal` queue scaffolded but no rendering.

REBEXE entries to investigate:
- Espionage Mission Report
- Incite Uprising Mission Foiled
- Battle outcome at <system> — successfully defended

### Phase 8 — Message Index (MEDIUM)
Slides 7, 10: central message log UI with category filter buttons across top. Webapp has `MessageIndexPanel` skeleton but minimal styling.

## Verification protocol

Per `~/.claude/projects/c--Users-nate-sw-reb-decompiled/memory/feedback_rebexe_rigorous_protocol.md`:

> BEFORE writing UI parity code: locate REBEXE function, disassemble, cross-ref DAT+BMP, write eval doc with caveats, THEN implement.

For each new panel:
1. Find the REBEXE function (`grep -rn "UIPanel_Init" decompiled/functions/`)
2. Read its decompiled C source to identify which BMP it loads
3. Cross-reference BMP id against DLL extraction
4. Document caveats (e.g. "BMP is 470x331, content overlay inset rectangle is (16, 16, 438, 274)")
5. Wire in `panel_bmp_map.ts` + `panel_insets.json`
6. Add to `cockpit_button_loop.mjs` test
7. Run self-test loop

Per `feedback_measure_dont_eyeball.md`: NEVER use `min(720px, 80vw)` CSS guesses. Programmatically measure reference slides with `tools/measure_slide.mjs` + `tools/crop_slide.mjs` + `tools/diff_overlay.mjs`.

## Repository layout

```
sw_reb_decompiled/                          # private monorepo (mysnubfighter/sw_reb_decompiled)
├── decompiled/
│   ├── functions/                          # 22,600 FUN_*.c files
│   └── analysis/                           # sprite inventory + panel catalogs
├── reference/
│   ├── golden_1998_slides/                 # 24 reference screenshots
│   ├── _selftest/                          # self_test_loop output
│   ├── _selftest_results.md
│   ├── _cockpit_buttons/                   # cockpit_button_loop output
│   └── _cockpit_buttons.md
├── tools/
│   ├── self_test_loop.mjs                  # 24 cell + context menu tests
│   ├── cockpit_button_loop.mjs             # 21 cockpit button tests
│   ├── measure_slide.mjs                   # sharp-based reference slide measurement
│   ├── crop_slide.mjs                      # ImageMagick-based slide cropping
│   └── diff_overlay.mjs                    # pixelmatch overlay generation
└── external/
    └── open-rebellion/                     # submodule (mysnubfighter/open-rebellion fork)
        ├── webapp/                         # React + TS + WASM web reimplementation
        │   └── src/
        │       ├── App.tsx                 # panel routing
        │       ├── components/
        │       │   ├── chrome/CockpitFrame.tsx
        │       │   └── panels/             # 19 panel components
        │       ├── data/
        │       │   ├── panel_bmp_map.ts    # PanelKey -> BMP id
        │       │   ├── panel_insets.json   # BMP inset rectangles
        │       │   └── sprite_manifest.json
        │       └── styles/
        │           ├── chrome.css          # cockpit + stat positioning
        │           └── theme.css           # native BMP backgrounds
        └── docs/plans/                     # plan files (this file)
```

## References

- `~/.claude/projects/c--Users-nate-sw-reb-decompiled/memory/` — persistent memory index
- `decompiled/analysis/panel_catalog_original_game.md` — exhaustive BMP scan per DLL
- `reference/golden_1998_slides/GOLDEN_SLIDES.md` — 24-slide parity audit
- `decompiled/analysis/sprite_full_inventory.csv` — all 2,075 extracted BMPs
