/**
 * Galaxy map view — renders inside the cockpit monitor area (behind chrome).
 * Visual goal: mimic the 1998 game's galaxy view — dark space with star noise,
 * tinted system icons sized by control state, pannable/zoomable. Sectors are
 * grouped by sectorId so systems in the same sector cluster spatially.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import type { StarSystem, ActiveMission, WorldState } from '../../types/game';

export type GalaxyViewMode = 'control' | 'popularity' | 'missions' | 'fleets';

interface Fleet {
  id: number;
  faction: string;
  currentSystemId: number;
  destinationSystemId?: number | null;
}

interface Props {
  world: WorldState;
  systems: StarSystem[];
  missions: ActiveMission[];
  fleets?: Fleet[];
  selectedSystemId: number | null;
  onSelectSystem: (id: number | null) => void;
  viewMode?: GalaxyViewMode;
  onContextMenuOnSystem?: (systemId: number, screenX: number, screenY: number) => void;
  /** When true, draw sector name labels at cluster centroids. Default
   *  off because slide_01/02 reference does not show these — sector
   *  names appear only inside the sector zoom popup. */
  showSectorLabels?: boolean;
  /** When true, render markers smaller and skip labels for the mini
   *  galaxy view alongside an open sector zoom popup (slide_04). */
  compressed?: boolean;
}

interface Camera { x: number; y: number; zoom: number; }

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4.0;

// REBEXE-authoritative sector names by id (per SECTORSD.DAT).
// Generated from decompiled/analysis/sector_layout.json.
const SECTOR_NAMES: Record<number, string> = {
  20: 'Abrion',     21: 'Atrivis',    22: 'Churba',     23: 'Corellian',
  24: 'Calaron',    25: 'Dolomar',    26: 'Dufilvan',   27: 'Fakir',
  28: 'Farfin',     29: 'Glythe',     30: 'Jospro',     31: 'Kanchen',
  32: 'Mayagil',    33: 'Moddell',    34: 'Orus',       35: 'Quelli',
  36: 'Sesswenna',  37: 'Sluis',      38: 'Sumitra',    39: 'Xappyh',
};

// World aspect is roughly 1.92:1 (X:730, Y:380). Monitor canvas at typical
// 1280-viewport sizes is ~1.52:1, so the auto-fit will pick X as the limiting
// axis and leave slight letterboxing top/bottom — matching slide_02 where the
// spiral's vertical edge has dim space above and below the bright disc. An
// earlier Y_STRETCH=1.5 over-corrected: it flipped the limiting axis to Y,
// which under-filled X and pushed every marker into the left half.
const Y_STRETCH = 1.0;

// System position from engine, or deterministic fallback if not present
function systemPosition(s: StarSystem, idx: number): { x: number; y: number } {
  if (s.x !== undefined && s.y !== undefined && (s.x !== 0 || s.y !== 0)) {
    return { x: s.x, y: s.y * Y_STRETCH };
  }
  const cols = 8;
  const col = idx % cols;
  const row = Math.floor(idx / cols);
  const seed = (s.id * 9301 + 49297) % 233280;
  const jx = ((seed % 100) - 50);
  const jy = (((seed / 100) | 0) % 100 - 50);
  return { x: 120 + col * 110 + jx, y: 100 + row * 110 + jy };
}

function systemColor(s: StarSystem): { fill: string; ring: string } {
  switch (s.control) {
    case 'Alliance':    return { fill: '#5fa8dc', ring: '#a0d4ff' };
    case 'Empire':      return { fill: '#dc5f3a', ring: '#ff9070' };
    case 'Contested':   return { fill: '#d49810', ring: '#ffdc70' };
    case 'Uprising':    return { fill: '#c8c810', ring: '#ffff70' };
    default:            return { fill: '#7a7a8a', ring: '#aaaab0' };
  }
}

// Pre-generated star field for parallax background
function generateStars(width: number, height: number, count: number) {
  const stars: { x: number; y: number; r: number; a: number }[] = [];
  for (let i = 0; i < count; i++) {
    const seed = i * 9301 + 49297;
    stars.push({
      x: (seed * 7) % width,
      y: (seed * 13) % height,
      r: ((seed % 7) === 0) ? 1.5 : (seed % 3 === 0 ? 1 : 0.5),
      a: 0.2 + ((seed % 80) / 100),
    });
  }
  return stars;
}

