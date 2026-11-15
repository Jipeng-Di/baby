'use client';
import {useCallback, useEffect, useRef, useState, useMemo} from 'react';
import {useRouter} from 'next/navigation';
import type {User} from '@supabase/supabase-js';
import {
  ArrowDown,
  CalendarDays,
  ChartNoAxesCombined,
  CloudOff,
  House,
  LayoutDashboard,
  LoaderCircle,
  Scale,
} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import {
  babyName,
  type Baby,
  type BabySex,
  type Family,
  type Feeding,
  type FeedingType,
  type GrowthMeasurement,
  type Member,
  typeLabels,
} from '@/lib/types';
import {datetimeLocal, dayKey} from '@/lib/dates';
import {tr, useLang} from '@/lib/i18n';
import {localDateTime, saveTextFile, toCsv} from '@/lib/export';
import {toDisplay, useUnit} from '@/lib/units';
import {getError} from '@/lib/errors';
import {byNewest, fetchFeedings, parseFeedForm, time, windowStart, type FeedForm} from '@/lib/feedings';
import {parseBabyForm, type BabyForm} from '@/lib/baby-form';
import {
  enqueue,
  isNetworkError,
  mergePending,
  opsFor,
  pendingRow,
  readOutbox,
  removeOp,
  writeOutbox,
  type OutboxOp,
} from '@/lib/outbox';
import GrowthView, {type GrowthValues} from './GrowthView';
import AvatarCropper from './AvatarCropper';
import HistoryCalendar from './HistoryCalendar';
import TodayView from './TodayView';
import TrendView from './TrendView';
import FeedSheet from './FeedSheet';
import SettingsSheet from './SettingsSheet';
import FamilyPage from './FamilyPage';
import Onboarding from './Onboarding';
import {AuthView, ResetView} from './AuthViews';
import {Alert, PageIntro, card, primary} from './ui';

type Page =
  'auth' | 'onboarding' | 'today' | 'history' | 'trends' | 'growth' | 'family' | 'join' | 'reset-password';

