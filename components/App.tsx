'use client';
import {useCallback, useEffect, useRef, useState, useMemo} from 'react';
import {useRouter} from 'next/navigation';
import type {User} from '@supabase/supabase-js';
import {CalendarDays, ChartNoAxesCombined, CloudOff, Scale, Sprout} from 'lucide-react';
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
  type Moment,
} from '@/lib/types';
import {datetimeLocal, dayKey} from '@/lib/dates';
import {tr, useLang} from '@/lib/i18n';
import {feedingsCsv, growthCsv, momentsCsv, saveTextFile} from '@/lib/export';
import {toDisplay, useUnit} from '@/lib/units';
import {getError} from '@/lib/errors';
import {byNewest, fetchFeedings, parseFeedForm, time, windowStart, type FeedForm} from '@/lib/feedings';
import {parseBabyForm, type BabyForm} from '@/lib/baby-form';
import {isNetworkError, mergePending, pendingRow, type OutboxOp} from '@/lib/outbox';
import {useOutbox} from '@/lib/use-outbox';
import {useFamilyRealtime} from '@/lib/use-realtime';
import {readLocal, writeLocal} from '@/lib/storage';
import {say, type GuideItem} from '@/lib/guide';
import {parseMomentForm} from '@/lib/timeline';
import {compressPhoto} from '@/lib/image';
import GrowthView, {type GrowthValues} from './GrowthView';
import TimelineView, {type GuideTab} from './TimelineView';
import GuideSheet from './GuideSheet';
import MomentSheet, {type MomentDraft} from './MomentSheet';
import VisitSheet from './VisitSheet';
import AvatarCropper from './AvatarCropper';
import HistoryCalendar from './HistoryCalendar';
import TodayView from './TodayView';
import TrendView from './TrendView';
import FeedSheet from './FeedSheet';
import SettingsSheet from './SettingsSheet';
import FamilyPage from './FamilyPage';
import Onboarding from './Onboarding';
import {AuthView, ResetView} from './AuthViews';
import BottomNav, {rememberView} from './BottomNav';
import ConfirmDialog from './ConfirmDialog';
import PullToRefresh from './PullToRefresh';
import {Alert, FullScreenNote, PageIntro, Segmented, card, primary} from './ui';