export function GalaxyMapView({
  world: _world, systems, missions, fleets = [], selectedSystemId, onSelectSystem,
  viewMode = 'control', onContextMenuOnSystem,
  showSectorLabels = false, compressed = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [hoverSystemId, setHoverSystemId] = useState<number | null>(null);
  const [dragging, setDragging] = useState<{ x: number; y: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  // Incremented when async assets (galaxy bg, planet sprites) load so the
  // draw useEffect re-fires with the latest canvasSize + camera closure,
  // not the stale one captured by onload callbacks.
  const [redrawTick, setRedrawTick] = useState(0);

  const positions = useRef<Map<number, { x: number; y: number }>>(new Map());
  useEffect(() => {
    positions.current = new Map(systems.map((s, i) => [s.id, systemPosition(s, i)]));
  }, [systems]);

  // Auto-center the camera so the system bounding box fills the canvas.
  // RE-FITS on every canvas resize until the user has manually panned or
  // zoomed (tracked by hasUserInteracted). Without re-fit, the first run
  // happens with the default 800×600 canvas, then never recomputes when
  // the real canvas (e.g. 974×800) measures in — leaving every marker
  // stuck in the upper-left quadrant of the actual monitor area.
  const hasUserInteracted = useRef(false);
  useEffect(() => {
    if (hasUserInteracted.current) return;
    if (systems.length === 0 || positions.current.size === 0) return;
    const cw = canvasSize.w, ch = canvasSize.h;
    if (cw === 0 || ch === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of positions.current.values()) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    const worldW = (maxX - minX) || 1;
    const worldH = (maxY - minY) || 1;
    // 1998 reference: markers fill the whole monitor edge-to-edge with
    // tight padding. Use 4% margin instead of 10%.
    const padX = cw * 0.04, padY = ch * 0.04;
    const zoom = Math.min((cw - padX * 2) / worldW, (ch - padY * 2) / worldH, 3.0);
    setCamera({
      x: cw / 2 - ((minX + maxX) / 2) * zoom,
      y: ch / 2 - ((minY + maxY) / 2) * zoom,
      zoom,
    });
  }, [systems, canvasSize.w, canvasSize.h]);

  // (legacy starfield generator unused — strategy/10337 supplies the bg)
  void generateStars;

  // Preload the actual game galaxy background sprite (strategy/10337)
  const galaxyBg = useRef<HTMLImageElement | null>(null);
  // Preload planet sprites (strategy/10349 = neutral planet, 10350 = different planet)
  const planetSprites = useRef<{[k: string]: HTMLImageElement}>({});

  useEffect(() => {
    const bg = new Image();
    // strategy/903 = clean galaxy spiral (single spiral on dark starfield).
    // 902 also exists but has a noise/static pattern on the right half.
    bg.src = '/assets/sprites/strategy/903.png';
    galaxyBg.current = bg;
    // IMPORTANT: don't call draw() directly here — `draw` closes over
    // canvasSize at the time of useEffect registration (800×600 default),
    // and never updates.  Instead, trigger a refresh by bumping a counter
    // state, which causes the draw useEffect to re-fire with the latest
    // canvasSize.
    bg.onload = () => setRedrawTick((t) => t + 1);

    for (const id of [10146, 10147, 10148, 10149, 10150, 10151, 10152, 10153,
                       10154, 10155, 10156, 10157, 10158, 10161, 10162, 10163, 10164,
                       10165, 10166, 10167, 10169, 10170, 10180, 10181]) {
      const img = new Image();
      img.src = `/assets/sprites/strategy/${id}.png`;
      planetSprites.current[String(id)] = img;
      img.onload = () => setRedrawTick((t) => t + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = canvasSize;

    // Always clear first to ensure no stale frames
    ctx.fillStyle = '#02030a';
    ctx.fillRect(0, 0, w, h);

    // Add procedural background stars (deterministic so they don't twinkle
    // every frame).  These give the dark space around the spiral some depth
    // when the galaxy backdrop fades to black at the canvas edges.
    const starCount = Math.floor((w * h) / 4500);
    for (let i = 0; i < starCount; i++) {
      const seed = i * 9301 + 49297;
      const x = (seed * 7) % w;
      const y = (seed * 13) % h;
      const r = ((seed % 100) < 10) ? 1.5 : 0.7;
      const a = 0.2 + ((seed % 60) / 100);
      ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
      ctx.fillRect(x, y, r, r);
    }

    // Background: the actual game's spiral galaxy image (strategy/903).
    // 1998 reference shows the spiral tilted ~18° clockwise so its major
    // axis runs upper-left → lower-right.  Apply a rotated cover-fit.
    if (galaxyBg.current && galaxyBg.current.complete) {
      const img = galaxyBg.current;
      // strategy/903 already has ~10° natural tilt baked in.
      // 1998 reference matches without additional rotation.
      const tilt = 0;
      // Rotated AABB cover: scale up so the rotated image still covers w×h.
      const cosT = Math.abs(Math.cos(tilt));
      const sinT = Math.abs(Math.sin(tilt));
      const baseScale = Math.max(w / img.width, h / img.height);
      // 1998 reference fills the entire monitor with the bright spiral
      // arms.  Bump 1.25× past pure cover so the dark periphery is pushed
      // off-screen and the spiral arms reach the canvas edges.
      const scale = baseScale * (cosT + sinT) * 1.25;
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.imageSmoothingEnabled = true;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(tilt);
      ctx.globalAlpha = 0.45;
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Camera transform for world-space
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Optional sector name labels — slide_01/02 reference does NOT show
    // floating sector names on the galaxy view (sector names appear only
    // inside the sector zoom popup). Gated behind showSectorLabels so the
    // default galaxy view stays clean.
    if (showSectorLabels) {
      type Acc = { sx: number; sy: number; minY: number; count: number };
      const byS = new Map<number, Acc>();
      for (const s of systems) {
        const p = positions.current.get(s.id);
        if (!p) continue;
        const a = byS.get(s.sectorId) ?? { sx: 0, sy: 0, minY: Infinity, count: 0 };
        a.sx += p.x; a.sy += p.y; a.count++;
        if (p.y < a.minY) a.minY = p.y;
        byS.set(s.sectorId, a);
      }
      const labelFontPx = Math.max(11, 13 / camera.zoom);
      ctx.font = `bold ${labelFontPx}px "Tahoma", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      for (const [sid, a] of byS) {
        if (a.count < 2) continue;
        const cx = a.sx / a.count;
        const cy = a.minY - 14 / camera.zoom;
        const label = SECTOR_NAMES[sid] ?? `Sector ${sid}`;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillText(label, cx + 1, cy + 1);
        ctx.fillStyle = '#80ff80';
        ctx.fillText(label, cx, cy);
      }
    }
    // Suppress unused warning when labels are off
    void SECTOR_NAMES;

    // Mission destination markers
    for (const m of missions) {
      const to = positions.current.get(m.targetSystemId);
      if (!to) continue;
      ctx.strokeStyle = (m.kind === 'Assassination' || m.kind === 'Sabotage') ? '#dc5f3a' : '#d4d810';
      ctx.lineWidth = 1.5 / camera.zoom;
      ctx.setLineDash([3 / camera.zoom, 3 / camera.zoom]);
      ctx.beginPath();
      ctx.arc(to.x, to.y, 14 / camera.zoom, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // De-duplicate by id (safety in case engine returns dupes)
    const seen = new Set<number>();
    const uniqueSystems = systems.filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });

    // System marker color depends on view mode (original game's view toggles)
    function dotColor(s: StarSystem): string {
      if (viewMode === 'popularity') {
        // Color by which faction has higher popularity
        const diff = s.popularityAlliance - s.popularityEmpire;
        if (diff > 0.15) return '#5fa8dc';      // strongly Alliance
        if (diff > 0.05) return '#90c0e0';      // weakly Alliance
        if (diff < -0.15) return '#dc5f3a';     // strongly Empire
        if (diff < -0.05) return '#e09080';     // weakly Empire
        return '#ffe060';                       // neutral/contested
      }
      if (viewMode === 'missions') {
        const onMission = missions.some(m => m.targetSystemId === s.id);
        return onMission ? '#ffd770' : '#888899';
      }
      // Default: control color
      switch (s.control) {
        case 'Alliance':    return '#5fa8dc';
        case 'Empire':      return '#dc5f3a';
        case 'Contested':   return '#d49810';
        case 'Uprising':    return '#d4d810';
        default:            return '#aaaaaa';
      }
    }

    for (const s of uniqueSystems) {
      const p = positions.current.get(s.id);
      if (!p) continue;
      const isSelected = s.id === selectedSystemId;
      const isHover = s.id === hoverSystemId;

      const color = dotColor(s);
      // armSize is the marker's visual half-width — used downstream by
      // the hover ring + label-offset code regardless of whether the
      // marker itself ended up being a sprite or a procedural cross.
      const armSize = 5 / camera.zoom;

      // Use ACTUAL 1998 game sprites from STRATEGY.DLL. The 1998 reference
      // image shows BIG 8-POINTED CYAN SPARKLES (sprite 10157) all over the
      // galaxy — those are unexplored systems.  Smaller markers indicate
      // explored/owned systems.
      //
      // Sprite content (audited via PIL):
      //   10149 = pure RED + cross           → Empire-controlled
      //   10156 = cyan 4-pointed star        → Alliance-controlled (explored)
      //   10157 = cyan 8-pointed BIG SPARKLE → Unexplored/neutral (1998's signature glyph)
      //   10147 = orange/red mix             → Contested
      //   10152 = green cross                → Uprising
      let spriteId: number;
      if (viewMode === 'popularity') {
        // Slide 2/3 (golden 1998): "Popular Support" view shows
        // green markers for Empire-leaning systems and cyan for
        // Alliance-leaning. The galaxy's faction-control state is
        // de-emphasized; popularity wins. Slide_02 shows mostly green
        // because that game-state was Empire-popular.
        const diff = s.popularityAlliance - s.popularityEmpire;
        if (diff > 0.10) spriteId = 10156;       // Alliance-popular: cyan star
        else if (diff < -0.10) spriteId = 10152;  // Empire-popular: green cross
        else spriteId = 10158;                    // even split: white
      } else if (viewMode === 'missions') {
        // Missions view: show mission destinations + faded other systems
        const onMission = missions.some(m => m.targetSystemId === s.id);
        spriteId = onMission ? 10147 : 10158;     // contested-orange if mission, else white
      } else if (viewMode === 'fleets') {
        // Fleets view: only highlight systems with fleets present
        const hasFleet = fleets.some(f => f.currentSystemId === s.id);
        spriteId = hasFleet ? 10156 : 10158;
      } else {
        // Default = 'control': faction-owned color scheme
        switch (s.control) {
          case 'Alliance':  spriteId = 10156; break;
          case 'Empire':    spriteId = 10149; break;
          case 'Contested': spriteId = 10147; break;
          case 'Uprising':  spriteId = 10152; break;
          default:          spriteId = 10157; break;
        }
      }
      const sprite = planetSprites.current[String(spriteId)];
      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        // 15×15 native size.  Default/Uncontrolled systems use sprite 10157
        // (big 8-pointed sparkle) which deserves more prominence to match
        // the 1998 reference's bright sparkle effect — render those at 1.8×
        // while keeping other markers at 1.4×. In compressed mode (sector
        // zoom open), halve the marker scale so the right-half mini galaxy
        // matches slide_04's smaller sparkles.
        const scaleBase = spriteId === 10157 ? 1.8 : 1.4;
        const scale = compressed ? scaleBase * 0.6 : scaleBase;
        const size = (sprite.naturalWidth * scale) / camera.zoom;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sprite, p.x - size/2, p.y - size/2, size, size);
      } else {
        // Fallback (sprite not loaded yet): procedural cross with halo so
        // the marker is still visible during the first frames.
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.lineWidth = Math.max(2, 3 / camera.zoom);
        ctx.beginPath();
        ctx.moveTo(p.x - armSize, p.y);
        ctx.lineTo(p.x + armSize, p.y);
        ctx.moveTo(p.x, p.y - armSize);
        ctx.lineTo(p.x, p.y + armSize);
        ctx.stroke();
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.5, 2 / camera.zoom);
        ctx.beginPath();
        ctx.moveTo(p.x - armSize, p.y);
        ctx.lineTo(p.x + armSize, p.y);
        ctx.moveTo(p.x, p.y - armSize);
        ctx.lineTo(p.x, p.y + armSize);
        ctx.stroke();
      }

      // Hover ring overlay (white circle)
      if (isHover && !isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1 / camera.zoom;
        ctx.beginPath();
        ctx.arc(p.x, p.y, armSize + 3 / camera.zoom, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Selected: red sniper-style target reticle (matches 1998 reference).
      // Solid red outer ring + bracket corners — unmistakable at any zoom.
      if (isSelected) {
        const r = 22 / camera.zoom;
        const bracket = 9 / camera.zoom;
        // Glowing red outer ring with double stroke
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 60, 60, 0.55)';
        ctx.lineWidth = 6 / camera.zoom;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#ff2020';
        ctx.lineWidth = 2 / camera.zoom;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        // Bracket corners over the ring
        ctx.strokeStyle = '#ff2020';
        ctx.lineWidth = Math.max(2.5, 3 / camera.zoom);
        ctx.lineCap = 'butt';
        // Four corner brackets
        ctx.beginPath();
        // top-left
        ctx.moveTo(p.x - r, p.y - r + bracket);
        ctx.lineTo(p.x - r, p.y - r);
        ctx.lineTo(p.x - r + bracket, p.y - r);
        // top-right
        ctx.moveTo(p.x + r - bracket, p.y - r);
        ctx.lineTo(p.x + r, p.y - r);
        ctx.lineTo(p.x + r, p.y - r + bracket);
        // bottom-left
        ctx.moveTo(p.x - r, p.y + r - bracket);
        ctx.lineTo(p.x - r, p.y + r);
        ctx.lineTo(p.x - r + bracket, p.y + r);
        // bottom-right
        ctx.moveTo(p.x + r - bracket, p.y + r);
        ctx.lineTo(p.x + r, p.y + r);
        ctx.lineTo(p.x + r, p.y + r - bracket);
        ctx.stroke();
        // Tiny inner cross
        ctx.beginPath();
        ctx.moveTo(p.x - 2 / camera.zoom, p.y);
        ctx.lineTo(p.x + 2 / camera.zoom, p.y);
        ctx.moveTo(p.x, p.y - 2 / camera.zoom);
        ctx.lineTo(p.x, p.y + 2 / camera.zoom);
        ctx.stroke();
      }

      // slide_01/02 reference: labels appear ONLY on hovered or selected
      // systems. The earlier `zoom > 1.8` fallback caused every name to
      // show at large viewports, cluttering the galaxy.
      if (isSelected || isHover) {
        const fontSize = 9;
        ctx.font = `${fontSize}px "Liberation Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(0,0,0,0.9)';
        ctx.fillText(s.name, p.x + 1, p.y + armSize + 3);
        ctx.fillStyle = isSelected ? '#ffd770' : (isHover ? '#ffffff' : '#e8e8e8');
        ctx.fillText(s.name, p.x, p.y + armSize + 2);
      }
    }

    // Fleet markers — diamonds at fleet positions. When multiple fleets stack
    // at one system, scatter them around the system in a small cluster (matches
    // the 1998 reference where fleets appear as a "diamond constellation").
    if (viewMode === 'fleets' || viewMode === 'control') {
      // Group fleets by current system
      const fleetsHere = new Map<number, typeof fleets>();
      for (const f of fleets) {
        const list = fleetsHere.get(f.currentSystemId) ?? [];
        list.push(f);
        fleetsHere.set(f.currentSystemId, list);
      }
      for (const [, group] of fleetsHere) {
        const sys0 = group[0];
        const center = positions.current.get(sys0.currentSystemId);
        if (!center) continue;
        // Offset cluster slightly to the upper-right so diamonds don't sit
        // directly under the system marker sparkle.
        const clusterOffset = { x: 14 / camera.zoom, y: -10 / camera.zoom };
        const rOuter = 11 / camera.zoom;
        group.forEach((f, i) => {
          const angle = (i / Math.max(group.length, 1)) * Math.PI * 2 + (sys0.currentSystemId * 0.3);
          const dist = group.length === 1 ? 0 : rOuter;
          const px = center.x + clusterOffset.x + Math.cos(angle) * dist;
          const py = center.y + clusterOffset.y + Math.sin(angle) * dist;
          const color = f.faction === 'Alliance' ? '#80c4ff' : '#ffaa70';
          const r = 7 / camera.zoom;
          const rH = 6 / camera.zoom;
          // Soft glow halo so the diamond reads against the spiral bg
          ctx.save();
          ctx.shadowColor = color;
          ctx.shadowBlur = 8 / camera.zoom;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(px + rH, py);
          ctx.lineTo(px, py - r);
          ctx.lineTo(px - rH, py);
          ctx.lineTo(px, py + r);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          // Crisp dark outline
          ctx.strokeStyle = 'rgba(0,0,0,0.85)';
          ctx.lineWidth = 1.5 / camera.zoom;
          ctx.beginPath();
          ctx.moveTo(px + rH, py);
          ctx.lineTo(px, py - r);
          ctx.lineTo(px - rH, py);
          ctx.lineTo(px, py + r);
          ctx.closePath();
          ctx.stroke();
        });
      }
      for (const f of fleets) {
        const p = positions.current.get(f.currentSystemId);
        if (!p) continue;
        const color = f.faction === 'Alliance' ? '#80c4ff' : '#ffaa70';
        // En-route line
        if (f.destinationSystemId != null) {
          const dest = positions.current.get(f.destinationSystemId);
          if (dest) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1 / camera.zoom;
            ctx.setLineDash([4 / camera.zoom, 4 / camera.zoom]);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(dest.x, dest.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
    }

    ctx.restore();
  }, [systems, missions, selectedSystemId, hoverSystemId, camera, canvasSize, redrawTick, viewMode, fleets, showSectorLabels, compressed]);

  // Resize handler — also uses ResizeObserver to catch the container being
  // measured AFTER mount (which is when cockpit-monitor flex layout settles).
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current;
      const co = containerRef.current;
      if (!c || !co) return;
      const dpr = window.devicePixelRatio || 1;
      const w = co.clientWidth;
      const h = co.clientHeight;
      if (w === 0 || h === 0) return;
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
      const ctx = c.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setCanvasSize({ w, h });
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', resize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => { draw(); }, [draw]);

  const findSystemAt = (mx: number, my: number): number | null => {
    const wx = (mx - camera.x) / camera.zoom;
    const wy = (my - camera.y) / camera.zoom;
    let best: { id: number; d: number } | null = null;
    for (const s of systems) {
      const p = positions.current.get(s.id);
      if (!p) continue;
      const d = Math.hypot(p.x - wx, p.y - wy);
      // Hit radius MUST be in world-coords; markers drawn at sprite size
      // (sprite naturalWidth * 1.4..1.8 / zoom in canvas px) → 22px in
      // screen-px ÷ zoom = world-px hit radius.
      // Generous hit radius (32px screen-space) so clicks near a marker
      // still select it — matches 1998 game's forgiving target box.
      if (d < 32 / camera.zoom && (!best || d < best.d)) best = { id: s.id, d };
    }
    return best?.id ?? null;
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const c = canvasRef.current; if (!c) return;
    const r = c.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    if (dragging) {
      hasUserInteracted.current = true;
      setCamera((cam) => ({ ...cam, x: cam.x + (mx - dragging.x), y: cam.y + (my - dragging.y) }));
      setDragging({ x: mx, y: my });
    } else {
      setHoverSystemId(findSystemAt(mx, my));
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const c = canvasRef.current; if (!c) return;
    const r = c.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    if (e.button === 2) {
      // Right-click: if on a system, fire context menu callback.
      // Otherwise, start panning.
      const id = findSystemAt(mx, my);
      if (id != null && onContextMenuOnSystem) {
        onContextMenuOnSystem(id, e.clientX, e.clientY);
      } else {
        setDragging({ x: mx, y: my });
      }
    } else if (e.button === 1) {
      setDragging({ x: mx, y: my });
    } else if (e.button === 0) {
      const id = findSystemAt(mx, my);
      onSelectSystem(id);
    }
  };
  const onMouseUp = () => setDragging(null);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const c = canvasRef.current; if (!c) return;
    const r = c.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const delta = -Math.sign(e.deltaY) * 0.15;
    hasUserInteracted.current = true;
    setCamera((cam) => {
      const nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cam.zoom * (1 + delta)));
      const s = nz / cam.zoom;
      return { x: mx - (mx - cam.x) * s, y: my - (my - cam.y) * s, zoom: nz };
    });
  };

  // slide_02 reference: GREEN centered header "Popular Support" in
  // Tahoma case, NOT red uppercase. Other view modes follow the same
  // green-on-dark pattern.
  const viewTitle = ({
    control: '',
    popularity: 'Popular Support',
    missions: 'Active Missions',
    fleets: 'Fleet Positions',
  })[viewMode];

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      {viewTitle && (
        <div style={{
          position: 'absolute',
          top: 2, left: '50%', transform: 'translateX(-50%)',
          color: '#80ff80',
          fontFamily: 'Tahoma, sans-serif',
          fontSize: 14,
          fontWeight: 'normal',
          letterSpacing: 0.5,
          textShadow: '0 0 3px rgba(0,0,0,1), 0 0 2px rgba(0,0,0,1)',
          pointerEvents: 'none',
          zIndex: 5,
        }}>{viewTitle}</div>
      )}
      <canvas
        ref={canvasRef}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          display: 'block',
          // Default cursor while idle — left-click selects systems, not pans.
          // 'grabbing' only while a pan drag (right-button) is active so the
          // user gets feedback that they're moving the camera.
          cursor: dragging ? 'grabbing' : 'default',
        }}
      />
    </div>
  );
}
