'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import type {User} from '@supabase/supabase-js';
import {supabase} from './supabase';
import {getError} from './errors';
import {tr} from './i18n';
import {enqueue, isNetworkError, opsFor, readOutbox, removeOp, writeOutbox, type OutboxOp} from './outbox';
import type {Feeding} from './types';

/**
 * The offline queue for feedings: what is waiting, how to add or remove an op, and replaying the queue.
 * `tick` is the 30-second clock; while something is queued, each tick retries the upload.
 */
export function useOutbox({
  user,
  familyId,
  loaded,
  tick,
  onSynced,
  onError,
}: {
  user: User | null;
  familyId: string;
  /** True once this family's data has loaded, so replayed rows merge into a complete list. */
  loaded: boolean;
  tick: number;
  onSynced: (row: Feeding) => void;
  onError: (message: string) => void;
}) {
  // Anything queued in an earlier session is picked up here; during prerender there is no storage, so [].
  const [outbox, setOutbox] = useState<OutboxOp[]>(readOutbox);
  const flushing = useRef(false);
  // Queued changes for this user and family, re-read from storage so every caller sees the latest.
  const pendingOps = useCallback(
    () => (user && familyId ? opsFor(readOutbox(), user.id, familyId) : []),
    [user, familyId],
  );
  const queueOp = useCallback((op: OutboxOp) => {
    const next = enqueue(readOutbox(), op);
    writeOutbox(next);
    setOutbox(next);
  }, []);
  const dequeue = useCallback((id: string) => {
    const next = removeOp(readOutbox(), id);
    writeOutbox(next);
    setOutbox(next);
  }, []);
  // Replays queued changes in order; stops at the first network failure and tries again later.
  const flush = useCallback(async () => {
    if (flushing.current || !user || !familyId) return;
    const ops = pendingOps();
    if (!ops.length) return;
    flushing.current = true;
    try {
      const sb = supabase();
      for (const op of ops) {
        const res =
          op.kind === 'insert'
            ? await sb
                .from('feedings')
                .insert({...op.payload, id: op.id, created_by: op.userId})
                .select()
                .single()
            : await sb
                .from('feedings')
                .update(op.payload)
                .eq('id', op.id)
                .eq('family_id', op.payload.family_id)
                .select()
                .single();
        if (res.error) {
          if (isNetworkError(res.error)) break;
          dequeue(op.id);
          // 23505: this insert already reached the server on an earlier attempt.
          if (res.error.code !== '23505')
            onError(
              tr(
                `有一条离线记录无法同步（${getError(res.error)}），已跳过。`,
                `An offline record couldn’t be synced (${getError(res.error)}) and was skipped.`,
              ),
            );
          continue;
        }
        dequeue(op.id);
        onSynced(res.data as Feeding);
      }
    } finally {
      flushing.current = false;
    }
  }, [user, familyId, pendingOps, dequeue, onSynced, onError]);
  // Replay the queue once the family has loaded, so synced rows merge into a complete list.
  useEffect(() => {
    if (loaded) flush().catch(() => {});
  }, [loaded, flush]);
  const pendingCount = user && familyId ? opsFor(outbox, user.id, familyId).length : 0;
  useEffect(() => {
    if (pendingCount) flush().catch(() => {});
  }, [tick, pendingCount, flush]);
  return {pendingOps, queueOp, dequeue, flush, pendingCount};
}