export const PAGES = [
  'auth',
  'onboarding',
  'today',
  'history',
  'trends',
  'timeline',
  'growth',
  'family',
  'join',
  'reset-password',
] as const;
export type Page = (typeof PAGES)[number];

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
  const [moments, setMoments] = useState<Moment[]>([]);
  // Signed URLs for moment photos, by storage path.
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  // True until the baby_moments migration has been run on this database.
  const [momentsUnavailable, setMomentsUnavailable] = useState(false);
  const [momentDraft, setMomentDraft] = useState<MomentDraft | null>(null);
  const [guideBabyId, setGuideBabyId] = useState<string | null>(null);
  const [guideTab, setGuideTab] = useState<GuideTab>('milestone');
  const [visitDraft, setVisitDraft] = useState<{baby: Baby; items: GuideItem[]} | null>(null);
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
  const [range, setRange] = useState<7 | 30>(7);
  const [now, setNow] = useState(() => Date.now());
  // Earliest fed_at currently held in `feedings`; null means the full history is loaded.
  const loadedSince = useRef<string | null>(null);
  const activeBabies = useMemo(() => babies.filter(b => b.is_active), [babies]);
  const family = families.find(f => f.id === familyId);
  const showError = useCallback((e: unknown) => {
    setError(getError(e));
    setSuccess('');
  }, []);
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
  const upsertMoment = useCallback(
    (row: Moment) => setMoments(list => [...list.filter(m => m.id !== row.id), row]),
    [],
  );
  const dropMoment = useCallback((id: string) => setMoments(list => list.filter(m => m.id !== id)), []);
  const {
    pendingOps,
    queueOp,
    dequeue,
    flush: flushOutbox,
    pendingCount,
  } = useOutbox({
    user,
    familyId,
    loaded: !!loadedFamilyId && loadedFamilyId === familyId,
    tick: now,
    onSynced: upsertFeeding,
    onError: setError,
  });

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
  }, [showError]);
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
  const loadMoments = useCallback(async () => {
    if (!familyId) return;
    const {data, error: e} = await supabase()
      .from('baby_moments')
      .select('*')
      .eq('family_id', familyId)
      .order('occurred_on', {ascending: false});
    // The table doesn't exist until its migration runs; keep the rest of the app working meanwhile.
    if (e && (e.code === '42P01' || e.code === 'PGRST205')) {
      setMomentsUnavailable(true);
      setMoments([]);
      return;
    }
    if (e) throw e;
    setMomentsUnavailable(false);
    setMoments((data ?? []) as Moment[]);
  }, [familyId]);
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
        loadMoments(),
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
  }, [familyId, loadBabies, loadMembers, loadGrowth, loadMoments, pendingOps, showError]);
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
    [familyId, showError],
  );
  const refreshVisible = useCallback(async () => {
    await Promise.all([refreshFeedings(), loadGrowth(), loadMoments()]);
  }, [refreshFeedings, loadGrowth, loadMoments]);

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
  }, [user, loadFamilies, showError]);
  useEffect(() => {
    if (familyId) loadData();
    else {
      setBabies([]);
      setAvatarUrls({});
      setFeedings([]);
      setMeasurements([]);
      setMoments([]);
      setLoadedFamilyId('');
    }
  }, [familyId, loadData]);

  const babiesChanged = useCallback(() => void loadBabies().catch(() => {}), [loadBabies]);
  const membersChanged = useCallback(() => void loadMembers().catch(() => {}), [loadMembers]);
  const reconnected = useCallback(() => void refreshVisible().catch(() => {}), [refreshVisible]);
  useFamilyRealtime(familyId, {
    upsertFeeding,
    dropFeeding,
    upsertGrowth,
    dropGrowth,
    upsertMoment,
    dropMoment,
    babiesChanged,
    membersChanged,
    reconnected,
  });

  // Sign any moment photos we don't have a URL for yet (signed URLs last an hour; reloads re-sign).
  useEffect(() => {
    const missing = moments.flatMap(m => (m.photo_path && !photoUrls[m.photo_path] ? [m.photo_path] : []));
    if (!missing.length) return;
    let live = true;
    supabase()
      .storage.from('baby-avatars')
      .createSignedUrls(missing, 3600)
      .then(({data}) => {
        if (!live || !data) return;
        const signed = data.flatMap(item =>
          item.path && item.signedUrl ? [[item.path, item.signedUrl]] : [],
        );
        if (signed.length) setPhotoUrls(urls => ({...urls, ...Object.fromEntries(signed)}));
      });
    return () => {
      live = false;
    };
  }, [moments, photoUrls]);

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

  // Warm the tab routes so switching is instant even on a slow connection.
  useEffect(() => {
    for (const p of ['today', 'history', 'trends', 'timeline', 'growth', 'family']) router.prefetch(`/${p}`);
  }, [router]);
  useEffect(() => {
    if (!ready) return;
    if (!user && !['auth', 'reset-password'].includes(page)) {
      if (page === 'join' && inviteCode) writeLocal('pendingInvite', inviteCode);
      router.replace('/auth');
    } else if (user && page === 'auth' && familiesLoaded) {
      const pending = readLocal('pendingInvite');
      router.replace(pending ? `/join/${pending}` : families.length ? '/today' : '/onboarding');
    } else if (user && page === 'onboarding' && familiesLoaded && families.length) {
      router.replace('/today');
    }
  }, [ready, user, page, inviteCode, router, families.length, familiesLoaded]);
  useEffect(() => {
    if (user && page === 'join' && inviteCode) writeLocal('pendingInvite', null);
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
    const last = (readLocal(`feeding-type:${baby.id}`) as FeedingType | null) || 'formula';
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
      writeLocal(`feeding-type:${form.baby_id}`, form.feeding_type);
      setForm(null);
      setEditing(null);
      // New feedings show up in the list straight away, so they need no confirmation message;
      // offline saves are covered by the "not synced yet" banner.
      if (editing && !offline) setSuccess(tr('记录已更新。', 'Record updated.'));
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
  const stamp = () => dayKey(new Date());
  async function exportFeedings() {
    await action(async () => {
      const rows = await fetchFeedings(familyId, null);
      await saveTextFile(
        tr(`喝奶记录-${stamp()}.csv`, `feedings-${stamp()}.csv`),
        feedingsCsv(rows, babies, recorderName),
      );
      setSuccess(tr(`已导出 ${rows.length} 条喝奶记录。`, `Exported ${rows.length} feeding records.`));
    });
  }
  async function exportGrowth() {
    await action(async () => {
      await saveTextFile(
        tr(`生长记录-${stamp()}.csv`, `growth-${stamp()}.csv`),
        growthCsv(measurements, babies, recorderName),
      );
      setSuccess(
        tr(`已导出 ${measurements.length} 条生长记录。`, `Exported ${measurements.length} growth records.`),
      );
    });
  }
  function openMoment(baby: Baby, item?: GuideItem) {
    setError('');
    setMomentDraft({
      baby,
      editing: null,
      photo: null,
      removePhoto: false,
      form: {
        kind: item ? (item.kind === 'vaccine' || item.kind === 'checkup' ? item.kind : 'milestone') : 'first',
        guide_key: item?.key ?? null,
        title: item ? say(item.title) : '',
        occurred_on: dayKey(new Date()),
        note: '',
      },
    });
  }
  function editMoment(m: Moment) {
    const baby = babies.find(b => b.id === m.baby_id);
    if (!baby) return;
    setError('');
    setMomentDraft({
      baby,
      editing: m,
      photo: null,
      removePhoto: false,
      form: {
        kind: m.kind,
        guide_key: m.guide_key,
        title: m.title,
        occurred_on: m.occurred_on,
        note: m.note ?? '',
      },
    });
  }
  function closeMomentDraft() {
    if (momentDraft?.photo) URL.revokeObjectURL(momentDraft.photo.url);
    setMomentDraft(null);
    setError('');
  }
  async function saveMoment() {
    if (!user || !momentDraft) return;
    const draft = momentDraft;
    const userId = user.id;
    await action(async () => {
      const parsed = parseMomentForm(draft.form, draft.baby.birthday, dayKey(new Date()));
      const sb = supabase();
      let uploaded: string | null = null;
      if (draft.photo) {
        const blob = await compressPhoto(draft.photo.file);
        uploaded = `${familyId}/moments/${crypto.randomUUID()}.jpg`;
        const {error: uploadError} = await sb.storage
          .from('baby-avatars')
          .upload(uploaded, blob, {contentType: 'image/jpeg', cacheControl: '3600'});
        if (uploadError) throw uploadError;
      }
      const old = draft.editing?.photo_path ?? null;
      const photoPath = uploaded ?? (draft.removePhoto ? null : old);
      const payload = {...parsed, photo_path: photoPath};
      const res = draft.editing
        ? await sb
            .from('baby_moments')
            .update(payload)
            .eq('id', draft.editing.id)
            .eq('family_id', familyId)
            .select()
            .single()
        : await sb
            .from('baby_moments')
            .insert({...payload, baby_id: draft.baby.id, family_id: familyId, recorded_by: userId})
            .select()
            .single();
      if (res.error) {
        if (uploaded) await sb.storage.from('baby-avatars').remove([uploaded]);
        if (res.error.code === '23505')
          throw new Error(
            tr(
              '这一项已经记录过了，可以在时间线上找到它。',
              'This is already logged. You’ll find it on the timeline.',
            ),
          );
        throw res.error;
      }
      if (old && old !== photoPath) await sb.storage.from('baby-avatars').remove([old]);
      // Show the new photo straight away from the local copy.
      if (uploaded && draft.photo) setPhotoUrls(urls => ({...urls, [uploaded]: draft.photo!.url}));
      upsertMoment(res.data as Moment);
      setMomentDraft(null);
    });
  }
  async function saveVisit(date: string, items: GuideItem[]) {
    if (!user || !visitDraft) return;
    const {baby} = visitDraft;
    const userId = user.id;
    await action(async () => {
      const rows = items.map(item =>
        parseMomentForm(
          {
            kind: item.kind === 'checkup' ? 'checkup' : 'vaccine',
            guide_key: item.key,
            title: say(item.title),
            occurred_on: date,
            note: '',
          },
          baby.birthday,
          dayKey(new Date()),
        ),
      );
      const {data, error: e} = await supabase()
        .from('baby_moments')
        .insert(rows.map(r => ({...r, baby_id: baby.id, family_id: familyId, recorded_by: userId})))
        .select();
      if (e && e.code === '23505')
        throw new Error(
          tr(
            '其中有项目已经记录过了，请取消勾选后再保存。',
            'Some of these are already logged. Untick them and save again.',
          ),
        );
      if (e) throw e;
      ((data ?? []) as Moment[]).forEach(upsertMoment);
      setVisitDraft(null);
    });
  }
  async function removeMoment() {
    const m = momentDraft?.editing;
    if (
      !m ||
      !window.confirm(tr('删除这条记录？删除后无法恢复。', 'Delete this entry? This can’t be undone.'))
    )
      return;
    await action(async () => {
      const sb = supabase();
      const {error: e} = await sb.from('baby_moments').delete().eq('id', m.id).eq('family_id', familyId);
      if (e) throw e;
      if (m.photo_path) await sb.storage.from('baby-avatars').remove([m.photo_path]);
      dropMoment(m.id);
      closeMomentDraft();
    });
  }
  async function exportMoments() {
    await action(async () => {
      await saveTextFile(
        tr(`成长时刻-${stamp()}.csv`, `moments-${stamp()}.csv`),
        momentsCsv(moments, babies, recorderName),
      );
      setSuccess(tr(`已导出 ${moments.length} 条成长时刻。`, `Exported ${moments.length} moments.`));
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
  /** Removes the account (App Store 5.1.1). Photos go first, because only a signed-in member may delete them. */
  async function deleteAccount() {
    if (!user) return;
    await action(async () => {
      const sb = supabase();
      if (familyId && members.length <= 1) {
        const bucket = sb.storage.from('baby-avatars');
        const paths: string[] = [];
        const {data: top} = await bucket.list(familyId, {limit: 1000});
        for (const entry of top ?? []) {
          if (entry.id) paths.push(`${familyId}/${entry.name}`);
          else {
            const {data: inner} = await bucket.list(`${familyId}/${entry.name}`, {limit: 1000});
            for (const file of inner ?? []) if (file.id) paths.push(`${familyId}/${entry.name}/${file.name}`);
          }
        }
        if (paths.length) await bucket.remove(paths);
      }
      const {error: e} = await sb.rpc('delete_account');
      if (e) throw e;
      await sb.auth.signOut({scope: 'local'});
      setSettingsOpen(false);
      router.replace('/auth');
    });
  }
  async function refreshApp() {
    setError('');
    setSuccess('');
    try {
      await Promise.all([
        loadFamilies(),
        loadBabies(),
        loadMembers(),
        loadGrowth(),
        loadMoments(),
        refreshFeedings(),
      ]);
      setNow(Date.now());
    } catch (e) {
      showError(e);
    }
  }
  const editingItem = editing ? feedings.find(f => f.id === editing) : undefined;
  if (!ready) return <FullScreenNote text={tr('正在加载…', 'Loading…')} />;
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
    return <FullScreenNote text={tr('正在加载…', 'Loading…')} />;
  if (page === 'onboarding' && familyId)
    return <FullScreenNote text={tr('正在进入家庭…', 'Opening family…')} />;
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
  const sheetOpen = !!(form || avatarDraft || deleteId || momentDraft || visitDraft || guideBabyId);
  const switchView = (view: Page) => {
    rememberView(view);
    router.replace(`/${view}`);
  };
  return (
    <>
      <div className="relative z-[1] mx-auto min-h-screen max-w-lg border-x border-(--rim)/50 bg-(--surface)/10 shadow-[0_0_70px_rgba(15,50,38,.06)]">
        <PullToRefresh disabled={sheetOpen} onRefresh={refreshApp}>
          <main className="space-y-6 px-5 pt-[max(24px,env(safe-area-inset-top))]">
            {error && <Alert text={error} />} {success && <Alert text={success} good />}
            {loading && <p className="text-sm text-(--muted)">{tr('正在同步…', 'Syncing…')}</p>}
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
                <Segmented
                  tabs
                  label={tr('历史或趋势', 'History or trends')}
                  value={page}
                  onChange={switchView}
                  options={[
                    {value: 'history', label: tr('历史', 'History'), icon: CalendarDays},
                    {value: 'trends', label: tr('趋势', 'Trends'), icon: ChartNoAxesCombined},
                  ]}
                />
              </>
            )}
            {page === 'history' && (
              <HistoryCalendar
                babies={babies}
                feedings={feedings}
                onSelect={editFeed}
                recorderName={recorderName}
                onMonthChange={ensureFeedingsSince}
                loadingOlder={loadingOlder}
              />
            )}
            {page === 'trends' && (
              <>
                <Segmented
                  label={tr('趋势天数', 'Trend range')}
                  value={range}
                  onChange={setRange}
                  options={([7, 30] as const).map(n => ({
                    value: n,
                    label: tr(`近 ${n} 天`, `Last ${n} days`),
                  }))}
                />
                <TrendView babies={activeBabies} feedings={feedings} days={range} />
              </>
            )}
            {(page === 'growth' || page === 'timeline') && (
              <>
                <PageIntro title={tr('成长', 'Growth')} />
                <Segmented
                  tabs
                  label={tr('时间线或生长曲线', 'Timeline or growth chart')}
                  value={page}
                  onChange={switchView}
                  options={[
                    {value: 'timeline', label: tr('时间线', 'Timeline'), icon: Sprout},
                    {value: 'growth', label: tr('生长曲线', 'Growth chart'), icon: Scale},
                  ]}
                />
              </>
            )}
            {page === 'timeline' && (
              <TimelineView
                babies={activeBabies}
                avatarUrls={avatarUrls}
                moments={moments}
                photoUrls={photoUrls}
                unavailable={momentsUnavailable}
                today={dayKey(new Date(now))}
                onLog={openMoment}
                onEdit={editMoment}
                onOpenGuide={(baby, tab = 'milestone') => {
                  setGuideTab(tab);
                  setGuideBabyId(baby.id);
                }}
                onLogVisit={(baby, items) => {
                  setError('');
                  setVisitDraft({baby, items});
                }}
              />
            )}
            {page === 'growth' && (
              <GrowthView
                babies={activeBabies}
                measurements={measurements}
                busy={busy}
                onAdd={addGrowthMeasurement}
                onDelete={removeGrowthMeasurement}
                onSetSex={setBabySex}
              />
            )}
            {page === 'family' && (
              <>
                <PageIntro title={tr('家庭', 'Family')} />
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
                  openSettings={() => setSettingsOpen(true)}
                />
              </>
            )}
          </main>
        </PullToRefresh>
        <BottomNav page={page} />
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
        {settingsOpen && (
          <SettingsSheet
            email={user?.email ?? null}
            busy={busy}
            onExportFeedings={exportFeedings}
            onExportGrowth={exportGrowth}
            onExportMoments={exportMoments}
            onSignOut={signOut}
            onDeleteAccount={deleteAccount}
            onClose={() => setSettingsOpen(false)}
          />
        )}
        {guideBabyId && activeBabies.some(b => b.id === guideBabyId) && (
          <GuideSheet
            baby={activeBabies.find(b => b.id === guideBabyId)!}
            initialTab={guideTab}
            moments={moments}
            today={dayKey(new Date(now))}
            onLog={item =>
              openMoment(
                activeBabies.find(b => b.id === guideBabyId)!,
                item,
              )
            }
            onEdit={editMoment}
            onClose={() => setGuideBabyId(null)}
          />
        )}
        {visitDraft && (
          <VisitSheet
            baby={visitDraft.baby}
            items={visitDraft.items}
            today={dayKey(new Date(now))}
            busy={busy}
            error={error}
            onSave={saveVisit}
            onClose={() => {
              setVisitDraft(null);
              setError('');
            }}
          />
        )}
        {momentDraft && (
          <MomentSheet
            draft={momentDraft}
            setDraft={setMomentDraft}
            existingPhotoUrl={
              momentDraft.editing?.photo_path ? photoUrls[momentDraft.editing.photo_path] : undefined
            }
            today={dayKey(new Date(now))}
            busy={busy}
            error={error}
            onSave={saveMoment}
            onDelete={removeMoment}
            onClose={closeMomentDraft}
          />
        )}
        {deleteId && (
          <ConfirmDialog
            title={tr('确认删除这条记录？', 'Delete this record?')}
            text={tr('删除后无法恢复。', 'This can’t be undone.')}
            confirmLabel={tr('删除', 'Delete')}
            busyLabel={tr('删除中…', 'Deleting…')}
            busy={busy}
            error={error}
            onConfirm={removeFeeding}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </div>
    </>
  );
}
