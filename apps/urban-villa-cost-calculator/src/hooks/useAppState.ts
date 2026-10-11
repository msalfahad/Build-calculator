import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { calculateEstimate } from '../calculators';
import { defaultInput, migrateInput } from '../lib/defaults';
import { loadRatebook, saveRatebook } from '../lib/ratebookStore';
import { listSaved, ratebookWithSnapshot, storeSaved } from '../lib/savedEstimates';
import { migrateRatebook, validateRatebook, ADMIN_ENABLED } from '../lib/ratebookStore';
import { IS_ARTIFACT } from '../platform/env';
import { cloudDeleteEstimate, cloudGet, cloudListEstimates, cloudPutEstimate, cloudSet, initCloud, markSynced, onCloudStatus, type CloudStatus } from '../platform/cloud';
import type { EstimateInput, Ratebook, SavedEstimate } from '../types';

export type View = 'home' | 'wizard' | 'results' | 'breakdown' | 'report' | 'saved' | 'admin' | 'research';
const VIEWS: View[] = ['home', 'wizard', 'results', 'breakdown', 'report', 'saved', 'admin', 'research'];
const DRAFT_KEY = 'urban-vcc.draft.v1';

function readHash(): { view: View; step: number } {
  // Inside the claude.ai viewer only plain #anchors reach the page, so navigation stays in memory.
  if (IS_ARTIFACT) return { view: 'home', step: 0 };
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

  const [cloud, setCloud] = useState<CloudStatus>('checking');
  useEffect(() => { const off = onCloudStatus(setCloud); return () => { off(); }; }, []);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(input));
    } catch {
      /* ignore */
    }
    if (hydrated.current) cloudSet('draft', input, 1500);
  }, [input]);

  // Account sync: pull the user's private copy once, or seed it from this browser on first use.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await initCloud();
      if (cancelled) return;
      if (!c) return; // status listener reports 'local'
      const [rb, draft, list] = await Promise.all([cloudGet<Ratebook>('ratebook'), cloudGet<EstimateInput>('draft'), cloudListEstimates<SavedEstimate>()]);
      if (cancelled) return;
      if (rb && ADMIN_ENABLED) {
        const m = migrateRatebook(rb.value);
        if (!validateRatebook(m)) { setRatebookState(m); saveRatebook(m); }
      }
      if (draft) setInput(migrateInput(draft.value));
      if (list && list.length) {
        const sorted = [...list].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
        setSavedState(sorted);
        storeSaved(sorted);
      } else listSaved().forEach((e) => void cloudPutEstimate(e.id, e));
      hydrated.current = true;
      // An account copy that already exists proves this visitor can sync; otherwise the first write decides.
      if (rb || draft || (list && list.length)) markSynced();
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const go = useCallback((v: View, s = 0) => {
    const hash = v === 'wizard' ? `#/wizard/${s}` : `#/${v}`;
    if (!IS_ARTIFACT && window.location.hash !== hash) window.location.hash = hash;
    setRoute({ view: v, step: s });
    window.scrollTo({ top: 0 });
  }, []);

  const setRatebook = useCallback((rb: Ratebook) => {
    setRatebookState(rb);
    saveRatebook(rb);
    if (ADMIN_ENABLED) cloudSet('ratebook', rb);
  }, []);

  const setSaved = useCallback((list: SavedEstimate[]) => {
    setSavedState((prev) => {
      const ids = new Set(list.map((e) => e.id));
      prev.filter((e) => !ids.has(e.id)).forEach((e) => void cloudDeleteEstimate(e.id));
      const old = new Set(prev.map((e) => e.id));
      list.filter((e) => !old.has(e.id)).forEach((e) => void cloudPutEstimate(e.id, e));
      return list;
    });
    storeSaved(list);
  }, []);

  // A reopened estimate is reproduced from its saved rate snapshot unless the user switches it off.
  const effectiveRatebook = useMemo(() => (reopened && useSnapshot ? ratebookWithSnapshot(ratebook, reopened) : ratebook), [ratebook, reopened, useSnapshot]);
  const result = useMemo(() => calculateEstimate(input, effectiveRatebook), [input, effectiveRatebook]);

  return { view, step, go, input, setInput, ratebook, setRatebook, saved, setSaved, result, toast, setToast, reopened, setReopened, useSnapshot, setUseSnapshot, effectiveRatebook, cloud };
}

export type AppState = ReturnType<typeof useAppState>;
