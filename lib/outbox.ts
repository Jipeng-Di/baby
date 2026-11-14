import type {Feeding, FeedingType} from './types';

/**
 * Offline outbox for feedings.
 *
 * When a save fails because the phone is offline, the change is kept in localStorage and replayed
 * once the connection is back. New feedings get their id on the client, so replaying an insert is
 * idempotent (a duplicate-key error just means it already reached the server).
 */

export type FeedingPayload = {
  baby_id: string;
  family_id: string;
  amount_ml: number | null;
  duration_min?: number | null;
  feeding_type: FeedingType;
  fed_at: string;
  note: string | null;
};
export type OutboxOp = {
  kind: 'insert' | 'update';
  /** Feeding id (generated on the client for inserts). */
  id: string;
  userId: string;
  payload: FeedingPayload;
  queuedAt: string;
};

const KEY = 'feeding-outbox-v1';

export function readOutbox(): OutboxOp[] {
  try {
    const raw = localStorage.getItem(KEY);
    const ops = raw ? (JSON.parse(raw) as OutboxOp[]) : [];
    return Array.isArray(ops) ? ops : [];
  } catch {
    return [];
  }
}
export function writeOutbox(ops: OutboxOp[]) {
  try {
    if (ops.length) localStorage.setItem(KEY, JSON.stringify(ops));
    else localStorage.removeItem(KEY);
  } catch {}
}

/** Adds an op, folding edits of a still-pending feeding into the queued insert or update. */
export function enqueue(ops: OutboxOp[], op: OutboxOp): OutboxOp[] {
  const existing = ops.find(o => o.id === op.id);
  if (!existing) return [...ops, op];
  const merged: OutboxOp = {
    ...existing,
    payload: {...existing.payload, ...op.payload},
    queuedAt: op.queuedAt,
  };
  return ops.map(o => (o.id === op.id ? merged : o));
}
export const removeOp = (ops: OutboxOp[], id: string) => ops.filter(o => o.id !== id);
export const opsFor = (ops: OutboxOp[], userId: string, familyId: string) =>
  ops.filter(o => o.userId === userId && o.payload.family_id === familyId);

/** The row a queued insert will become, so it shows up in the UI straight away. */
export function pendingRow(op: OutboxOp): Feeding {
  return {
    id: op.id,
    created_by: op.userId,
    created_at: op.queuedAt,
    updated_at: op.queuedAt,
    duration_min: null,
    ...op.payload,
  };
}

/** Overlays queued changes on rows loaded from the server. */
export function mergePending(rows: Feeding[], ops: OutboxOp[]): Feeding[] {
  const byId = new Map(rows.map(r => [r.id, r]));
  for (const op of ops) {
    const current = byId.get(op.id);
    if (current) byId.set(op.id, {...current, ...op.payload});
    else if (op.kind === 'insert') byId.set(op.id, pendingRow(op));
  }
  return [...byId.values()];
}

/** True when a failed request never reached the server (offline, DNS, dropped connection). */
export function isNetworkError(e: unknown) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const message =
    e instanceof Error
      ? e.message
      : e && typeof e === 'object' && 'message' in e && typeof e.message === 'string'
        ? e.message
        : '';
  return /failed to fetch|load failed|networkerror|network request failed|fetch failed/i.test(message);
}
