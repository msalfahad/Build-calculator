// True when built for publishing as a claude.ai Artifact (single-file web app).
export const IS_ARTIFACT = (import.meta as { env?: Record<string, string> }).env?.VITE_ARTIFACT === 'true';

type Use = (name: string) => Promise<unknown>;
/** The viewer's capability entry point, when the page runs inside a claude.ai viewer. */
export function claudeUse<T>(name: string): Promise<T | null> {
  const c = (window as unknown as { claude?: { use?: Use } }).claude;
  if (!c || typeof c.use !== 'function') return Promise.resolve(null);
  return (c.use(name) as Promise<T | null>).catch(() => null);
}
