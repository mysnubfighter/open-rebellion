import { useEffect, useState } from 'react';
import { useEngine } from './hooks/useEngine';
import { useGroupProfiles } from './hooks/useGroupProfiles';
import { Engine } from './wasm/engine';
import { CockpitFrame, type PanelKey, type GameSpeed } from './components/chrome/CockpitFrame';
import { GalaxyMapView, type GalaxyViewMode } from './components/views/GalaxyMapView';
import { SystemContextMenu, type ContextMenuAction } from './components/ui/SystemContextMenu';
import { MissionReportModal, type MissionReport } from './components/views/MissionReportModal';
import { MessageIndexPanel, type GameMessage } from './components/panels/MessageIndexPanel';
import { GameOptionsPanel } from './components/panels/GameOptionsPanel';
import './styles/context-menu.css';
import './styles/mission-report.css';
import './styles/message-index.css';
import './styles/game-options.css';
import { ViewportLoading } from './components/views/ViewportLoading';
import { TacticalCombatView, type CombatSession } from './components/views/TacticalCombatView';
import { GroundCombatModal, type Regiment } from './components/views/GroundCombatModal';
import { EventScreenOverlay, type GameEvent } from './components/views/EventScreenOverlay';
import { AdvisorWindow, type AdvisorMessage } from './components/views/AdvisorWindow';
import { CutsceneView, type CutsceneKind } from './components/views/CutsceneView';
import { SystemDetailCard } from './components/views/SystemDetailCard';
import { SectorZoomPopup } from './components/views/SectorZoomPopup';
import { AudioBus } from './audio/AudioEngine';
import { OfficersPanel } from './components/panels/OfficersPanel';
import { FleetsPanel } from './components/panels/FleetsPanel';
import { ManufacturePanel } from './components/panels/ManufacturePanel';
import { MissionsPanel } from './components/panels/MissionsPanel';
import { ProfileManager } from './components/ProfileManager';
import { MissionPlanner } from './components/MissionPlanner';
import {
  ResearchPanel, JediPanel, BombardmentPanel, DeathStarPanel,
  LoyaltyPanel, EncyclopediaPanel, MessagesPanel, SaveLoadPanel, OptionsPanel,
} from './components/panels/StubPanels';
import { PanelShell } from './components/panels/PanelShell';
import type { Faction, MissionKind } from './types/game';

