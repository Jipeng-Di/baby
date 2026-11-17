'use client';
import {useEffect} from 'react';
import {supabase} from './supabase';
import type {BabyEvent, Feeding, GrowthMeasurement, Moment} from './types';

type Row = {id: string};
type Handlers = {
  upsertFeeding: (row: Feeding) => void;
  dropFeeding: (id: string) => void;
  upsertGrowth: (row: GrowthMeasurement) => void;
  dropGrowth: (id: string) => void;
  upsertMoment: (row: Moment) => void;
  dropMoment: (id: string) => void;
  upsertEvent: (row: BabyEvent) => void;
  dropEvent: (id: string) => void;
  /** Babies or members changed on another device; reload that list. */
  babiesChanged: () => void;
  membersChanged: () => void;
  /** The connection came back after a drop (e.g. the phone was locked); catch up on anything missed. */
  reconnected: () => void;
};

/** Live sync: other family members' changes arrive without pulling to refresh. */
/** `withEvents` is false until the baby_events table exists; watching a missing table breaks the channel. */
export function useFamilyRealtime(familyId: string, handlers: Handlers, withEvents = true) {
  const {
    upsertFeeding,
    dropFeeding,
    upsertGrowth,
    dropGrowth,
    upsertMoment,
    dropMoment,
    upsertEvent,
    dropEvent,
    babiesChanged,
    membersChanged,
    reconnected,
  } = handlers;
  useEffect(() => {
    if (!familyId) return;
    const sb = supabase();
    const filter = `family_id=eq.${familyId}`;
    let joined = false;
    let channel = sb.channel(`family-${familyId}`);
    const watch = <T extends Row>(table: string, upsert: (row: T) => void, drop: (id: string) => void) => {
      channel = channel
        .on<T>('postgres_changes', {event: 'INSERT', schema: 'public', table, filter}, p => upsert(p.new))
        .on<T>('postgres_changes', {event: 'UPDATE', schema: 'public', table, filter}, p => upsert(p.new))
        // Delete events cannot be filtered and only carry the primary key; unknown ids are a no-op.
        .on<T>('postgres_changes', {event: 'DELETE', schema: 'public', table}, p => {
          if (p.old.id) drop(p.old.id);
        });
    };
    watch<Feeding>('feedings', upsertFeeding, dropFeeding);
    watch<GrowthMeasurement>('growth_measurements', upsertGrowth, dropGrowth);
    watch<Moment>('baby_moments', upsertMoment, dropMoment);
    if (withEvents) watch<BabyEvent>('baby_events', upsertEvent, dropEvent);
    channel
      .on('postgres_changes', {event: '*', schema: 'public', table: 'babies', filter}, babiesChanged)
      .on('postgres_changes', {event: '*', schema: 'public', table: 'family_members', filter}, membersChanged)
      .subscribe(status => {
        if (status !== 'SUBSCRIBED') return;
        if (joined) reconnected();
        joined = true;
      });
    return () => {
      void sb.removeChannel(channel);
    };
  }, [
    familyId,
    withEvents,
    upsertFeeding,
    dropFeeding,
    upsertGrowth,
    dropGrowth,
    upsertMoment,
    dropMoment,
    upsertEvent,
    dropEvent,
    babiesChanged,
    membersChanged,
    reconnected,
  ]);
}
