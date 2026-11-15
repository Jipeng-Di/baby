import {supabase} from './supabase';
import {localDay} from './dates';
import {tr} from './i18n';
import {fromDisplay, volumeLabel} from './units';
import type {Feeding, FeedingType} from './types';

// Feedings older than this are only fetched when the history calendar navigates to them.
const FEEDING_WINDOW_DAYS = 60;
export const time = (iso: string) => new Date(iso).getTime();
export const byNewest = (a: Feeding, b: Feeding) => time(b.fed_at) - time(a.fed_at);
export function validTime(value: string) {
  const n = new Date(value).getTime();
  return Number.isFinite(n) && n <= Date.now() + 5 * 60000 && n >= new Date('2000-01-01').getTime();
}
export function windowStart() {
  const d = localDay();
  d.setDate(d.getDate() - FEEDING_WINDOW_DAYS);
  return d.toISOString();
}
export async function fetchFeedings(familyId: string, since: string | null, before: string | null = null) {
  const sb = supabase();
  const all: Feeding[] = [];
  for (let start = 0; ; start += 1000) {
    let query = sb.from('feedings').select('*').eq('family_id', familyId);
    if (since) query = query.gte('fed_at', since);
    if (before) query = query.lt('fed_at', before);
    const {data, error} = await query
      .order('fed_at', {ascending: false})
      .order('id')
      .range(start, start + 999);
    if (error) throw error;
    all.push(...((data ?? []) as Feeding[]));
    if ((data ?? []).length < 1000) break;
  }
  return all;
}

// `amount` is typed in the display unit (ml or oz); `mode` picks whether the input is volume or nursing minutes.
export type FeedForm = {
  baby_id: string;
  amount: string;
  duration: string;
  mode: 'vol' | 'min';
  feeding_type: FeedingType;
  fed_at: string;
  note: string;
};

/** Validates the feed sheet and converts it to stored values. Throws a user-facing Error when invalid. */
export function parseFeedForm(form: FeedForm, activeBabyIds: string[]) {
  const rawAmount = form.amount.trim();
  const typed = rawAmount === '' ? null : Number(rawAmount);
  const amount = typed === null ? null : fromDisplay(typed);
  if (
    typed !== null &&
    (!Number.isFinite(typed) || typed <= 0 || amount === null || amount < 1 || amount > 1000)
  )
    throw new Error(
      tr(
        `奶量留空，或输入 ${volumeLabel(1)}–${volumeLabel(1000)} 之间的数。`,
        `Leave the amount blank, or enter ${volumeLabel(1)}–${volumeLabel(1000)}.`,
      ),
    );
  const rawDuration = form.feeding_type === 'formula' ? '' : form.duration.trim();
  const duration = rawDuration === '' ? null : Number(rawDuration);
  if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 240))
    throw new Error(
      tr(
        '亲喂时长留空，或输入 1–240 之间的整数分钟。',
        'Leave nursing time blank, or enter 1–240 whole minutes.',
      ),
    );
  if (!validTime(form.fed_at))
    throw new Error(
      tr('请输入有效的喂奶时间，不能是未来时间。', 'Enter a valid feeding time that isn’t in the future.'),
    );
  if (!activeBabyIds.includes(form.baby_id))
    throw new Error(tr('请选择当前家庭的宝宝。', 'Choose a baby from this family.'));
  return {
    amount_ml: amount,
    duration_min: duration,
    fed_at: new Date(form.fed_at).toISOString(),
    note: form.note.trim() || null,
  };
}