export function App() {
  const { ready, error, world, characters, systems, missions, fleets, refresh } = useEngine();
  const { profiles } = useGroupProfiles();

  const [playerFaction] = useState<Faction>('Alliance');
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerSelection, setPlannerSelection] = useState<number[]>([]);
  const [speed, setSpeed] = useState<GameSpeed>('paused');
  const [combat, setCombat] = useState<CombatSession | null>(null);
  const [groundCombat, setGroundCombat] = useState<{
    systemName: string; alliance: Regiment[]; empire: Regiment[]; victor: Faction | 'Draw';
  } | null>(null);
  const [activeEvent, setActiveEvent] = useState<GameEvent | null>(null);
  const [cutscene, setCutscene] = useState<{ kind: CutsceneKind; slug: string } | null>(
    // Play intro on first load
    () => (sessionStorage.getItem('rebellion-intro-played') ? null : { kind: 'intro', slug: '000' }),
  );
  const [advisorQueue, setAdvisorQueue] = useState<AdvisorMessage[]>([]);
  const [galaxyView, setGalaxyView] = useState<GalaxyViewMode>('control');
  // 1998 didn't ship a view-mode picker — toggle via `V` keypress instead of
  // the persistent floating pill at the top of the monitor.
  const [viewPickerVisible, setViewPickerVisible] = useState(false);
  const [zoomPopupClosed, setZoomPopupClosed] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; systemId: number } | null>(null);
  // FIFO queue of mission/battle reports waiting to be shown.
  // Engine emissions push, modal shifts on close.
  // Second selected system for the multi-sector zoom (slide 15).
  // Shift-click any left-rail cell or galaxy marker to set it; ESC clears.
  const [secondSelectedSystemId, setSecondSelectedSystemId] = useState<number | null>(null);
  const [reportQueue, setReportQueue] = useState<MissionReport[]>([]);
  // Persistent message log — feed from engine events; rendered by
  // MessageIndexPanel when activePanel === 'messages'.
  const [messageLog, setMessageLog] = useState<GameMessage[]>([
    { id: 1, category: 'advice', tick: 1, title: 'The System Defenses Window' },
    { id: 2, category: 'maintenance', tick: 1, title: 'Maintenance Funds' },
    { id: 3, category: 'manufacturing', tick: 1, title: 'The Manufacturing and Production Window' },
    { id: 4, category: 'fleet', tick: 1, title: 'The Fleet Window' },
    { id: 5, category: 'alliance', tick: 1, title: 'What We Know About the Rebel Alliance' },
    { id: 6, category: 'victory', tick: 1, title: 'Victory Conditions' },
    { id: 7, category: 'characters', tick: 1, title: 'Emperor Palpatine and Lord Vader' },
    { id: 8, category: 'galactic', tick: 1, title: 'The Galactic Information Display' },
    { id: 9, category: 'positioning', tick: 1, title: 'Positioning Fleets' },
  ]);

  // Auto-advance based on speed
  useEffect(() => {
    if (!ready || speed === 'paused') return;
    const interval = speed === '1x' ? 2000 : speed === '2x' ? 1000 : 500;
    const t = setInterval(() => {
      Engine.advanceDays(1).then(() => refresh()).catch(console.error);
    }, interval);
    return () => clearInterval(t);
  }, [speed, ready, refresh]);

  // Start audio context + load real game music tracks after first interaction
  useEffect(() => {
    let bgAudio: HTMLAudioElement | null = null;
    const onFirstInput = () => {
      AudioBus.start();
      // Play a real game music track from MDATA (extracted to /assets/audio/music/)
      // Alliance gets track 301 (longer), Empire gets 303 (their theme)
      const trackId = playerFaction === 'Alliance' ? 301 : 303;
      bgAudio = new Audio(`/assets/audio/music/track_${trackId}.wav`);
      bgAudio.loop = true;
      bgAudio.volume = 0.35 * AudioBus.getVolumes().master * AudioBus.getVolumes().music;
      bgAudio.play().catch(() => {});
      window.removeEventListener('click', onFirstInput);
      window.removeEventListener('keydown', onFirstInput);
    };
    window.addEventListener('click', onFirstInput);
    window.addEventListener('keydown', onFirstInput);
    return () => {
      window.removeEventListener('click', onFirstInput);
      window.removeEventListener('keydown', onFirstInput);
      if (bgAudio) { bgAudio.pause(); bgAudio.src = ''; }
    };
  }, [playerFaction]);

  // Welcome advisor message after engine ready
  useEffect(() => {
    if (!ready || !world) return;
    setAdvisorQueue([{
      id: 1, priority: 'normal',
      text: `Welcome, Commander. ${world.systemCount} systems mapped. Your forces stand ready.`,
    }]);
  }, [ready, world]);

  // Keyboard shortcuts: Esc to close, Space=pause, 1/2/4=speed
  // Skipped entirely while a cutscene is up — CutsceneView owns those keys
  // (SPACE/ESC dismiss the cutscene; without this guard, App's Space handler
  // would still toggle pause underneath the dismissed intro).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (cutscene) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') {
        if (plannerOpen) setPlannerOpen(false);
        else if (profilesOpen) setProfilesOpen(false);
        else if (activePanel != null) setActivePanel(null);
        else if (secondSelectedSystemId != null) setSecondSelectedSystemId(null);
        else if (selectedSystemId != null) setSelectedSystemId(null);
      }
      if (e.key === ' ') { e.preventDefault(); setSpeed((s) => s === 'paused' ? '1x' : 'paused'); }
      if (e.key === '1') setSpeed('1x');
      if (e.key === '2') setSpeed('2x');
      if (e.key === '4') setSpeed('4x');
      if (e.key === 'v' || e.key === 'V') setViewPickerVisible((v) => !v);
      // 'm' opens the Message Index — there's no right-rail button for it
      // in the 1998 layout; users brought it up via the C-3PO advisor
      // portrait (1998 also had a Messages icon in the chrome). Hotkey for now.
      if (e.key === 'm' || e.key === 'M') {
        setActivePanel((cur) => cur === 'messages' ? null : 'messages');
      }
      // Dev keystroke 'b': open a sample tactical combat session
      // so the user can preview the battle arena.
      if (e.key === 'b') {
        setCombat({
          phase: 'approach',
          ticksRemaining: 120,
          ships: [
            { id: 1, classId: 1,  name: 'Executor',                  faction: 'Empire',   hullPct: 1.0,  shieldPct: 1.0,  weaponPct: 0.8, x: 0.65, y: 0.40 },
            { id: 2, classId: 2,  name: 'Imperial-class Star Destroyer #1', faction: 'Empire', hullPct: 0.95, shieldPct: 0.9,  weaponPct: 1.0, x: 0.72, y: 0.55 },
            { id: 3, classId: 4,  name: 'Strike Cruiser',            faction: 'Empire',   hullPct: 1.0,  shieldPct: 1.0,  weaponPct: 0.6, x: 0.62, y: 0.62 },
            { id: 4, classId: 10, name: 'Mon Calamari Cruiser',      faction: 'Alliance', hullPct: 0.85, shieldPct: 0.85, weaponPct: 0.9, x: 0.30, y: 0.45 },
            { id: 5, classId: 11, name: 'Nebulon-B Frigate',         faction: 'Alliance', hullPct: 1.0,  shieldPct: 1.0,  weaponPct: 1.0, x: 0.22, y: 0.55 },
            { id: 6, classId: 12, name: 'Corellian Corvette',        faction: 'Alliance', hullPct: 0.95, shieldPct: 0.9,  weaponPct: 0.7, x: 0.18, y: 0.65 },
          ],
          log: [
            { tick: 0, text: 'Combat initiated.', faction: 'Alliance' },
            { tick: 1, text: 'Imperial fleet approaches.', faction: 'Empire' },
          ],
        });
      }
      // Dev keystroke 'r': fire a sample mission report so we can verify
      // the modal renders. Remove when engine event wiring lands.
      if (e.key === 'r') {
        setReportQueue((q) => [...q, {
          id: Date.now(),
          title: 'Espionage Mission Report',
          outcomeText: 'The espionage mission to Balfron was successful.',
          bodyText: 'In addition, information was provided on the following systems:\n  - Byss\n\nPersonnel are returning to Tangrene.',
          outcomeColor: 'success',
        }]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [plannerOpen, profilesOpen, activePanel, selectedSystemId, cutscene]);

  if (error) {
    return (
      <div className="cockpit" data-faction="empire">
        <div className="cockpit-viewport">
          <div className="viewport-loading">
            <h1>Engine Error</h1>
            <pre style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</pre>
          </div>
        </div>
      </div>
    );
  }

  if (!ready || !world) {
    return (
      <div className="cockpit" data-faction={playerFaction.toLowerCase()}>
        <div className="cockpit-viewport">
          <ViewportLoading title="STAR WARS" detail="Initializing Rebellion engine…" />
        </div>
      </div>
    );
  }

  const handleDispatchOne = async (charId: number, target: number, kind: MissionKind) => {
    try {
      await Engine.dispatchMission(charId, target, kind);
      await refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDispatch = async (
    assignments: { characterId: number; mission: MissionKind; targetSystemId: number }[],
  ) => {
    for (const a of assignments) {
      try { await Engine.dispatchMission(a.characterId, a.targetSystemId, a.mission); }
      catch (e) { console.error('Dispatch failed', a, e); }
    }
    await refresh();
  };

  const renderPanel = () => {
    switch (activePanel) {
      case 'officers':
        return <OfficersPanel
          characters={characters} systems={systems} playerFaction={playerFaction}
          onClose={() => setActivePanel(null)}
          onDispatchMission={handleDispatchOne}
        />;
      case 'fleets':
        return <FleetsPanel systems={systems} characters={characters} playerFaction={playerFaction} onClose={() => setActivePanel(null)} />;
      case 'manufacture':
        return <ManufacturePanel systems={systems} playerFaction={playerFaction} onClose={() => setActivePanel(null)} />;
      case 'missions':
        return <MissionsPanel missions={missions} world={world} onClose={() => setActivePanel(null)} />;
      case 'research':
        return <ResearchPanel playerFaction={playerFaction} characters={characters} onClose={() => setActivePanel(null)} />;
      case 'jedi':
        return <JediPanel characters={characters} playerFaction={playerFaction} onClose={() => setActivePanel(null)} />;
      case 'bombardment':
        return <BombardmentPanel onClose={() => setActivePanel(null)} />;
      case 'deathstar':
        return <DeathStarPanel playerFaction={playerFaction} onClose={() => setActivePanel(null)} />;
      case 'loyalty':
        return <LoyaltyPanel systems={systems} playerFaction={playerFaction} onClose={() => setActivePanel(null)} />;
      case 'encyclopedia':
        return <EncyclopediaPanel characters={characters} systems={systems} onClose={() => setActivePanel(null)} />;
      case 'messages':
        return (
          <MessageIndexPanel
            messages={messageLog}
            onClose={() => setActivePanel(null)}
            onMessageClick={(msg) => {
              // Push to MissionReportModal queue for full-screen detail view
              setReportQueue((q) => [...q, {
                id: msg.id,
                title: msg.title,
                outcomeText: '',
                bodyText: msg.body ?? `(${msg.category} message — day ${msg.tick})`,
                outcomeColor: 'neutral',
              }]);
            }}
          />
        );
      case 'saveload':
      case 'options':
        // Slide 8: one composite modal w/ Save Games + Sound + Tactical
        return <GameOptionsPanel onClose={() => setActivePanel(null)} />;
      case 'galaxy':
      default:
        return null;
    }
  };

  return (
    <>
      <CockpitFrame
        world={{ ...world, playerFaction }}
        missions={missions}
        systems={systems}
        playerFaction={playerFaction}
        speed={speed}
        onSpeedChange={setSpeed}
        activePanel={activePanel}
        onPanel={(k) => setActivePanel(activePanel === k ? null : k)}
        selectedSystemId={selectedSystemId}
        onSelectSystem={setSelectedSystemId}
        onShiftSelectSystem={(id) => setSecondSelectedSystemId(id)}
      >
        <GalaxyMapView
          world={world}
          systems={systems}
          missions={missions}
          fleets={fleets}
          selectedSystemId={selectedSystemId}
          onSelectSystem={setSelectedSystemId}
          viewMode={galaxyView}
          onContextMenuOnSystem={(sid, x, y) => {
            // Don't change selectedSystemId — that triggers the sector
            // zoom popup which is a separate gesture from right-click.
            setCtxMenu({ x, y, systemId: sid });
          }}
        />
        {/* View-mode picker — 1998 didn't ship a persistent pill; press `V` to
            reveal it.  Hidden by default to match the reference cockpit. */}
        {viewPickerVisible && (
          <div style={{
            position: 'absolute', top: 6, left: 8, zIndex: 6,
            display: 'flex', gap: 3, pointerEvents: 'auto',
          }}>
            {(['control', 'popularity', 'missions', 'fleets'] as GalaxyViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setGalaxyView(m)}
                style={{
                  background: galaxyView === m ? 'rgba(220, 80, 80, 0.85)' : 'rgba(0, 0, 0, 0.6)',
                  color: galaxyView === m ? '#ffffff' : '#a0c0e0',
                  border: '1px solid rgba(120, 200, 255, 0.4)',
                  padding: '2px 6px',
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  boxShadow: galaxyView === m ? '0 0 4px rgba(220, 80, 80, 0.7)' : 'none',
                }}
              >{m}</button>
            ))}
          </div>
        )}

        {/* Sector Zoom Popup (left) + System Detail Card (right) when a system
            is selected. The zoom popup matches the 1998 game's iconic sector
            window with planet sprites + support bars; the detail card holds
            modern stats (fleet/mission counts). Popup closes independently
            (×) so the galaxy reticle stays visible. */}
        {selectedSystemId != null && (() => {
          const sel = systems.find((s) => s.id === selectedSystemId);
          if (!sel) return null;
          return <>
            {!zoomPopupClosed && (
              <SectorZoomPopup
                allSystems={systems}
                selectedSystem={sel}
                onSelectSystem={(id) => { setSelectedSystemId(id); setZoomPopupClosed(false); }}
                onClose={() => setZoomPopupClosed(true)}
              />
            )}
            {/* Multi-sector zoom (slide 15): second popup on the right half. */}
            {secondSelectedSystemId != null && (() => {
              const sel2 = systems.find((s) => s.id === secondSelectedSystemId);
              if (!sel2) return null;
              return (
                <SectorZoomPopup
                  allSystems={systems}
                  selectedSystem={sel2}
                  onSelectSystem={(id) => setSecondSelectedSystemId(id)}
                  onClose={() => setSecondSelectedSystemId(null)}
                  secondary
                />
              );
            })()}
            <SystemDetailCard
              system={sel}
              characters={characters}
              onClose={() => { setSelectedSystemId(null); setZoomPopupClosed(false); }}
            />
          </>;
        })()}
      </CockpitFrame>

      {/* Mission-report modal — slides 11, 13, 14, 23. Shows the head of
          the queue; shifts off on close so the next one (if any) appears. */}
      {reportQueue.length > 0 && (
        <MissionReportModal
          report={reportQueue[0]}
          onClose={() => setReportQueue((q) => q.slice(1))}
        />
      )}

      {/* SystemContextMenu lives at App-root (NOT inside CockpitFrame's
          .cockpit-monitor which clips/overflows). Rendered above panels +
          modals via z-index. */}
      {ctxMenu && (() => {
        const sysName = systems.find((s) => s.id === ctxMenu.systemId)?.name ?? '';
        const handleAction = (action: ContextMenuAction) => {
          switch (action) {
            case 'build-ships':
            case 'build-troops':
            case 'build-facilities':
            case 'manage-production':
              setActivePanel('manufacture');
              break;
            case 'galaxy-overview':
              setSelectedSystemId(null);
              setActivePanel(null);
              break;
            case 'objectives':
              setActivePanel('encyclopedia');
              break;
            case 'manage-garrisons':
              setActivePanel('fleets');
              break;
            case 'translate-counterpart':
              setActivePanel(null);
              break;
            case 'agent-advice':
              setAdvisorQueue((q) => [
                ...q,
                { id: Date.now(), priority: 'normal', text: `Advisor on ${sysName}: support stable, no immediate threats reported.` },
              ]);
              break;
          }
        };
        return (
          <SystemContextMenu
            x={ctxMenu.x}
            y={ctxMenu.y}
            systemId={ctxMenu.systemId}
            systemName={sysName}
            onAction={handleAction}
            onClose={() => setCtxMenu(null)}
          />
        );
      })()}

      {renderPanel()}

      {profilesOpen && (
        <PanelShell title="CHARACTER GROUP PROFILES" onClose={() => setProfilesOpen(false)} width={920}>
          <ProfileManager characters={characters} />
        </PanelShell>
      )}

      {plannerOpen && (
        <MissionPlanner
          selectedCharacterIds={plannerSelection}
          characters={characters}
          systems={systems}
          profiles={profiles}
          onDispatch={handleDispatch}
          onClose={() => setPlannerOpen(false)}
        />
      )}

      {/* Tactical / Ground combat overlays */}
      {combat && (
        <TacticalCombatView
          session={combat}
          onClose={() => setCombat(null)}
          onRetreat={() => setCombat(null)}
        />
      )}
      {groundCombat && (
        <GroundCombatModal
          systemName={groundCombat.systemName}
          alliance={groundCombat.alliance}
          empire={groundCombat.empire}
          victor={groundCombat.victor}
          onClose={() => setGroundCombat(null)}
        />
      )}

      {/* Story event overlays */}
      {activeEvent && (
        <EventScreenOverlay
          event={activeEvent}
          onContinue={() => setActiveEvent(null)}
        />
      )}

      {/* Cutscenes (intro/victory/defeat/story) */}
      {cutscene && (
        <CutsceneView
          kind={cutscene.kind}
          slug={cutscene.slug}
          onFinish={() => {
            if (cutscene.kind === 'intro') sessionStorage.setItem('rebellion-intro-played', '1');
            setCutscene(null);
          }}
        />
      )}

      {/* Persistent advisor — only when a panel is open (free space), not on galaxy view */}
      {!cutscene && activePanel != null && advisorQueue.length > 0 && (
        <AdvisorWindow
          faction={playerFaction}
          queue={advisorQueue}
          onDismiss={(id) => setAdvisorQueue((q) => q.filter((m) => m.id !== id))}
        />
      )}

      {/* Suppress unused warnings (these setters are wired for Phase 8 engine integration) */}
      {plannerSelection.length === -1 && setPlannerSelection.toString()}
      {(setCombat as any) === null && (setGroundCombat as any) === null && (setActiveEvent as any) === null}
    </>
  );
}
