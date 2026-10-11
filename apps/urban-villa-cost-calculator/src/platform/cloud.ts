import { claudeUse } from './env';

/**
 * Optional account sync through the claude.ai `db` capability. Everything lives in the viewer's own
 * private subtree (`data/users/<id>/…`), so nobody else — not even people the page is shared with —
 * can read it. When the capability is unavailable the app keeps working on browser storage alone.
 */
type Snap = { exists: boolean; data(): Record<string, unknown> | undefined; id: string };
type DocRef = { get(): Promise<Snap>; set(d: Record<string, unknown>): Promise<void>; delete(): Promise<void>; collection(p: string): ColRef };
type ColRef = { doc(id: string): DocRef; get(): Promise<{ docs: Snap[] }> };
type DB = { doc(p: string): DocRef };
type User = { id(): Promise<string | null> };

let ready: Promise<{ db: DB; uid: string } | null> | null = null;

export function initCloud() {
  if (!ready) {
    ready = (async () => {
      const [db, user] = await Promise.all([claudeUse<DB>('db'), claudeUse<User>('user')]);
      if (!db || !user) return null;
      const uid = await user.id().catch(() => null);
      return uid ? { db, uid } : null;
    })();
  }
  return ready;
}

const docPath = (uid: string, key: string) => `data/users/${uid}/${key}`;

export async function cloudGet<T>(key: string): Promise<{ value: T; updatedAt: string } | null> {
  const c = await initCloud();
  if (!c) return null;
  try {
    const s = await c.db.doc(docPath(c.uid, key)).get();
    const d = s.exists ? s.data() : undefined;
    return d && 'value' in d ? { value: d.value as T, updatedAt: String(d.updatedAt ?? '') } : null;
  } catch {
    return null;
  }
}

// One write at a time per document; bursts are coalesced into the latest value.
const pending = new Map<string, unknown>();
const writing = new Set<string>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function cloudSet(key: string, value: unknown, delayMs = 800) {
  pending.set(key, value);
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(() => void flush(key), delayMs));
}

async function flush(key: string) {
  if (writing.has(key) || !pending.has(key)) return;
  const c = await initCloud();
  if (!c) return;
  const value = pending.get(key);
  pending.delete(key);
  writing.add(key);
  try {
    // JSON round-trip strips undefined values the store would reject.
    await c.db.doc(docPath(c.uid, key)).set({ value: JSON.parse(JSON.stringify(value)), updatedAt: new Date().toISOString() });
  } catch {
    /* browser copy remains; next change retries */
  } finally {
    writing.delete(key);
    if (pending.has(key)) void flush(key);
  }
}

// Saved estimates: one document each, so the list can grow past the per-document size limit.
const estimates = (c: { db: DB; uid: string }) => c.db.doc(docPath(c.uid, 'profile')).collection('estimates');

export async function cloudListEstimates<T>(): Promise<T[] | null> {
  const c = await initCloud();
  if (!c) return null;
  try {
    const q = await estimates(c).get();
    return q.docs.map((d) => d.data()?.value as T).filter(Boolean);
  } catch {
    return null;
  }
}

export async function cloudPutEstimate(id: string, value: unknown) {
  const c = await initCloud();
  if (!c) return;
  try {
    await estimates(c).doc(id).set({ value: JSON.parse(JSON.stringify(value)), updatedAt: new Date().toISOString() });
  } catch {
    /* ignore */
  }
}

export async function cloudDeleteEstimate(id: string) {
  const c = await initCloud();
  if (!c) return;
  try {
    await estimates(c).doc(id).delete();
  } catch {
    /* ignore */
  }
}
