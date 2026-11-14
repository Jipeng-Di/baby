import {describe, expect, it} from 'vitest';
import {enqueue, isNetworkError, mergePending, opsFor, removeOp, type OutboxOp} from '@/lib/outbox';
import type {Feeding} from '@/lib/types';

const payload = {
  baby_id: 'a',
  family_id: 'f',
  amount_ml: 120,
  feeding_type: 'formula' as const,
  fed_at: '2026-11-13T12:00:00.000Z',
  note: null,
};
const insert: OutboxOp = {
  kind: 'insert',
  id: 'n1',
  userId: 'u',
  payload,
  queuedAt: '2026-11-13T12:01:00.000Z',
};
const server: Feeding = {
  id: 's1',
  created_by: 'u2',
  created_at: '',
  updated_at: '',
  duration_min: null,
  ...payload,
  amount_ml: 90,
};

describe('outbox', () => {
  it('folds an edit of a queued insert into that insert', () => {
    const ops = enqueue([insert], {...insert, kind: 'update', payload: {...payload, amount_ml: 150}});
    expect(ops).toHaveLength(1);
    expect(ops[0].kind).toBe('insert');
    expect(ops[0].payload.amount_ml).toBe(150);
  });
  it('keeps ops for other users or families out of the current view', () => {
    const other = {...insert, id: 'n2', userId: 'someone-else'};
    expect(opsFor([insert, other], 'u', 'f').map(o => o.id)).toEqual(['n1']);
    expect(opsFor([insert], 'u', 'other-family')).toEqual([]);
  });
  it('shows queued inserts and overlays queued edits on server rows', () => {
    const edit: OutboxOp = {...insert, kind: 'update', id: 's1', payload: {...payload, amount_ml: 100}};
    const rows = mergePending([server], [insert, edit]);
    expect(rows.find(r => r.id === 'n1')?.created_by).toBe('u');
    expect(rows.find(r => r.id === 's1')?.amount_ml).toBe(100);
    expect(rows.find(r => r.id === 's1')?.created_by).toBe('u2');
  });
  it('does not resurrect a queued update for a row that is gone', () => {
    const edit: OutboxOp = {...insert, kind: 'update', id: 'gone'};
    expect(mergePending([], [edit])).toEqual([]);
  });
  it('removes ops by id', () => {
    expect(removeOp([insert], 'n1')).toEqual([]);
  });
  it('recognises browser network failures but not server errors', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkError({message: 'TypeError: Load failed'})).toBe(true);
    expect(isNetworkError({message: 'new row violates row-level security policy', code: '42501'})).toBe(
      false,
    );
  });
});