export default function App({page, inviteCode}: {page: Page; inviteCode?: string}) {
  // Subscribed only so every view re-renders when the language or volume unit changes.
  useLang();
  useUnit();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [families, setFamilies] = useState<Family[]>([]);
  const [familyId, setFamilyId] = useState('');
  const [familiesLoaded, setFamiliesLoaded] = useState(false);
  const [loadedFamilyId, setLoadedFamilyId] = useState('');
  const [babies, setBabies] = useState<Baby[]>([]);
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});
  const [feedings, setFeedings] = useState<Feeding[]>([]);
  const [measurements, setMeasurements] = useState<GrowthMeasurement[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<FeedForm | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [avatarDraft, setAvatarDraft] = useState<{baby: Baby; url: string} | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullStart = useRef<{x: number; y: number} | null>(null);
  const [dragging, setDragging] = useState(false);
  const pullDistanceRef = useRef(0);
  const [range, setRange] = useState<7 | 30>(7);
  const [now, setNow] = useState(() => Date.now());
  const [outbox, setOutbox] = useState<OutboxOp[]>([]);
  const flushing = useRef(false);
  // Earliest fed_at currently held in `feedings`; null means the full history is loaded.
  const loadedSince = useRef<string | null>(null);
  const activeBabies = useMemo(() => babies.filter(b => b.is_active), [babies]);
  const family = families.find(f => f.id === familyId);
  const showError = (e: unknown) => {
    setError(getError(e));
    setSuccess('');
  };
  const recorderName = useCallback(
    (userId: string) =>
      userId === user?.id
        ? tr('我', 'Me')
        : members.find(m => m.user_id === userId)?.display_name || tr('家人', 'Family'),
    [user, members],
  );

  // Local state updates shared by our own saves and by realtime events from other devices.
  const upsertFeeding = useCallback(
    (row: Feeding) => setFeedings(list => [...list.filter(f => f.id !== row.id), row].sort(byNewest)),
    [],
  );
  const dropFeeding = useCallback((id: string) => setFeedings(list => list.filter(f => f.id !== id)), []);
  const upsertGrowth = useCallback(
    (row: GrowthMeasurement) =>
      setMeasurements(list =>
        [...list.filter(m => m.id !== row.id), row].sort((a, b) =>
          b.measured_at.localeCompare(a.measured_at),
        ),
      ),
    [],
  );
  const dropGrowth = useCallback((id: string) => setMeasurements(list => list.filter(m => m.id !== id)), []);

  useEffect(() => {
    let live = true;
    try {
      const sb = supabase();
      sb.auth
        .getUser()
        .then(({data}) => {
          if (live) {
            setUser(data.user);
            setReady(true);
          }
        })
        .catch(e => {
          if (live) {
            showError(e);
            setReady(true);
          }
        });
      const {
        data: {subscription},
      } = sb.auth.onAuthStateChange((_event, session) => {
        if (live) {
          setUser(session?.user ?? null);
          setReady(true);
        }
      });
      return () => {
        live = false;
        subscription.unsubscribe();
      };
    } catch (e) {
      showError(e);
      setReady(true);
    }
  }, []);
  const loadFamilies = useCallback(async () => {
    if (!user) return;
    const sb = supabase();
    const {data: links, error: e} = await sb
      .from('family_members')
      .select('family_id')
      .eq('user_id', user.id);
    if (e) throw e;
    const ids = (links ?? []).map(x => x.family_id as string);
    if (!ids.length) {
      setFamilies([]);
      setFamilyId('');
      return;
    }
    const {data, error: fe} = await sb
      .from('families')
      .select('id,name,family_code,created_by')
      .in('id', ids)
      .order('created_at');
    if (fe) throw fe;
    const rows = (data ?? []) as Family[];
    setFamilies(rows);
    setFamilyId(rows[0]?.id ?? '');
  }, [user]);
  const loadBabies = useCallback(async () => {
    if (!familyId) return;
    const sb = supabase();
    const {data, error: e} = await sb
      .from('babies')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at');
    if (e) throw e;
    const babyRows = (data ?? []) as Baby[];
    setBabies(babyRows);
    const paths = babyRows.flatMap(b => (b.avatar_path ? [b.avatar_path] : []));
    if (paths.length) {
      const {data: signed} = await sb.storage.from('baby-avatars').createSignedUrls(paths, 3600);
      const byPath = new Map(
        (signed ?? []).flatMap(item => (item.signedUrl ? [[item.path, item.signedUrl] as const] : [])),
      );
      setAvatarUrls(
        Object.fromEntries(
          babyRows.flatMap(b =>
            b.avatar_path && byPath.get(b.avatar_path) ? [[b.id, byPath.get(b.avatar_path)!]] : [],
          ),
        ),
      );
    } else setAvatarUrls({});
  }, [familyId]);
  const loadMembers = useCallback(async () => {
    if (!familyId) return;
    const sb = supabase();
    const {data, error: e} = await sb
      .from('family_members')
      .select('id,user_id,role')
      .eq('family_id', familyId);
    if (e) throw e;
    const links = (data ?? []) as Member[];
    const ids = links.map(m => m.user_id);
    if (ids.length) {
      const {data: profiles} = await sb.from('profiles').select('id,display_name').in('id', ids);
      setMembers(
        links.map(m => ({...m, display_name: profiles?.find(p => p.id === m.user_id)?.display_name || null})),
      );
    } else setMembers([]);
  }, [familyId]);
  const loadGrowth = useCallback(async () => {
    if (!familyId) return;
    const {data, error: e} = await supabase()
      .from('growth_measurements')
      .select('*')
      .eq('family_id', familyId)
      .order('measured_at', {ascending: false});
    if (e) throw e;
    setMeasurements((data ?? []) as GrowthMeasurement[]);
  }, [familyId]);
  // Queued offline changes for this user and family, re-read from storage so every caller sees the latest.
  const pendingOps = useCallback(
    () => (user && familyId ? opsFor(readOutbox(), user.id, familyId) : []),
    [user, familyId],
  );
  // Re-fetch the loaded window (keeps any older months the history page already pulled in).
  const refreshFeedings = useCallback(async () => {
    if (!familyId) return;
    const since = loadedSince.current;
    const rows = await fetchFeedings(familyId, since);
    setFeedings(list =>
      mergePending(
        [...(since ? list.filter(f => time(f.fed_at) < time(since)) : []), ...rows],
        pendingOps(),
      ).sort(byNewest),
    );
  }, [familyId, pendingOps]);
  const loadData = useCallback(async () => {
    if (!familyId) return;
    setLoading(true);
    try {
      const since = windowStart();
      const [rows] = await Promise.all([
        fetchFeedings(familyId, since),
        loadBabies(),
        loadMembers(),
        loadGrowth(),
      ]);
      loadedSince.current = since;
      setFeedings(mergePending(rows, pendingOps()).sort(byNewest));
    } catch (e) {
      // Offline at startup: still show what was logged on this phone while offline.
      if (isNetworkError(e)) setFeedings(mergePending([], pendingOps()).sort(byNewest));
      showError(e);
    } finally {
      setLoading(false);
      setLoadedFamilyId(familyId);
    }
  }, [familyId, loadBabies, loadMembers, loadGrowth, pendingOps]);
  const ensureFeedingsSince = useCallback(
    async (from: Date) => {
      const loaded = loadedSince.current;
      if (!familyId || loaded === null || from.getTime() >= time(loaded)) return;
      const since = from.toISOString();
      setLoadingOlder(true);
      try {
        const rows = await fetchFeedings(familyId, since, loaded);
        loadedSince.current =
          loadedSince.current && time(loadedSince.current) < time(since) ? loadedSince.current : since;
        setFeedings(list => {
          const ids = new Set(list.map(f => f.id));
          return [...list, ...rows.filter(f => !ids.has(f.id))].sort(byNewest);
        });
      } catch (e) {
        showError(e);
      } finally {
        setLoadingOlder(false);
      }
    },
    [familyId],
  );
  const refreshVisible = useCallback(async () => {
    await Promise.all([refreshFeedings(), loadGrowth()]);
  }, [refreshFeedings, loadGrowth]);

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
  // Replays queued offline changes in order; stops at the first network failure and tries again later.
  const flushOutbox = useCallback(async () => {
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
            setError(
              tr(
                `有一条离线记录无法同步（${getError(res.error)}），已跳过。`,
                `An offline record couldn’t be synced (${getError(res.error)}) and was skipped.`,
              ),
            );
          continue;
        }
        dequeue(op.id);
        upsertFeeding(res.data as Feeding);
      }
    } finally {
      flushing.current = false;
    }
  }, [user, familyId, pendingOps, dequeue, upsertFeeding]);
  // Pick up anything queued in an earlier session once the family has loaded.
  useEffect(() => {
    setOutbox(readOutbox());
    if (loadedFamilyId && loadedFamilyId === familyId) flushOutbox().catch(() => {});
  }, [loadedFamilyId, familyId, flushOutbox]);
  const pendingCount = user && familyId ? opsFor(outbox, user.id, familyId).length : 0;
  // While something is queued, retry on each 30-second tick.
  useEffect(() => {
    if (pendingCount) flushOutbox().catch(() => {});
  }, [now, pendingCount, flushOutbox]);

  useEffect(() => {
    if (user) {
      setFamiliesLoaded(false);
      loadFamilies()
        .catch(showError)
        .finally(() => setFamiliesLoaded(true));
    } else {
      setFamilies([]);
      setFamilyId('');
      setFamiliesLoaded(false);
    }
  }, [user, loadFamilies]);
  useEffect(() => {
    if (familyId) loadData();
    else {
      setBabies([]);
      setAvatarUrls({});
      setFeedings([]);
      setMeasurements([]);
      setLoadedFamilyId('');
    }
  }, [familyId, loadData]);

  // Live sync: other family members' changes arrive without pulling to refresh.
  useEffect(() => {
    if (!familyId) return;
    const sb = supabase();
    const filter = `family_id=eq.${familyId}`;
    let joined = false;
    const channel = sb
      .channel(`family-${familyId}`)
      .on<Feeding>(
        'postgres_changes',
        {event: 'INSERT', schema: 'public', table: 'feedings', filter},
        payload => upsertFeeding(payload.new),
      )
      .on<Feeding>(
        'postgres_changes',
        {event: 'UPDATE', schema: 'public', table: 'feedings', filter},
        payload => upsertFeeding(payload.new),
      )
      // Delete events cannot be filtered and only carry the primary key; unknown ids are a no-op.
      .on<Feeding>('postgres_changes', {event: 'DELETE', schema: 'public', table: 'feedings'}, payload => {
        if (payload.old.id) dropFeeding(payload.old.id);
      })
      .on<GrowthMeasurement>(
        'postgres_changes',
        {event: 'INSERT', schema: 'public', table: 'growth_measurements', filter},
        payload => upsertGrowth(payload.new),
      )
      .on<GrowthMeasurement>(
        'postgres_changes',
        {event: 'UPDATE', schema: 'public', table: 'growth_measurements', filter},
        payload => upsertGrowth(payload.new),
      )
      .on<GrowthMeasurement>(
        'postgres_changes',
        {event: 'DELETE', schema: 'public', table: 'growth_measurements'},
        payload => {
          if (payload.old.id) dropGrowth(payload.old.id);
        },
      )
      .on('postgres_changes', {event: '*', schema: 'public', table: 'babies', filter}, () => {
        loadBabies().catch(() => {});
      })
      .on('postgres_changes', {event: '*', schema: 'public', table: 'family_members', filter}, () => {
        loadMembers().catch(() => {});
      })
      .subscribe(status => {
        // After a dropped connection (e.g. phone was locked), catch up on anything missed.
        if (status === 'SUBSCRIBED') {
          if (joined) refreshVisible().catch(() => {});
          joined = true;
        }
      });
    return () => {
      void sb.removeChannel(channel);
    };
  }, [
    familyId,
    upsertFeeding,
    dropFeeding,
    upsertGrowth,
    dropGrowth,
    loadBabies,
    loadMembers,
    refreshVisible,
  ]);

  // Keep "time since last feeding" current, and resync when the app returns to the foreground.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 30000);
    let hiddenAt = 0;
    const onVisible = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      tick();
      // Send queued offline records first, so the refresh already includes them.
      if (familyId && Date.now() - hiddenAt > 30000)
        flushOutbox()
          .catch(() => {})
          .finally(() => refreshVisible().catch(() => {}));
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [familyId, refreshVisible, flushOutbox]);

  useEffect(() => {
    if (!ready) return;
    if (!user && !['auth', 'reset-password'].includes(page)) {
      if (page === 'join' && inviteCode) localStorage.setItem('pendingInvite', inviteCode);
      router.replace('/auth');
    } else if (user && page === 'auth' && familiesLoaded) {
      const pending = localStorage.getItem('pendingInvite');
      router.replace(pending ? `/join/${pending}` : families.length ? '/today' : '/onboarding');
    } else if (user && page === 'onboarding' && familiesLoaded && families.length) {
      router.replace('/today');
    }
  }, [ready, user, page, inviteCode, router, families.length, familiesLoaded]);
  useEffect(() => {
    if (user && page === 'join' && inviteCode) localStorage.removeItem('pendingInvite');
  }, [user, page, inviteCode]);
  async function action(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await work();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }
  async function createFamily(name: string) {
    let done = false;
    await action(async () => {
      const {data, error: e} = await supabase().rpc('create_family', {family_name: name.trim()});
      if (e) throw e;
      setFamilyId(data as string);
      done = true;
      await loadFamilies();
      router.push('/family');
      setSuccess(tr('家庭已创建，请添加宝宝。', 'Family created. Now add your baby.'));
    });
    return done;
  }
  async function joinFamilyByCode(input: string) {
    let done = false;
    await action(async () => {
      const code = input.replace(/[^a-z0-9]/gi, '').toUpperCase();
      if (code.length !== 10)
        throw new Error(tr('请输入 10 位家庭编码。', 'Enter the 10-character family code.'));
      const {data, error: e} = await supabase().rpc('join_family_by_code', {input_code: code});
      if (e) throw e;
      setFamilyId(data as string);
      done = true;
      await loadFamilies();
      router.replace('/today');
    });
    return done;
  }
  async function saveBaby(form: BabyForm, edit: Baby | null) {
    let saved = false;
    await action(async () => {
      if (!familyId) throw new Error(tr('请先创建家庭。', 'Create a family first.'));
      const {gestational_age_days: gestation, ...fields} = parseBabyForm(form);
      const payload = {
        ...fields,
        ...(gestation !== null || edit?.gestational_age_days ? {gestational_age_days: gestation} : {}),
      };
      const sb = supabase();
      const res = edit
        ? await sb.from('babies').update(payload).eq('id', edit.id).eq('family_id', familyId)
        : await sb.from('babies').insert({...payload, family_id: familyId});
      if (res.error) throw res.error;
      saved = true;
      await loadBabies();
      setSuccess(edit ? tr('宝宝资料已更新。', 'Baby profile updated.') : tr('宝宝已添加。', 'Baby added.'));
    });
    return saved;
  }
  function startFeed(baby: Baby, amount: number) {
    let last: FeedingType = 'formula';
    try {
      last = (localStorage.getItem(`feeding-type:${baby.id}`) as FeedingType) || 'formula';
    } catch {}
    setEditing(null);
    setForm({
      baby_id: baby.id,
      amount: amount ? String(toDisplay(amount)) : '',
      duration: '',
      mode: !amount && last === 'breast_milk' ? 'min' : 'vol',
      feeding_type: last,
      fed_at: datetimeLocal(new Date().toISOString(), 5),
      note: '',
    });
    setError('');
  }
  function editFeed(item: Feeding) {
    setEditing(item.id);
    setForm({
      baby_id: item.baby_id,
      amount: item.amount_ml === null ? '' : String(toDisplay(item.amount_ml)),
      duration: item.duration_min ? String(item.duration_min) : '',
      mode:
        item.feeding_type !== 'formula' &&
        item.amount_ml === null &&
        (item.duration_min || item.feeding_type === 'breast_milk')
          ? 'min'
          : 'vol',
      feeding_type: item.feeding_type,
      fed_at: datetimeLocal(item.fed_at),
      note: item.note || '',
    });
    setError('');
  }
  async function saveFeeding() {
    if (!form || !user || !familyId) return;
    await action(async () => {
      const {
        amount_ml: amount,
        duration_min: duration,
        fed_at,
        note,
      } = parseFeedForm(
        form,
        activeBabies.map(b => b.id),
      );
      const payload = {
        baby_id: form.baby_id,
        family_id: familyId,
        amount_ml: amount,
        ...(duration !== null || (editing && feedings.find(f => f.id === editing)?.duration_min)
          ? {duration_min: duration}
          : {}),
        feeding_type: form.feeding_type,
        fed_at,
        note,
      };
      // New feedings get their id here so an offline save can be replayed later without duplicates.
      const id = editing ?? crypto.randomUUID();
      const op: OutboxOp = {
        kind: editing ? 'update' : 'insert',
        id,
        userId: user.id,
        payload,
        queuedAt: new Date().toISOString(),
      };
      // Editing a feeding that is itself still queued: just update the queued copy.
      const queuedAlready = pendingOps().some(o => o.id === id);
      let offline = queuedAlready;
      if (!queuedAlready) {
        const sb = supabase();
        const res = editing
          ? await sb
              .from('feedings')
              .update(payload)
              .eq('id', editing)
              .eq('family_id', familyId)
              .select()
              .single()
          : await sb
              .from('feedings')
              .insert({...payload, id, created_by: user.id})
              .select()
              .single();
        if (res.error && !isNetworkError(res.error)) throw res.error;
        if (res.error) offline = true;
        else upsertFeeding(res.data as Feeding);
      }
      if (offline) {
        queueOp(op);
        const existing = feedings.find(f => f.id === id);
        upsertFeeding(existing ? {...existing, ...payload} : pendingRow(op));
      }
      try {
        localStorage.setItem(`feeding-type:${form.baby_id}`, form.feeding_type);
      } catch {}
      setForm(null);
      setEditing(null);
      setSuccess(
        offline
          ? tr(
              '现在没有网络，记录已先存在这台手机上，联网后会自动同步。',
              'You’re offline. The record is saved on this phone and will sync when you’re back online.',
            )
          : editing
            ? tr('记录已更新。', 'Record updated.')
            : amount === null && duration === null
              ? tr('时间已记录，吃完后可以补充奶量。', 'Time saved. You can add the amount after the feed.')
              : tr('记录已保存。', 'Record saved.'),
      );
    });
  }
  async function removeFeeding() {
    if (!deleteId) return;
    await action(async () => {
      const queued = pendingOps().find(o => o.id === deleteId);
      // A feeding that never reached the server only needs to leave the queue.
      if (queued?.kind !== 'insert') {
        const {error: e} = await supabase()
          .from('feedings')
          .delete()
          .eq('id', deleteId)
          .eq('family_id', familyId);
        if (e && isNetworkError(e))
          throw new Error(
            tr('删除需要联网，请稍后再试。', 'Deleting needs a connection. Please try again later.'),
          );
        if (e) throw e;
      }
      if (queued) dequeue(deleteId);
      dropFeeding(deleteId);
      setDeleteId(null);
      setForm(null);
      setSuccess(tr('记录已删除。', 'Record deleted.'));
    });
  }
  async function removeBaby(baby: Baby) {
    if (
      !window.confirm(
        tr(
          `确定将“${babyName(baby)}”移出宝宝列表？已有的喝奶和体重记录会保留。`,
          `Remove “${babyName(baby)}” from the baby list? Existing feeding and growth records will be kept.`,
        ),
      )
    )
      return;
    await action(async () => {
      const {error: e} = await supabase()
        .from('babies')
        .update({is_active: false})
        .eq('id', baby.id)
        .eq('family_id', familyId);
      if (e) throw e;
      await loadBabies();
      setSuccess(tr('宝宝已移出，历史记录已保留。', 'Baby removed. Their history has been kept.'));
    });
  }
  function chooseAvatar(baby: Baby, file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showError(new Error(tr('请选择 JPG、PNG 或 WebP 图片。', 'Choose a JPG, PNG or WebP image.')));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError(new Error(tr('头像图片不能超过 5 MB。', 'The photo must be 5 MB or smaller.')));
      return;
    }
    if (avatarDraft) URL.revokeObjectURL(avatarDraft.url);
    setAvatarDraft({baby, url: URL.createObjectURL(file)});
    setError('');
  }
  function closeAvatarDraft() {
    if (avatarDraft) URL.revokeObjectURL(avatarDraft.url);
    setAvatarDraft(null);
  }
  async function uploadAvatar(baby: Baby, file: File) {
    let saved = false;
    await action(async () => {
      const path = `${familyId}/${baby.id}/${crypto.randomUUID()}.jpg`;
      const sb = supabase();
      const {error: uploadError} = await sb.storage
        .from('baby-avatars')
        .upload(path, file, {contentType: 'image/jpeg', cacheControl: '3600'});
      if (uploadError) throw uploadError;
      const {error: updateError} = await sb
        .from('babies')
        .update({avatar_path: path})
        .eq('id', baby.id)
        .eq('family_id', familyId);
      if (updateError) {
        await sb.storage.from('baby-avatars').remove([path]);
        throw updateError;
      }
      if (baby.avatar_path) await sb.storage.from('baby-avatars').remove([baby.avatar_path]);
      await loadBabies();
      setSuccess(tr(`${babyName(baby)} 的头像已更新。`, `${babyName(baby)}’s photo has been updated.`));
      saved = true;
    });
    return saved;
  }
  async function setBabySex(baby: Baby, sex: BabySex) {
    await action(async () => {
      const {error: e} = await supabase()
        .from('babies')
        .update({sex})
        .eq('id', baby.id)
        .eq('family_id', familyId);
      if (e) throw e;
      await loadBabies();
      setSuccess(tr(`已保存 ${babyName(baby)} 的资料。`, `Saved ${babyName(baby)}’s profile.`));
    });
  }
  async function addGrowthMeasurement(baby: Baby, values: GrowthValues, measuredAt: string, note: string) {
    if (!user) return false;
    const userId = user.id;
    let saved = false;
    await action(async () => {
      const parse = (raw: string, min: number, max: number, label: string) => {
        const text = raw.trim();
        if (!text) return null;
        const value = Number(text);
        if (!Number.isFinite(value) || value < min || value > max)
          throw new Error(
            tr(
              `${label}请输入 ${min}–${max} 之间的数字。`,
              `${label} must be a number between ${min} and ${max}.`,
            ),
          );
        return value;
      };
      const weight = parse(values.weight, 0.5, 80, tr('体重（kg）', 'Weight (kg)'));
      const length = parse(values.length, 20, 130, tr('身长（cm）', 'Length (cm)'));
      const head = parse(values.head, 18, 60, tr('头围（cm）', 'Head circumference (cm)'));
      if (weight === null && length === null && head === null)
        throw new Error(
          tr(
            '请至少填写体重、身长或头围中的一项。',
            'Enter at least one of weight, length or head circumference.',
          ),
        );
      if (!measuredAt || measuredAt < baby.birthday || measuredAt > dayKey(new Date()))
        throw new Error(
          tr('测量日期应在出生日期至今天之间。', 'The measurement date must be between birth and today.'),
        );
      const {data, error: e} = await supabase()
        .from('growth_measurements')
        .insert({
          baby_id: baby.id,
          family_id: familyId,
          recorded_by: userId,
          weight_kg: weight,
          ...(length !== null ? {length_cm: length} : {}),
          ...(head !== null ? {head_cm: head} : {}),
          measured_at: measuredAt,
          note: note.trim() || null,
        })
        .select()
        .single();
      if (e) throw e;
      upsertGrowth(data as GrowthMeasurement);
      setSuccess(tr('生长记录已保存。', 'Growth record saved.'));
      saved = true;
    });
    return saved;
  }
  async function removeGrowthMeasurement(item: GrowthMeasurement) {
    if (
      !window.confirm(
        tr(`删除 ${item.measured_at} 的这条生长记录？`, `Delete the growth record from ${item.measured_at}?`),
      )
    )
      return;
    await action(async () => {
      const {error: e} = await supabase()
        .from('growth_measurements')
        .delete()
        .eq('id', item.id)
        .eq('family_id', familyId);
      if (e) throw e;
      dropGrowth(item.id);
      setSuccess(tr('生长记录已删除。', 'Growth record deleted.'));
    });
  }
  async function exportFeedings() {
    await action(async () => {
      const rows = await fetchFeedings(familyId, null);
      const names = new Map(babies.map(b => [b.id, babyName(b)]));
      const csv = toCsv([
        [
          tr('时间', 'Time'),
          tr('宝宝', 'Baby'),
          tr('奶量(ml)', 'Amount (ml)'),
          tr('亲喂(分钟)', 'Nursing (min)'),
          tr('类型', 'Type'),
          tr('备注', 'Note'),
          tr('记录人', 'Logged by'),
        ],
        ...[...rows]
          .reverse()
          .map(f => [
            localDateTime(f.fed_at),
            names.get(f.baby_id) ?? '',
            f.amount_ml,
            f.duration_min ?? null,
            typeLabels[f.feeding_type],
            f.note,
            recorderName(f.created_by),
          ]),
      ]);
      await saveTextFile(tr(`喝奶记录-${dayKey(new Date())}.csv`, `feedings-${dayKey(new Date())}.csv`), csv);
      setSuccess(tr(`已导出 ${rows.length} 条喝奶记录。`, `Exported ${rows.length} feeding records.`));
    });
  }
  async function exportGrowth() {
    await action(async () => {
      const names = new Map(babies.map(b => [b.id, babyName(b)]));
      const rows = [...measurements].sort((a, b) => a.measured_at.localeCompare(b.measured_at));
      const num = (v: number | null | undefined) => (v === null || v === undefined ? null : Number(v));
      const csv = toCsv([
        [
          tr('测量日期', 'Date measured'),
          tr('宝宝', 'Baby'),
          tr('体重(kg)', 'Weight (kg)'),
          tr('身长(cm)', 'Length (cm)'),
          tr('头围(cm)', 'Head (cm)'),
          tr('备注', 'Note'),
          tr('记录人', 'Logged by'),
        ],
        ...rows.map(m => [
          m.measured_at,
          names.get(m.baby_id) ?? '',
          num(m.weight_kg),
          num(m.length_cm),
          num(m.head_cm),
          m.note,
          recorderName(m.recorded_by),
        ]),
      ]);
      await saveTextFile(tr(`生长记录-${dayKey(new Date())}.csv`, `growth-${dayKey(new Date())}.csv`), csv);
      setSuccess(tr(`已导出 ${rows.length} 条生长记录。`, `Exported ${rows.length} growth records.`));
    });
  }
  async function joinFamily() {
    if (!inviteCode) return;
    await action(async () => {
      const {error: e} = await supabase().rpc('join_family', {invite_token: inviteCode});
      if (e) throw e;
      await loadFamilies();
      router.replace('/today');
    });
  }
  async function signOut() {
    const {error: e} = await supabase().auth.signOut({scope: 'local'});
    if (e) {
      showError(e);
      return;
    }
    router.replace('/auth');
  }
  function startPull(event: React.TouchEvent) {
    if (refreshing || form || avatarDraft || deleteId || window.scrollY > 0) return;
    const touch = event.touches[0];
    pullStart.current = {x: touch.clientX, y: touch.clientY};
    pullDistanceRef.current = 0;
    setDragging(true);
  }
  function movePull(event: React.TouchEvent) {
    if (!pullStart.current || refreshing) return;
    const touch = event.touches[0];
    const dx = Math.abs(touch.clientX - pullStart.current.x);
    const dy = touch.clientY - pullStart.current.y;
    if (dy <= 0 || dx > dy) {
      pullStart.current = null;
      pullDistanceRef.current = 0;
      setDragging(false);
      setPullDistance(0);
      return;
    }
    const distance = Math.min(88, dy * 0.45);
    pullDistanceRef.current = distance;
    setPullDistance(distance);
    event.preventDefault();
  }
  async function refreshApp() {
    setRefreshing(true);
    setPullDistance(52);
    setError('');
    setSuccess('');
    try {
      await Promise.all([loadFamilies(), loadBabies(), loadMembers(), loadGrowth(), refreshFeedings()]);
      setNow(Date.now());
    } catch (e) {
      showError(e);
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  }
  function endPull() {
    const shouldRefresh = pullDistanceRef.current >= 56;
    pullStart.current = null;
    setDragging(false);
    pullDistanceRef.current = 0;
    if (shouldRefresh && !refreshing) void refreshApp();
    else setPullDistance(0);
  }
  function cancelPull() {
    pullStart.current = null;
    setDragging(false);
    pullDistanceRef.current = 0;
    setPullDistance(0);
  }
  const editingItem = editing ? feedings.find(f => f.id === editing) : undefined;
  if (!ready)
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center text-(--muted)">
        {tr('正在加载…', 'Loading…')}
      </main>
    );
  if (page === 'auth') return <AuthView onError={showError} user={user} />;
  if (page === 'reset-password') return <ResetView onError={showError} />;
  if (!user) return <main className="p-8">{tr('正在打开登录页面…', 'Opening sign-in…')}</main>;
  if (page === 'join')
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6">
        <div className={card}>
          <img src="/icon.svg" alt="" className="mb-4 h-12 w-12 rounded-[14px]" />
          <h1 className="text-3xl font-semibold">{tr('一起照顾宝宝', 'Care for your baby together')}</h1>
          <p className="mt-3 text-(--muted)">
            {tr(
              '加入家庭后，你可以查看和记录这个家庭的喝奶数据。',
              'After joining, you can view and log this family’s feeding data.',
            )}
          </p>
          {error && <Alert text={error} />}
          <button className={`${primary} mt-7`} disabled={busy} onClick={joinFamily}>
            {busy ? tr('正在加入…', 'Joining…') : tr('加入家庭', 'Join family')}
          </button>
          <button className="mt-4 w-full p-3 text-(--brand)" onClick={() => router.push('/today')}>
            {tr('返回', 'Back')}
          </button>
        </div>
      </main>
    );
  if (!familiesLoaded || (familyId && loadedFamilyId !== familyId))
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center text-(--muted)">
        {tr('正在加载…', 'Loading…')}
      </main>
    );
  if (page === 'onboarding' && familyId)
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center text-(--muted)">
        {tr('正在进入家庭…', 'Opening family…')}
      </main>
    );
  if (!familyId)
    return (
      <Onboarding
        error={error}
        success={success}
        busy={busy}
        onCreate={createFamily}
        onJoin={joinFamilyByCode}
      />
    );
  const nav: [Page, string, typeof House][] = [
    ['today', tr('今天', 'Today'), LayoutDashboard],
    ['history', tr('记录', 'Records'), CalendarDays],
    ['growth', tr('生长', 'Growth'), Scale],
    ['family', tr('家庭', 'Family'), House],
  ];
  return (
    <>
      <div
        role="status"
        aria-live="polite"
        className="fixed left-1/2 top-[max(12px,env(safe-area-inset-top))] z-0 flex -translate-x-1/2 items-center gap-2 text-sm font-semibold text-(--brand)"
      >
        {refreshing ? (
          <>
            <LoaderCircle className="animate-spin" size={18} />
            {tr('正在刷新', 'Refreshing')}
          </>
        ) : pullDistance > 0 ? (
          <>
            <ArrowDown
              className={pullDistance >= 56 ? 'rotate-180 transition-transform' : 'transition-transform'}
              size={18}
            />
            {pullDistance >= 56 ? tr('松开刷新', 'Release to refresh') : tr('下拉刷新', 'Pull to refresh')}
          </>
        ) : null}
      </div>
      <div className="relative z-[1] mx-auto min-h-screen max-w-lg border-x border-(--rim)/50 bg-(--surface)/10 shadow-[0_0_70px_rgba(15,50,38,.06)]">
        <div
          className="min-h-screen pb-32"
          style={{
            transform: `translateY(${pullDistance}px)`,
            transition: dragging ? 'none' : 'transform 180ms ease',
          }}
          onTouchStart={startPull}
          onTouchMove={movePull}
          onTouchEnd={endPull}
          onTouchCancel={cancelPull}
        >
          <main className="space-y-6 px-5 pt-[max(24px,env(safe-area-inset-top))]">
            {error && <Alert text={error} />} {success && <Alert text={success} good />}
            {loading && !refreshing && (
              <p className="text-sm text-(--muted)">{tr('正在同步…', 'Syncing…')}</p>
            )}
            {pendingCount > 0 && (
              <p
                role="status"
                className="flex items-center gap-2 rounded-2xl border border-(--warm-line) bg-(--warm-pale) px-4 py-3 text-sm text-(--warm-ink)"
              >
                <CloudOff size={18} className="shrink-0" />
                {tr(
                  `有 ${pendingCount} 条记录还没同步，联网后会自动上传。`,
                  `${pendingCount} record${pendingCount > 1 ? 's' : ''} waiting to sync. They’ll upload when you’re back online.`,
                )}
              </p>
            )}
            {page === 'today' && (
              <TodayView
                babies={activeBabies}
                feedings={feedings}
                avatarUrls={avatarUrls}
                now={now}
                recorderName={recorderName}
                onStartFeed={startFeed}
                onEditFeed={editFeed}
                onAddBaby={() => router.push('/family')}
              />
            )}
            {(page === 'history' || page === 'trends') && (
              <>
                <PageIntro title={tr('喂养记录', 'Feeding records')} />
                <div
                  className="flex rounded-[18px] border border-(--rim)/80 bg-(--chip)/80 p-1.5 shadow-inner"
                  role="tablist"
                  aria-label={tr('历史或趋势', 'History or trends')}
                >
                  {(
                    [
                      ['history', tr('历史', 'History'), CalendarDays],
                      ['trends', tr('趋势', 'Trends'), ChartNoAxesCombined],
                    ] as const
                  ).map(([key, label, Icon]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={page === key}
                      className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[14px] font-semibold transition ${page === key ? 'bg-(--paper) text-(--brand) shadow-[0_3px_12px_rgba(30,67,52,.09)]' : 'text-(--muted)'}`}
                      onClick={() => {
                        try {
                          localStorage.setItem('records-tab', key);
                        } catch {}
                        router.replace(`/${key}`);
                      }}
                    >
                      <Icon size={18} />
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
            {page === 'history' && (
              <>
                <HistoryCalendar
                  babies={babies}
                  feedings={feedings}
                  onSelect={editFeed}
                  recorderName={recorderName}
                  onMonthChange={ensureFeedingsSince}
                  loadingOlder={loadingOlder}
                />
              </>
            )}
            {page === 'trends' && (
              <>
                <div
                  className="flex rounded-[18px] border border-(--rim)/80 bg-(--chip)/80 p-1.5 shadow-inner"
                  role="group"
                  aria-label={tr('趋势天数', 'Trend range')}
                >
                  {([7, 30] as const).map(n => (
                    <button
                      key={n}
                      className={`min-h-11 flex-1 rounded-[14px] font-semibold transition ${range === n ? 'bg-(--paper) text-(--brand) shadow-[0_3px_12px_rgba(30,67,52,.09)]' : 'text-(--muted)'}`}
                      onClick={() => setRange(n)}
                    >
                      {tr(`近 ${n} 天`, `Last ${n} days`)}
                    </button>
                  ))}
                </div>
                <TrendView babies={activeBabies} feedings={feedings} days={range} />
              </>
            )}
            {page === 'growth' && (
              <>
                <PageIntro title={tr('生长曲线', 'Growth')} />
                <GrowthView
                  babies={activeBabies}
                  measurements={measurements}
                  busy={busy}
                  onAdd={addGrowthMeasurement}
                  onDelete={removeGrowthMeasurement}
                  onSetSex={setBabySex}
                />
              </>
            )}
            {page === 'family' && <PageIntro title={tr('家庭', 'Family')} />}
            {page === 'family' && user && (
              <FamilyPage
                family={family}
                activeBabies={activeBabies}
                avatarUrls={avatarUrls}
                members={members}
                userId={user.id}
                busy={busy}
                setSuccess={setSuccess}
                setError={setError}
                chooseAvatar={chooseAvatar}
                removeBaby={removeBaby}
                onSaveBaby={saveBaby}
                exportFeedings={exportFeedings}
                exportGrowth={exportGrowth}
                signOut={signOut}
                openSettings={() => setSettingsOpen(true)}
              />
            )}
          </main>
        </div>
        <nav
          className="safe-bottom fixed bottom-[max(10px,env(safe-area-inset-bottom))] left-1/2 z-20 flex w-[calc(100%_-_24px)] max-w-[488px] -translate-x-1/2 rounded-[25px] border border-(--rim)/90 bg-(--paper)/92 p-1.5 shadow-[0_12px_40px_rgba(19,50,39,.18)] backdrop-blur-2xl"
          aria-label={tr('主导航', 'Main navigation')}
        >
          {nav.map(([key, label, Icon]) => {
            const on = page === key || (key === 'history' && page === 'trends');
            return (
              <button
                key={key}
                aria-current={on ? 'page' : undefined}
                className={`flex min-h-[58px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[19px] text-[11px] transition ${on ? 'bg-(--brand-pale) font-bold text-(--brand)' : 'text-(--soft) active:bg-(--surface-2)'}`}
                onClick={() => router.push(`/${key === 'history' ? recordsTab() : key}`)}
              >
                <Icon size={21} strokeWidth={on ? 2.5 : 1.8} />
                {label}
              </button>
            );
          })}
        </nav>
        {avatarDraft && (
          <AvatarCropper
            src={avatarDraft.url}
            name={babyName(avatarDraft.baby)}
            busy={busy}
            uploadError={error}
            onCancel={closeAvatarDraft}
            onConfirm={async file => {
              if (await uploadAvatar(avatarDraft.baby, file)) closeAvatarDraft();
            }}
          />
        )}
        {form && (
          <FeedSheet
            form={form}
            setForm={setForm}
            editing={editing}
            editingItem={editingItem}
            activeBabies={activeBabies}
            babies={babies}
            busy={busy}
            error={error}
            recorderName={recorderName}
            saveFeeding={saveFeeding}
            setDeleteId={setDeleteId}
          />
        )}
        {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
        {deleteId && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#10231b]/50 p-6">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-label={tr('确认删除', 'Confirm delete')}
              className={`${card} w-full max-w-sm`}
            >
              <h2 className="text-xl font-semibold">{tr('确认删除这条记录？', 'Delete this record?')}</h2>
              <p className="mt-2 text-sm text-(--muted)">{tr('删除后无法恢复。', 'This can’t be undone.')}</p>
              {error && <Alert text={error} />}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  className="min-h-12 rounded-xl border border-(--line)"
                  disabled={busy}
                  onClick={() => setDeleteId(null)}
                >
                  {tr('取消', 'Cancel')}
                </button>
                <button
                  className="min-h-12 rounded-xl bg-(--danger) font-semibold text-white"
                  disabled={busy}
                  onClick={removeFeeding}
                >
                  {busy ? tr('删除中…', 'Deleting…') : tr('删除', 'Delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
// The Records tab reopens whichever of History / Trends was used last.
function recordsTab() {
  try {
    return localStorage.getItem('records-tab') === 'trends' ? 'trends' : 'history';
  } catch {
    return 'history';
  }
}
