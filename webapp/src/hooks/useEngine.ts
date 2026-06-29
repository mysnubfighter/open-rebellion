import { useCallback, useEffect, useState } from 'react';
import { Engine } from '../wasm/engine';
import type { Character, StarSystem, ActiveMission, WorldState, Fleet } from '../types/game';

/**
 * Top-level engine state hook. Loads the WASM engine on mount and exposes
 * world state with a refresh function. Components can call refresh after
 * any mutation (dispatch mission, advance day, etc.).
 */
export function useEngine() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [world, setWorld] = useState<WorldState | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [systems, setSystems] = useState<StarSystem[]>([]);
  const [missions, setMissions] = useState<ActiveMission[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [w, c, s, m, f] = await Promise.all([
        Engine.getWorldState(),
        Engine.getCharacters(),
        Engine.getSystems(),
        Engine.getActiveMissions(),
        Engine.getFleets(),
      ]);
      setWorld(w);
      setCharacters(c);
      setSystems(s);
      setMissions(m);
      setFleets(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await Engine.ready();
        setReady(true);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [refresh]);

  return { ready, error, world, characters, systems, missions, fleets, refresh };
}
