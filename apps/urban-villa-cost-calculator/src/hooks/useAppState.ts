import { useCallback, useEffect, useMemo, useState } from 'react';
import { calculateEstimate } from '../calculators';
import { defaultInput, migrateInput } from '../lib/defaults';
import { loadRatebook, saveRatebook } from '../lib/ratebookStore';
import { listSaved, ratebookWithSnapshot, storeSaved } from '../lib/savedEstimates';
import type { EstimateInput, Ratebook, SavedEstimate } from '../types';

export type View = 'home' | 'wizard' | 'results' | 'breakdown' | 'report' | 'saved' | 'admin' | 'research';
const VIEWS: View[] = ['home', 'wizard', 'results', 'breakdown', 'report', 'saved', 'admin', 'research'];
const DRAFT_KEY = 'urban-vcc.draft.v1';

function readHash(): { view: View; step: number } {
  const m = window.location.hash.match(/^#\/(\w+)(?:\/(\d))?/);
  const view = (m && VIEWS.includes(m[1] as View) ? m[1] : 'home') as View;
  return { view, step: m && m[2] ? Math.min(5, Number(m[2])) : 0 };
}

function loadDraft(): EstimateInput {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.floors && d.basement && d.fees && d.rateSelection) return migrateInput(d);
    }
  } catch {
    /* ignore */
  }
  return defaultInput();
}

export function useAppState() {
  const [{ view, step }, setRoute] = useState(readHash);
  const [input, setInput] = useState<EstimateInput>(loadDraft);
  const [ratebook, setRatebookState] = useState<Ratebook>(loadRatebook);
  const [saved, setSavedState] = useState<SavedEstimate[]>(listSaved);
  const [toast, setToast] = useState<string | null>(null);
  const [reopened, setReopenedState] = useState<SavedEstimate | null>(null);
  const [useSnapshot, setUseSnapshot] = useState(false);
  const setReopened = useCallback((e: SavedEstimate | null) => { setReopenedState(e); setUseSnapshot(!!e); }, []);

  useEffect(() => {
    const on = () => setRoute(readHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(input));
    } catch {
      /* ignore */
    }
  }, [input]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const go = useCallback((v: View, s = 0) => {
    const hash = v === 'wizard' ? `#/wizard/${s}` : `#/${v}`;
    if (window.location.hash !== hash) window.location.hash = hash;
    setRoute({ view: v, step: s });
    window.scrollTo({ top: 0 });
  }, []);

  const setRatebook = useCallback((rb: Ratebook) => {
    setRatebookState(rb);
    saveRatebook(rb);
  }, []);

  const setSaved = useCallback((list: SavedEstimate[]) => {
    setSavedState(list);
    storeSaved(list);
  }, []);

  // A reopened estimate is reproduced from its saved rate snapshot unless the user switches it off.
  const effectiveRatebook = useMemo(() => (reopened && useSnapshot ? ratebookWithSnapshot(ratebook, reopened) : ratebook), [ratebook, reopened, useSnapshot]);
  const result = useMemo(() => calculateEstimate(input, effectiveRatebook), [input, effectiveRatebook]);

  return { view, step, go, input, setInput, ratebook, setRatebook, saved, setSaved, result, toast, setToast, reopened, setReopened, useSnapshot, setUseSnapshot, effectiveRatebook };
}

export type AppState = ReturnType<typeof useAppState>;
